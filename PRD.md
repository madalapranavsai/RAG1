# Product Requirements Document

## Product Name

DocuMind RAG SaaS

## Summary

DocuMind is a multi-tenant RAG SaaS application that lets users upload documents, ask questions over their private knowledge base, and receive citation-backed answers. The project is designed as a resume-ready SaaS product that demonstrates authentication, file ingestion, vector search, retrieval-augmented generation, access control, usage tracking, and an optional Agent-to-UI layer for interactive AI responses.

## Target Users

- Students and professionals who want to query notes, resumes, reports, or PDFs.
- Small teams that need a private document Q&A assistant.
- Recruiters or reviewers evaluating the builder's full-stack AI product skills.

## Problem

Users often store useful information across PDFs, notes, and text files but cannot quickly retrieve exact answers from them. Generic chatbots cannot reliably answer questions about private documents without a retrieval pipeline.

## Goals

- Allow users to sign up, create a workspace, and upload documents.
- Extract text from uploaded files and split it into searchable chunks.
- Generate embeddings for each chunk and store them in a vector database.
- Let users ask questions and receive answers grounded in retrieved chunks.
- Show citations so users can inspect the source text.
- Enforce tenant isolation so users can only query their own workspace data.
- Track usage for documents, chunks, queries, and model calls.
- Optionally render structured A2UI components such as citation cards, suggested follow-ups, filters, and source previews.

## Non-Goals

- Enterprise SSO in the first version.
- Real-time collaborative document editing.
- Fine-tuning custom models.
- Complex permission hierarchies beyond workspace membership.
- Support for every file format in the MVP.

## Core Features

### Authentication

- Email/password authentication.
- Protected dashboard routes.
- User profile record created on signup.

### Workspace Management

- Each user belongs to at least one workspace.
- Documents, chunks, chats, and usage records belong to a workspace.
- Workspace ID must be included in all protected database records.

### Document Upload

- Support PDF, TXT, and Markdown for MVP.
- Store original files in object storage.
- Save document metadata in Postgres.
- Show upload status: uploaded, processing, ready, failed.

### Text Extraction

- Extract text from supported files.
- Normalize whitespace.
- Preserve page number or source location when available.
- Store extraction errors for debugging.

### Chunking

- Split extracted text into chunks.
- Default chunk target: 600-900 tokens or roughly 2,500-3,500 characters.
- Use overlap of 100-200 tokens or roughly 400-700 characters.
- Save chunk index, source location, content, and metadata.

### Embeddings

- Generate embeddings for each chunk.
- Free-first option: local or Hugging Face embedding model.
- Production option: OpenAI `text-embedding-3-small`.
- Store embeddings in Postgres using `pgvector`.

### Retrieval

- Convert the user question into an embedding.
- Filter chunks by workspace ID before similarity search.
- Return top K chunks, default K = 5.
- Support metadata filters later, such as document ID or file type.

### Answer Generation

- Send the question and retrieved chunks to an LLM.
- Instruct the model to answer only from retrieved context.
- If context is insufficient, say that the answer was not found.
- Return answer with citations.

### Chat History

- Save each question, retrieved chunk IDs, answer, and timestamp.
- Show recent conversations in the dashboard.

### Usage Dashboard

- Show document count.
- Show indexed chunk count.
- Show number of questions asked.
- Show approximate token or request usage.

### A2UI Interactive Response Layer

- Parse structured UI metadata returned by the answer-generation pipeline.
- Render citation cards, source previews, follow-up prompts, and filter suggestions.
- Keep A2UI components deterministic and schema-driven.
- Use A2UI only to enhance the answer experience, not to replace citations or retrieval.
- Require confirmation UI for sensitive actions such as deleting documents.

## User Stories

- As a user, I can create an account so that my documents remain private.
- As a user, I can upload a PDF so that I can ask questions about it.
- As a user, I can see when processing is complete so that I know the document is searchable.
- As a user, I can ask a question and get an answer based on my documents.
- As a user, I can view citations so that I can verify the answer.
- As a user, I can interact with generated citation cards and follow-up prompts so that I can continue exploring my documents quickly.
- As a user, I can see previous questions so that I can continue my research.
- As a developer, I can inspect usage logs so that I can debug retrieval quality and cost.

## Success Metrics

- User can complete signup, upload, processing, and question flow in under 5 minutes.
- At least 90 percent of successful answers include citations.
- Retrieval latency is under 2 seconds for small workspaces.
- Full answer latency is under 10 seconds for MVP demos.
- No cross-workspace data leakage in manual tests.

## MVP Scope

- Next.js app with dashboard and chat UI.
- Supabase auth, database, storage, and `pgvector`.
- PDF, TXT, and Markdown ingestion.
- Background processing route or worker.
- Vector search over workspace-scoped chunks.
- Citation-backed answers.
- Basic usage dashboard.

## V2 Scope

- Hybrid search with full-text search plus vector search.
- Document-level filters.
- Streaming answers.
- Team invitations.
- Billing with Stripe.
- Query feedback: helpful or not helpful.
- Retrieval evaluation dataset.
- Admin panel for failed jobs and usage.
- A2UI response layer for dynamic source cards, follow-up actions, and generated comparison views.

## Risks

- Free model quality may be weaker than paid APIs.
- Free hosting tiers may sleep or enforce rate limits.
- Large PDFs may exceed serverless time limits.
- Poor chunking can reduce answer quality.
- Missing tenant filters can cause serious privacy bugs.
- Generated UI payloads can be confusing or unsafe if not validated against a strict schema.

## Resume Positioning

Suggested resume bullet:

> Built a multi-tenant RAG SaaS platform using Next.js, Supabase, Postgres/pgvector, and open-source embeddings, enabling users to upload documents, query them with semantic search, and receive citation-backed AI answers with workspace-level access control.

Advanced resume bullet:

> Added an Agent-to-UI layer that converts RAG outputs into validated interactive components, including citation cards, source previews, follow-up prompts, and document filters.
