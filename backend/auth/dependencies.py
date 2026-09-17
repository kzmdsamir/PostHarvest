"""FastAPI authentication dependencies."""
from __future__ import annotations

from typing import Optional
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from backend.auth.firebase import verify_id_token
from backend.core.database import get_db
from backend.core.exceptions import AppError


def extract_bearer_token(authorization: str = Header(default="", alias="Authorization")) -> str:
    """Extract token string from Authorization: Bearer <token> header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise AppError(
            "Missing or invalid Authorization header",
            status_code=401,
            code="auth_required",
        )
    token = authorization[7:].strip()
    if not token:
        raise AppError(
            "Empty bearer token provided",
            status_code=401,
            code="invalid_token",
        )
    return token


async def get_current_user(
    token: str = Depends(extract_bearer_token),
    db: Session = Depends(get_db),
):
    """Verify the Firebase ID token and return the PostHarvest User.

    Auto-provisions the User row in Postgres on first login.
    """
    decoded = verify_id_token(token)
    firebase_uid = decoded.get("uid") or decoded.get("user_id")
    if not firebase_uid:
        raise AppError("Token payload missing user identity", status_code=401, code="invalid_token")

    from backend.auth.user_service import get_or_create_user

    user = get_or_create_user(db, firebase_uid, decoded)
    if not user.is_active:
        raise AppError("Account disabled", status_code=403, code="account_disabled")
    return user


async def require_ops(current_user: User = Depends(get_current_user)) -> User:
    """Require the caller to hold the ``ops`` (operator/admin) role.

    Used to gate admin endpoints (user/role/plan management, ops-pool
    cookie mutations) that must never be reachable by regular users.
    """
    if getattr(current_user, "role", None) != "ops":
        raise AppError(
            "Operator privileges required",
            status_code=403,
            code="admin_required",
        )
    return current_user


async def get_optional_user(
    authorization: str = Header(default="", alias="Authorization"),
    db: Session = Depends(get_db),
):
    """Returns the authenticated User if Bearer token is valid, else None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:].strip()
    if not token:
        return None
    try:
        decoded = verify_id_token(token)
        firebase_uid = decoded.get("uid") or decoded.get("user_id")
        if not firebase_uid:
            return None
        from backend.auth.user_service import get_or_create_user
        return get_or_create_user(db, firebase_uid, decoded)
    except Exception:
        return None
