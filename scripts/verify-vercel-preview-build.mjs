import { spawnSync } from "node:child_process";

const shouldRun =
  process.env.VERCEL === "1" &&
  process.env.VERCEL_ENV === "preview" &&
  process.env.VERCEL_GIT_COMMIT_REF === "release/integration-settings-final" &&
  process.env.VERCEL_GIT_PULL_REQUEST_ID === "146";

if (!shouldRun) process.exit(0);

const preflight = spawnSync("npm", ["run", "preflight:integration-settings"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

const migration = spawnSync("npm", ["run", "verify:integration-settings-migration"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if ((preflight.status ?? 1) !== 0 || (migration.status ?? 1) !== 0) process.exit(1);
