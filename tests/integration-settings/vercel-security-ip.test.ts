import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
test("Vercel security identity does not trust client-supplied x-real-ip first", () => {
  const file = readFileSync("lib/site-security/policy.ts", "utf8");
  const start = file.indexOf("export function securityClientIp(");
  const end = file.indexOf("export function matchesNetwork(", start);
  assert.ok(start >= 0 && end > start);
  const fn = file.slice(start, end);
  const vercelBlock = fn.indexOf("if (process.env.VERCEL)");
  const realIp = fn.indexOf('headers.get("x-real-ip")');
  assert.ok(vercelBlock >= 0 && realIp > vercelBlock, "The Vercel trust boundary must precede X-Real-IP");
  assert.match(fn, /x-vercel-forwarded-for/);
});
