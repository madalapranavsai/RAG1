# Docker Guide

## Goal

Run and deploy the RAG SaaS application with Docker so the project is easier to reproduce, demo, and deploy on services like Railway, Render, Fly.io, a VPS, or cloud container platforms.

Docker should cover:

- Next.js application container.
- Postgres with `pgvector` for local development.
- Optional object storage emulator for local development.
- Environment-driven embedding and LLM providers.

## Recommended Docker Strategy

Use Docker in two modes:

- Local development: `docker compose` runs the app plus Postgres/pgvector.
- Production deployment: build and deploy only the app container, while using managed Supabase or managed Postgres.

For a resume project, the best balance is:

- Local: Docker Compose with `pgvector/pgvector`.
- Deployed demo: Dockerized app on Railway/Render/Fly.io plus Supabase for Auth, Storage, and Postgres.

## Local Docker Compose

Create `docker-compose.yml` after the app is scaffolded:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    depends_on:
      - db

  db:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: rag_saas
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./supabase/init.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  postgres_data:
```

## Dockerfile for Python FastAPI

The application includes a production-ready `Dockerfile`:

```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-cache FastEmbed MiniLM model
RUN python3 -c "from fastembed import TextEmbedding; TextEmbedding('sentence-transformers/all-MiniLM-L6-v2')"

COPY app/ ./app/
COPY templates/ ./templates/
COPY static/ ./static/

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

## Local Environment Variables

Use `.env.local`:

```bash
DATABASE_URL=postgresql://postgres:postgres@db:5432/rag_saas

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

If running the app outside Docker while Postgres runs in Docker, use:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rag_saas
```

## Database Init File

Create `supabase/init.sql` or `db/init.sql`:

```sql
create extension if not exists vector;
```

Add schema migrations later instead of putting all schema code in the init file.

## Commands

Build containers:

```bash
docker compose build
```

Start services:

```bash
docker compose up
```

Start in background:

```bash
docker compose up -d
```

Stop services:

```bash
docker compose down
```

View logs:

```bash
docker compose logs -f app
```

Reset local database volume:

```bash
docker compose down -v
```

Only run the reset command when you are okay deleting local database data.

## Production Docker Deployment

For production, deploy the app container and use managed services for state.

Recommended:

- App container: Railway, Render, Fly.io, AWS ECS, Google Cloud Run, Azure Container Apps, or a VPS.
- Database: Supabase or managed Postgres with `pgvector`.
- Storage: Supabase Storage or S3-compatible storage.
- Secrets: platform environment variable manager.

Avoid storing uploaded files inside the app container. Containers should be stateless.

## Railway Deployment

High-level steps:

1. Push code to GitHub.
2. Create a Railway project.
3. Deploy from GitHub.
4. Railway detects the Dockerfile.
5. Add environment variables.
6. Point the app to Supabase or managed Postgres.
7. Deploy.

## Render Deployment

High-level steps:

1. Push code to GitHub.
2. Create a new Web Service.
3. Select Docker runtime.
4. Add environment variables.
5. Set exposed port to `3000`.
6. Deploy.

## Fly.io Deployment

High-level steps:

1. Install Fly CLI.
2. Run `fly launch`.
3. Use the Dockerfile.
4. Add secrets with `fly secrets set`.
5. Deploy with `fly deploy`.

## Docker Testing Checklist

- `docker compose build` succeeds.
- `docker compose up` starts the app.
- App is reachable at `http://localhost:3000`.
- App can connect to Postgres.
- `pgvector` extension is enabled.
- Auth flow works with configured provider.
- Upload flow works.
- Ingestion creates chunks.
- Retrieval query returns workspace-scoped chunks.
- A2UI payload validation works in the container.

## Resume Bullet

> Containerized a multi-tenant RAG SaaS application with Docker and Postgres/pgvector, enabling reproducible local development and deployment to cloud container platforms.

