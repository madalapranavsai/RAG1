from supabase import create_client, Client
from app.core.config import settings

def get_admin_client() -> Client:
    """
    Creates and returns a Supabase client with the service role key.
    Used for server-side pipeline tasks like background processing, storage access,
    and bypassing RLS when necessary.
    """
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    if not settings.SUPABASE_URL or not key:
        raise ValueError("Supabase URL and API Key must be configured in environment variables.")
    return create_client(settings.SUPABASE_URL, key)

def get_supabase_client(access_token: str = None) -> Client:
    """
    Creates and returns a Supabase client configured with the Anon Key,
    optionally setting the Authorization Bearer header to impersonate the logged in user.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        # Fallback to service role if anon key is not set
        key = settings.SUPABASE_SERVICE_ROLE_KEY
    else:
        key = settings.SUPABASE_ANON_KEY

    client = create_client(settings.SUPABASE_URL, key)
    if access_token:
        client.postgrest.auth(access_token)
    return client
