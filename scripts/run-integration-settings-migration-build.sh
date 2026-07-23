#!/usr/bin/env bash
set -Eeuo pipefail

block() {
  printf '[BLOCKED] %s\n' "$1"
  exit 1
}

[[ "${VERCEL:-}" == "1" ]] || block "vercel-context"
[[ "${VERCEL_ENV:-}" == "production" ]] || block "vercel-environment"
[[ "${VERCEL_GIT_COMMIT_REF:-}" == "main" ]] || block "git-ref"

set +e
pre="$(npm run verify:integration-settings-migration 2>&1)"
pre_rc=$?
set -e
printf '%s\n' "$pre"
[[ $pre_rc -eq 0 ]] || block "pre-migration-verification-failed"

if grep -q 'MIGRATION STATUS: FULLY_APPLIED' <<<"$pre"; then
  printf 'MIGRATION EXECUTION: SKIPPED_ALREADY_APPLIED\n'
elif grep -q 'MIGRATION STATUS: NOT_APPLIED' <<<"$pre" \
  && ! grep -Eq '\[(BLOCKED|UNKNOWN)\]|PARTIALLY_APPLIED|Duplicate provider/key groups|conflicting index|CONFLICT' <<<"$pre"; then
  npm run migrate:integration-settings
  printf 'MIGRATION EXECUTION: APPLIED_ONCE\n'
else
  block "unsafe-pre-migration-status"
fi

post="$(npm run verify:integration-settings-migration 2>&1)"
printf '%s\n' "$post"
grep -q 'MIGRATION STATUS: FULLY_APPLIED' <<<"$post" || block "post-migration-not-fully-applied"
! grep -Eq '\[(WARNING|BLOCKED|UNKNOWN)\]|PARTIALLY_APPLIED' <<<"$post" || block "post-migration-warning"

flight="$(npm run preflight:integration-settings 2>&1)"
printf '%s\n' "$flight"
grep -q 'INTEGRATION SETTINGS PREFLIGHT: PASS' <<<"$flight" || block "preflight-failed"
! grep -Eq '\[(WARNING|BLOCKED|UNKNOWN)\]' <<<"$flight" || block "preflight-warning"

npm run build
