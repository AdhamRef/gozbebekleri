import { spawnSync } from "node:child_process";

const expected =
  process.env.VERCEL === "1" &&
  process.env.VERCEL_ENV === "preview" &&
  process.env.VERCEL_GIT_COMMIT_REF === "release/integration-settings-final" &&
  process.env.VERCEL_GIT_PULL_REQUEST_ID === "146";

if (!expected) {
  process.exit(0);
}

function run(script, allowedPattern, publicPattern) {
  const result = spawnSync("npm", ["run", script], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const publicLines = output
    .split(/\r?\n/)
    .filter((line) => publicPattern.test(line));

  for (const line of publicLines) {
    console.log(line);
  }

  if (result.error || result.status !== 0 || !allowedPattern.test(output)) {
    process.exit(1);
  }
}

run(
  "preflight:integration-settings",
  /INTEGRATION SETTINGS PREFLIGHT: (PASS|WARNING)/,
  /INTEGRATION SETTINGS PREFLIGHT: (PASS|WARNING|BLOCKED)/,
);

run(
  "verify:integration-settings-migration",
  /MIGRATION STATUS: (NOT_APPLIED|PARTIALLY_APPLIED|FULLY_APPLIED)/,
  /MIGRATION STATUS: (NOT_APPLIED|PARTIALLY_APPLIED|FULLY_APPLIED|UNKNOWN)/,
);
