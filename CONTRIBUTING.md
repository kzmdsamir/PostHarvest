# Contributing to PostHarvest

Welcome! PostHarvest extracts public Facebook pages and profiles (posts, media,
engagement) with honest export counts. Thanks for helping out.

Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before contributing — by
participating you agree to keep the space respectful. Incidents can be reported
to `report@postharvest.space`.

---

## Table of contents

1. [Project at a glance](#project-at-a-glance)
2. [Getting started](#getting-started)
3. [Branch model](#branch-model)
4. [Making a change — the contribution loop](#making-a-change--the-contribution-loop)
5. [Commit conventions](#commit-conventions)
6. [Promote & release flow](#promote--release-flow)
7. [Testing](#testing)
8. [Database schema changes (Alembic)](#database-schema-changes-alembic)
9. [Secrets & environment files](#secrets--environment-files)
10. [Issues & pull requests](#issues--pull-requests)

## Project at a glance

| Path | What lives there |
|---|---|
| `backend/` | FastAPI app, scraper, job runner, auth; SQLAlchemy models; Alembic migrations |
| `frontend/` | Next.js app (Jost design system), Firebase auth, vitest |
| `docker/` | Compose stacks (dev + prod) + nginx; the `docker/.env` split |
| `tests/` | Backend pytest suite (~180 tests) |
| `docs/` | Deployment guide, decisions, API docs |

## Getting started

**Requirements:** Python 3.13+ (project venv), Node 22+, Docker for the full stack.

```bash
# backend dependencies (install into .venv)
make backend-install

# frontend dependencies
make frontend-install

# full dev stack — backend :8000, frontend :3000, postgres, hot reload
make dev
```

**Env files** (all gitignored — see [Secrets](#secrets--environment-files)):

```bash
cp docker/example.env docker/.env   # docker compose (drives the prod stack)
cp .env.example .env                # local CLI / tests / next dev
```

Use `make help` for the full command list, and read
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) before touching deployment-related code.

## Branch model

Everything flows one way — up the ladder:

```
feature/*  ──PR──▶  testing  ──promote──▶  next  ──promote──▶  master
                                                                    │ release
                                                                    ▼
                                                      git tag + CHANGELOG.md
                                                      + GitHub release
                                                                    │
                                                                    ▼
                                                           production  (stable marker)
```

| Branch | Role | Rules |
|---|---|---|
| `feature/*`, `fix/*`, `chore/*` | your work-in-progress | base off `testing`; land via PR |
| `testing` | QA branch — PRs merge here, CI runs | maintainers promote it up |
| `next` | integration branch | only receives merges from `testing` |
| `master` | **default branch** — shipped & released | only receives merges from `next`; a push releases automatically |
| `production` | stable marker | mirrors `master`, never committed to directly |

**Never push directly to `master`, `next`, `testing`, or `production`.** They move
only through the promote flow (see below).

## Making a change — the contribution loop

**1. Base your branch off `testing`** (it carries all pending + shipped work):

```bash
git fetch origin
git checkout -b feature/my-thing origin/testing
```

Name work branches `feature/*`, `fix/*`, or `chore/*`.

**2. Commit with conventional commits** (see [next section](#commit-conventions)).

**3. Push and open a PR against `testing`:**

```bash
git push -u origin feature/my-thing
```

CI (pytest, typecheck, eslint/oxlint, vitest, lighthouse) runs on every PR and
on every push to `master`, `next`, and `testing`.

**4. After review, a maintainer merges the PR into `testing`.**

**5. A maintainer promotes the ladder**: `testing → next → master`. The `master`
push triggers semantic-release — version, changelog, tag, and GitHub release are
created automatically. Nobody runs releases manually.

> External contributors: fork the repo, push the feature branch to your fork,
> and open a PR targeting `teampostharvest/PostHarvest:testing`.

## Commit conventions

Commitlint (husky `commit-msg` hook) enforces the format on every commit:

```
type(scope): subject          # keep the subject ≤ 100 chars, imperative tone
```

The `type` is **not decoration** — `semantic-release` derives the version from it:

| Type | Release impact |
|---|---|
| `feat` (scope, new ability) | **minor** (1.0.0 → 1.1.0) |
| `fix` (behavior correct now) | **patch** (1.1.0 → 1.1.1) |
| `feat!` or a `BREAKING CHANGE:` footer | **major** (1.1.0 → 2.0.0) |
| `chore`, `docs`, `test`, `refactor`, `ci`, `style`, `perf`, `build`, `revert` | none — no release |

Good examples:

```
feat(accounts): add saved session management API
fix(scraper): retry cookies twice before falling back to anonymous
feat!(auth): require OPS_EMAILS on every login      # breaking
```

Self-check locally at any time:

```bash
npx commitlint --from HEAD~1 --to HEAD --verbose
```

## Promote & release flow

### `npm run promote` (recommended)

Promotes the ladder from the top level:

```bash
npm run promote           # full ladder: testing → next → master
npm run promote -- next   # only next → master
```

The script verifies a clean tree, fetches `origin`, fast-forwards local ladder
branches, merges the source into the target, and pushes. Pushing `master` fires
the release in CI. Optionally run the local test gate before that push:

```bash
GATE=1 npm run promote    # runs backend pytest + frontend vitest + tsc first
```

### Manual alternative (maintainers)

```bash
# promote testing → next
git checkout next    && git fetch origin && git merge --ff-only origin/next
git merge testing    && git push origin next

# promote next → master (release fires in CI on this push)
git checkout master  && git merge --ff-only origin/master
git merge next       && git push origin master
```

Notes:

- The release commit (`CHANGELOG.md`, version bumps) is created **on master only**
  by semantic-release. That's expected — feature branches never touch those files,
  so merges stay conflict-free.
- Never force-push any release branch.

## Testing

```bash
make test            # backend pytest suite (tests/)
make test-frontend   # frontend vitest
make test-all        # both

# frontend quality gates
cd frontend
npx tsc --noEmit
npm run lint         # eslint
npm run lint:ox      # oxlint (fast)
```

CI enforces all of the above on every PR and on pushes to `master`, `next`,
`testing`.

## Database schema changes (Alembic)

- **Alembic owns the production schema.** The backend container runs
  `alembic upgrade head` on boot, so prod always reaches the schema head.
- New table, column, or constraint → **add a new migration** in
  `backend/alembic/versions/`:

  ```bash
  cd backend && alembic revision --autogenerate -m "add_xyz"
  ```

  Then **review the generated file** — autogenerate can miss or misread things.
- **Never edit a migration that has already run** against Supabase. If you need
  to change something shipped, add another migration on top.
- `create_all` remains only as a dev/test convenience.
- See `docs/DEPLOYMENT.md` → *Database migrations* for the stamping procedure.

## Secrets & environment files

- Real credentials live **only** in the gitignored `docker/.env` (compose) and
  `.env` (local CLI/tests).
- Committed templates are `docker/example.env` and `.env.example` —
  placeholders only, never real values.
- **Never commit:** Supabase/Firebase keys, service accounts, cookie jars,
  scraped data dumps, or personal tokens. If a secret lands in a commit, it must
  be rotated, not just removed.

## Issues & pull requests

- **Issues:** use the templates in `.github/ISSUE_TEMPLATE/` — bug reports and
  feature requests. Include steps to reproduce and redact any credentials.
- **Pull requests:** use `.github/pull_request_template.md` — it has the
  checklist. PRs target `testing`. UI changes: include a screenshot.
- When an issue is small, needs clarification, or is a known bug, just say so in
  the thread — no need to open a PR for every change.

Thank you for contributing to PostHarvest!