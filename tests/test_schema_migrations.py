"""Alembic migration tests — the migrations must equal the ORM models.

Historically the deployed (Supabase) schema was built by ``create_all``;
Alembic is now the schema authority in prod (``alembic upgrade head`` runs
before uvicorn boots in docker-compose.prod.yml). These tests run the full
migration chain ``upgrade head`` from scratch against a fresh SQLite file and
assert the resulting schema, so drift between the models and the migrations
fails here instead of as a broken prod deploy.
"""
from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ALEMBIC_INI = REPO_ROOT / "backend" / "alembic.ini"

EXPECTED_TABLES = {
    "crawl_states",
    "engagement_metrics",
    "errors",
    "export_jobs",
    "media",
    "posts",
    "saved_accounts",
    "scrape_jobs",
    "sources",
    "users",
}


def _upgrade_head(db_path: Path) -> None:
    env = dict(os.environ)
    env["DATABASE_URL"] = f"sqlite:///{db_path}"
    env["SUPABASE_DB_URL"] = ""
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "-c", str(ALEMBIC_INI), "upgrade", "head"],
        cwd=REPO_ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert result.returncode == 0, (
        f"alembic upgrade head failed:\n{result.stdout}\n{result.stderr}"
    )


def _table_names(db_path: Path) -> set[str]:
    with sqlite3.connect(db_path) as conn:
        rows = conn.execute(
            "select name from sqlite_master where type='table'"
        ).fetchall()
    return {r[0] for r in rows}


def _columns(db_path: Path, table: str) -> set[str]:
    with sqlite3.connect(db_path) as conn:
        rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return {r[1] for r in rows}


def test_migrations_build_full_schema(tmp_path: Path) -> None:
    """Fresh ``upgrade head`` creates every model table with key columns."""
    db = tmp_path / "migrated.db"
    _upgrade_head(db)

    assert EXPECTED_TABLES <= _table_names(db)

    # The columns this test exists to catch (auth + multitenancy ownership).
    assert {"id", "firebase_uid", "role", "plan", "is_active"} <= _columns(
        db, "users"
    )
    assert {"owner_id", "scope", "name", "cookies"} <= _columns(
        db, "saved_accounts"
    )
    assert {"owner_id", "status", "cancel_requested"} <= _columns(
        db, "scrape_jobs"
    )

    with sqlite3.connect(db) as conn:
        versions = [
            r[0] for r in conn.execute("select version_num from alembic_version")
        ]
    assert versions == ["001_initial_schema"]


def test_migrations_are_idempotent_when_at_head(tmp_path: Path) -> None:
    """Re-running ``upgrade head`` on an up-to-date DB is a no-op."""
    db = tmp_path / "stamped.db"
    _upgrade_head(db)
    _upgrade_head(db)  # must not raise