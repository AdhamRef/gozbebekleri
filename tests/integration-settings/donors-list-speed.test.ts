import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("badges for a page of donors are evaluated together, attached in badge order", () => {
  const s = fs.readFileSync("lib/badge-criteria.ts", "utf8");
  assert.match(s, /await Promise\.all\(badges\.map\(\(badge\) => getUserIdsMatchingBadge\(badge\.criteria, userIds\)\)\)/);
  assert.doesNotMatch(s, /for \(const badge of badges\) \{\n\s*const matching = await/);
});
// Gözbebekleri has no summary=registered endpoint, so #266's cache for it does not apply here.
