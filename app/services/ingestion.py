import io
import re
from typing import Optional
from pypdf import PdfReader
from app.core.supabase import get_admin_client
from app.services.chunker import chunk_text
from app.services.embeddings import generate_embeddings

def extract_text_from_bytes(file_bytes: bytes, mime_type: str, filename: str = "") -> str:
    """
    Extracts structured raw text from PDF, DOCX, XLSX, PPTX, CSV, JSON, and text/markdown files.
    """
    fn_lower = filename.lower()

    # 1. PDF Documents
    if mime_type == "application/pdf" or fn_lower.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(file_bytes))
        extracted_pages = []
        for page_idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                extracted_pages.append(f"--- Page {page_idx + 1} ---\n{page_text}")
        raw_text = "\n\n".join(extracted_pages)

    # 2. Microsoft Word Documents (.docx)
    elif "wordprocessingml" in mime_type or fn_lower.endswith(".docx"):
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        paragraphs = []
        for p in doc.paragraphs:
            if p.text.strip():
                paragraphs.append(p.text.strip())
        # Also extract table text
        for table in doc.tables:
            table_rows = []
            for row in table.rows:
                row_cells = [cell.text.strip().replace("\n", " ") for cell in row.cells if cell.text.strip()]
                if row_cells:
                    table_rows.append(" | ".join(row_cells))
            if table_rows:
                paragraphs.append("\n".join(table_rows))
        raw_text = "\n\n".join(paragraphs)

    # 3. Excel Spreadsheets (.xlsx, .xls)
    elif "spreadsheetml" in mime_type or "excel" in mime_type or fn_lower.endswith((".xlsx", ".xls")):
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        sheets_text = []
        for sheetname in wb.sheetnames:
            ws = wb[sheetname]
            sheet_rows = []
            for row in ws.iter_rows(values_only=True):
                # Filter out all-None rows
                non_empty = [str(cell).strip() for cell in row if cell is not None and str(cell).strip()]
                if non_empty:
                    sheet_rows.append(" | ".join(non_empty))
            if sheet_rows:
                sheets_text.append(f"--- Sheet: {sheetname} ---\n" + "\n".join(sheet_rows))
        raw_text = "\n\n".join(sheets_text)

    # 4. PowerPoint Presentations (.pptx)
    elif "presentationml" in mime_type or fn_lower.endswith(".pptx"):
        import pptx
        prs = pptx.Presentation(io.BytesIO(file_bytes))
        slides_text = []
        for s_idx, slide in enumerate(prs.slides, 1):
            slide_parts = []
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    slide_parts.append(shape.text.strip())
            if slide_parts:
                slides_text.append(f"--- Slide {s_idx} ---\n" + "\n".join(slide_parts))
        raw_text = "\n\n".join(slides_text)

    # 5. CSV Files
    elif mime_type == "text/csv" or fn_lower.endswith(".csv"):
        import csv
        decoded = file_bytes.decode("utf-8", errors="replace")
        csv_reader = csv.reader(io.StringIO(decoded))
        rows = [" | ".join(row) for row in csv_reader if any(cell.strip() for cell in row)]
        raw_text = "\n".join(rows)

    # 6. JSON Data Files
    elif mime_type == "application/json" or fn_lower.endswith(".json"):
        import json
        decoded = file_bytes.decode("utf-8", errors="replace")
        try:
            parsed = json.loads(decoded)
            raw_text = json.dumps(parsed, indent=2)
        except Exception:
            raw_text = decoded

    # 7. HTML Files
    elif "html" in mime_type or fn_lower.endswith((".html", ".htm")):
        decoded = file_bytes.decode("utf-8", errors="replace")
        # Strip script/style and HTML tags
        clean_html = re.sub(r"<(script|style).*?</\1>", "", decoded, flags=re.DOTALL)
        clean_html = re.sub(r"<[^>]+>", " ", clean_html)
        raw_text = clean_html

    # 8. Plain Text & Markdown Fallback
    else:
        raw_text = file_bytes.decode("utf-8", errors="replace")

    # Normalize whitespace, CRLF, and multiple empty spaces
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

        # 4. Extract raw text with multi-format support
        extracted_text = extract_text_from_bytes(
            download_resp,
            document.get("mime_type", ""),
            filename=document.get("title", "")
        )
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
