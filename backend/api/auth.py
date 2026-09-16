"""Authentication & user profile API routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.auth.dependencies import get_current_user
from backend.models.user import User

router = APIRouter(tags=["auth"])


class UserOut(BaseModel):
    id: int
    firebase_uid: str
    email: str | None = None
    display_name: str | None = None
    photo_url: str | None = None
    plan: str = "free"
    is_active: bool = True

    class Config:
        from_attributes = True


@router.get("/auth/me", response_model=UserOut, summary="Get current user profile")
def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    """Return the currently authenticated user's profile."""
    return UserOut.model_validate(current_user)
