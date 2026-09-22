# Agent Guidelines for DocuMind

## Technology Stack
- **Language**: Python 3.12+
- **Backend & Web Framework**: FastAPI with Jinja2 templates and Tailwind CSS
- **RAG Framework**: LangGraph (`StateGraph`) + LangChain Core
- **LLM**: Google Gemini (`gemini-1.5-flash` / `gemini-2.0-flash`) via `langchain-google-genai`
- **Embeddings**: FastEmbed (`sentence-transformers/all-MiniLM-L6-v2`, 384 dimensions)
- **Database & Vector Store**: Supabase PostgreSQL with `pgvector`
- **Deployment**: Docker, Render (`render.yaml`), Hugging Face Spaces

## Coding Conventions
1. Always use the project virtual environment `.venv/bin/python` and `.venv/bin/pip`.
2. Follow PEP 8 and use type annotations throughout the codebase.
3. Keep database queries tenant-isolated by filtering by `workspace_id`.
4. Never expose secret keys (such as `SUPABASE_SERVICE_ROLE_KEY` or `GOOGLE_API_KEY`) to the client-side templates.
