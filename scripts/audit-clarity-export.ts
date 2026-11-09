import { readFileSync } from "node:fs";
import { auditClarityCsvExports } from "../lib/tracking/clarity-audit-export";

const paths = process.argv.slice(2);
const hmacKey = process.env.CLARITY_AUDIT_HMAC_KEY ?? "";

if (paths.length === 0 || hmacKey.length < 32) {
  process.stderr.write(
    "Usage: CLARITY_AUDIT_HMAC_KEY=<private-32+-char-key> node --import tsx scripts/audit-clarity-export.ts <sessions.csv> [events.csv ...]\n",
  );
  process.exitCode = 2;
} else {
  try {
    const inventory = auditClarityCsvExports(
      paths.map((path) => ({ csv: readFileSync(path, "utf8") })),
      hmacKey,
    );
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
  } catch {
    process.stderr.write("Clarity export audit failed. Check the local export format and try again.\n");
    process.exitCode = 1;
  }
}
