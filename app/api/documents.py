import re
import uuid
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from app.api.auth import get_current_user
from app.core.supabase import get_admin_client
from app.services.ingestion import process_document

router = APIRouter(prefix="/api/documents", tags=["Documents"])

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB

EXTENSION_MIME_MAP = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".csv": "text/csv",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".json": "application/json",
    ".html": "text/html",
    ".htm": "text/html",
}

@router.get("")
async def list_documents(user: dict = Depends(get_current_user)):
    """
    Lists all documents belonging to the user's active workspace with chunk metrics.
    """
    workspace_id = user.get("workspace_id")
    if not workspace_id:
        return {"documents": []}

    supabase = get_admin_client()
    resp = supabase.table("documents").select("*").eq("workspace_id", workspace_id).order("created_at", desc=True).execute()
    docs = resp.data or []

    if docs:
        doc_ids = [d["id"] for d in docs if d.get("id")]
        # Count chunks per document in this workspace
        try:
            chunks_resp = supabase.table("document_chunks").select("document_id").in_("document_id", doc_ids).execute()
            from collections import Counter
            chunk_counts = Counter(r["document_id"] for r in (chunks_resp.data or []))
        except Exception:
            chunk_counts = {}

        for doc in docs:
            title = doc.get("title") or ""
            ext = title.rsplit(".", 1)[-1].lower() if "." in title else "file"
            doc["file_type"] = ext
            doc["total_chunks"] = chunk_counts.get(doc["id"], 0)

    return {"documents": docs}

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Uploads a document (PDF, DOCX, XLSX, PPTX, CSV, TXT, MD, JSON, HTML) up to 15MB,
    writes to Supabase Storage, creates a document record, and triggers background vector processing.
    """
    workspace_id = user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="No active workspace found for user.")

    # Read and validate file size
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="File cannot be empty.")
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 15MB limit.")

    # Detect extension and resolve mime type
    fn_lower = file.filename.lower()
    matched_ext = next((ext for ext in EXTENSION_MIME_MAP if fn_lower.endswith(ext)), None)

    if not matched_ext:
        raise HTTPException(
            status_code=400,
            detail="Unsupported format. Accepted: PDF, DOCX, XLSX, PPTX, CSV, TXT, MD, JSON, HTML."
        )

    content_type = file.content_type or EXTENSION_MIME_MAP[matched_ext]

    document_id = str(uuid.uuid4())
    clean_filename = re.sub(r"[^a-zA-Z0-9.-]", "_", file.filename)
    storage_path = f"workspaces/{workspace_id}/documents/{document_id}/{clean_filename}"

    supabase = get_admin_client()

    try:
        # 1. Upload to Supabase Storage
        supabase.storage.from_("documents").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "true"}
        )

        # 2. Insert into database
        supabase.table("documents").insert({
            "id": document_id,
            "workspace_id": workspace_id,
            "uploaded_by": user["id"],
            "title": file.filename,
            "file_path": storage_path,
            "mime_type": content_type,
            "status": "uploaded"
        }).execute()

        # 3. Log usage event
        supabase.table("usage_events").insert({
            "workspace_id": workspace_id,
            "user_id": user["id"],
            "event_type": "document_uploaded",
            "quantity": 1,
            "metadata": {"filename": file.filename, "size": len(file_bytes)}
        }).execute()

        # 4. Enqueue background ingestion worker
        background_tasks.add_task(process_document, document_id)

        return {"success": True, "document_id": document_id, "title": file.filename}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process upload: {str(e)}")

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Deletes a document, removing its file from Storage and cascading chunks in DB.
    """
    workspace_id = user.get("workspace_id")
    supabase = get_admin_client()

    # Verify ownership
    doc_resp = supabase.table("documents").select("workspace_id, file_path").eq("id", document_id).single().execute()
    document = doc_resp.data
    if not document or document.get("workspace_id") != workspace_id:
        raise HTTPException(status_code=404, detail="Document not found or unauthorized.")

    try:
        # Delete from storage
        if document.get("file_path"):
            supabase.storage.from_("documents").remove([document["file_path"]])

        # Delete from database (cascades to document_chunks)
        supabase.table("documents").delete().eq("id", document_id).execute()

        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")
