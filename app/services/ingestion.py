import io
import re
from typing import Optional
from pypdf import PdfReader
from app.core.supabase import get_admin_client
from app.services.chunker import chunk_text
from app.services.embeddings import generate_embeddings

def extract_text_from_bytes(file_bytes: bytes, mime_type: str) -> str:
    """
    Extracts raw text content from raw bytes depending on the mime type.
    """
    if mime_type == "application/pdf":
        reader = PdfReader(io.BytesIO(file_bytes))
        extracted_pages = []
        for page_idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                extracted_pages.append(page_text)
        raw_text = "\n\n".join(extracted_pages)
    else:
        # Text or Markdown files
        raw_text = file_bytes.decode("utf-8", errors="replace")

    # Normalize whitespace, CRLF, and empty spaces
    raw_text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    raw_text = re.sub(r"[ \t]+", " ", raw_text).strip()
    return raw_text

def process_document(document_id: str):
    """
    Synchronous / background worker function to download an uploaded file,
    extract text, split into overlapping semantic chunks, embed them,
    and persist them into Postgres pgvector.
    """
    supabase = get_admin_client()

    try:
        # 1. Update status to 'processing'
        supabase.table("documents").update({
            "status": "processing",
            "error_message": None
        }).eq("id", document_id).execute()

        # 2. Retrieve document record
        doc_resp = supabase.table("documents").select("*").eq("id", document_id).single().execute()
        document = doc_resp.data
        if not document:
            raise ValueError(f"Document with ID {document_id} not found.")

        # 3. Download file from Supabase Storage
        file_path = document["file_path"]
        download_resp = supabase.storage.from_("documents").download(file_path)
        if not download_resp:
            raise ValueError(f"Failed to download file from storage path: {file_path}")

        # 4. Extract raw text
        extracted_text = extract_text_from_bytes(download_resp, document.get("mime_type", ""))
        if not extracted_text:
            raise ValueError("No readable text could be extracted from the uploaded document.")

        # 5. Chunk text
        chunks = chunk_text(extracted_text, chunk_size=3000, chunk_overlap=500)
        if not chunks:
            raise ValueError("Document chunking produced 0 segments.")

        # 6. Generate vector embeddings
        chunk_contents = [c["content"] for c in chunks]
        embeddings = generate_embeddings(chunk_contents)

        # 7. Bulk insert chunks into Postgres
        chunk_rows = []
        for idx, chunk in enumerate(chunks):
            chunk_rows.append({
                "workspace_id": document["workspace_id"],
                "document_id": document["id"],
                "chunk_index": chunk["chunk_index"],
                "content": chunk["content"],
                "embedding": embeddings[idx]
            })

        # Insert in batches of 50 to prevent payload limits
        batch_size = 50
        for i in range(0, len(chunk_rows), batch_size):
            batch = chunk_rows[i:i + batch_size]
            supabase.table("document_chunks").insert(batch).execute()

        # 8. Mark document ready
        supabase.table("documents").update({
            "status": "ready"
        }).eq("id", document_id).execute()

        # 9. Record usage events
        supabase.table("usage_events").insert([
            {
                "workspace_id": document["workspace_id"],
                "event_type": "chunk_created",
                "quantity": len(chunks),
                "metadata": {"document_id": document_id}
            },
            {
                "workspace_id": document["workspace_id"],
                "event_type": "embedding_generated",
                "quantity": len(chunks),
                "metadata": {"document_id": document_id}
            }
        ]).execute()

        print(f"[Ingestion] Successfully processed document {document_id} ({len(chunks)} chunks).")

    except Exception as e:
        print(f"[Ingestion] Failed to process document {document_id}: {e}")
        supabase.table("documents").update({
            "status": "failed",
            "error_message": str(e) or "An unexpected processing error occurred."
        }).eq("id", document_id).execute()
