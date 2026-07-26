#!/bin/sh
# Optional Debian apt mirror rewrite for constrained networks.
# Env: APT_DEBIAN_MIRROR, APT_DEBIAN_SECURITY_MIRROR
set -eu

if [ -z "${APT_DEBIAN_MIRROR:-}" ] && [ -z "${APT_DEBIAN_SECURITY_MIRROR:-}" ]; then
  exit 0
fi

DEBIAN_MIRROR="${APT_DEBIAN_MIRROR:-http://deb.debian.org/debian}"
SECURITY_MIRROR="${APT_DEBIAN_SECURITY_MIRROR:-http://deb.debian.org/debian-security}"

if [ -f /etc/apt/sources.list.d/debian.sources ]; then
  sed -i \
    -e "s|http://deb.debian.org/debian|${DEBIAN_MIRROR}|g" \
    -e "s|http://deb.debian.org/debian-security|${SECURITY_MIRROR}|g" \
    /etc/apt/sources.list.d/debian.sources
fi

if [ -f /etc/apt/sources.list ]; then
  sed -i \
    -e "s|http://deb.debian.org/debian|${DEBIAN_MIRROR}|g" \
    -e "s|http://deb.debian.org/debian-security|${SECURITY_MIRROR}|g" \
    /etc/apt/sources.list
fi
