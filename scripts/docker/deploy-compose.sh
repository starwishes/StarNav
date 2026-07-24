#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=scripts/docker/compose-deploy-common.sh
. "${SCRIPT_DIR}/compose-deploy-common.sh"

require_env_file
resolve_runtime_config
detect_compose_variant

TARGET_IMAGE_REF="${STARNAV_IMAGE}:${STARNAV_TAG}"
CURRENT_IMAGE_REF="$(current_image_ref)"
DEPLOY_BACKUP_PATH="${DEPLOY_BACKUP_PATH:-$(make_backup_path deploy)}"

log "Deploying ${TARGET_IMAGE_REF} on port ${STARNAV_PORT}"
if [ -n "${CURRENT_IMAGE_REF}" ]; then
  log "Current image: ${CURRENT_IMAGE_REF}"
fi

backup_database "${DEPLOY_BACKUP_PATH}"

if [ "${SKIP_PULL}" = "1" ]; then
  log "Skipping image pull for ${SERVICE_NAME}"
else
  compose pull "${SERVICE_NAME}"
fi

compose up -d "${SERVICE_NAME}"

if wait_for_health; then
  write_state_file "${TARGET_IMAGE_REF}" "${CURRENT_IMAGE_REF}" "${DEPLOY_BACKUP_PATH}"
  log "Deployment succeeded: ${TARGET_IMAGE_REF}"
  if [ "${DRY_RUN}" = "1" ]; then
    log "Rollback state would be written to ${STATE_FILE}"
  else
    log "Rollback state saved to ${STATE_FILE}"
  fi
  exit 0
fi

log "Deployment healthcheck failed for ${TARGET_IMAGE_REF}"

if [ -z "${CURRENT_IMAGE_REF}" ]; then
  fail '部署失败，且未检测到可回滚的旧镜像。'
fi

log "Starting automatic rollback to ${CURRENT_IMAGE_REF}"
compose stop "${SERVICE_NAME}"
restore_database "${DEPLOY_BACKUP_PATH}"

parse_image_ref "${CURRENT_IMAGE_REF}"
STARNAV_IMAGE="${PARSED_IMAGE}"
STARNAV_TAG="${PARSED_TAG}"
export STARNAV_IMAGE STARNAV_TAG

compose up -d "${SERVICE_NAME}"

if wait_for_health; then
  fail "部署失败，已自动回滚到 ${CURRENT_IMAGE_REF}"
fi

fail "部署失败，且自动回滚未恢复健康状态。请检查容器日志与数据库备份 ${DEPLOY_BACKUP_PATH}"
