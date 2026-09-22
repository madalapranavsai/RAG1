from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Body
from app.api.auth import get_current_user
from app.core.supabase import get_admin_client
from app.graphs.rag_graph import rag_graph

router = APIRouter(prefix="/api/chat", tags=["Chat"])

@router.get("/sessions")
async def list_chat_sessions(user: dict = Depends(get_current_user)):
    """
    Lists all chat sessions belonging to the active workspace.
    """
    workspace_id = user.get("workspace_id")
    if not workspace_id:
        return {"chats": []}

    supabase = get_admin_client()
    resp = supabase.table("chats").select("*").eq("workspace_id", workspace_id).order("created_at", desc=True).execute()
    return {"chats": resp.data or []}

@router.post("/sessions")
async def create_chat_session(user: dict = Depends(get_current_user)):
    """
    Creates a new chat session.
    """
    workspace_id = user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="No active workspace found.")

    supabase = get_admin_client()
    resp = supabase.table("chats").insert({
        "workspace_id": workspace_id,
        "user_id": user["id"],
        "title": "New Chat"
    }).execute()

    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create chat session.")

    return {"chat": resp.data[0]}

@router.delete("/sessions/{chat_id}")
async def delete_chat_session(chat_id: str, user: dict = Depends(get_current_user)):
    """
    Deletes a chat session (cascades to messages).
    """
    workspace_id = user.get("workspace_id")
    supabase = get_admin_client()

    supabase.table("chats").delete().eq("id", chat_id).eq("workspace_id", workspace_id).execute()
    return {"success": True}

@router.get("/sessions/{chat_id}/messages")
async def get_chat_messages(chat_id: str, user: dict = Depends(get_current_user)):
    """
    Retrieves message history for a specific chat session.
    """
    workspace_id = user.get("workspace_id")
    supabase = get_admin_client()

    resp = supabase.table("chat_messages").select("*").eq("chat_id", chat_id).eq("workspace_id", workspace_id).order("created_at", desc=False).execute()
    messages = resp.data or []

    # Collect all retrieved chunk IDs to enrich with document titles if needed
    all_chunk_ids = []
    for m in messages:
        if m.get("retrieved_chunk_ids"):
            all_chunk_ids.extend(m["retrieved_chunk_ids"])

    chunk_map = {}
    if all_chunk_ids:
        chunks_resp = supabase.table("document_chunks").select("id, document_id, content, source_page, documents(title)").in_("id", list(set(all_chunk_ids))).execute()
        for c in (chunks_resp.data or []):
            chunk_map[c["id"]] = {
                "id": c["id"],
                "document_title": (c.get("documents") or {}).get("title", "Document"),
                "content": c.get("content", ""),
                "source_page": c.get("source_page")
            }

    # Enrich messages with citation details and A2UI payload
    import re, json
    enriched_messages = []
    for m in messages:
        citations = []
        for cid in (m.get("retrieved_chunk_ids") or []):
            if cid in chunk_map:
                citations.append(chunk_map[cid])
        m_copy = dict(m)
        m_copy["citations"] = citations

        # Parse A2UI if contained in content
        a2ui_payload = None
        content = m.get("content", "")
        a2ui_match = re.search(r"```a2ui\s*([\s\S]*?)\s*```", content)
        if a2ui_match:
            try:
                a2ui_payload = json.loads(a2ui_match.group(1).strip(), strict=False)
            except Exception:
                pass
        if not a2ui_payload:
            mermaid_match = re.search(r"```mermaid\s*([\s\S]*?)\s*```", content)
            if mermaid_match:
                a2ui_payload = {
                    "type": "mermaid",
                    "title": "Process Flowchart",
                    "definition": mermaid_match.group(1).strip()
                }
        m_copy["a2ui_payload"] = a2ui_payload
        enriched_messages.append(m_copy)

    return {"messages": enriched_messages}

@router.post("/sessions/{chat_id}/messages")
async def send_message(
    chat_id: str,
    payload: Dict[str, str] = Body(...),
    user: dict = Depends(get_current_user)
):
    """
    Sends a message, invokes the LangGraph state machine,
    and returns Gemini's grounded response with citations.
    """
    content = payload.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    workspace_id = user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="No active workspace found.")

    supabase = get_admin_client()

    # 1. Save User Message
    supabase.table("chat_messages").insert({
        "chat_id": chat_id,
        "workspace_id": workspace_id,
        "role": "user",
        "content": content
    }).execute()

    # 2. Retrieve past messages for conversation context
    history_resp = supabase.table("chat_messages").select("role, content").eq("chat_id", chat_id).order("created_at", desc=False).limit(15).execute()
    history = [
        {"role": h["role"], "content": h["content"]}
        for h in (history_resp.data or [])
        if h["content"] != content
    ]

    # 3. Execute LangGraph RAG Workflow
    initial_state = {
        "chat_id": chat_id,
        "workspace_id": workspace_id,
        "user_id": user["id"],
        "query": content,
        "chat_history": history
    }

    try:
        final_state = rag_graph.invoke(initial_state)

        return {
            "success": True,
            "response": final_state.get("response_text", ""),
            "citations": final_state.get("filtered_chunks") if final_state.get("filtered_chunks") is not None else final_state.get("retrieved_chunks", []),
            "follow_up_questions": final_state.get("follow_up_questions", []),
            "a2ui_payload": final_state.get("a2ui_payload"),
            "crag_status": final_state.get("crag_status")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LangGraph execution error: {str(e)}")
