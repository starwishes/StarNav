#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname "$0")" && pwd)
REPO_DIR=$(CDPATH='' cd -- "${SCRIPT_DIR}/../.." && pwd)
PLAYWRIGHT_VERSION="${PLAYWRIGHT_VERSION:-$(cd "${REPO_DIR}" && node -p "require('./node_modules/playwright-core/package.json').version" 2>/dev/null || printf '1.59.1')}"
PLAYWRIGHT_IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble}"
PLAYWRIGHT_ENTRYPOINT="${PLAYWRIGHT_ENTRYPOINT:-scripts/quality/browser-regression.mjs}"
HOST_PORT="${HOST_PORT:-38112}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-BrowserQa123!}"
SITE_NAME="${SITE_NAME:-StarNav Browser QA}"
JWT_SECRET="${JWT_SECRET:-browser-regression-secret-0123456789abcdef0123456789abcdef}"
DOCKER_HOST_ALIAS="${DOCKER_HOST_ALIAS-host.docker.internal:host-gateway}"
SERVER_PID=""
DATA_DIR=""
LOG_FILE="${LOG_FILE:-/tmp/starnav-browser-regression-${HOST_PORT}.log}"
BASE_URL="${BASE_URL:-}"

cleanup() {
  if [ -n "${SERVER_PID}" ]; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" >/dev/null 2>&1 || true
  fi

  if [ -n "${DATA_DIR}" ]; then
    rm -rf "${DATA_DIR}"
  fi
}

trap cleanup EXIT INT TERM

to_docker_base_url() {
  printf '%s' "$1" | sed \
    -e 's#://127\.0\.0\.1#://host.docker.internal#' \
    -e 's#://localhost#://host.docker.internal#'
}

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  (
    cd "${REPO_DIR}"
    npm run build
  )
fi

if [ -z "${BASE_URL}" ]; then
  DATA_DIR=$(mktemp -d /tmp/starnav-browser-regression.XXXXXX)
  BASE_URL="http://127.0.0.1:${HOST_PORT}"

  (
    cd "${REPO_DIR}"
    PORT="${HOST_PORT}" \
      NODE_ENV=production \
      DATA_PATH="${DATA_DIR}" \
      ADMIN_PASSWORD="${ADMIN_PASSWORD}" \
      JWT_SECRET="${JWT_SECRET}" \
      LOG_LEVEL="${LOG_LEVEL:-0}" \
      CORS_ORIGINS="${CORS_ORIGINS:-${BASE_URL}}" \
      ./node_modules/.bin/tsx server.ts
  ) >"${LOG_FILE}" 2>&1 &
  SERVER_PID=$!

  attempt=0
  until curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "${attempt}" -ge 45 ]; then
      echo "Browser regression failed: service did not become healthy in time" >&2
      cat "${LOG_FILE}" >&2 || true
      exit 1
    fi

    if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
      echo "Browser regression failed: server exited early" >&2
      cat "${LOG_FILE}" >&2 || true
      exit 1
    fi

    sleep 2
  done
fi

DOCKER_BASE_URL="${DOCKER_BASE_URL:-$(to_docker_base_url "${BASE_URL}")}"

if [ -n "${DOCKER_HOST_ALIAS}" ]; then
  docker run --rm \
    --add-host="${DOCKER_HOST_ALIAS}" \
    -e BASE_URL="${DOCKER_BASE_URL}" \
    -e ADMIN_PASSWORD="${ADMIN_PASSWORD}" \
    -e JWT_SECRET="${JWT_SECRET}" \
    -e SITE_NAME="${SITE_NAME}" \
    -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    -v "${REPO_DIR}:/work" \
    -w /work \
    "${PLAYWRIGHT_IMAGE}" \
    node "${PLAYWRIGHT_ENTRYPOINT}"
else
  docker run --rm \
    -e BASE_URL="${DOCKER_BASE_URL}" \
    -e ADMIN_PASSWORD="${ADMIN_PASSWORD}" \
    -e JWT_SECRET="${JWT_SECRET}" \
    -e SITE_NAME="${SITE_NAME}" \
    -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    -v "${REPO_DIR}:/work" \
    -w /work \
    "${PLAYWRIGHT_IMAGE}" \
    node "${PLAYWRIGHT_ENTRYPOINT}"
fi
