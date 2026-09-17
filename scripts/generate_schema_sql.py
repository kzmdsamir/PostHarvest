#!/usr/bin/env python3
"""Regenerate backend/db/schema.sql from the SQLAlchemy ORM.

The ORM (backend/core/database.py Base.metadata) is the source of truth; this
script compiles the DDL for the PostgreSQL dialect (prod = Supabase Postgres)
into the checked-in reference file.

Usage:
    .venv/bin/python scripts/generate_schema_sql.py
"""
from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateIndex, CreateTable

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def main() -> None:
    from backend.core.database import Base
    from backend import models  # noqa: F401 - registers every model on Base.metadata

    lines = [
        "-- PostgreSQL reference schema for PostHarvest.",
        "--",
        "-- Generated from the SQLAlchemy ORM (backend/core/database.py Base.metadata)",
        "-- regenerate with `python scripts/generate_schema_sql.py`.",
        "-- The ORM is the source of truth; this file is for review / Supabase console",
        "-- provisioning and must be re-generated when models change.",
        "",
    ]
    for table in Base.metadata.sorted_tables:
        lines.append(str(CreateTable(table).compile(dialect=postgresql.dialect())) + ";")
        for index in sorted(table.indexes, key=lambda idx: idx.name or ""):
            lines.append(str(CreateIndex(index).compile(dialect=postgresql.dialect())) + ";")
        lines.append("")

    out = ROOT / "backend" / "db" / "schema.sql"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {out} ({len(Base.metadata.sorted_tables)} tables)")


if __name__ == "__main__":
    main()