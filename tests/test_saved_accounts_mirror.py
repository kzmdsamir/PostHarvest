"""saved_accounts mirror (disk-authentic + DB mirror) and live-capture API tests."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from backend.core.config import get_settings
from backend.core.database import SessionLocal
from backend.models import SavedAccount, User
from backend.scraper import browser_scraper
from backend.scraper.browser_scraper import (
    CaptureAlreadyActive,
    _cookies_path,
    account_metadata,
    delete_account,
    import_cookie_files_to_db,
    load_cookies,
    save_cookies,
    start_session_capture,
)

# A session cookie set that status-checks as VALID (xs present, far future).
_VALID_COOKIES = [
    {
        "name": "c_user", "value": "1001", "domain": ".facebook.com", "path": "/",
        "expires": 4102444800, "secure": True, "httpOnly": True,
    },
    {
        "name": "xs", "value": "sess-token", "domain": ".facebook.com", "path": "/",
        "expires": 4102444800, "secure": True, "httpOnly": True,
    },
]


def _user_id(firebase_uid: str) -> int:
    with SessionLocal() as db:
        user = db.query(User).filter_by(firebase_uid=firebase_uid).one()
        return user.id


def _set_user(firebase_uid: str, **attrs) -> None:
    with SessionLocal() as db:
        user = db.query(User).filter_by(firebase_uid=firebase_uid).one()
        for key, value in attrs.items():
            setattr(user, key, value)
        db.commit()


def _mirror(scope: str, owner_id: int | None, name: str):
    with SessionLocal() as db:
        return db.query(SavedAccount).filter_by(scope=scope, owner_id=owner_id, name=name).first()


def _wipe_mirror() -> None:
    with SessionLocal() as db:
        db.query(SavedAccount).delete()
        db.commit()


# ---------------------------------------------------------------------------
# mirror: writes / fallback reads / deletes / metadata
# ---------------------------------------------------------------------------


def test_save_cookies_mirrors_ops_row_into_db():
    save_cookies(list(_VALID_COOKIES), account_name="alpha", owner_id=None)
    row = _mirror("ops", None, "alpha")
    assert row is not None
    assert json.loads(row.cookies) == _VALID_COOKIES
    # disk is still the authoritative write
    assert _cookies_path("alpha", None).exists()


def test_save_cookies_mirrors_personal_row_into_db(authed_client):
    authed_client.get("/api/auth/me")  # provision user A
    owner_id = _user_id("test_firebase_uid_user_a")
    save_cookies(list(_VALID_COOKIES), account_name="beta", owner_id=owner_id)
    row = _mirror("me", owner_id, "beta")
    assert row is not None
    assert json.loads(row.cookies) == _VALID_COOKIES
    assert row.meta and row.meta.get("saved_at")


def test_load_cookies_falls_back_to_mirror_when_file_missing():
    save_cookies(list(_VALID_COOKIES), account_name="gamma", owner_id=None)
    path = _cookies_path("gamma", None)
    assert path.exists()
    path.unlink()
    loaded = load_cookies("gamma", owner_id=None)
    assert loaded == _VALID_COOKIES


def test_delete_account_removes_mirror_row():
    save_cookies(list(_VALID_COOKIES), account_name="delta", owner_id=None)
    assert _mirror("ops", None, "delta") is not None
    assert delete_account("delta", owner_id=None) is True
    assert _mirror("ops", None, "delta") is None
    assert not _cookies_path("delta", None).exists()


def test_account_metadata_lists_mirror_only_rows(authed_client):
    authed_client.get("/api/auth/me")
    owner_id = _user_id("test_firebase_uid_user_a")
    with SessionLocal() as db:
        db.add(
            SavedAccount(
                scope="me", owner_id=owner_id, name="restored-a",
                cookies=json.dumps(_VALID_COOKIES), meta={"imported": True},
            )
        )
        db.add(
            SavedAccount(
                scope="ops", owner_id=None, name="restored-ops",
                cookies=json.dumps(_VALID_COOKIES), meta={"imported": True},
            )
        )
        db.commit()

    mine_names = [item["name"] for item in account_metadata(owner_id=owner_id)]
    assert "restored-a" in mine_names
    ops_names = [item["name"] for item in account_metadata()]
    assert "restored-ops" in ops_names


# ---------------------------------------------------------------------------
# boot backfill
# ---------------------------------------------------------------------------


def test_import_cookie_files_to_db_backfills_disk_jars(authed_client):
    authed_client.get("/api/auth/me")
    owner_id = _user_id("test_firebase_uid_user_a")
    _wipe_mirror()

    data_dir = Path(get_settings().data_dir)
    # ops pool: implicit default + one indexed account (legacy host, files only)
    (data_dir / "fb_cookies.json").write_text(json.dumps(_VALID_COOKIES), encoding="utf-8")
    (data_dir / "fb_cookies_opstwo.json").write_text(json.dumps(_VALID_COOKIES), encoding="utf-8")
    (data_dir / "fb_credentials.json").write_text(
        json.dumps(
            {"opstwo": {"cookies_file": "fb_cookies_opstwo.json", "saved_at": "2026-01-01T00:00:00Z"}}
        ),
        encoding="utf-8",
    )
    # one personal jar
    personal = data_dir / "personal" / str(owner_id)
    personal.mkdir(parents=True, exist_ok=True)
    (personal / "fb_cookies_mine.json").write_text(json.dumps(_VALID_COOKIES), encoding="utf-8")
    (personal / "fb_credentials.json").write_text(
        json.dumps(
            {"mine": {"cookies_file": "fb_cookies_mine.json", "saved_at": "2026-01-01T00:00:00Z"}}
        ),
        encoding="utf-8",
    )

    inserted = import_cookie_files_to_db()
    assert inserted >= 3  # ops default + ops opstwo + personal mine
    assert _mirror("ops", None, "default") is not None
    assert _mirror("ops", None, "opstwo") is not None
    assert _mirror("me", owner_id, "mine") is not None
    # second call is a no-op once the table has rows
    assert import_cookie_files_to_db() == 0


# ---------------------------------------------------------------------------
# capture runner (worker stubbed — no real browser/network in tests)
# ---------------------------------------------------------------------------


def _stub_capture_worker(record, timeout_seconds):
    record["url"] = "http://192.168.10.41:9333/devtools/inspector.html?ws=ws-test"


def test_start_session_capture_returns_pipe_url(monkeypatch):
    monkeypatch.setattr(browser_scraper, "_capture_worker", _stub_capture_worker)
    info = start_session_capture(owner_id=None, account_name="ops-capture", scope="ops", timeout_seconds=60)
    assert info["url"].startswith("http://")
    assert info["scope"] == "ops"
    assert info["name"] == "ops-capture"
    assert info["expires_at"]
    browser_scraper._CAPTURES.clear()


def test_start_session_capture_single_active_per_scope(monkeypatch):
    monkeypatch.setattr(browser_scraper, "_capture_worker", _stub_capture_worker)
    start_session_capture(owner_id=None, account_name="one", scope="ops", timeout_seconds=60)
    # stub leaves finished=False, so the scope is still occupied
    with pytest.raises(CaptureAlreadyActive):
        start_session_capture(owner_id=None, account_name="two", scope="ops", timeout_seconds=60)
    browser_scraper._CAPTURES.clear()


# ---------------------------------------------------------------------------
# capture API
# ---------------------------------------------------------------------------


def test_capture_endpoint_requires_auth(client):
    assert client.post("/api/accounts/capture", json={"name": "x"}).status_code == 401


def test_capture_endpoint_returns_link(authed_client, monkeypatch):
    def fake_start(*, owner_id, account_name=None, scope="me", timeout_seconds=None):
        return {
            "capture_id": "cap-1",
            "name": account_name or "default",
            "scope": scope,
            "url": "http://192.168.10.41:9333/devtools/inspector.html?ws=w",
            "expires_at": "2026-01-01T00:00:00Z",
        }

    monkeypatch.setattr("backend.api.accounts.start_session_capture", fake_start)
    r = authed_client.post("/api/accounts/capture", json={"name": "me-capture", "scope": "me"})
    assert r.status_code == 201
    body = r.json()
    assert body["scope"] == "me"
    assert body["url"].startswith("http://")
    assert body["capture_id"] == "cap-1"


def test_capture_ops_scope_requires_ops_role(authed_client, monkeypatch):
    def fake_start(**kwargs):
        raise AssertionError("capture must not start for a non-ops user")

    monkeypatch.setattr("backend.api.accounts.start_session_capture", fake_start)
    r = authed_client.post("/api/accounts/capture", json={"name": "shared", "scope": "ops"})
    assert r.status_code == 403


def test_capture_ops_scope_allowed_for_ops_role(authed_client, monkeypatch):
    authed_client.get("/api/auth/me")
    _set_user("test_firebase_uid_user_a", role="ops")

    def fake_start(*, owner_id, account_name=None, scope="me", timeout_seconds=None):
        return {
            "capture_id": "cap-2",
            "name": account_name or "default",
            "scope": scope,
            "url": "http://192.168.10.41:9333/devtools/inspector.html?ws=w",
            "expires_at": "2026-01-01T00:00:00Z",
        }

    monkeypatch.setattr("backend.api.accounts.start_session_capture", fake_start)
    r = authed_client.post("/api/accounts/capture", json={"name": "shared", "scope": "ops"})
    assert r.status_code == 201
    assert r.json()["scope"] == "ops"


def test_capture_personal_honors_plan_cap(authed_client, monkeypatch):
    authed_client.get("/api/auth/me")
    owner_id = _user_id("test_firebase_uid_user_a")
    # basic plan caps personal accounts at 1 — fill it via the file store.
    save_cookies(list(_VALID_COOKIES), account_name="only-one", owner_id=owner_id)

    def fake_start(**kwargs):
        raise AssertionError("capture must not start above the plan cap")

    monkeypatch.setattr("backend.api.accounts.start_session_capture", fake_start)
    r = authed_client.post("/api/accounts/capture", json={"name": "second", "scope": "me"})
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "plan_limit"


def test_capture_conflict_returns_409(authed_client, monkeypatch):
    def fake_start(**kwargs):
        raise CaptureAlreadyActive()

    monkeypatch.setattr("backend.api.accounts.start_session_capture", fake_start)
    r = authed_client.post("/api/accounts/capture", json={"name": "x", "scope": "me"})
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "capture_active"


def test_cancel_capture_endpoint_noop_204(authed_client):
    assert authed_client.delete("/api/accounts/capture/does-not-exist").status_code == 204