#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=scripts/docker/compose-deploy-common.sh
. "${SCRIPT_DIR}/compose-deploy-common.sh"

require_env_file
resolve_runtime_config
detect_compose_variant
load_state_file

if [ -z "${ROLLBACK_IMAGE_REF:-}" ]; then
  fail "当前部署状态没有记录可回滚镜像: ${STATE_FILE}"
fi

if [ -z "${ROLLBACK_BACKUP_PATH:-}" ]; then
  fail "当前部署状态没有记录可回滚数据库备份: ${STATE_FILE}"
fi

CURRENT_IMAGE_REF="$(current_image_ref)"
ROLLBACK_SAFETY_BACKUP_PATH="${ROLLBACK_SAFETY_BACKUP_PATH:-$(make_backup_path rollback-preflight)}"

log "Rolling back to ${ROLLBACK_IMAGE_REF}"
backup_database "${ROLLBACK_SAFETY_BACKUP_PATH}"
compose stop "${SERVICE_NAME}"
restore_database "${ROLLBACK_BACKUP_PATH}"

parse_image_ref "${ROLLBACK_IMAGE_REF}"
STARNAV_IMAGE="${PARSED_IMAGE}"
STARNAV_TAG="${PARSED_TAG}"
export STARNAV_IMAGE STARNAV_TAG

compose up -d "${SERVICE_NAME}"

if wait_for_health; then
  write_state_file "${ROLLBACK_IMAGE_REF}" "${CURRENT_IMAGE_REF}" "${ROLLBACK_SAFETY_BACKUP_PATH}"
  log "Rollback succeeded: ${ROLLBACK_IMAGE_REF}"
  if [ "${DRY_RUN}" = "1" ]; then
    log "New rollback state would be written to ${STATE_FILE}"
  else
    log "New rollback state saved to ${STATE_FILE}"
  fi
  exit 0
fi

log "Rollback target failed healthcheck, restoring the previous runtime"

if [ -n "${CURRENT_IMAGE_REF}" ]; then
  compose stop "${SERVICE_NAME}"
  restore_database "${ROLLBACK_SAFETY_BACKUP_PATH}"
  parse_image_ref "${CURRENT_IMAGE_REF}"
  STARNAV_IMAGE="${PARSED_IMAGE}"
  STARNAV_TAG="${PARSED_TAG}"
  export STARNAV_IMAGE STARNAV_TAG
  compose up -d "${SERVICE_NAME}"

  if wait_for_health; then
    fail "回滚失败，已恢复到 ${CURRENT_IMAGE_REF}"
  fi
fi

fail "回滚失败，且未能恢复原始运行状态。请检查 ${ROLLBACK_BACKUP_PATH} 与容器日志。"
