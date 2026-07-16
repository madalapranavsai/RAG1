-- Create the private "documents" storage bucket if it does not exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false, -- Private bucket
  2097152, -- 2MB file size limit for resume/demo safety
  array['application/pdf', 'text/plain', 'text/markdown'] -- Supported MIME types
)
on conflict (id) do nothing;

-- Helper to extract workspace UUID from storage path
-- Expected format: 'workspaces/UUID-HEX-FORMAT/...'
create or replace function public.extract_workspace_id_from_path(path text)
returns uuid
security definer
set search_path = public
language plpgsql
as $$
declare
  parts text[];
begin
  parts := string_to_array(path, '/');
  if array_length(parts, 1) >= 2 and parts[1] = 'workspaces' then
    return parts[2]::uuid;
  end if;
  return null;
exception
  when others then
    -- Handle malformed UUID conversion errors gracefully
    return null;
end;
$$;

-- Enable Row Level Security on storage.objects if not already enabled
alter table storage.objects enable row level security;

-- Storage Policies for "documents" bucket

create policy "Allow workspace members to read documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and public.is_workspace_member(public.extract_workspace_id_from_path(name))
  );

create policy "Allow workspace members to upload documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and public.is_workspace_member(public.extract_workspace_id_from_path(name))
  );

create policy "Allow workspace members to delete documents"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and public.is_workspace_member(public.extract_workspace_id_from_path(name))
  );
