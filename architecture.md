# Architecture

## Overview

The system is a full-stack RAG SaaS application. Users upload documents into a workspace. The backend extracts text, chunks it, creates embeddings, and stores those chunks in Postgres with `pgvector`. When a user asks a question, the system retrieves relevant chunks from that user's workspace and sends them to an LLM to produce a grounded answer with citations. An optional A2UI layer converts parts of the response into validated interactive UI components.

## Recommended Free-First Stack

- Backend & Web App: Python 3.12 with FastAPI and Jinja2
- Styling: Tailwind CSS
- RAG Orchestration: LangGraph (`StateGraph`) + LangChain Core
- LLM Engine: Google Gemini (`gemini-1.5-flash` / `gemini-2.0-flash`) via `langchain-google-genai`
- Embeddings: FastEmbed in-process local execution (`sentence-transformers/all-MiniLM-L6-v2`, 384 dim)
- Ingestion & Parsing: PyPDF + LangChain `RecursiveCharacterTextSplitter`
- Auth: Supabase Auth
- Database & Vector storage: Supabase Postgres with `pgvector`
- File storage: Supabase Storage
- Deployment: Dockerized app on Render, Hugging Face Spaces, Koyeb, or a VPS (100% Free Tiers)
- Repository: GitHub

## High-Level Flow

```text
User
  -> FastAPI Full-stack App
  -> Supabase Auth
  -> Upload File (PDF/TXT/MD)
  -> Supabase Storage
  -> Document Metadata in Postgres
  -> Background Processing Task
  -> PyPDF Text Extraction
  -> LangChain Text Chunking
  -> FastEmbed Local Embedding Generation
  -> document_chunks table with pgvector
  -> Ask Question
  -> Query Embedding
  -> Workspace-Scoped Vector Search (match_chunks RPC)
  -> LangGraph StateGraph Execution
  -> Google Gemini Answer Generation
  -> Answer + Citations + 2 Follow-Up Questions
  -> Responsive UI / Markdown Rendering
```

## Main Modules

### Web App

Responsible for:

- Signup and login.
- Workspace dashboard.
- Document upload.
- Document processing status.
- Chat interface.
- Citation display.
- A2UI component rendering for source cards and suggested follow-ups.
- Usage dashboard.

### API Layer

Responsible for:

- Validating authenticated requests.
- Enforcing workspace access.
- Creating document records.
- Triggering processing jobs.
- Running retrieval.
- Calling embedding and LLM providers.

### Processing Pipeline

Responsible for:

- Downloading uploaded files from storage.
- Extracting text.
- Splitting text into chunks.
- Generating chunk embeddings.
- Saving chunks and embeddings.
- Updating document processing status.

### Retrieval Pipeline

Responsible for:

- Embedding the user question.
- Running vector similarity search.
- Filtering by workspace ID.
- Returning top chunks with metadata.
- Preparing context for answer generation.

### Generation Pipeline

Responsible for:

- Building a prompt from the user question and retrieved chunks.
- Instructing the model to answer only from provided context.
- Asking the model to cite source chunk IDs.
- Asking the model to return optional structured UI metadata.
- Validating UI metadata against an allowed schema.
- Saving chat history and retrieved references.

### A2UI Rendering Layer

Responsible for:

- Receiving validated UI payloads from the API.
- Rendering known component types only.
- Displaying citation cards, source previews, suggested prompts, filters, and comparison tables.
- Rejecting unknown component types or unsupported actions.
- Keeping sensitive actions behind explicit user confirmation.

## Database Schema

### profiles

- `id uuid primary key`
- `user_id uuid unique not null`
- `email text`
- `created_at timestamptz default now()`

### workspaces

- `id uuid primary key`
- `name text not null`
- `owner_id uuid not null`
- `created_at timestamptz default now()`

### workspace_members

- `id uuid primary key`
- `workspace_id uuid not null`
- `user_id uuid not null`
- `role text not null`
- `created_at timestamptz default now()`

Roles:

- `owner`
- `member`

### documents

- `id uuid primary key`
- `workspace_id uuid not null`
- `uploaded_by uuid not null`
- `title text not null`
- `file_path text`
- `mime_type text`
- `status text not null`
- `error_message text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Statuses:

- `uploaded`
- `processing`
- `ready`
- `failed`

### document_chunks

- `id uuid primary key`
- `workspace_id uuid not null`
- `document_id uuid not null`
- `chunk_index int not null`
- `content text not null`
- `source_page int`
- `source_label text`
- `embedding vector(1536)`
- `metadata jsonb default '{}'`
- `created_at timestamptz default now()`

For open-source embedding models, change the vector dimension to match the model.

### chats

- `id uuid primary key`
- `workspace_id uuid not null`
- `user_id uuid not null`
- `title text`
- `created_at timestamptz default now()`

### chat_messages

- `id uuid primary key`
- `chat_id uuid not null`
- `workspace_id uuid not null`
- `role text not null`
- `content text not null`
- `retrieved_chunk_ids uuid[]`
- `ui_payload jsonb`
- `created_at timestamptz default now()`

Roles:

- `user`
- `assistant`
- `system`

### usage_events

- `id uuid primary key`
- `workspace_id uuid not null`
- `user_id uuid`
- `event_type text not null`
- `quantity int default 1`
- `metadata jsonb default '{}'`
- `created_at timestamptz default now()`

Event examples:

- `document_uploaded`
- `chunk_created`
- `question_asked`
- `embedding_generated`
- `answer_generated`

## Indexes

Recommended indexes:

```sql
create index documents_workspace_id_idx on documents(workspace_id);
create index document_chunks_workspace_id_idx on document_chunks(workspace_id);
create index document_chunks_document_id_idx on document_chunks(document_id);
create index chat_messages_chat_id_idx on chat_messages(chat_id);
```

Vector index for cosine distance:

```sql
create index document_chunks_embedding_hnsw_idx
on document_chunks
using hnsw (embedding vector_cosine_ops);
```

## Security Model

- Every tenant-owned table includes `workspace_id`.
- Enable Row Level Security on all public tables.
- Users can only select rows where they are a member of the workspace.
- Uploads are stored under workspace-scoped paths.
- Server-side routes use service role keys only on the backend.
- Never expose the Supabase service role key to the browser.

## RAG Prompt Contract

The model should receive:

- System instructions.
- User question.
- Retrieved context chunks.
- Citation metadata.

Core instruction:

```text
Answer using only the provided context. If the context does not contain the answer, say that the answer was not found in the uploaded documents. Cite the source chunk labels used in your answer.
```

## A2UI Schema Contract

The LLM may return optional UI metadata, but the backend must validate it before saving or rendering.

Allowed top-level shape:

```json
{
  "components": [
    {
      "type": "citation_cards",
      "items": []
    }
  ],
  "actions": []
}
```

Allowed component types:

- `citation_cards`
- `source_preview`
- `suggested_prompts`
- `document_filters`
- `comparison_table`

Allowed action types:

- `suggested_prompt`
- `apply_filter`
- `open_source`

Disallowed:

- Arbitrary HTML
- Arbitrary JavaScript
- Hidden destructive actions
- Cross-workspace document references
- Direct database mutations

Example payload:

```json
{
  "components": [
    {
      "type": "citation_cards",
      "items": [
        {
          "document_id": "doc_123",
          "chunk_id": "chunk_456",
          "title": "Refund Policy.pdf",
          "page": 2,
          "snippet": "Cancellation is allowed within 7 days."
        }
      ]
    },
    {
      "type": "suggested_prompts",
      "items": [
        {
          "label": "Ask about exceptions",
          "prompt": "What are the exceptions to this policy?"
        }
      ]
    }
  ],
  "actions": []
}
```

## Deployment Architecture

### MVP

- A Docker-compatible host runs the Next.js app container.
- Supabase hosts auth, database, storage, and vector search.
- Processing can run in API routes for small files.

### More Robust Version

- A Dockerized app service hosts frontend and lightweight APIs.
- A worker service handles ingestion.
- A queue stores processing jobs.
- Object storage keeps original files.
- Postgres stores extracted chunks, embeddings, and app data.

## Scaling Notes

- Move processing out of serverless routes when PDFs become large.
- Add hybrid search when semantic search misses exact terms.
- Add per-workspace quotas before public launch.
- Keep A2UI schema small and explicit until the core product is stable.
- Consider Qdrant, Pinecone, or Weaviate only after Postgres vector search becomes a bottleneck.
