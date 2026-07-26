#!/bin/sh
set -eu

resolve_docker() {
  if command -v docker >/dev/null 2>&1; then
    command -v docker
    return 0
  fi
  if [ -x /usr/bin/docker ]; then
    printf '%s\n' /usr/bin/docker
    return 0
  fi
  if [ -x '/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe' ]; then
    printf '%s\n' '/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe'
    return 0
  fi
  return 1
}

if [ "$#" -eq 0 ] || [ "$1" = 'Dockerfile' ]; then
  set -- docker/Dockerfile docker/Dockerfile.runtime-min
fi

if command -v hadolint >/dev/null 2>&1; then
  hadolint "$@"
  exit 0
fi

if DOCKER_BIN="$(resolve_docker)"; then
  for dockerfile in "$@"; do
    "${DOCKER_BIN}" run --rm -i hadolint/hadolint <"${dockerfile}"
  done
  exit 0
fi

echo "lint-dockerfile.sh requires hadolint or docker to be available." >&2
exit 1
