from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import get_current_user
from app.core.supabase import get_admin_client

router = APIRouter(prefix="/api/usage", tags=["Usage"])

# Free tier Sandbox limits
MAX_DOCUMENTS = 10
MAX_CHUNKS = 500
MAX_TOKENS = 100000

@router.get("")
async def get_usage_metrics(user: dict = Depends(get_current_user)):
    """
    Returns workspace capacity utilization and recent event logs.
    """
    workspace_id = user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="No active workspace found.")

    supabase = get_admin_client()

    # 1. Total documents count
    docs_resp = supabase.table("documents").select("id", count="exact").eq("workspace_id", workspace_id).execute()
    document_count = docs_resp.count or len(docs_resp.data or [])

    # 2. Total chunks count
    chunks_resp = supabase.table("document_chunks").select("id", count="exact").eq("workspace_id", workspace_id).execute()
    chunk_count = chunks_resp.count or len(chunks_resp.data or [])

    # 3. Aggregate token usage from usage_events
    events_resp = supabase.table("usage_events").select("*").eq("workspace_id", workspace_id).order("created_at", desc=True).limit(50).execute()
    events = events_resp.data or []

    tokens_used = sum(e["quantity"] for e in events if e.get("event_type") == "token_used")

    return {
        "metrics": {
            "documents": {
                "used": document_count,
                "limit": MAX_DOCUMENTS,
                "percentage": min(100, int((document_count / MAX_DOCUMENTS) * 100))
            },
            "chunks": {
                "used": chunk_count,
                "limit": MAX_CHUNKS,
                "percentage": min(100, int((chunk_count / MAX_CHUNKS) * 100))
            },
            "tokens": {
                "used": tokens_used,
                "limit": MAX_TOKENS,
                "percentage": min(100, int((tokens_used / MAX_TOKENS) * 100))
            }
        },
        "recent_events": events
    }
