-- Helper function to check if the current user is a member of the workspace.
-- Bypasses RLS recursion using security definer.
create or replace function public.is_workspace_member(check_workspace_id uuid)
returns boolean
security definer
set search_path = public
language plpgsql
as $$
begin
  return exists (
    select 1 
    from public.workspace_members 
    where workspace_id = check_workspace_id 
      and user_id = auth.uid()
  );
end;
$$;

-- Helper function to check if the current user is the owner of the workspace.
-- Bypasses RLS recursion using security definer.
create or replace function public.is_workspace_owner(check_workspace_id uuid)
returns boolean
security definer
set search_path = public
language plpgsql
as $$
begin
  return exists (
    select 1 
    from public.workspaces 
    where id = check_workspace_id 
      and owner_id = auth.uid()
  );
end;
$$;

-- 1. Profiles Table Policies
create policy "Allow users to read their own profile"
  on public.profiles for select
  using (user_id = auth.uid());

create policy "Allow users to insert their own profile"
  on public.profiles for insert
  with check (user_id = auth.uid());

create policy "Allow users to update their own profile"
  on public.profiles for update
  using (user_id = auth.uid());

-- 2. Workspaces Table Policies
create policy "Allow members to read workspaces"
  on public.workspaces for select
  using (public.is_workspace_member(id));

create policy "Allow authenticated users to create workspaces"
  on public.workspaces for insert
  with check (owner_id = auth.uid());

create policy "Allow owners to update workspaces"
  on public.workspaces for update
  using (owner_id = auth.uid());

create policy "Allow owners to delete workspaces"
  on public.workspaces for delete
  using (owner_id = auth.uid());

-- 3. Workspace Members Table Policies
create policy "Allow members to view workspace memberships"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

create policy "Allow workspace owners to add members"
  on public.workspace_members for insert
  with check (public.is_workspace_owner(workspace_id));

create policy "Allow workspace owners to update member roles"
  on public.workspace_members for update
  using (public.is_workspace_owner(workspace_id));

create policy "Allow workspace owners to remove members"
  on public.workspace_members for delete
  using (public.is_workspace_owner(workspace_id));

-- 4. Documents Table Policies
create policy "Allow workspace members to read documents"
  on public.documents for select
  using (public.is_workspace_member(workspace_id));

create policy "Allow workspace members to insert documents"
  on public.documents for insert
  with check (public.is_workspace_member(workspace_id) and uploaded_by = auth.uid());

create policy "Allow workspace members to update documents"
  on public.documents for update
  using (public.is_workspace_member(workspace_id));

create policy "Allow workspace members to delete documents"
  on public.documents for delete
  using (public.is_workspace_member(workspace_id));

-- 5. Document Chunks Table Policies
create policy "Allow workspace members to read document chunks"
  on public.document_chunks for select
  using (public.is_workspace_member(workspace_id));

-- 6. Chats Table Policies
create policy "Allow owners to read their own chats in workspace"
  on public.chats for select
  using (public.is_workspace_member(workspace_id) and user_id = auth.uid());

create policy "Allow owners to insert chats in workspace"
  on public.chats for insert
  with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

create policy "Allow owners to update their own chats in workspace"
  on public.chats for update
  using (public.is_workspace_member(workspace_id) and user_id = auth.uid());

create policy "Allow owners to delete their own chats in workspace"
  on public.chats for delete
  using (public.is_workspace_member(workspace_id) and user_id = auth.uid());

-- 7. Chat Messages Table Policies
create policy "Allow members to read chat messages"
  on public.chat_messages for select
  using (public.is_workspace_member(workspace_id));

create policy "Allow members to insert chat messages"
  on public.chat_messages for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Allow members to update chat messages"
  on public.chat_messages for update
  using (public.is_workspace_member(workspace_id));

create policy "Allow members to delete chat messages"
  on public.chat_messages for delete
  using (public.is_workspace_member(workspace_id));

-- 8. Usage Events Table Policies
create policy "Allow members to read usage events"
  on public.usage_events for select
  using (public.is_workspace_member(workspace_id));
