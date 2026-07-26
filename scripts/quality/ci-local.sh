#!/bin/sh
# Run the same checks as .github/workflows/ci.yml (validate job), for pre-push use.
# Usage: sh scripts/quality/ci-local.sh
# Optional: SKIP_DOCKER=1 to skip docker smoke (faster).
set -eu

ROOT_DIR="$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)"
cd "${ROOT_DIR}"

export CI=true
export HUSKY=0

# Prefer real docker/shellcheck on Windows/Git Bash PATH quirks.
export PATH="/usr/bin:/bin:${PATH}"

step() {
  printf '\n======== %s ========\n' "$1"
}

step "Lint"
npm run lint:check

step "Ops lint (shell + dockerfile)"
# Call shell helpers directly so Windows npm/cmd PATH quirks cannot hide docker.
sh scripts/quality/lint-shell.sh
sh scripts/quality/lint-dockerfile.sh

step "Git whitespace check"
# Only check unstaged/staged diffs; clean tree is a no-op success.
git diff --check
git diff --cached --check

step "Production dependency audit"
npm run audit:prod

step "Typecheck (web + server)"
npm run typecheck

step "OpenAPI types drift check"
npm run openapi:types:check

step "Extension common sync check"
npm run extension:sync-common:check

step "Test surface stats"
npm run test:stats

step "Coverage regression"
npm run test:coverage

step "Runtime smoke"
npm run test:smoke:runtime

step "Build"
npm run build

if [ "${SKIP_DOCKER:-0}" != "1" ]; then
  step "Docker smoke"
  npm run docker:smoke
else
  step "Docker smoke (skipped via SKIP_DOCKER=1)"
fi

printf '\n======== CI local: all checks passed ========\n'
