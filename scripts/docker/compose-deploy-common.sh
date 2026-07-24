#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT_DIR}/docker/docker-compose.yml}"
SERVICE_NAME="${SERVICE_NAME:-nav}"
CONTAINER_NAME="${CONTAINER_NAME:-starnav}"
STATE_DIR="${STATE_DIR:-${ROOT_DIR}/data/releases}"
STATE_FILE="${STATE_FILE:-${STATE_DIR}/current.env}"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-30}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-2}"
DRY_RUN="${DRY_RUN:-0}"
SKIP_PULL="${SKIP_PULL:-0}"

log() {
  printf '%s\n' "$*"
}

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

require_env_file() {
  if [ ! -f "${ENV_FILE}" ]; then
    fail "缺少部署环境文件: ${ENV_FILE}。请先从 .env.example 复制并完成配置。"
  fi
}

read_env_value() {
  key="$1"

  if [ ! -f "${ENV_FILE}" ]; then
    return 0
  fi

  awk -F= -v key="${key}" '
    /^[[:space:]]*#/ { next }
    $1 == key {
      sub(/^[^=]*=/, "", $0)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", $0)
      print $0
      exit
    }
  ' "${ENV_FILE}"
}

resolve_runtime_config() {
  if [ -z "${STARNAV_IMAGE:-}" ]; then
    STARNAV_IMAGE="$(read_env_value STARNAV_IMAGE)"
  fi
  if [ -z "${STARNAV_TAG:-}" ]; then
    STARNAV_TAG="$(read_env_value STARNAV_TAG)"
  fi
  if [ -z "${STARNAV_PORT:-}" ]; then
    STARNAV_PORT="$(read_env_value STARNAV_PORT)"
  fi

  STARNAV_IMAGE="${STARNAV_IMAGE:-ghcr.io/starwishes/starnav}"
  STARNAV_TAG="${STARNAV_TAG:-latest}"
  STARNAV_PORT="${STARNAV_PORT:-8080}"
  HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${STARNAV_PORT}/api/health}"
  export STARNAV_IMAGE STARNAV_TAG STARNAV_PORT HEALTH_URL
}

detect_compose_variant() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_VARIANT="docker-compose-v2"
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_VARIANT="docker-compose-v1"
    return
  fi

  fail '未检测到 docker compose 或 docker-compose'
}

compose() {
  if [ "${DRY_RUN}" = "1" ]; then
    log "[dry-run] compose $*"
    return 0
  fi

  if [ "${COMPOSE_VARIANT}" = "docker-compose-v2" ]; then
    docker compose --project-directory "${ROOT_DIR}" -f "${COMPOSE_FILE}" "$@"
    return
  fi

  docker-compose --project-directory "${ROOT_DIR}" -f "${COMPOSE_FILE}" "$@"
}

current_image_ref() {
  if [ "${DRY_RUN}" = "1" ]; then
    return 0
  fi

  docker inspect "${CONTAINER_NAME}" --format '{{.Config.Image}}' 2>/dev/null || true
}

parse_image_ref() {
  image_ref="$1"

  case "${image_ref}" in
    *@*)
      fail "暂不支持 digest 形式的回滚镜像引用: ${image_ref}"
      ;;
    *:*)
      # shellcheck disable=SC2034
      PARSED_IMAGE="${image_ref%:*}"
      # shellcheck disable=SC2034
      PARSED_TAG="${image_ref##*:}"
      ;;
    *)
      # shellcheck disable=SC2034
      PARSED_IMAGE="${image_ref}"
      # shellcheck disable=SC2034
      PARSED_TAG="latest"
      ;;
  esac
}

timestamp() {
  date -u '+%Y-%m-%dT%H-%M-%SZ'
}

ensure_state_dir() {
  mkdir -p "${STATE_DIR}"
}

make_backup_path() {
  prefix="$1"
  ensure_state_dir
  printf '%s/%s-%s.db.bak' "${STATE_DIR}" "${prefix}" "$(timestamp)"
}

backup_database() {
  output_path="$1"

  if [ "${DRY_RUN}" = "1" ]; then
    log "[dry-run] npm run db:backup -- --output ${output_path}"
    return 0
  fi

  (
    cd "${ROOT_DIR}"
    npm run db:backup -- --output "${output_path}"
  )
}

restore_database() {
  backup_path="$1"

  if [ "${DRY_RUN}" = "1" ]; then
    log "[dry-run] npm run db:restore -- --from ${backup_path}"
    return 0
  fi

  if [ ! -f "${backup_path}" ]; then
    fail "找不到可用于恢复的数据库备份: ${backup_path}"
  fi

  (
    cd "${ROOT_DIR}"
    npm run db:restore -- --from "${backup_path}"
  )
}

wait_for_health() {
  if [ "${DRY_RUN}" = "1" ]; then
    log "[dry-run] wait for health at ${HEALTH_URL}"
    return 0
  fi

  attempt=0
  while [ "${attempt}" -lt "${HEALTH_ATTEMPTS}" ]; do
    if curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
      return 0
    fi

    attempt=$((attempt + 1))
    sleep "${HEALTH_INTERVAL_SECONDS}"
  done

  return 1
}

write_state_file() {
  image_ref="$1"
  rollback_image_ref="$2"
  rollback_backup_path="$3"

  if [ "${DRY_RUN}" = "1" ]; then
    log "[dry-run] write deployment state to ${STATE_FILE}"
    return 0
  fi

  ensure_state_dir
  tmp_file="${STATE_FILE}.tmp"

  {
    printf 'IMAGE_REF=%s\n' "${image_ref}"
    printf 'ROLLBACK_IMAGE_REF=%s\n' "${rollback_image_ref}"
    printf 'ROLLBACK_BACKUP_PATH=%s\n' "${rollback_backup_path}"
    printf 'STARNAV_PORT=%s\n' "${STARNAV_PORT}"
    printf 'UPDATED_AT=%s\n' "$(timestamp)"
  } > "${tmp_file}"

  mv "${tmp_file}" "${STATE_FILE}"
}

load_state_file() {
  if [ ! -f "${STATE_FILE}" ]; then
    fail "缺少部署状态文件: ${STATE_FILE}。请先执行一次成功部署。"
  fi

  # shellcheck disable=SC1090
  . "${STATE_FILE}"
}
