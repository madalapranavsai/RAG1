import os
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.core.config import settings
from app.core.supabase import get_supabase_client, get_admin_client
from app.api import auth, documents, retrieval, chat, usage

app = FastAPI(
    title=settings.APP_NAME,
    description="Multi-Tenant RAG SaaS Platform with LangGraph, LangChain & Google Gemini",
    version="1.0.0"
)

# Static directory setup
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# Mount API Routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(retrieval.router)
app.include_router(chat.router)
app.include_router(usage.router)

def get_session_user(request: Request):
    """
    Extracts the user and active workspace details from the session cookie.
    Returns None if unauthenticated.
    """
    token = request.cookies.get("sb_access_token")
    if not token:
        return None

    try:
        supabase = get_supabase_client(token)
        user_resp = supabase.auth.get_user(token)
        if not user_resp or not user_resp.user:
            return None

        user = user_resp.user
        admin = get_admin_client()
        memberships_resp = admin.table("workspace_members").select(
            "workspace_id, role, workspaces(id, name)"
        ).eq("user_id", user.id).execute()

        memberships = memberships_resp.data or []
        primary = memberships[0] if memberships else None

        return {
            "id": user.id,
            "email": user.email,
            "workspace_id": primary.get("workspace_id") if primary else None,
            "workspace_name": (primary.get("workspaces") or {}).get("name", "Personal Workspace") if primary else "Personal Workspace",
            "role": primary.get("role", "member") if primary else "member"
        }
    except Exception:
        return None

# Web UI Routes
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    user = get_session_user(request)
    if user:
        return RedirectResponse("/dashboard")
    return RedirectResponse("/login")

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    user = get_session_user(request)
    if user:
        return RedirectResponse("/dashboard")
    return templates.TemplateResponse(request=request, name="login.html", context={"user": None})

@app.get("/signup", response_class=HTMLResponse)
async def signup_page(request: Request):
    user = get_session_user(request)
    if user:
        return RedirectResponse("/dashboard")
    return templates.TemplateResponse(request=request, name="signup.html", context={"user": None})

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request):
    user = get_session_user(request)
    if not user:
        return RedirectResponse("/login")

    stats = {"documents": 0, "chunks": 0, "tokens": 0}
    try:
        admin = get_admin_client()
        w_id = user.get("workspace_id")
        if w_id:
            d_resp = admin.table("documents").select("id", count="exact").eq("workspace_id", w_id).execute()
            c_resp = admin.table("document_chunks").select("id", count="exact").eq("workspace_id", w_id).execute()
            u_resp = admin.table("usage_events").select("quantity").eq("workspace_id", w_id).eq("event_type", "token_used").execute()

            stats["documents"] = d_resp.count or len(d_resp.data or [])
            stats["chunks"] = c_resp.count or len(c_resp.data or [])
            stats["tokens"] = sum(e["quantity"] for e in (u_resp.data or []))
    except Exception as e:
        print(f"Error fetching dashboard stats: {e}")

    return templates.TemplateResponse(
        request=request,
        name="dashboard.html",
        context={"user": user, "active_page": "dashboard", "stats": stats}
    )

@app.get("/documents", response_class=HTMLResponse)
async def documents_page(request: Request):
    user = get_session_user(request)
    if not user:
        return RedirectResponse("/login")
    return templates.TemplateResponse(
        request=request,
        name="documents.html",
        context={"user": user, "active_page": "documents"}
    )

@app.get("/chat", response_class=HTMLResponse)
async def chat_page(request: Request):
    user = get_session_user(request)
    if not user:
        return RedirectResponse("/login")
    return templates.TemplateResponse(
        request=request,
        name="chat.html",
        context={"user": user, "active_page": "chat"}
    )

@app.get("/usage", response_class=HTMLResponse)
async def usage_page(request: Request):
    user = get_session_user(request)
    if not user:
        return RedirectResponse("/login")
    return templates.TemplateResponse(
        request=request,
        name="usage.html",
        context={"user": user, "active_page": "usage"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
