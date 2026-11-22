import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (p: string) => fs.readFileSync(p, "utf8");

// Gözbebekleri has no account-invitation route or card (dropped from #274), so only the conversation link is checked.
test("the donor's profile opens their WhatsApp conversation, and the page finds it by phone", () => {
  assert.match(read("components/dashboard/ViewUserProfileDialog.tsx"), /\/dashboard\/communication\/conversations\?phone=\$\{encodeURIComponent\(user\.phone\)\}/);
  const page = read("app/(dashboard)/dashboard/communication/conversations/_components/ConversationsWorkspace.tsx");
  assert.match(page, /new URLSearchParams\(window\.location\.search\)\.get\("phone"\)/);
  assert.match(page, /if \(hit\) \{ setActiveId\(hit\.id\); setWantedPhone\(""\); \}/);
});
