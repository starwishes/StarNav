#!/bin/sh
set -eu

normalize_container_path() {
  file_path="$1"

  case "${file_path}" in
    "${PWD}"/*)
      printf '/workdir/%s\n' "${file_path#"${PWD}/"}"
      ;;
    /*)
      printf '%s\n' "${file_path}"
      ;;
    *)
      printf '/workdir/%s\n' "${file_path}"
      ;;
  esac
}

# When npm on Windows leaves the glob unexpanded, discover shell scripts ourselves.
if [ "$#" -eq 0 ] || [ "$1" = 'scripts/*/*.sh' ]; then
  set --
  # Portable file discovery without relying on bash globs under npm/cmd.
  for dir in scripts/docker scripts/quality scripts/release; do
    if [ -d "${dir}" ]; then
      for file_path in "${dir}"/*.sh; do
        if [ -f "${file_path}" ]; then
          set -- "$@" "${file_path}"
        fi
      done
    fi
  done
fi

if [ "$#" -eq 0 ]; then
  exit 0
fi

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck -x "$@"
  exit 0
fi

DOCKER_BIN="$(command -v docker 2>/dev/null || true)"
if [ -z "${DOCKER_BIN}" ] && [ -x /usr/bin/docker ]; then
  DOCKER_BIN=/usr/bin/docker
fi
if [ -z "${DOCKER_BIN}" ] && [ -x /mnt/c/Program\ Files/Docker/Docker/resources/bin/docker.exe ]; then
  DOCKER_BIN='/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe'
fi

if [ -n "${DOCKER_BIN}" ]; then
  for file_path in "$@"; do
    "${DOCKER_BIN}" run --rm -v "$PWD:/workdir" -w /workdir koalaman/shellcheck:stable \
      -x "$(normalize_container_path "${file_path}")"
  done
  exit 0
fi

echo "lint-shell.sh requires shellcheck or docker to be available." >&2
exit 1
