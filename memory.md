# Project Memory

## Current Project Direction

Build a resume-ready multi-tenant RAG SaaS application. The product lets users upload documents, index them with embeddings, ask questions, and receive citation-backed answers. Add A2UI as an advanced interactive response layer after the core RAG workflow is stable.

## Recommended Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- `pgvector`
- Open-source embeddings for free prototype
- Optional OpenAI `text-embedding-3-small` for higher quality
- Local Ollama model or low-cost hosted LLM for answer generation
- Custom A2UI JSON schema rendered by React components
- Docker for reproducible local development and deployment

## Key Product Promise

Private document Q&A with citations and workspace-level access control.

Advanced promise:

Private document Q&A that can turn answers into interactive source cards, follow-up prompts, filters, and previews.

## MVP Features

- User authentication.
- Workspace creation.
- File upload.
- Text extraction.
- Chunking.
- Embedding generation.
- Workspace-scoped vector retrieval.
- Chat interface.
- Citation-backed answers.
- Usage dashboard.
- Optional A2UI response components.

## Important Constraints

- This is for a resume project, so clarity and demonstrability matter more than massive scale.
- Use free resources where possible.
- Avoid over-engineering.
- Tenant isolation is a must-have.
- Citations are a must-have.
- A2UI is optional V2 polish, not required for the first working MVP.
- Keep the UI SaaS-like, not toy-like.

## Data Ownership Rule

Every document, chunk, chat, message, and usage event belongs to a workspace. All queries must be scoped to the current workspace.

## Retrieval Rule

Never retrieve chunks globally. Always filter by `workspace_id`.

## Answer Rule

Answers must be based only on retrieved chunks. If the answer is not present in the uploaded documents, say so.

## A2UI Rule

Treat generated UI payloads as untrusted data. Validate against a strict schema, render only known components, and never execute model-generated code.

## Resume Story

The project should demonstrate:

- Full-stack product development.
- Auth and tenant-aware SaaS architecture.
- Document processing pipeline.
- Vector search with `pgvector`.
- RAG answer generation.
- Citation UX.
- Usage analytics.
- Agent-to-UI style interactive answer rendering.
- Dockerized deployment and reproducible developer setup.

## Suggested Repository Description

Multi-tenant RAG SaaS knowledge assistant built with Next.js, Supabase, pgvector, and open-source embeddings.

## Suggested Resume Bullet

Built a multi-tenant RAG SaaS platform using Next.js, Supabase, Postgres/pgvector, and open-source embeddings, enabling users to upload documents, query them with semantic search, and receive citation-backed AI answers with workspace-level access control.

Advanced resume bullet:

Added an Agent-to-UI layer that converts RAG responses into validated interactive components, including citation cards, source previews, document filters, and suggested follow-up prompts.

## Next Build Step

Start with Phase 0 and Phase 1:

- Create the Next.js app.
- Configure Supabase.
- Implement auth.
- Create workspace tables and policies.
- Build a protected dashboard.
