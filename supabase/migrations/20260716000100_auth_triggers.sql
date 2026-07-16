-- Trigger to automatically create a profile and default workspace when a user signs up
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public
as $$
declare
  new_workspace_id uuid;
  user_email text;
  workspace_name text;
begin
  -- Get user email or fallback to 'User'
  user_email := coalesce(new.email, 'User');
  
  -- Create workspace name, e.g. "john's Workspace"
  workspace_name := split_part(user_email, '@', 1) || '''s Workspace';
  
  -- 1. Create a profile record
  insert into public.profiles (user_id, email)
  values (new.id, new.email);
  
  -- 2. Create a default workspace
  insert into public.workspaces (name, owner_id)
  values (workspace_name, new.id)
  returning id into new_workspace_id;
  
  -- 3. Add the user as the owner of the workspace
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');
  
  return new;
exception
  when others then
    -- Log or ignore errors so that the user sign-up process does not crash completely,
    -- but you should check database logs if profile creation fails.
    return new;
end;
$$ language plpgsql;

-- Trigger to run after a user is created in auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
