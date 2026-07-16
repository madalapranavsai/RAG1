# Deployment Guide

## Goal

Deploy the RAG SaaS application using free or low-cost resources while keeping the architecture production-shaped enough for a resume project.

Recommended deployment:

- Frontend and API: Dockerized Next.js app
- Auth, database, storage, and vectors: Supabase
- Vector search: Supabase Postgres with `pgvector`
- Embeddings: free/local provider during development, paid API optional for deployed demo
- LLM: low-cost hosted API for deployed demo, local Ollama for local development only

## Deployment Architecture

```text
Browser
  -> Dockerized Next.js App
  -> Next.js API Routes / Server Actions
  -> Supabase Auth
  -> Supabase Storage
  -> Supabase Postgres + pgvector
  -> Embedding Provider
  -> LLM Provider
```

## Supabase Setup

### 1. Create Project

1. Create a Supabase project.
2. Save the project URL.
3. Save the anon key.
4. Save the service role key securely.

Never expose the service role key in browser code.

### 2. Enable pgvector

In Supabase SQL editor:

```sql
create extension if not exists vector with schema extensions;
```

### 3. Create Tables

Create the schema from `architecture.md`.

Core tables:

- `profiles`
- `workspaces`
- `workspace_members`
- `documents`
- `document_chunks`
- `chats`
- `chat_messages`
- `usage_events`

For A2UI support, include:

```sql
alter table chat_messages
add column if not exists ui_payload jsonb;
```

### 4. Enable Row Level Security

Enable RLS on tenant-owned tables:

```sql
alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table chats enable row level security;
alter table chat_messages enable row level security;
alter table usage_events enable row level security;
```

### 5. Create Storage Bucket

Create a bucket:

```text
documents
```

Recommended storage path format:

```text
workspaces/{workspace_id}/documents/{document_id}/{filename}
```

### 6. Create Vector Index

For OpenAI `text-embedding-3-small`, use `vector(1536)`.

```sql
create index if not exists document_chunks_embedding_hnsw_idx
on document_chunks
using hnsw (embedding vector_cosine_ops);
```

If using a different embedding model, match the vector column dimension to that model.

## Environment Variables

Create `.env.local` for local development:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

EMBEDDING_PROVIDER=
EMBEDDING_MODEL=
EMBEDDING_DIMENSIONS=

LLM_PROVIDER=
LLM_MODEL=
LLM_API_KEY=
```

Example provider values:

```bash
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

LLM_PROVIDER=openai
LLM_MODEL=gpt-4.1-mini
```

For a free-first local setup, you can use local embeddings and Ollama locally, but deployed containers cannot depend on your laptop's local Ollama server.

## Docker Deployment Setup

Use Docker for the application runtime. Keep state in managed services such as Supabase.

For detailed Docker files and commands, see `docker.md`.

Production container options:

- Railway
- Render
- Fly.io
- Google Cloud Run
- AWS ECS
- Azure Container Apps
- VPS with Docker Compose

Recommended resume-project path:

1. Use Docker Compose locally.
2. Use Supabase for hosted Auth, Postgres, Storage, and `pgvector`.
3. Deploy the Dockerized app to Railway or Render.
4. Keep uploads in Supabase Storage, not inside the container.

## Vercel Setup

Vercel is still possible, but if the project goal is Docker, prefer Railway, Render, Fly.io, or a VPS because Vercel does not deploy a normal long-running Docker container for standard Next.js hosting.

### 1. Push Code to GitHub

Create a GitHub repository and push the project.

### 2. Import Project in Vercel

1. Open Vercel.
2. Import the GitHub repository.
3. Select the Next.js framework preset.
4. Add environment variables.
5. Deploy.

### 3. Add Environment Variables in Vercel

Add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EMBEDDING_PROVIDER`
- `EMBEDDING_MODEL`
- `EMBEDDING_DIMENSIONS`
- `LLM_PROVIDER`
- `LLM_MODEL`
- `LLM_API_KEY`

Only variables prefixed with `NEXT_PUBLIC_` are safe for browser exposure.

## Docker Environment Variables

Set these in your container host:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

DATABASE_URL=

EMBEDDING_PROVIDER=
EMBEDDING_MODEL=
EMBEDDING_DIMENSIONS=

LLM_PROVIDER=
LLM_MODEL=
LLM_API_KEY=
```

If using managed Supabase for the database, `DATABASE_URL` should point to Supabase Postgres.

## Container and Free-Tier Limits

Free container hosts may sleep, throttle CPU, or enforce memory limits. For the resume MVP:

- Keep uploaded files small.
- Start with Markdown and TXT.
- Add PDF support after the basic flow works.
- Process one document at a time.
- Show clear failed status if processing fails or times out.

If processing becomes slow, move ingestion to:

- Supabase Edge Functions
- Trigger.dev
- Inngest
- A small Railway/Fly.io worker

## Deployment Checklist

Before deploying:

- App builds locally.
- Auth works locally.
- Supabase environment variables are set.
- Docker image builds successfully.
- Container starts successfully.
- `pgvector` is enabled.
- Tables are created.
- RLS is enabled.
- Storage bucket exists.
- Upload works locally.
- Ingestion works for a small Markdown file.
- Retrieval filters by `workspace_id`.
- Generated answers include citations.
- A2UI payloads are validated before rendering.

After deploying:

- Create a new account.
- Upload `refund-policy.md` from `testing.md`.
- Confirm document status becomes `ready`.
- Ask: `How long do customers have to request a refund?`
- Confirm answer says `7 days`.
- Confirm citation appears.
- Check Usage page.
- Test logout and login again.

## Public Demo Safety

If sharing the deployed app publicly:

- Add file size limits.
- Add per-user upload limits.
- Add per-user question limits.
- Avoid expensive default models.
- Do not allow anonymous uploads.
- Do not display raw processing errors to users.
- Monitor Supabase usage.

## Suggested Free Demo Limits

For a resume project:

- Max file size: 2 MB
- Max documents per workspace: 5
- Max questions per day: 25
- Max chunks per document: 100
- Max retrieved chunks per query: 5

These limits keep free-tier usage under control and make the demo predictable.

## README Deployment Section

Add this to the README later:

```md
## Deployment

This project is deployed as a Dockerized Next.js application with Supabase.

Required services:

- Docker-compatible host for the Next.js app
- Supabase for Auth, Postgres, Storage, and pgvector
- Optional hosted LLM provider for deployed answer generation

Required environment variables are listed in `deployment.md`.
Docker setup is documented in `docker.md`.
```

## Resume Note

Mention deployment only if the live demo works reliably.

Example:

> Deployed a Dockerized multi-tenant RAG SaaS app with Supabase, workspace-scoped retrieval, document uploads, citation-backed answers, and validated A2UI response components.
