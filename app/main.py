import os
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.core.config import settings
from app.core.supabase import get_supabase_client, get_admin_client
from app.api import auth, documents, retrieval, chat, usage, evals

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
app.include_router(evals.router)

frontend_dist = "frontend/dist"
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", response_class=HTMLResponse)
    async def serve_spa(request: Request, full_path: str):
        if full_path.startswith("api/") or full_path in ("docs", "redoc", "openapi.json"):
            return HTMLResponse(status_code=404)

        potential_file = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(potential_file):
            from fastapi.responses import FileResponse
            return FileResponse(potential_file)

        from fastapi.responses import FileResponse
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    def get_session_user(request: Request):
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
        return templates.TemplateResponse(request=request, name="dashboard.html", context={"user": user, "active_page": "dashboard", "stats": {"documents": 0, "chunks": 0, "tokens": 0}})

    @app.get("/documents", response_class=HTMLResponse)
    async def documents_page(request: Request):
        user = get_session_user(request)
        if not user:
            return RedirectResponse("/login")
        return templates.TemplateResponse(request=request, name="documents.html", context={"user": user, "active_page": "documents"})

    @app.get("/chat", response_class=HTMLResponse)
    async def chat_page(request: Request):
        user = get_session_user(request)
        if not user:
            return RedirectResponse("/login")
        return templates.TemplateResponse(request=request, name="chat.html", context={"user": user, "active_page": "chat"})

    @app.get("/usage", response_class=HTMLResponse)
    async def usage_page(request: Request):
        user = get_session_user(request)
        if not user:
            return RedirectResponse("/login")
        return templates.TemplateResponse(request=request, name="usage.html", context={"user": user, "active_page": "usage"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
