# TODO — PostHarvest

Status snapshot: 2026-09-17. Legend: **✅** done to this stage · **⬜** pending
(roadmap items from [ROADMAP.md](./ROADMAP.md), reality-checked against the code).

---

## ✅ Done

### Core product — scraper + API
- [x] Job-based Facebook page/profile scraping with two modes: **HTTP** (fast, ~3 s) and **browser** (Playwright + Chromium, JS, scrolling, saved-cookie auth)
- [x] Job manager: live progress, best-effort cancellation, **pause/resume**, per-source lifecycles (`queued → running → completed | failed | cancelled`)
- [x] **CrawlState checkpointing** — resume paused/crashed jobs where they left off
- [x] Normalized **33-key post schema** (missing fields stay `null`/`[]`, never fabricated)
- [x] Two-layer dedup (post-id + SHA-256 fingerprint)
- [x] Filters: date range, post type (`text/image/video/link/all`), `max_posts`
- [x] Rate limiter (token bucket) + retry manager (circuit breaker, exponential backoff on 429/5xx)
- [x] Configurable proxy support (`ProxyManager`)
- [x] Exports: **JSON / CSV / XLSX / JSONL** (streaming)
- [x] Consistent error envelope `{"error": {"code", "message"}}`; `/api/health` with DB latency check
- [x] Standalone **CLI** (`python cli.py` — login, accounts, scrape, export)

### Database
- [x] SQLite out of the box; Postgres via `DATABASE_URL`
- [x] **Supabase** (managed Postgres) as the production database (`SUPABASE_DB_URL`) — schema stamped **once** with `alembic -c backend/alembic.ini stamp head`
- [x] **Alembic owns the schema**: repo has the initial migration `20260917_001_initial_schema.py`; backend runs `alembic upgrade head` on boot (no more `create_all` in prod)

### Containers & deploy tooling
- [x] Dev compose stack: backend :8000 + frontend :3000, hot reload (`make dev`/`dev-up`)
- [x] Prod compose layer `docker-compose.prod.yml`: **nginx** :80/:443 + backend + frontend + postgres, non-root, read-only rootfs, dropped caps, mem/CPU limits (`make prod-up`)
- [x] Playwright + Chromium baked into the backend image; browser mode verified inside Docker
- [x] Makefile (dev/prod/test/lint/backend/frontend targets)
- [x] Env split: `docker/.env` (compose) + root `.env` (CLI/tests), both gitignored; tracked templates `docker/example.env` + `.env.example`
- [x] Single-replica constraint documented (in-process job workers)

### Frontend
- [x] Next.js dashboard (Jost design system) with jobs/exports/accounts screens; public Home with login entry
- [x] WebSocket capture bridge for saved-account captures
- [x] **Pricing page + top-nav menu** (`df4861e`)

### Quality, docs & compliance
- [x] Backend pytest suite (**179 tests**) + frontend vitest
- [x] `tsc` typecheck, ESLint, **oxlint pinned 1.83.0**, Lighthouse CI
- [x] Docs: README, `docs/{API,ARCHITECTURE,DEPLOYMENT,README}`, `DECISIONS.md`, `COMPLIANCE.md`, `ROADMAP.md`
- [x] `.editorconfig`
- [x] **CONTRIBUTING.md** (branch model + commit conventions + promote flow), **CODE_OF_CONDUCT.md** (enforcement → `report@postharvest.space`), **issue templates** (bug + feature) + **pull request template**
- [x] Dependabot + Renovate configs

### Release engineering (this stage)
- [x] **semantic-release pipeline** wired (commit-analyzer, release-notes-generator, changelog, npm, git, github plugins) — versions from `frontend/package.json`
- [x] Branch ladder **`master` ← `next` ← `testing` ← `feature/*`**; `master` = default branch; releases from master only
- [x] **`production`** marker branch (mirrors master)
- [x] **Commitlint** + husky 9.1.7 gate on every commit (`feat|fix|chore…` convention)
- [x] Release scripts: `npm run release` / `release:dry` / **`promote`** + `scripts/promote.sh` (ladder runner, `GATE=1` local pre-push checks)
- [x] CI gates run on `master`/`next`/`testing` pushes + PRs; release workflow fires on `master` only
- [x] **v1.0.0 released in CI** (`e781e7a`, first release folding the 134-commit history)
- [x] **v1.0.1 released in CI** via full promote (`testing → next → master`, merge `55ec67a`; tag `cb00ce7`) — genuine end-to-end run caught and fixed a script bug (`91db989`), then released
- [x] `CHANGELOG.md` auto-generated; public GitHub releases (repo is public — flagged & accepted)

---

## ⬜ Pending — roadmap phases (from [ROADMAP.md](./ROADMAP.md))

### Phase 2 — Core SaaS plumbing
- [ ] **Firebase server-side verification on every `/api` route** — today only a bare `firebase_uid` field exists in `backend/api/auth.py`; no token verification, no Firebase in frontend app code (only `node_modules`)
- [ ] **`owner_id` on every persisted row** — partial: present in schema + saved-accounts/exports/scrape paths; not audited across all models; backfill migration pending
- [ ] **Frontend Firebase integration** (Google OAuth + email/password, shared auth provider, dashboard gating)
- [ ] **Encrypted per-owner FB session storage** + owner-scoped accounts API (still plaintext shared pool `data/fb_cookies_*.json`)

### Phase 3 — Production topology
- [ ] **Let's Encrypt / nginx TLS** + point `postharvest.space` DNS (public deploy still pending — stack currently runs on the laptop, LAN)
- [ ] **CORS audit** (restrict to public origin) + hide `/docs` in prod
- [x] nginx service + docker network layout already in place (roadmap's local postgres container is superseded by Supabase)

### Phase 4 — Hardening & abuse protection
- [ ] **Quota middleware** (concurrency + page caps + daily ceiling) — **not implemented yet** (no quota code in the backend)
- [ ] **Startup sweep** for orphaned `running` jobs + quota release (decision locked in ROADMAP; implementation pending)
- [ ] Outbound **proxy rotation** wiring exposed via env
- [ ] **Structured logs + request IDs** + basic error telemetry

### Phase 5 — Launch
- [ ] Seed admin account + full-funnel smoke test on prod Postgres over nginx/TLS
- [ ] Load test: N concurrent users/jobs/exports; tune worker threads
- [ ] Backup strategy (pg_dump cron into a second volume; note Supabase-hosted backups)

### Phase 6 — Monetization (seams only — no UI until billing ships)
- [ ] `Organization`/`plan` + subscription hooks behind the existing limits resolver
- [ ] Stripe checkout + webhooks + customer portal; plan gating by tier
- [ ] Plan-aware UI (strictly post-billing)

---

## ⬜ Pending — engineering follow-ups (parked at this stage)

- [ ] **Flaky WS mirror test still flakes in CI** — `test_capture_ws_bridge_forwards_frames` → `CancelledError` (failed on the master push 2026-09-17: 178 passed / 1 failed). Earlier fix `91820b3` helped locally but is insufficient under CI load
- [ ] **GitHub branch protection** on `master` (require PR + CI checks, only `next → master`)
- [ ] **Release → deployment/version consumption** — images still `:latest`, `backend settings.version` hardcoded `"1.0.0"` in `/api/health`; wire release versions through
- [ ] **Add Python 3.13 to the CI matrix** (currently runs 3.11)

---

## Who did what

| Who | Email | Contributions |
|---|---|---|
| **Reza** (project owner) | reza1234khan1234@gmail.com | Author of the whole project: scraper core, API + CLI, frontend, Docker/deploy tooling, docs; directed the release-engineering stage (92 commits under git identities `Sagittarius` / `イムティヤズ` / `apocalypse`) |
| **Claude** (AI coding assistant, via OpenCode on Reza's machine) | — | Executed under direction: semantic-release wiring, branch ladder + `production` branch, commitlint/husky, CI trigger fixes, CONTRIBUTING / CoC / issue + PR templates, promote script + live promote runs (v1.0.0, v1.0.1), production marker sync, this TODO |
| **Kazi Samir** | kzsamir849@gmail.com | Earlier foundation-era maintainer (kzmdsamir-era `main`/`production` branches — fully superseded and removed); 31 commits |
| **dependabot[bot]** | 49699333+dependabot[bot]@users.noreply.github.com | Automated dependency bumps (backend, frontend); 16 commits |