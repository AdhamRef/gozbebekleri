#!/usr/bin/env bash
set -Eeuo pipefail

block() {
  printf '[BLOCKED] %s\n' "$1"
  exit 1
}

[[ "${VERCEL:-}" == "1" ]] || block "vercel-context"
[[ "${VERCEL_ENV:-}" == "production" ]] || block "vercel-environment"
[[ "${VERCEL_GIT_COMMIT_REF:-}" == "main" ]] || block "git-ref"

[[ -f node_modules/tsx/dist/cli.mjs ]] || block "tsx-runtime-missing"
[[ -f node_modules/prisma/build/index.js ]] || block "prisma-runtime-missing"

node node_modules/prisma/build/index.js generate --schema prisma/integration-settings.schema.prisma

set +e
pre="$(node node_modules/tsx/dist/cli.mjs scripts/verify-integration-settings-migration.ts 2>&1)"
pre_rc=$?
set -e
printf '%s\n' "$pre"
[[ $pre_rc -eq 0 ]] || block "pre-migration-verification-failed"

if grep -Eq '\[(BLOCKED|UNKNOWN)\]|MIGRATION STATUS: (UNKNOWN|PARTIALLY_APPLIED)|Duplicate provider/key groups|DUPLICATE_PROVIDER_KEY|INDEX_.*CONFLICT|database.*fail|DATABASE.*FAIL' <<<"$pre"; then
  block "unsafe-pre-migration-status"
fi

if grep -q 'MIGRATION STATUS: FULLY_APPLIED' <<<"$pre"; then
  migration_state="FULLY_APPLIED"
elif grep -q 'MIGRATION STATUS: NOT_APPLIED' <<<"$pre"; then
  migration_state="NOT_APPLIED"
else
  block "unrecognized-pre-migration-status"
fi

npm run build
printf 'APP BUILD RESULT: PASS\n'

if [[ "$migration_state" == "FULLY_APPLIED" ]]; then
  printf 'MIGRATION EXECUTION: SKIPPED_ALREADY_APPLIED\n'
  printf 'MIGRATION EXECUTION COUNT: 0\n'
else
  node node_modules/tsx/dist/cli.mjs prisma/mongodb-migrations/20260714-integration-settings.ts
  printf 'MIGRATION EXECUTION: APPLIED_ONCE\n'
  printf 'MIGRATION EXECUTION COUNT: 1\n'
fi

set +e
post="$(node node_modules/tsx/dist/cli.mjs scripts/verify-integration-settings-migration.ts 2>&1)"
post_rc=$?
set -e
printf '%s\n' "$post"
[[ $post_rc -eq 0 ]] || block "post-migration-verification-failed"
grep -q 'MIGRATION STATUS: FULLY_APPLIED' <<<"$post" || block "post-migration-not-fully-applied"
! grep -Eq '\[(WARNING|BLOCKED|UNKNOWN)\]|PARTIALLY_APPLIED|Duplicate provider/key groups|DUPLICATE_PROVIDER_KEY|INDEX_.*CONFLICT' <<<"$post" || block "unsafe-post-migration-status"

set +e
flight="$(node node_modules/tsx/dist/cli.mjs scripts/preflight-integration-settings.ts 2>&1)"
flight_rc=$?
set -e
printf '%s\n' "$flight"
[[ $flight_rc -eq 0 ]] || block "post-migration-preflight-failed"
grep -q 'INTEGRATION SETTINGS PREFLIGHT: PASS' <<<"$flight" || block "post-migration-preflight-not-pass"
! grep -Eq '\[(WARNING|BLOCKED|UNKNOWN)\]' <<<"$flight" || block "post-migration-preflight-warning"
