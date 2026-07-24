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

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck -x "$@"
  exit 0
fi

if command -v docker >/dev/null 2>&1; then
  for file_path in "$@"; do
    docker run --rm -v "$PWD:/workdir" -w /workdir koalaman/shellcheck:stable \
      -x "$(normalize_container_path "${file_path}")"
  done
  exit 0
fi

echo "lint-shell.sh requires shellcheck or docker to be available." >&2
exit 1
