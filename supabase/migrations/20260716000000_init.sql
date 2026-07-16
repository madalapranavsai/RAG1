-- Enable UUID and Vector Extensions
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null,
  email text,
  created_at timestamptz default now()
);

-- 2. Workspaces Table
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null,
  created_at timestamptz default now()
);

-- 3. Workspace Members Table
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid not null,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz default now(),
  unique (workspace_id, user_id)
);

-- 4. Documents Table
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  uploaded_by uuid not null,
  title text not null,
  file_path text,
  mime_type text,
  status text not null check (status in ('uploaded', 'processing', 'ready', 'failed')),
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Document Chunks Table
-- Set vector dimensions to 384 for default local Hugging Face all-MiniLM-L6-v2.
-- Change vector(384) to vector(1536) if using OpenAI text-embedding-3-small.
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  document_id uuid references public.documents(id) on delete cascade not null,
  chunk_index int not null,
  content text not null,
  source_page int,
  source_label text,
  embedding vector(384),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 6. Chats Table
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid not null,
  title text,
  created_at timestamptz default now()
);

-- 7. Chat Messages Table
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats(id) on delete cascade not null,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  retrieved_chunk_ids uuid[],
  ui_payload jsonb,
  created_at timestamptz default now()
);

-- 8. Usage Events Table
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid,
  event_type text not null,
  quantity int default 1,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Database Indexes for Performance
create index if not exists documents_workspace_id_idx on public.documents(workspace_id);
create index if not exists document_chunks_workspace_id_idx on public.document_chunks(workspace_id);
create index if not exists document_chunks_document_id_idx on public.document_chunks(document_id);
create index if not exists chat_messages_chat_id_idx on public.chat_messages(chat_id);

-- HNSW Index for Fast Cosine Vector Distance Search
-- Note: Re-create this index if the embedding dimension changes.
create index if not exists document_chunks_embedding_hnsw_idx
on public.document_chunks
using hnsw (embedding vector_cosine_ops);

-- Row Level Security (RLS) Enablement
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;
alter table public.usage_events enable row level security;

-- Vector Search Match Helper Function
-- Allows workspace-scoped query execution
create or replace function public.match_chunks (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  filter_workspace_id uuid
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  source_page int,
  source_label text,
  similarity float
)
language plpgsql
security definer
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.source_page,
    dc.source_label,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.workspace_id = filter_workspace_id
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;
