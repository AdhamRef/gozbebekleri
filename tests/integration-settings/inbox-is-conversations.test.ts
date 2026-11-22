import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (p: string) => fs.readFileSync(p, "utf8");
const NEW = "/dashboard/communication/conversations";

// Gözbebekleri: its own topbar (multi-line <Link>), no Permissions-Policy header anywhere (so the microphone is
// not blocked) and no InboxPermissionsBoundary; its menu keeps its own WhatsApp entry, pointing at the new page.
test("the top-bar WhatsApp icon opens the conversations page and counts its unread", () => {
  assert.ok(read("app/(dashboard)/dashboard/_shell/DashboardTopbar.tsx").includes(`href="${NEW}"`));
  const layout = read("app/(dashboard)/dashboard/DashboardLayoutClient.tsx");
  assert.match(layout, /inbox\/conversations\?countsOnly=1/);
  assert.match(layout, /Number\(data\?\.counts\?\.all\)/);
  assert.match(read("app/api/dashboard/communication/inbox/conversations/route.ts"), /countsOnly \? Promise\.resolve\(\[\]\)/);
  assert.match(read("app/(dashboard)/dashboard/communication/conversations/_components/ConversationsWorkspace.tsx"), /dispatchEvent\(new Event\("whatsapp-inbox-updated"\)\)/);
});

test("voice notes keep working: nothing blocks the microphone", () => {
  assert.doesNotMatch(read("next.config.ts"), /microphone=\(\)/);
});

test("the old inbox address redirects, and the menu points straight at the new page", () => {
  assert.match(read("app/(dashboard)/dashboard/communication/inbox/page.tsx"), new RegExp(`redirect\\("${NEW}"\\)`));
  const nav = read("lib/dashboard/nav-config.ts");
  assert.equal(nav.split(`href: "${NEW}"`).length - 1, 1, "one menu entry");
  assert.ok(!nav.includes(`href: "/dashboard/communication/inbox"`));
});
