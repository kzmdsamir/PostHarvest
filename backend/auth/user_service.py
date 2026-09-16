"""User provisioning — get-or-create on first Firebase login."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.core.logging import get_logger

logger = get_logger("auth.user_service")


def get_or_create_user(db: Session, firebase_uid: str, claims: dict):
    """Find the User by firebase_uid, or create one on first login."""
    from backend.models.user import User

    user = db.scalar(select(User).where(User.firebase_uid == firebase_uid))
    if user is not None:
        return user

    user = User(
        firebase_uid=firebase_uid,
        email=claims.get("email"),
        display_name=claims.get("name") or claims.get("email", "").split("@")[0] or "User",
        photo_url=claims.get("picture"),
        plan="free",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Provisioned new user id=%s uid=%s", user.id, firebase_uid)
    return user
