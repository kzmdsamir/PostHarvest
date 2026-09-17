"""ORM model — saved Facebook session (cookie) mirror table.

Disk files under ``data/`` (ops pool) and ``data/personal/{owner_id}/``
(personal) remain the *authoritative* cookie store (locked decision
2026-09-17); this table is a mirror written on every save, imported once
from existing files at boot, and used as a read fallback when a jar's file
has not been materialized (e.g. after a restore onto a fresh host).

``owner_id`` NULL rows are the shared ops pool (global scope).
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SavedAccount(Base):
    """One session jar mirrored from the on-disk cookie store."""

    __tablename__ = "saved_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    scope: Mapped[str] = mapped_column(String(16), nullable=False)  # "ops" | "me"
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    # Same serialized payload written to the disk file (plain cookie array for
    # the ops pool; {"__encrypted__": true, "payload": ...} for personal jars
    # when a cookie_encryption_key is configured).
    cookies: Mapped[str] = mapped_column(Text, nullable=False)
    # Encrypted Facebook credentials, kept only for legacy/CLI personal logins
    # (the live capture flow never stores credentials).
    credentials: Mapped[str | None] = mapped_column(Text, nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<SavedAccount scope={self.scope!r} name={self.name!r} "
            f"owner_id={self.owner_id}>"
        )