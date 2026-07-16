# DocuMind RAG SaaS

DocuMind is a multi-tenant RAG (Retrieval-Augmented Generation) SaaS application that lets users upload documents, ask questions over their private knowledge base, and receive citation-backed answers with strict workspace-level isolation. It features an advanced Agent-to-UI (A2UI) response layer for interactive UI component rendering.

## Technology Stack

- **Frontend/API**: Next.js App Router (React, TypeScript)
- **Styling**: Tailwind CSS v4
- **Auth, DB, & Storage**: Supabase (PostgreSQL, `pgvector`, Object Storage)
- **Embeddings**: Local ONNX models (`all-MiniLM-L6-v2`) or OpenAI API (`text-embedding-3-small`)
- **LLM Provider**: Local Ollama (`llama3`) or OpenAI API (`gpt-4o-mini`)
- **Deployment**: Dockerized app on Railway, Render, Fly.io, or VPS

## High-Level Architecture

```text
Browser
  -> Dockerized Next.js App
  -> Next.js API Routes / Server Actions
  -> Supabase Auth
  -> Supabase Storage (Original PDFs/Markdown/Text)
  -> Supabase Postgres + pgvector (Extracted chunks, embeddings, profiles, chats)
  -> Embedding Provider (Local or OpenAI)
  -> LLM Provider (Ollama or OpenAI)
```

## Local Development Setup

### 1. Prerequisites

- Node.js v20+
- Docker & Docker Compose
- Supabase account (for hosted staging/prod)

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in the configuration details:

```bash
cp .env.example .env.local
```

### 3. Spin up PostgreSQL with pgvector

Launch the database service locally inside Docker:

```bash
docker compose up -d
```

This starts a Postgres instance on `localhost:5432` with username `postgres`, password `postgres`, database `rag_saas`, and enables the `vector` extension automatically.

### 4. Run Next.js Dev Server

Install dependencies and start the local development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

- `src/app/`: Next.js App Router routes, layouts, and page templates
- `src/components/`: Reusable React components (including citation and A2UI renderers)
- `supabase/`: Database migrations, init scripts, and helper functions
- `docker-compose.yml`: Database and container setup configurations
