from typing import Optional, Dict, Any
from fastapi import APIRouter, Request, HTTPException, Depends, status, Form, Response
from fastapi.responses import RedirectResponse
from app.core.supabase import get_admin_client, get_supabase_client

router = APIRouter(prefix="/api/auth", tags=["Auth"])

async def get_current_user(request: Request) -> Dict[str, Any]:
    """
    Dependency that extracts the logged-in user from Bearer header or cookies.
    """
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    elif "sb_access_token" in request.cookies:
        token = request.cookies.get("sb_access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in."
        )

    try:
        supabase = get_supabase_client(access_token=token)
        user_resp = supabase.auth.get_user(token)
        if not user_resp or not user_resp.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token.")
        
        user = user_resp.user
        
        # Get active workspace
        admin = get_admin_client()
        memberships_resp = admin.table("workspace_members").select(
            "workspace_id, role, workspaces(id, name)"
        ).eq("user_id", user.id).execute()

        memberships = memberships_resp.data or []
        primary_membership = memberships[0] if memberships else None
        workspace_id = primary_membership.get("workspace_id") if primary_membership else None
        workspace_name = (primary_membership.get("workspaces") or {}).get("name", "Personal Workspace") if primary_membership else "Personal Workspace"

        return {
            "id": user.id,
            "email": user.email,
            "workspace_id": workspace_id,
            "workspace_name": workspace_name,
            "role": primary_membership.get("role", "member") if primary_membership else "member",
            "access_token": token
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Authentication error: {str(e)}")

@router.post("/login")
async def login(
    response: Response,
    email: str = Form(...),
    password: str = Form(...)
):
    try:
        supabase = get_admin_client()
        auth_resp = supabase.auth.sign_in_with_password({
            "email": email.strip(),
            "password": password
        })
        if not auth_resp.session:
            raise HTTPException(status_code=400, detail="Invalid credentials.")

        token = auth_resp.session.access_token
        # Set secure HTTP-only cookie
        response.set_cookie(
            key="sb_access_token",
            value=token,
            httponly=True,
            samesite="lax",
            max_age=60 * 60 * 24 * 7 # 7 days
        )
        return {"success": True, "token": token}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/signup")
async def signup(
    response: Response,
    email: str = Form(...),
    password: str = Form(...)
):
    try:
        supabase = get_admin_client()
        auth_resp = supabase.auth.sign_up({
            "email": email.strip(),
            "password": password
        })

        if not auth_resp.user:
            raise HTTPException(status_code=400, detail="Registration failed.")

        token = auth_resp.session.access_token if auth_resp.session else None
        if token:
            response.set_cookie(
                key="sb_access_token",
                value=token,
                httponly=True,
                samesite="lax",
                max_age=60 * 60 * 24 * 7
            )
        return {
            "success": True,
            "message": "Account registered successfully!",
            "session_active": bool(token)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("sb_access_token")
    return {"success": True}
