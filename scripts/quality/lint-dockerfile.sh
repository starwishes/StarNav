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

if [ "$#" -eq 0 ]; then
  set -- Dockerfile
fi

if command -v hadolint >/dev/null 2>&1; then
  hadolint "$@"
  exit 0
fi

if command -v docker >/dev/null 2>&1; then
  for dockerfile in "$@"; do
    docker run --rm -v "$PWD:/workdir" -w /workdir hadolint/hadolint \
      hadolint "$(normalize_container_path "${dockerfile}")"
  done
  exit 0
fi

echo "lint-dockerfile.sh requires hadolint or docker to be available." >&2
exit 1
