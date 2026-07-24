#!/bin/sh
set -eu

npm run versions:check
npm run lint:check
npm run lint:ops
npm run audit:prod
npm run test:fast
npm run test:smoke
npm run build
SKIP_BUILD=1 npm run test:browser
npm run docker:smoke

VERSION="$(node --input-type=module -e "import fs from 'node:fs'; const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); process.stdout.write(pkg.version);")"
TAG="v${VERSION}"
GH_CLI_AUTH=0

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  GH_CLI_AUTH=1
fi

if [ -z "${GITHUB_TOKEN:-${GH_TOKEN:-}}" ] && [ "${GH_CLI_AUTH}" -ne 1 ]; then
  echo "Validated local release gates. Planned release version from package.json: ${TAG}"
  echo "Skipping remote release existence check because neither GITHUB_TOKEN/GH_TOKEN nor gh CLI auth is available."
  exit 0
fi

if [ -n "${GITHUB_TOKEN:-${GH_TOKEN:-}}" ]; then
  if GH_TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}" gh release view "${TAG}" >/dev/null 2>&1; then
    echo "GitHub release ${TAG} already exists."
  else
    echo "GitHub release ${TAG} does not exist yet."
  fi
elif gh release view "${TAG}" >/dev/null 2>&1; then
  echo "GitHub release ${TAG} already exists."
else
  echo "GitHub release ${TAG} does not exist yet."
fi

echo "Validated local release gates. Planned release version from package.json: ${TAG}"
