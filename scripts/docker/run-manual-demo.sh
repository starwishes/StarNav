#!/bin/sh
# Start a production-like StarNav container and seed realistic bookmarks.
set -eu

ROOT_DIR="$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)"
IMAGE_NAME="${IMAGE_NAME:-starnav:smoke}"
CONTAINER_NAME="${CONTAINER_NAME:-starnav-manual-demo}"
HOST_PORT="${HOST_PORT:-8080}"
DATA_DIR="${DATA_DIR:-${ROOT_DIR}/data/manual-demo}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-UkTm7hXOUp27pbRFsY88GoS8}"
JWT_SECRET="${JWT_SECRET:-rucL6_4F8NDlKvQ0WBUPhbvos9xjIOoYQd65i-4HJcs83FsM6Ufr1RqeImf9NzAn}"
TZ="${TZ:-Asia/Shanghai}"
# Default: generate seed JSON via realisticBookmarkDataset (no committed fixtures).
# Override count with SEED_COUNT=1000, or pass a prebuilt file with FIXTURE=/path/to.json
SEED_COUNT="${SEED_COUNT:-100}"
FIXTURE="${FIXTURE:-}"
BASE_URL="http://127.0.0.1:${HOST_PORT}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required" >&2
  exit 1
fi

if ! docker image inspect "${IMAGE_NAME}" >/dev/null 2>&1; then
  echo "image ${IMAGE_NAME} not found; build first, e.g.:" >&2
  echo "  docker build -f docker/Dockerfile -t starnav:smoke ." >&2
  exit 1
fi

mkdir -p "${DATA_DIR}"

if [ -n "${FIXTURE}" ]; then
  if [ ! -f "${FIXTURE}" ]; then
    echo "fixture not found: ${FIXTURE}" >&2
    exit 1
  fi
else
  FIXTURE="${DATA_DIR}/seed-realistic-bookmarks-${SEED_COUNT}.json"
  echo "generating ${SEED_COUNT} realistic bookmarks -> ${FIXTURE}"
  TSX_BIN="${ROOT_DIR}/node_modules/.bin/tsx"
  if [ -x "${TSX_BIN}" ]; then
    "${TSX_BIN}" "${ROOT_DIR}/src/server/tools/realisticBookmarkDataset.ts" "${SEED_COUNT}" "${FIXTURE}"
  elif command -v npx >/dev/null 2>&1; then
    (cd "${ROOT_DIR}" && npx --no-install tsx src/server/tools/realisticBookmarkDataset.ts "${SEED_COUNT}" "${FIXTURE}")
  else
    echo "tsx is required to generate the seed dataset (npm install first)" >&2
    exit 1
  fi
  if [ ! -f "${FIXTURE}" ]; then
    echo "failed to generate fixture: ${FIXTURE}" >&2
    exit 1
  fi
fi

if docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  echo "removing existing container ${CONTAINER_NAME}"
  docker rm -f "${CONTAINER_NAME}" >/dev/null
fi

echo "starting ${CONTAINER_NAME} on http://127.0.0.1:${HOST_PORT}"
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${HOST_PORT}:8080" \
  -e "NODE_ENV=production" \
  -e "PORT=8080" \
  -e "LOG_LEVEL=${LOG_LEVEL:-3}" \
  -e "ADMIN_USERNAME=${ADMIN_USERNAME}" \
  -e "ADMIN_PASSWORD=${ADMIN_PASSWORD}" \
  -e "JWT_SECRET=${JWT_SECRET}" \
  -e "TZ=${TZ}" \
  -v "${DATA_DIR}:/app/data" \
  --restart unless-stopped \
  "${IMAGE_NAME}" >/dev/null

ok=0
i=0
while [ "${i}" -lt 40 ]; do
  i=$((i + 1))
  if curl -fsS "${BASE_URL}/api/health" >/tmp/starnav-manual-health.json 2>/dev/null; then
    ok=1
    break
  fi
  sleep 1
done

if [ "${ok}" -ne 1 ]; then
  echo "service did not become healthy" >&2
  docker logs "${CONTAINER_NAME}" 2>&1 | tail -50 >&2 || true
  exit 1
fi

echo "healthy; importing realistic bookmarks from ${FIXTURE}..."

python3 - "${BASE_URL}" "${ADMIN_USERNAME}" "${ADMIN_PASSWORD}" "${FIXTURE}" <<'PY'
import json
import sys
import urllib.error
import urllib.request

base_url, username, password, fixture_path = sys.argv[1:5]

def request(method, path, body=None, token=None):
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(base_url + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
        return resp.status, json.loads(raw) if raw else {}

try:
    status, login = request(
        "POST",
        "/api/login",
        {"username": username, "password": password},
    )
except urllib.error.HTTPError as exc:
    print(f"login failed: HTTP {exc.code}", file=sys.stderr)
    print(exc.read().decode("utf-8", errors="replace"), file=sys.stderr)
    sys.exit(1)

token = ((login.get("data") or {}).get("token")) or ""
if not token:
    print("login did not return token:", login, file=sys.stderr)
    sys.exit(1)

payload = json.loads(open(fixture_path, encoding="utf-8").read())
content = payload.get("content") or payload
body = {
    "action": "replace",
    "categories": content.get("categories") or [],
    "items": content.get("items") or [],
}

try:
    status, result = request("POST", "/api/data", body, token=token)
except urllib.error.HTTPError as exc:
    print(f"import failed: HTTP {exc.code}", file=sys.stderr)
    print(exc.read().decode("utf-8", errors="replace"), file=sys.stderr)
    sys.exit(1)

if not result.get("success", True) and status >= 400:
    print("import failed:", result, file=sys.stderr)
    sys.exit(1)

status, data = request("GET", "/api/data", token=token)
payload_data = data.get("data") or data
cats = payload_data.get("categories") or []
items = payload_data.get("items") or []
print(f"imported categories={len(cats)} items={len(items)}")
expected = len(body.get("items") or [])
if len(items) < expected:
    print(f"warning: expected {expected} items, got {len(items)}", file=sys.stderr)
    sys.exit(1)
PY

cat <<EOF

========================================
StarNav manual demo is ready
========================================
URL:      ${BASE_URL}
Admin:    ${ADMIN_USERNAME}
Password: ${ADMIN_PASSWORD}
TZ:       ${TZ}
Data:     ${DATA_DIR}
Image:    ${IMAGE_NAME}
Container:${CONTAINER_NAME}

Seed: ${FIXTURE}

Useful:
  docker logs -f ${CONTAINER_NAME}
  docker stop ${CONTAINER_NAME}
  docker start ${CONTAINER_NAME}
  docker rm -f ${CONTAINER_NAME}
========================================
EOF
