# 100% Free-Tier Deployment Guide

Deploy the **DocuMind Python Full-stack RAG SaaS** application with **LangGraph**, **LangChain**, and **Google Gemini** completely free of charge without requiring a paid subscription or credit card.

---

## Free Hosting Architecture

```
User Browser
    │
    ▼
[Render / Hugging Face Spaces (Free Python Web Service)]
    │  FastAPI + HTML5/Tailwind Web UI
    │  LangGraph StateGraph Workflow
    │  FastEmbed (Local MiniLM Embeddings in RAM - 0 API cost)
    │
    ├──▶ Google AI Studio [Gemini 1.5 Flash] (Free LLM API)
    │
    └──▶ Supabase Cloud (Free Tier)
         ├── PostgreSQL + pgvector (vector similarity search via RPC)
         ├── Supabase Auth (User signups and sessions)
         └── Supabase Storage (Private document files)
```

---

## Step 1: Get Free Google Gemini API Key

Google provides generous **free API access** to its frontier Gemini models via Google AI Studio:

1. Visit **[Google AI Studio](https://aistudio.google.com/)**.
2. Sign in with any Google account (no credit card required).
3. Click **"Get API key"** in the top navigation.
4. Click **"Create API key"** and copy your `GOOGLE_API_KEY`.
5. Free Limits for `gemini-1.5-flash`:
   - **15 Requests per Minute (RPM)**
   - **1,000,000 Tokens per Minute (TPM)**
   - **1,500 Requests per Day (RPD)**

---

## Step 2: Set Up Free Supabase Database & Storage

Supabase provides a generous free tier with 500MB PostgreSQL, `pgvector`, and 1GB storage:

1. Go to **[Supabase](https://supabase.com/)** and create a free account.
2. Create a new project (e.g., `documind-rag`).
3. Under **Project Settings -> API**, copy:
   - **Project URL** (`SUPABASE_URL`)
   - **anon public key** (`SUPABASE_ANON_KEY`)
   - **service_role secret key** (`SUPABASE_SERVICE_ROLE_KEY`)
4. Open the **SQL Editor** in Supabase and run the migrations in order:
   - Run `supabase/migrations/20260716000000_init.sql` (Enables `uuid-ossp`, `pgvector`, creates tables, indexes, and `match_chunks` RPC).
   - Run `supabase/migrations/20260716000100_auth_triggers.sql` (Auto-creates workspaces on user signup).
   - Run `supabase/migrations/20260716000200_rls_policies.sql` (Row Level Security).
   - Run `supabase/migrations/20260716000300_storage_policies.sql` (Storage path security).
5. In the Supabase Dashboard, go to **Storage**:
   - Verify that the private bucket named `documents` exists (created by migration 4).

---

## Step 3: Local Testing

To test the application locally on your machine:

```bash
# 1. Activate the Python virtual environment
source .venv/bin/activate

# 2. Configure environment variables in .env
cp .env.example .env
# Fill in your GOOGLE_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Launch the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser:
- Register an account at `/signup`.
- Upload a PDF, TXT, or Markdown document at `/documents`.
- Test similarity matching in the **Retrieval Sandbox**.
- Chat with your documents at `/chat` via LangGraph + Gemini.

---

## Step 4: Deploy for Free on Cloud Platforms

### Option A: Render.com (Recommended Free Web Service)

Render provides free web services supporting Docker containers:

1. Push your repository to **GitHub**.
2. Go to **[Render.com](https://render.com/)** and connect your GitHub account.
3. Click **New +** -> **Web Service**.
4. Select your `RAG` repository.
5. Configuration:
   - **Environment**: `Docker`
   - **Instance Type**: `Free`
   - **Dockerfile Path**: `./Dockerfile`
6. Add the following **Environment Variables**:
   ```
   SUPABASE_URL = https://your-id.supabase.co
   SUPABASE_ANON_KEY = your-anon-key
   SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
   GOOGLE_API_KEY = your-gemini-api-key
   GEMINI_MODEL = gemini-1.5-flash
   EMBEDDING_PROVIDER = local
   ```
7. Click **Create Web Service**. Render will build the container and deploy your live URL (e.g. `https://documind-rag.onrender.com`).

---

### Option B: Hugging Face Spaces (100% Free Docker Container with 16GB RAM)

Hugging Face Spaces offers completely free Docker hosting with generous memory:

1. Go to **[Hugging Face Spaces](https://huggingface.co/spaces)** and click **Create new Space**.
2. Set Space name (e.g. `documind-rag`).
3. Select **Docker** as the Space SDK (Blank).
4. In Space **Settings -> Variables and secrets**, add your environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_API_KEY`
   - `GEMINI_MODEL` = `gemini-1.5-flash`
   - `EMBEDDING_PROVIDER` = `local`
5. Push your repository code to the Hugging Face space repository. It will automatically build and launch!

---

### Option C: Koyeb (Free Nano Tier)

1. Sign up at **[Koyeb](https://www.koyeb.com/)**.
2. Create an App from GitHub.
3. Select **Docker build**.
4. Set port to `8000`.
5. Add your environment variables and deploy.

---

## Summary of Free Quotas

| Service | Component | Free Tier Allowance | Cost |
|---|---|---|---|
| **Google AI Studio** | Gemini 1.5 Flash | 15 RPM, 1M TPM, 1,500 RPD | **$0.00** |
| **FastEmbed** | MiniLM Embeddings (384 dim) | Unlimited (runs inside container RAM) | **$0.00** |
| **Supabase** | Postgres + pgvector + Auth + Storage | 500 MB DB, 1 GB Storage, 50k MAU | **$0.00** |
| **Render / HF Spaces** | Web Service & Application Runtime | Free container instance with HTTPS | **$0.00** |
