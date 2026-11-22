import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// Gözbebekleri: security/DonorGatewayOverrides.tsx comes with #242, which was not ported.
const files = ["platform-connections/communication/_components/IntegrationProviderCards.tsx", "security/EmergencySwitch.tsx", "security/SiteSecurityManager.tsx"].map((f) => `app/(dashboard)/dashboard/${f}`);
test("dashboard dates format with a fixed time zone, so the server and the browser draw the same text (React #418)", () => {
  for (const f of files) {
    const s = fs.readFileSync(f, "utf8");
    assert.doesNotMatch(s, /toLocaleString\(\)/, f);
    for (const m of s.matchAll(/toLocaleString\(/g)) assert.match(s.slice(m.index, m.index + 120), /timeZone: "Europe\/Istanbul"/, `${f}: ${s.slice(m.index, m.index + 60)}`);
  }
});
