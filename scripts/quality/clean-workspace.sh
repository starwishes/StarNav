#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname "$0")" && pwd)
REPO_DIR=$(CDPATH='' cd -- "${SCRIPT_DIR}/../.." && pwd)

cleanup_path() {
  target_path="${REPO_DIR}/$1"

  if [ -e "${target_path}" ]; then
    rm -rf "${target_path}"
    printf '[clean] removed %s\n' "$1"
  fi
}

# Only remove generated build and test outputs. Runtime data under data/ is preserved.
cleanup_path "dist"
cleanup_path "clients/extension/dist"
cleanup_path "coverage"
cleanup_path ".nyc_output"
cleanup_path "test-results"
cleanup_path "playwright-report"
