from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Body
from app.api.auth import get_current_user
from app.core.supabase import get_admin_client
from app.services.embeddings import generate_embedding

router = APIRouter(prefix="/api/retrieval", tags=["Retrieval"])

@router.post("/sandbox")
async def test_retrieval(
    payload: Dict[str, str] = Body(...),
    user: dict = Depends(get_current_user)
):
    """
    Directly tests vector similarity search over workspace chunks.
    Used by the Retrieval Sandbox UI.
    """
    query = payload.get("query", "").strip()
    if not query:
        return {"chunks": []}

    workspace_id = user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="No active workspace found.")

    supabase = get_admin_client()

    # 1. Generate query embedding
    query_embedding = generate_embedding(query)

    # 2. Call match_chunks RPC
    rpc_resp = supabase.rpc("match_chunks", {
        "query_embedding": query_embedding,
        "match_threshold": 0.15,
        "match_count": 5,
        "filter_workspace_id": workspace_id
    }).execute()

    matches = rpc_resp.data or []
    if not matches:
        return {"chunks": []}

    # 3. Retrieve document titles
    doc_ids = list(set(m["document_id"] for m in matches if "document_id" in m))
    title_map = {}
    if doc_ids:
        docs_resp = supabase.table("documents").select("id, title").in_("id", doc_ids).execute()
        if docs_resp.data:
            title_map = {d["id"]: d["title"] for d in docs_resp.data}

    # 4. Format chunks
    chunks = []
    for m in matches:
        chunks.append({
            "id": m.get("id"),
            "document_id": m.get("document_id"),
            "document_title": title_map.get(m.get("document_id"), "Unknown Document"),
            "content": m.get("content", ""),
            "source_page": m.get("source_page"),
            "similarity": m.get("similarity", 0.0)
        })

    return {"chunks": chunks}
