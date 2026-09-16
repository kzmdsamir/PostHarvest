"""User provisioning — get-or-create on first Firebase login."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.core.logging import get_logger

logger = get_logger("auth.user_service")


def get_or_create_user(db: Session, firebase_uid: str, claims: dict):
    """Find the User by firebase_uid, or create one on first login."""
    from backend.core.config import get_settings
    from backend.models.user import User

    user = db.scalar(select(User).where(User.firebase_uid == firebase_uid))
    if user is not None:
        return user

    email = claims.get("email")
    # Emails listed in OPS_EMAILS are promoted to the ops role on first
    # login (bootstrap path); everyone else allocates with basic plan.
    ops_emails = {e.strip().lower() for e in get_settings().ops_emails if e.strip()}
    role = "ops" if email and email.lower() in ops_emails else "user"

    user = User(
        firebase_uid=firebase_uid,
        email=email,
        display_name=claims.get("name") or (email or "").split("@")[0] or "User",
        photo_url=claims.get("picture"),
        plan="basic",
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(
        "Provisioned new user id=%s uid=%s role=%s plan=%s",
        user.id, firebase_uid, user.role, user.plan,
    )
    return user
