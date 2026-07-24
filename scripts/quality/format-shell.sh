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
  exit 0
fi

if command -v shfmt >/dev/null 2>&1; then
  shfmt -w "$@"
  exit 0
fi

if command -v docker >/dev/null 2>&1; then
  if ! docker image inspect mvdan/shfmt:v3.10.0 >/dev/null 2>&1; then
    echo "Skipping shell formatting: shfmt is unavailable and Docker image mvdan/shfmt:v3.10.0 is not cached locally." >&2
    exit 0
  fi

  for file_path in "$@"; do
    docker run --rm -v "$PWD:/workdir" -w /workdir mvdan/shfmt:v3.10.0 \
      -w "$(normalize_container_path "${file_path}")"
  done
  exit 0
fi

echo "format-shell.sh requires shfmt or docker to be available." >&2
exit 1
