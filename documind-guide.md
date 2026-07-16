# DocuMind Workspace Manual

Welcome to DocuMind, your high-performance multi-tenant RAG (Retrieval-Augmented Generation) document assistant. This guide details the features, configurations, and operations of the platform.

---

## 1. Platform Overview
DocuMind lets you upload documents (PDF, TXT, MD), index them using vector embeddings, and execute highly precise contextual searches over them.

### Features
- **Multi-Tenant Isolation**: Your files and chats are strictly mapped to your Active Workspace. RLS policies prevent leaks across tenants.
- **Local Vectors Ingestion**: Chunks are processed and embedded on-the-fly using Node-cached local ONNX neural network features.
- **Unified Chat Base**: Open interactive chat threads to query knowledge directly with LLM synthesis models.

---

## 2. Technical Specifications

### Document Upload Limits
- **Max File Size**: 2 Megabytes (2,000,000 bytes) per upload.
- **Supported Formats**:
  1. Portable Document Format (`application/pdf`)
  2. Plain Text (`text/plain`)
  3. Markdown (`text/markdown`)

### Semantic Text Chunker
- **Chunk Size**: Target length is 3,000 characters.
- **Chunk Overlap**: Carry-over context window is 500 characters.
- **Split Boundaries**: Chunks are partitioned strictly along sentence endings, newline breaks, or spaces to prevent word slicing.

### Vectors & Embeddings
- **Local Model**: Hugging Face `all-MiniLM-L6-v2` via Transformers.js.
- **Dimensions**: 384 floating-point dimensions.
- **Database Index**: pgvector HNSW cosine similarity indices.
- **API Model Support**: Optional fallback configuration to OpenAI `text-embedding-3-small` (1536 dimensions).

---

## 3. Storage and Data Safety

### supabase Storage Paths
All uploaded files are written to the private `documents` bucket under:
`workspaces/[Workspace_UUID]/documents/[Document_UUID]/[filename]`

### Postgres RLS Policies
Active Row Level Security (RLS) restricts access strictly:
1. `workspace_members`: Can only query documents and chunks matching their active workspace membership.
2. `storage.objects`: Uploads and downloads are permitted only if the user belongs to the workspace ID specified in the path prefix.
3. `chats` and `messages`: Access scoped strictly to the session creator.

---

## 4. Usage Tiers
DocuMind Sandbox Plan applies the following default capacities:
- **Maximum Uploads**: 10 documents
- **Maximum Chunks**: 500 segments
- **Maximum Tokens**: 100,000 billing tokens
- **Event Logging**: All ingestion and completion events write direct telemetry rows into the database for billing audit checks.
