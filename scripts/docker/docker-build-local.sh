#!/bin/sh
set -eu

IMAGE_NAME="${IMAGE_NAME:-starnav}"
IMAGE_TAG="${IMAGE_TAG:-$(node -p "require('./package.json').version")}"
NODE_IMAGE="${NODE_IMAGE:-node:24.14.1-slim}"
DOCKERFILE="${DOCKERFILE:-docker/Dockerfile}"
APT_DEBIAN_MIRROR="${APT_DEBIAN_MIRROR:-}"
APT_DEBIAN_SECURITY_MIRROR="${APT_DEBIAN_SECURITY_MIRROR:-}"
HTTP_PROXY="${HTTP_PROXY:-}"
HTTPS_PROXY="${HTTPS_PROXY:-}"
NO_PROXY="${NO_PROXY:-}"

run_docker_build() {
  if [ "${DOCKER_BUILDKIT+x}" = "x" ]; then
    DOCKER_BUILDKIT="${DOCKER_BUILDKIT}" docker build "$@"
    return
  fi

  if DOCKER_BUILDKIT=1 docker build "$@"; then
    return
  fi

  echo "BuildKit build failed, retrying with legacy builder..." >&2
  DOCKER_BUILDKIT=0 docker build "$@"
}

set -- --build-arg "NODE_IMAGE=${NODE_IMAGE}"

if [ -n "${APT_DEBIAN_MIRROR}" ]; then
  set -- "$@" --build-arg "APT_DEBIAN_MIRROR=${APT_DEBIAN_MIRROR}"
fi

if [ -n "${APT_DEBIAN_SECURITY_MIRROR}" ]; then
  set -- "$@" --build-arg "APT_DEBIAN_SECURITY_MIRROR=${APT_DEBIAN_SECURITY_MIRROR}"
fi

if [ -n "${HTTP_PROXY}" ]; then
  set -- "$@" --build-arg "HTTP_PROXY=${HTTP_PROXY}"
fi

if [ -n "${HTTPS_PROXY}" ]; then
  set -- "$@" --build-arg "HTTPS_PROXY=${HTTPS_PROXY}"
fi

if [ -n "${NO_PROXY}" ]; then
  set -- "$@" --build-arg "NO_PROXY=${NO_PROXY}"
fi

run_docker_build \
  "$@" \
  -f "${DOCKERFILE}" \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  -t "${IMAGE_NAME}:latest" \
  .

echo "Built images:"
echo "  - ${IMAGE_NAME}:${IMAGE_TAG}"
echo "  - ${IMAGE_NAME}:latest"
echo "  - dockerfile: ${DOCKERFILE}"
echo "  - base image: ${NODE_IMAGE}"
if [ -n "${APT_DEBIAN_MIRROR}" ]; then
  echo "  - apt debian mirror: ${APT_DEBIAN_MIRROR}"
fi
if [ -n "${APT_DEBIAN_SECURITY_MIRROR}" ]; then
  echo "  - apt debian security mirror: ${APT_DEBIAN_SECURITY_MIRROR}"
fi
if [ -n "${HTTP_PROXY}" ]; then
  echo "  - http proxy: ${HTTP_PROXY}"
fi
if [ -n "${HTTPS_PROXY}" ]; then
  echo "  - https proxy: ${HTTPS_PROXY}"
fi
if [ -n "${NO_PROXY}" ]; then
  echo "  - no proxy: ${NO_PROXY}"
fi
