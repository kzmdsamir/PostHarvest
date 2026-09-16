# PostHarvest — Agent Rules (feature/auth)

Scope: Firebase Auth + owner_id multitenancy. Auth changes access control,
never scraper behavior.

## Verified starting state — do not re-derive, do not contradict
- feature/auth == testing == e505b65. Branch is already frozen. Do not create,
  rebase, or force-push branches.
- No Alembic exists. Schema is created by Base.metadata.create_all
  (backend/core/database.py:86-95, called from backend/main.py:48).
- Job routes share one lookup helper: _get_job_or_404 (backend/api/jobs.py:39).
  TWO routes bypass it: GET /jobs/{id}/stats (backend/services/stats.py:21) and
  the export path (backend/services/export_service.py:123).
- The frontend has exactly ONE fetch(): request() in frontend/lib/api.ts:45.
- Exports download via a plain anchor: frontend/components/export-area.tsx:44.
  An anchor cannot send an Authorization header. This must be solved before
  the export route is protected.
- Accounts are filesystem-only. No facebook_accounts table exists.
  data/fb_credentials.json + data/fb_cookies_<name>.json, bind-mounted and
  shared with the host CLI.
- 58 client.* calls across 5 test files will 401 once routes are protected.
  tests/conftest.py:88 is a SESSION-scoped TestClient; a second one per
  process is unsafe per its own docstring.
- ROADMAP.md and DECISIONS.md do NOT exist. Do not cite them. The real
  documented direction is docs/ARCHITECTURE.md:172-180.

## Hard denylist — do not modify
backend/scraper/** (parser, normalizer, dedup, browser_scraper, pagination,
rate_limiter, proxy_manager, crawler, adapters, fetcher), backend/exporters/**,
existing test assertions (add tests, never weaken one), main / testing / 
production branches, docker/example.env real values.

If a task seems to require a denylist file, STOP and report.

## Allowlist
backend/auth/** (new), backend/alembic/** (new), backend/models/** (User +
scrape_jobs.owner_id only), backend/api/**, backend/services/{job,export,stats}_service.py
(ownership filters only), backend/core/config.py (env vars only),
frontend/lib/{firebase,auth,api}.ts, frontend/components/export-area.tsx,
frontend auth routes, tests/conftest.py, new tests/test_auth*.py,
tests/test_tenancy*.py, .gitignore, .env.example.

## Security invariants
1. Identity comes only from a verified Firebase ID token. Never from body,
   query, or a client-supplied header.
2. Ownership goes in the SQL WHERE clause — including DELETE statements
   (backend/api/jobs.py:209). Never fetch-then-check in Python.
3. Cross-tenant → 404 with the existing envelope. 403 is reserved for
   account_disabled and quota_exceeded only.
4. Never leak Firebase internals (cert kid, JWT parse detail) to the client.
   Log server-side, return {"error":{"code":"invalid_token", ...}}.
5. Service-account credentials never reach the repo, the image, or any
   NEXT_PUBLIC_* variable.
6. Frontend guards are UX. Security is FastAPI.

## Architecture constraints
- Firebase = identity. PostgreSQL = all data. No Firestore.
- owner_id goes on scrape_jobs ONLY. Every child already has an indexed
  job_id with ON DELETE CASCADE — do not add redundant owner columns.
- users.id (int) is the FK target. users.firebase_uid is UNIQUE, not an FK.
- Backend stays a SINGLE replica (in-process ThreadPoolExecutor job state).
  No Redis, no Celery, no extra replicas.
- New schema goes through Alembic, not create_all.

## Protocol
Read before writing; cite file:line. Plan, wait for "go", then implement.
One phase per task. Run `make test` after every phase and report the count
against the 133 baseline. Conventional Commits, one concern each.
Never state a repo fact you have not opened the file to confirm.