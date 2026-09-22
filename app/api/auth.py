from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException, Depends, status, Form, Response, Body
from fastapi.responses import RedirectResponse
from app.core.supabase import get_admin_client, get_supabase_client

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class AuthCredentials(BaseModel):
    email: str
    password: str

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

@router.get("/me")
async def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "workspace_id": user["workspace_id"],
        "workspace_name": user["workspace_name"],
        "role": user["role"]
    }

@router.post("/login")
async def login(
    response: Response,
    request: Request,
    email: Optional[str] = Form(None),
    password: Optional[str] = Form(None)
):
    # Support both JSON and Form submissions
    req_email = email
    req_password = password
    if not req_email or not req_password:
        try:
            body = await request.json()
            req_email = body.get("email")
            req_password = body.get("password")
        except Exception:
            pass

    if not req_email or not req_password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    try:
        supabase = get_admin_client()
        auth_resp = supabase.auth.sign_in_with_password({
            "email": req_email.strip(),
            "password": req_password
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
    request: Request,
    email: Optional[str] = Form(None),
    password: Optional[str] = Form(None)
):
    req_email = email
    req_password = password
    if not req_email or not req_password:
        try:
            body = await request.json()
            req_email = body.get("email")
            req_password = body.get("password")
        except Exception:
            pass

    if not req_email or not req_password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    try:
        supabase = get_admin_client()
        auth_resp = supabase.auth.sign_up({
            "email": req_email.strip(),
            "password": req_password
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

