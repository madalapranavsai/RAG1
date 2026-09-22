import re
from typing import List, Dict, Any, TypedDict
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.core.supabase import get_admin_client
from app.services.embeddings import generate_embedding
from app.services.llm import get_gemini_llm

class RAGState(TypedDict, total=False):
    chat_id: str
    workspace_id: str
    user_id: str
    query: str
    chat_history: List[Dict[str, str]]
    retrieved_chunks: List[Dict[str, Any]]
    retrieved_chunk_ids: List[str]
    context_text: str
    response_text: str
    follow_up_questions: List[str]
    prompt_tokens: int
    completion_tokens: int

def retrieve_node(state: RAGState) -> Dict[str, Any]:
    """
    Node: Generates query embedding and runs similarity search
    scoped strictly to the user's active workspace.
    """
    query = state.get("query", "").strip()
    workspace_id = state.get("workspace_id")
    supabase = get_admin_client()

    if not query or not workspace_id:
        return {"retrieved_chunks": [], "retrieved_chunk_ids": []}

    query_embedding = generate_embedding(query)

    # Call match_chunks RPC
    rpc_resp = supabase.rpc("match_chunks", {
        "query_embedding": query_embedding,
        "match_threshold": 0.15,
        "match_count": 4,
        "filter_workspace_id": workspace_id
    }).execute()

    matches = rpc_resp.data or []
    if not matches:
        return {"retrieved_chunks": [], "retrieved_chunk_ids": []}

    # Fetch document titles
    doc_ids = list(set(m["document_id"] for m in matches if "document_id" in m))
    title_map = {}
    if doc_ids:
        docs_resp = supabase.table("documents").select("id, title").in_("id", doc_ids).execute()
        if docs_resp.data:
            title_map = {d["id"]: d["title"] for d in docs_resp.data}

    retrieved = []
    chunk_ids = []
    for m in matches:
        chunk_id = m.get("id")
        if chunk_id:
            chunk_ids.append(chunk_id)
        retrieved.append({
            "id": chunk_id,
            "document_id": m.get("document_id"),
            "document_title": title_map.get(m.get("document_id"), "Unknown Document"),
            "content": m.get("content", ""),
            "source_page": m.get("source_page"),
            "similarity": m.get("similarity", 0.0)
        })

    return {
        "retrieved_chunks": retrieved,
        "retrieved_chunk_ids": chunk_ids
    }

def format_context_node(state: RAGState) -> Dict[str, Any]:
    """
    Node: Assembles retrieved chunks into a clean context block.
    """
    chunks = state.get("retrieved_chunks", [])
    if not chunks:
        context_text = "No relevant workspace documents found."
    else:
        parts = []
        for idx, chunk in enumerate(chunks, 1):
            title = chunk.get("document_title", "Document")
            page = f" (Page {chunk['source_page']})" if chunk.get("source_page") else ""
            parts.append(f"--- CONTEXT PART {idx} [File: {title}{page}] ---\n{chunk.get('content', '')}")
        context_text = "\n\n".join(parts)

    return {"context_text": context_text}

def generate_node(state: RAGState) -> Dict[str, Any]:
    """
    Node: Calls Google Gemini with the grounded system prompt and chat history.
    """
    context_text = state.get("context_text", "No relevant workspace documents found.")
    query = state.get("query", "")
    history = state.get("chat_history", [])

    a2ui_instructions = """
If the answer naturally contains numerical metrics, structured data comparisons, workflow diagrams, process steps, or timelines, you MAY optionally include an interactive UI component block in your answer using the following exact format:
```a2ui
{
  "type": "metric_card" | "table" | "bar_chart" | "line_chart" | "mermaid" | "timeline",
  "title": "Descriptive Widget Title",
  "metrics": [{"label": "Name", "value": "123", "change": "+5%", "trend": "up"}], // for metric_card
  "headers": ["Col 1", "Col 2"], "rows": [["Val 1", "Val 2"]], // for table
  "labels": ["Jan", "Feb"], "datasets": [{"label": "Series", "data": [10, 20]}], // for charts
  "definition": "graph TD\\n  A-->B", // for mermaid
  "events": [{"date": "2026", "title": "Event", "description": "Details"}] // for timeline
}
```
Only output valid JSON within the ```a2ui block. Provide standard markdown explanation text along with the widget.
"""

    system_prompt = f"""You are DocuMind RAG, a professional AI workspace document assistant powered by Google Gemini.
You must answer questions strictly based on the provided Workspace Document Context.
If the context does not contain sufficient information to answer the question, state that you do not know based on the uploaded workspace documents. Do not make up answers.

Workspace Document Context:
{context_text}
{a2ui_instructions}
At the very end of your response, on a new line, add exactly two concise suggested follow-up questions that the user might want to ask next based on this conversation. Format it exactly as:
Follow-up Questions:
1. [First Question]
2. [Second Question]
"""

    messages = [SystemMessage(content=system_prompt)]
    for msg in history:
        role = msg.get("role")
        content = msg.get("content", "")
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=query))

    llm = get_gemini_llm()
    ai_response = llm.invoke(messages)
    content = ai_response.content if hasattr(ai_response, "content") else str(ai_response)

    # Extract follow-up questions if formatted
    follow_ups = []
    follow_up_match = re.search(r"Follow-up Questions:\s*\n1\.\s*(.+?)\n2\.\s*(.+)", content, re.DOTALL)
    if follow_up_match:
        q1 = follow_up_match.group(1).strip()
        q2 = follow_up_match.group(2).strip()
        q2 = q2.split("\n")[0].strip()
        follow_ups = [q1, q2]

    # Extract A2UI payload if present
    import json
    a2ui_payload = None
    a2ui_match = re.search(r"```a2ui\s*([\s\S]*?)\s*```", content)
    if a2ui_match:
        try:
            a2ui_payload = json.loads(a2ui_match.group(1).strip())
        except Exception:
            pass

    # Usage metadata
    metadata = getattr(ai_response, "response_metadata", {})
    usage = metadata.get("usage_metadata", {})
    prompt_tokens = usage.get("prompt_token_count", len(system_prompt.split()) + len(query.split()))
    completion_tokens = usage.get("candidates_token_count", len(content.split()))

    return {
        "response_text": content,
        "follow_up_questions": follow_ups,
        "a2ui_payload": a2ui_payload,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens
    }

def track_and_save_node(state: RAGState) -> Dict[str, Any]:
    """
    Node: Persists the AI response message and usage events to Supabase.
    """
    chat_id = state.get("chat_id")
    workspace_id = state.get("workspace_id")
    response_text = state.get("response_text", "")
    chunk_ids = state.get("retrieved_chunk_ids", [])
    prompt_tokens = state.get("prompt_tokens", 0)
    completion_tokens = state.get("completion_tokens", 0)

    if not chat_id or not workspace_id:
        return {}

    supabase = get_admin_client()

    # Save Assistant Message
    supabase.table("chat_messages").insert({
        "chat_id": chat_id,
        "workspace_id": workspace_id,
        "role": "assistant",
        "content": response_text,
        "retrieved_chunk_ids": chunk_ids
    }).execute()

    # Update chat title if it is still 'New Chat'
    chat_resp = supabase.table("chats").select("title").eq("id", chat_id).single().execute()
    if chat_resp.data and chat_resp.data.get("title") == "New Chat":
        query = state.get("query", "")
        title = (query[:37] + "...") if len(query) > 40 else query
        supabase.table("chats").update({"title": title}).eq("id", chat_id).execute()

    # Log usage tokens
    if prompt_tokens > 0 or completion_tokens > 0:
        events = []
        if prompt_tokens > 0:
            events.append({
                "workspace_id": workspace_id,
                "event_type": "token_used",
                "quantity": prompt_tokens,
                "metadata": {"type": "prompt", "chat_id": chat_id, "model": "gemini"}
            })
        if completion_tokens > 0:
            events.append({
                "workspace_id": workspace_id,
                "event_type": "token_used",
                "quantity": completion_tokens,
                "metadata": {"type": "completion", "chat_id": chat_id, "model": "gemini"}
            })
        supabase.table("usage_events").insert(events).execute()

    return {}

def create_rag_graph():
    """
    Builds and compiles the LangGraph StateGraph workflow for RAG.
    """
    builder = StateGraph(RAGState)

    builder.add_node("retrieve", retrieve_node)
    builder.add_node("format_context", format_context_node)
    builder.add_node("generate", generate_node)
    builder.add_node("track_and_save", track_and_save_node)

    builder.set_entry_point("retrieve")
    builder.add_edge("retrieve", "format_context")
    builder.add_edge("format_context", "generate")
    builder.add_edge("generate", "track_and_save")
    builder.add_edge("track_and_save", END)

    return builder.compile()

# Global compiled graph instance
rag_graph = create_rag_graph()
