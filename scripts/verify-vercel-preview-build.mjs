import { spawnSync } from "node:child_process";

const shouldRun =
  process.env.VERCEL === "1" &&
  process.env.VERCEL_ENV === "preview" &&
  process.env.VERCEL_GIT_COMMIT_REF === "release/integration-settings-final" &&
  process.env.VERCEL_GIT_PULL_REQUEST_ID === "146";

if (!shouldRun) process.exit(0);

function run(scriptName, kind) {
  const result = spawnSync("npm", ["run", scriptName], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const safeLines = output.split(/\r?\n/).filter((line) =>
    /^\[(PASS|WARNING|BLOCKED)\] [a-z0-9-]+: /.test(line) ||
    /^INTEGRATION SETTINGS PREFLIGHT: (PASS|WARNING|BLOCKED)$/.test(line) ||
    /^MIGRATION STATUS: (NOT_APPLIED|PARTIALLY_APPLIED|FULLY_APPLIED|UNKNOWN)$/.test(line),
  );

  for (const line of safeLines) console.log(line);

  if (kind === "preflight" && !safeLines.some((line) => line.startsWith("INTEGRATION SETTINGS PREFLIGHT:"))) {
    console.log("INTEGRATION SETTINGS PREFLIGHT: BLOCKED");
  }
  if (kind === "migration" && !safeLines.some((line) => line.startsWith("MIGRATION STATUS:"))) {
    console.log("MIGRATION STATUS: UNKNOWN");
  }

  return { status: result.status ?? 1, output };
}

const preflight = run("preflight:integration-settings", "preflight");
const migration = run("verify:integration-settings-migration", "migration");

const preflightAccepted = /INTEGRATION SETTINGS PREFLIGHT: (PASS|WARNING)/.test(preflight.output);
const migrationAccepted = /MIGRATION STATUS: (NOT_APPLIED|PARTIALLY_APPLIED|FULLY_APPLIED)/.test(migration.output);

if (preflight.status !== 0 || !preflightAccepted || migration.status !== 0 || !migrationAccepted) process.exit(1);
