#!/bin/sh
set -eu

IMAGE_NAME="${IMAGE_NAME:-starnav:smoke}"
CONTAINER_NAME="${CONTAINER_NAME:-starnav-smoke-$$}"
HOST_PORT="${HOST_PORT:-38084}"
DATA_DIR="$(mktemp -d /tmp/starnav-docker-smoke.XXXXXX)"
DATA_DIR_PARENT="$(dirname "${DATA_DIR}")"
DATA_DIR_NAME="$(basename "${DATA_DIR}")"
BUILD_IMAGE="${BUILD_IMAGE:-1}"
NODE_IMAGE="${NODE_IMAGE:-node:24.14.1-slim}"
DOCKERFILE="${DOCKERFILE:-docker/Dockerfile}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-DockerSmoke123!}"
JWT_SECRET="${JWT_SECRET:-docker-smoke-secret-0123456789abcdef0123456789abcdef}"
TZ="${TZ:-Asia/Shanghai}"
HEALTH_URL="http://127.0.0.1:${HOST_PORT}/api/health"
LOGIN_URL="http://127.0.0.1:${HOST_PORT}/api/login"
APT_DEBIAN_MIRROR="${APT_DEBIAN_MIRROR:-}"
APT_DEBIAN_SECURITY_MIRROR="${APT_DEBIAN_SECURITY_MIRROR:-}"
HTTP_PROXY="${HTTP_PROXY:-}"
HTTPS_PROXY="${HTTPS_PROXY:-}"
NO_PROXY="${NO_PROXY:-}"

cleanup_data_dir() {
  if [ ! -e "${DATA_DIR}" ]; then
    return 0
  fi

  if rm -rf "${DATA_DIR}" 2>/dev/null; then
    return 0
  fi

  # Mounted data may be left owned by root inside CI containers, so fall back
  # to a short-lived helper container that can remove the host-mounted path.
  docker run --rm \
    -v "${DATA_DIR_PARENT}:${DATA_DIR_PARENT}" \
    --entrypoint /bin/sh \
    "${IMAGE_NAME}" \
    -c "rm -rf '${DATA_DIR_PARENT}/${DATA_DIR_NAME}'" >/dev/null 2>&1 || true

  rm -rf "${DATA_DIR}" 2>/dev/null || true
}

cleanup() {
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  cleanup_data_dir
}

trap cleanup EXIT INT TERM

run_docker_build() {
  if [ "${DOCKER_BUILDKIT+x}" = "x" ]; then
    DOCKER_BUILDKIT="${DOCKER_BUILDKIT}" docker build "$@"
    return
  fi

  if DOCKER_BUILDKIT=1 docker build "$@"; then
    return
  fi

  echo "BuildKit build failed, retrying with legacy builder..." >&2
  DOCKER_BUILDKIT=0 docker build "$@"
}

if [ "${BUILD_IMAGE}" = "1" ]; then
  set -- --build-arg "NODE_IMAGE=${NODE_IMAGE}"

  if [ -n "${APT_DEBIAN_MIRROR}" ]; then
    set -- "$@" --build-arg "APT_DEBIAN_MIRROR=${APT_DEBIAN_MIRROR}"
  fi

  if [ -n "${APT_DEBIAN_SECURITY_MIRROR}" ]; then
    set -- "$@" --build-arg "APT_DEBIAN_SECURITY_MIRROR=${APT_DEBIAN_SECURITY_MIRROR}"
  fi

  if [ -n "${HTTP_PROXY}" ]; then
    set -- "$@" --build-arg "HTTP_PROXY=${HTTP_PROXY}"
  fi

  if [ -n "${HTTPS_PROXY}" ]; then
    set -- "$@" --build-arg "HTTPS_PROXY=${HTTPS_PROXY}"
  fi

  if [ -n "${NO_PROXY}" ]; then
    set -- "$@" --build-arg "NO_PROXY=${NO_PROXY}"
  fi

  run_docker_build "$@" -f "${DOCKERFILE}" -t "${IMAGE_NAME}" .
fi

set -- \
  -d \
  --name "${CONTAINER_NAME}" \
  -p "${HOST_PORT}:8080" \
  -e "ADMIN_PASSWORD=${ADMIN_PASSWORD}" \
  -e "JWT_SECRET=${JWT_SECRET}" \
  -e "LOG_LEVEL=${LOG_LEVEL:-0}" \
  -e "TZ=${TZ}" \
  -v "${DATA_DIR}:/app/data"

if [ -n "${HTTP_PROXY}" ]; then
  set -- "$@" -e "HTTP_PROXY=${HTTP_PROXY}" -e NODE_USE_ENV_PROXY=1
fi

if [ -n "${HTTPS_PROXY}" ]; then
  set -- "$@" -e "HTTPS_PROXY=${HTTPS_PROXY}"
fi

if [ -n "${NO_PROXY}" ]; then
  set -- "$@" -e "NO_PROXY=${NO_PROXY}"
fi

docker run "$@" "${IMAGE_NAME}" >/dev/null

attempt=0
until curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "${attempt}" -ge 30 ]; then
    echo "Docker smoke failed: service did not become healthy in time" >&2
    docker logs "${CONTAINER_NAME}" >&2 || true
    exit 1
  fi
  sleep 2
done

LOGIN_RESPONSE="$(
  curl -fsS \
    -H 'Content-Type: application/json' \
    -X POST \
    -d "{\"username\":\"admin\",\"password\":\"${ADMIN_PASSWORD}\"}" \
    "${LOGIN_URL}"
)"

TOKEN="$(
  printf '%s' "${LOGIN_RESPONSE}" | if command -v node >/dev/null 2>&1; then
    node -e "
      let data = '';
      process.stdin.on('data', (chunk) => (data += chunk));
      process.stdin.on('end', () => {
        const body = JSON.parse(data);
        process.stdout.write(body?.data?.token || '');
      });
    "
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import json,sys; body=json.load(sys.stdin); print((body.get("data") or {}).get("token") or "", end="")'
  else
    echo "docker-smoke requires node or python3 to parse login token" >&2
    exit 1
  fi
)"

if [ -z "${TOKEN}" ]; then
  echo "Docker smoke failed: login did not return a token" >&2
  echo "${LOGIN_RESPONSE}" >&2
  exit 1
fi

echo "Docker smoke passed for ${IMAGE_NAME} on port ${HOST_PORT} using ${NODE_IMAGE}"
