## Summary

<!-- One or two sentences: what this PR does and why it exists. -->

## Type of change

<!-- Mark the one that matches (and what semantic-release will do with it). -->

- [ ] `feat` — new capability (→ **minor** release)
- [ ] `fix` — correct behavior (→ **patch** release)
- [ ] `feat!` / `BREAKING CHANGE` footer (→ **major** release)
- [ ] `chore` / `refactor` / `test` / `docs` / `ci` (→ no release)

## Checklist

- [ ] Branch targets **`testing`** (per CONTRIBUTING.md — never `master`/`next` directly)
- [ ] Commits follow conventional commits (`type(scope): subject`, ≤ 100 chars)
- [ ] CI is green: pytest, typecheck, eslint/oxlint, vitest
- [ ] Tests added/updated for the behavior I changed
- [ ] Schema changes ship as a **new Alembic migration** (Alembic owns prod schema;
      I did not edit an already-applied migration)
- [ ] No secrets added — credentials stay in the gitignored `docker/.env`
- [ ] `CHANGELOG.md` intentionally untouched (semantic-release owns it)
- [ ] Docs updated if user-facing behavior changed (`docs/`, `CONTRIBUTING.md`)

## Test plan

<!-- How did you verify this? Commands run and what you checked. -->

```
make test
make test-frontend
npx tsc --noEmit
```

<!-- Anything else (e.g. "visually verified the capture viewer", "checked /api/health"). -->

## Screenshots

<!-- For UI changes: before / after. -->

## Related issues

<!-- e.g. "Closes #42" -->