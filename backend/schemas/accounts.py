"""Request/response models for the saved-session accounts API."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AccountOut(BaseModel):
    """Metadata for one saved Facebook session (never cookie contents)."""

    name: str
    scope: Literal["ops", "me"]
    saved_at: str | None = None
    cookies_file: str | None = None
    status: Literal["VALID", "EXPIRED"] = "EXPIRED"


class AccountsResponse(BaseModel):
    """Saved sessions split by tier: ops pool + the caller's own sessions."""

    ops: list[AccountOut]
    mine: list[AccountOut]


class PersonalLoginRequest(BaseModel):
    """Credentials + label for a server-side personal Facebook login."""

    name: str = Field(..., min_length=1, max_length=64, description="Account label")
    email: str = Field(..., min_length=3, max_length=320, description="Facebook email")
    password: str = Field(..., min_length=1, description="Facebook password (never stored)")