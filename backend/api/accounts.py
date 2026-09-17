"""Saved Facebook session (cookie) accounts endpoints.

Two scopes (locked decision, 2026-09-17):

* ``ops`` — the global cookie pool maintained by the operator via the CLI
  (``cli.py login --account``) or the ops role. Any signed-in user may list
  and *use* ops sessions; only the ops role may delete them.
* ``me`` — per-user sessions stored under ``data/personal/{uid}/``. Visible,
  usable and deletable only by their owner. Personal sessions are captured
  server-side via :func:`~backend.scraper.browser_scraper.login_with_credentials`
  (the "+" flow in Saved Accounts); the Facebook password is never stored.

Endpoints
---------
* GET    /api/accounts                      — ``{ops: [...], mine: [...]}`` (authed)
* POST   /api/accounts/capture              — start a live session capture; returns a
                                              pipe link the user opens to log into
                                              Facebook in a new tab (authed; ``ops``
                                              scope requires the ops role)
* DELETE /api/accounts/capture/{id}         — abort a running capture (authed)
* POST   /api/accounts/personal             — label + FB credentials → server-side
                                              login, save a personal session (authed)
* DELETE /api/accounts/{scope}/{name}       — remove a session (scope + role gated)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from backend.auth.dependencies import get_current_user
from backend.core.database import get_db
from backend.core.exceptions import AppError, NotFoundError
from backend.core.plans import personal_account_cap
from backend.models.user import User
from backend.schemas.accounts import (
    AccountOut,
    AccountsResponse,
    PersonalLoginRequest,
    SessionCaptureOut,
    SessionCaptureRequest,
)
from backend.scraper.browser_scraper import (
    CaptureAlreadyActive,
    CaptureStartFailed,
    account_metadata,
    cancel_session_capture,
    delete_account,
    get_cookie_status,
    list_accounts,
    login_with_credentials,
    start_session_capture,
)

router = APIRouter(tags=["accounts"])


def _normalize_scope(scope: str) -> str:
    scope = scope.strip().lower()
    if scope not in ("ops", "me"):
        raise AppError(
            "Account scope must be 'ops' or 'me'",
            status_code=400,
            code="invalid_scope",
        )
    return scope


def _account_out(item: dict, scope: str, owner_id: int | None = None) -> AccountOut:
    return AccountOut(
        name=item["name"],
        scope=scope,
        saved_at=item.get("saved_at"),
        cookies_file=item.get("cookies_file"),
        status=get_cookie_status(item["name"], owner_id=owner_id),
    )


@router.get(
    "/accounts",
    response_model=AccountsResponse,
    summary="List saved Facebook sessions (ops pool + my own)",
)
def list_saved_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccountsResponse:
    """List operator-maintained sessions and the caller's personal sessions.

    Metadata only — cookie contents are never returned. A caller always sees
    the full ops pool (shared) but only their own ``me`` sessions.
    """
    ops_items = [_account_out(item, "ops") for item in account_metadata()]
    mine_items = [
        _account_out(item, "me", owner_id=current_user.id)
        for item in account_metadata(owner_id=current_user.id)
    ]
    return AccountsResponse(ops=ops_items, mine=mine_items)


@router.post(
    "/accounts/personal",
    response_model=AccountOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add my own Facebook session via server-side login",
)
def add_personal_account(
    payload: PersonalLoginRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccountOut:
    """Run a headless Facebook login on the user's behalf and save the
    resulting session cookies under the caller's personal store.

    The Facebook credentials are used once and never persisted. Login
    failures (checkpoint / timeout / wrong password) return 502.
    """
    name = payload.name.strip()
    if not name:
        raise AppError("Account name cannot be empty", status_code=400, code="invalid_input")

    cap = personal_account_cap(current_user.plan)
    if cap is not None and len(list_accounts(owner_id=current_user.id)) >= cap:
        raise AppError(
            f"Your {current_user.plan} plan allows {cap} personal account(s); "
            "delete one or upgrade to add more",
            status_code=429,
            code="plan_limit",
        )

    ok = login_with_credentials(
        email=payload.email,
        password=payload.password,
        owner_id=current_user.id,
        account_name=name,
    )
    if not ok:
        raise AppError(
            "Facebook login failed (wrong credentials, checkpoint, or timeout). "
            "Please try again.",
            status_code=502,
            code="facebook_login_failed",
        )

    # Re-read so the response reflects what was actually stored.
    item = next((i for i in account_metadata(owner_id=current_user.id) if i["name"] == name), None)
    if item is None:
        raise AppError(
            "Login reported success but cookies were not saved",
            status_code=500,
            code="cookie_save_failed",
        )
    return _account_out(item, "me", owner_id=current_user.id)


@router.post(
    "/accounts/capture",
    response_model=SessionCaptureOut,
    status_code=status.HTTP_201_CREATED,
    summary="Start a live Facebook session capture (open the pipe link in a new tab)",
)
def start_capture(
    payload: SessionCaptureRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionCaptureOut:
    """Launch a throwaway Chromium with a remote-debugging endpoint and return
    a pipe link the caller opens in a new tab. The user signs in to Facebook
    there (solving any CAPTCHA live); the backend captures the ``c_user`` +
    ``xs`` session cookies and saves the jar automatically.

    Scope rules match the rest of the accounts API: ``me`` is open to any
    signed-in user (plan-capped, one capture at a time); ``ops`` requires the
    ops role and targets the shared pool.
    """
    name = payload.name.strip()
    if not name:
        raise AppError("Account name cannot be empty", status_code=400, code="invalid_input")

    if payload.scope == "ops":
        if current_user.role != "ops":
            raise AppError(
                "Only operators may add shared sessions",
                status_code=403,
                code="admin_required",
            )
        owner_id = None
    else:
        cap = personal_account_cap(current_user.plan)
        if cap is not None and len(list_accounts(owner_id=current_user.id)) >= cap:
            raise AppError(
                f"Your {current_user.plan} plan allows {cap} personal account(s); "
                "delete one or upgrade to add more",
                status_code=429,
                code="plan_limit",
            )
        owner_id = current_user.id

    try:
        info = start_session_capture(
            owner_id=owner_id,
            account_name=name,
            scope=payload.scope,
        )
    except CaptureAlreadyActive:
        raise AppError(
            "A session capture is already running — finish it or wait for it to time out",
            status_code=409,
            code="capture_active",
        )
    except CaptureStartFailed as exc:
        raise AppError(
            f"Could not start the capture browser: {exc}",
            status_code=502,
            code="capture_start_failed",
        )
    return SessionCaptureOut(**info)


@router.delete(
    "/accounts/capture/{capture_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Abort a running session capture",
)
def cancel_capture(
    capture_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Best-effort cancellation: the worker stops polling, closes the browser
    and cleans up. Unknown or already-finished captures are a no-op 204."""
    cancel_session_capture(capture_id)
    return Response(status_code=204)


@router.delete(
    "/accounts/{scope}/{account_name}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a saved Facebook session",
)
def remove_account(
    scope: str,
    account_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Delete an account's cookies + index entry.

    * scope ``me``  -> owner-only (any authenticated user, their own sessions)
    * scope ``ops`` -> ops role required (operator-managed pool)
    """
    return _delete_for_scope(
        scope=_normalize_scope(scope),
        name=account_name,
        current_user=current_user,
        is_ops=current_user.role == "ops",
    )


def _delete_for_scope(scope: str, name: str, current_user: User, is_ops: bool) -> Response:
    """Shared delete body — validates scope/role, then removes the session."""
    name = name.strip()
    if not name:
        raise AppError("Account name cannot be empty", status_code=400, code="invalid_input")

    if scope == "ops":
        if not is_ops:
            raise AppError(
                "Only operators may delete ops-pool sessions",
                status_code=403,
                code="admin_required",
            )
        removed = delete_account(name, owner_id=None)
    else:
        # "me" — the caller may only touch their own personal sessions.
        removed = delete_account(name, owner_id=current_user.id)

    if not removed:
        raise NotFoundError(f"Account '{name}' not found")
    return Response(status_code=204)