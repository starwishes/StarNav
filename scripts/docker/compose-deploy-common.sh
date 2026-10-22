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

# 数据库备份/恢复在容器内执行：纯 Docker 交付的宿主机可能没有 node_modules，
# 直接跑宿主机 `npm run db:backup/restore` 会第一步即失败（第 35 轮 G5）。
# compose 把 ./data 挂载到容器 /app/data，故写到该目录下的备份文件宿主机可见。
HOST_DATA_DIR="${HOST_DATA_DIR:-${ROOT_DIR}/data}"
CONTAINER_DATA_DIR="${CONTAINER_DATA_DIR:-/app/data}"
# 恢复用的一次性容器镜像；留空时取当前 STARNAV_IMAGE:STARNAV_TAG。
TOOL_IMAGE="${TOOL_IMAGE:-}"

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

# 宿主机 data 目录下的路径 → 容器内路径（db:backup/restore 在容器内执行时使用）。
to_container_path() {
  host_path="$1"

  case "${host_path}" in
    "${HOST_DATA_DIR}"/*)
      printf '%s/%s' "${CONTAINER_DATA_DIR}" "${host_path#"${HOST_DATA_DIR}"/}"
      ;;
    *)
      fail "备份路径必须位于宿主数据目录 ${HOST_DATA_DIR} 下（compose 仅挂载该目录到容器）：${host_path}"
      ;;
  esac
}

container_running() {
  [ "$(docker inspect -f '{{.State.Running}}' "${CONTAINER_NAME}" 2>/dev/null || true)" = "true" ]
}

resolve_tool_image() {
  if [ -z "${TOOL_IMAGE}" ]; then
    TOOL_IMAGE="${STARNAV_IMAGE}:${STARNAV_TAG}"
  fi
}

backup_database() {
  output_path="$1"

  if [ "${DRY_RUN}" = "1" ]; then
    log "[dry-run] docker exec ${CONTAINER_NAME} npm run db:backup -- --output $(to_container_path "${output_path}")"
    return 0
  fi

  # 部署前备份针对"当前运行中的容器"。容器未运行（首次部署/已停止）说明没有在跑的
  # 数据需要保护，给明确提示后跳过，不阻断部署流程。
  if ! container_running; then
    log "容器 ${CONTAINER_NAME} 未运行，跳过部署前数据库备份（无运行中数据需要保护）。"
    return 0
  fi

  # 以容器默认（root）执行：备份输出目录由宿主机 mkdir 创建，属主可能与容器 node
  # 用户（uid 1000）不一致，root 可无碍写入；文件对宿主/容器均可读。
  docker exec "${CONTAINER_NAME}" \
    npm run db:backup -- --output "$(to_container_path "${output_path}")"
}

restore_database() {
  backup_path="$1"

  if [ "${DRY_RUN}" = "1" ]; then
    log "[dry-run] docker run --rm -v ${HOST_DATA_DIR}:${CONTAINER_DATA_DIR} ${TOOL_IMAGE:-<image>} npm run db:restore -- --from $(to_container_path "${backup_path}")"
    return 0
  fi

  if [ ! -f "${backup_path}" ]; then
    fail "找不到可用于恢复的数据库备份: ${backup_path}"
  fi

  # 恢复前应用容器已被 stop，无法 docker exec 到已停止的容器：改用一次性容器复用
  # 同一镜像里的 node_modules 执行 db:restore，并挂载宿主 data 目录。
  resolve_tool_image
  docker run --rm \
    -v "${HOST_DATA_DIR}:${CONTAINER_DATA_DIR}" \
    "${TOOL_IMAGE}" \
    npm run db:restore -- --from "$(to_container_path "${backup_path}")"
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
