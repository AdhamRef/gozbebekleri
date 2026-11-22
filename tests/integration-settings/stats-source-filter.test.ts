import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const s = fs.readFileSync("app/api/admin/stats/route.ts", "utf8");
// Gözbebekleri: no payment-gateway filter, so the source filter wraps the country/locale filters directly,
// and the charity's own dashboard page sends `source` to the stats request.
test("the home KPIs read and apply the donation-source filter like the chart and the list", () => {
  assert.match(s, /const source = searchParams\.get\('source'\)/);
  assert.match(s, /mergeDonationSourceFilter\(mergeCountryFilter\(mergeLocaleFilter\(where, locale\), country\), source\)/);
  const get = s.slice(s.indexOf("export async function GET"));
  assert.equal((get.match(/\bcountry\)/g) ?? []).length, 0, "no call passes country without source");
  assert.equal((get.match(/country,\s*source\s*\)/g) ?? []).length, 5);
  const page = fs.readFileSync("app/(dashboard)/dashboard/page.tsx", "utf8");
  const stats = page.slice(page.indexOf("const fetchStats = useCallback"), page.indexOf("/api/admin/stats?"));
  assert.match(stats, /params\.set\("source", donationSourceFilter\)/);
});
