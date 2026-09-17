#!/usr/bin/env bash
#
# promote.sh — promote a branch up the release ladder.
#
#   feature/* ─▶ testing ─▶ next ─▶ master
#
# Pushing master fires semantic-release in CI (version bump, CHANGELOG.md,
# vX.Y.Z tag, GitHub release). See CONTRIBUTING.md → "Promote & release flow".
#
# Usage:
#   npm run promote             # full ladder: testing → next → master
#   npm run promote -- next     # only next → master
#   GATE=1 npm run promote      # run local checks (pytest + vitest + tsc) first
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

START="${1:-testing}"
GATE_MASTER="${GATE:-0}"
LADDER=(testing next master)

back_to="$(git symbolic-ref --short -q HEAD 2>/dev/null || echo 'master')"
trap 'git checkout -q "$back_to" 2>/dev/null || true' EXIT

say()  { printf '\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m*** %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m%s\033[0m\n' "$*" >&2; exit 1; }

# --- resolve the starting rung ---------------------------------------------
start_idx=-1
for i in "${!LADDER[@]}"; do
  [[ "${LADDER[$i]}" == "$START" ]] && start_idx="$i"
done
[[ "$start_idx" -ge 0 ]] || die "unknown start branch '$START' (want: testing | next | master)"

# --- refuse to run on a dirty tree -----------------------------------------
git diff --quiet       || die "working tree has unstaged changes — commit or stash first"
git diff --cached --quiet || die "working tree has staged changes — commit or stash first"

git fetch -q origin

run_gate() {  # optional local sanity before pushing master
  say "running local gate (backend pytest + frontend vitest + tsc)"
  [[ -x .venv/bin/pytest ]] && .venv/bin/pytest -q || warn "no .venv/bin/pytest — skipping backend"
  (cd frontend && npm run test)
  (cd frontend && npx tsc --noEmit)
}

promote() {
  local src="$1" dst="$2"
  say "promote $src → $dst"

  git rev-parse --verify "origin/$src" >/dev/null 2>&1 || die "origin/$src does not exist"
  git rev-parse --verify "origin/$dst" >/dev/null 2>&1 || die "origin/$dst does not exist"

  git checkout -q "$dst"
  git merge -q --ff-only "origin/$dst" \
    || die "local '$dst' has commits not on origin/$dst — reset it first (git branch -f $dst origin/$dst)"

  if git merge-base --is-ancestor "origin/$src" "origin/$dst"; then
    say "$dst already contains $src — nothing to promote"
    return
  fi

  git merge --no-edit "origin/$src"

  if [[ "$GATE_MASTER" == 1 && "$dst" == master ]]; then run_gate; fi

  git push origin "$dst"
  say "pushed $dst"
  [[ "$dst" == master ]] && say "master pushed — semantic-release will tag the release in CI"
}

for ((i = start_idx; i < ${#LADDER[@]} - 1; i++)); do
  promote "${LADDER[$i]}" "${LADDER[$i + 1]}"
done

say "done — back on $back_to"