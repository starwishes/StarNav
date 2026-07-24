#!/bin/sh
set -eu

fail() {
  echo "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

bool_json() {
  if [ "${1}" = "1" ]; then
    printf 'true'
  else
    printf 'false'
  fi
}

require_command gh
require_command grep
require_command mktemp

BRANCH="${STARNAV_PROTECTED_BRANCH:-main}"
REQUIRED_CHECK="${STARNAV_REQUIRED_CHECK:-validate}"
REQUIRED_APPROVALS="${STARNAV_REQUIRED_APPROVALS:-0}"
STRICT_STATUS_CHECKS="${STARNAV_STRICT_STATUS_CHECKS:-1}"
REQUIRE_LINEAR_HISTORY="${STARNAV_REQUIRE_LINEAR_HISTORY:-1}"
REQUIRE_CONVERSATION_RESOLUTION="${STARNAV_REQUIRE_CONVERSATION_RESOLUTION:-1}"
REQUIRE_CODEOWNER_REVIEWS="${STARNAV_REQUIRE_CODEOWNER_REVIEWS:-0}"
DRY_RUN="${DRY_RUN:-0}"

case "${REQUIRED_APPROVALS}" in
  '' | *[!0-9]*)
    fail "STARNAV_REQUIRED_APPROVALS must be a non-negative integer."
    ;;
esac

REPO="${STARNAV_REPO:-$(gh repo view --json nameWithOwner --jq '.nameWithOwner')}"

if ! gh api "repos/${REPO}/commits/${BRANCH}/check-runs" --jq '.check_runs[].name' | grep -qx "${REQUIRED_CHECK}"; then
  fail "Required check '${REQUIRED_CHECK}' was not found on ${REPO}:${BRANCH}. Push the current workflow first or override STARNAV_REQUIRED_CHECK."
fi

PAYLOAD_FILE="$(mktemp)"
trap 'rm -f "${PAYLOAD_FILE}"' EXIT HUP INT TERM

cat >"${PAYLOAD_FILE}" <<EOF
{
  "required_status_checks": {
    "strict": $(bool_json "${STRICT_STATUS_CHECKS}"),
    "contexts": ["${REQUIRED_CHECK}"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": $(bool_json "${REQUIRE_CODEOWNER_REVIEWS}"),
    "required_approving_review_count": ${REQUIRED_APPROVALS},
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": $(bool_json "${REQUIRE_LINEAR_HISTORY}"),
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": $(bool_json "${REQUIRE_CONVERSATION_RESOLUTION}")
}
EOF

if [ "${DRY_RUN}" = "1" ]; then
  echo "Would apply branch protection to ${REPO}:${BRANCH}"
  cat "${PAYLOAD_FILE}"
  exit 0
fi

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "repos/${REPO}/branches/${BRANCH}/protection" \
  --input "${PAYLOAD_FILE}" >/dev/null

echo "Updated branch protection for ${REPO}:${BRANCH}"
