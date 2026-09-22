# Project Memory

## Current Project Direction

Build a resume-ready multi-tenant RAG SaaS application. The product lets users upload documents, index them with vector embeddings, ask questions, and receive citation-backed answers. The core retrieval and chat experience is orchestrated using a stateful **LangGraph** pipeline with **Google Gemini**.

## Recommended Stack

- **Backend & Full-stack Framework**: Python 3.12, FastAPI, Jinja2
- **Styling**: Tailwind CSS
- **RAG Orchestration**: LangGraph (`StateGraph`), LangChain Core, `langchain-text-splitters`
- **LLM Engine**: **Google Gemini** (`gemini-1.5-flash` / `gemini-2.0-flash`) via `langchain-google-genai` (100% Free Tier)
- **Embeddings**: In-process local execution via FastEmbed (`sentence-transformers/all-MiniLM-L6-v2`, 384 dimensions)
- **File Ingestion**: `pypdf` + LangChain `RecursiveCharacterTextSplitter`
- **Database & Storage**: Supabase Postgres with `pgvector`, Supabase Auth, Supabase Storage
- **Deployment**: Single unified Docker container for Render.com, Hugging Face Spaces, or Koyeb (100% free hosting)

## Key Product Promise

Private document Q&A with citations, clickable follow-up suggestions, and workspace-level access control.

## MVP Features

- User authentication (Supabase Auth).
- Automatic workspace provisioning.
- File upload (PDF, TXT, Markdown up to 2MB).
- Text extraction and semantic chunking (3,000 chars, 500 overlap).
- Local dense embedding generation (384 dimensions).
- Workspace-scoped vector retrieval with `match_chunks` RPC.
- Retrieval Sandbox for testing cosine similarity rankings.
- Interactive chat interface with source citation cards.
- Follow-up question generation.
- Usage dashboard tracking storage, chunks, and token quotas.

## Important Constraints

- This is for a resume project, so clarity and demonstrability matter more than massive scale.
- Use 100% free resources where possible (Google AI Studio, Supabase Free Tier, Render Free Web Service).
- Avoid over-engineering.
- Tenant isolation is a must-have.
- Citations are a must-have.
- Keep the UI SaaS-like, not toy-like.

## Data Ownership Rule

Every document, chunk, chat, message, and usage event belongs to a workspace. All queries must be scoped to the current workspace.

## Retrieval Rule

Never retrieve chunks globally. Always filter by `workspace_id`.

## Answer Rule

Answers must be based only on retrieved chunks. If the answer is not present in the uploaded documents, state that it was not found.

## Resume Story

The project demonstrates:

- Full-stack Python application development (FastAPI + Jinja2 + Tailwind).
- Multi-tenant architecture with Row-Level Security (RLS).
- Stateful Agentic RAG workflow orchestration using **LangGraph** and **LangChain**.
- Google Gemini API integration for grounded Q&A.
- Local dense vector indexing and cosine distance search with PostgreSQL `pgvector`.
- Ingestion pipeline with `pypdf` and chunking along natural semantic boundaries.
- Interactive citation cards and suggested follow-ups.
- Containerized zero-cost deployment using Docker and Render blueprints.

## Suggested Repository Description

Multi-tenant RAG SaaS platform built with Python, FastAPI, LangGraph, LangChain, Google Gemini, and PostgreSQL pgvector.

## Suggested Resume Bullet

> Built a multi-tenant RAG SaaS platform using Python, FastAPI, LangGraph, LangChain, and Google Gemini, enabling users to upload documents, query them with pgvector cosine search, and receive grounded, citation-backed AI answers with workspace isolation and token usage telemetry.

Advanced resume bullet:

> Implemented an agentic LangGraph StateGraph pipeline that coordinates document retrieval, context grading, Gemini response synthesis, source citation cards, and automated follow-up question generation.
