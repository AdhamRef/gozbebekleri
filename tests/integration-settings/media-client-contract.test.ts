import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("dashboard media requests always receive an explicit section scope", () => {
  const bridge = read("app/(dashboard)/dashboard/DashboardMediaRequestBridge.tsx");
  for (const [path, scope] of [
    ["/dashboard/campaigns", "campaigns"],
    ["/dashboard/blog", "blog"],
    ["/dashboard/slides", "slides"],
    ["/dashboard/categories", "categories"],
    ["/dashboard/ticker", "ticker"],
  ]) {
    assert.match(bridge, new RegExp(`${path.replaceAll("/", "\\/")}.*${scope}`));
  }
  assert.match(bridge, /params\.set\("scope", scope\)/);
  assert.match(read("app/(dashboard)/dashboard/layout.tsx"), /DashboardMediaRequestBridge/);
});

test("legacy publicId requests never reach provider deletion", () => {
  const bridge = read("app/(dashboard)/dashboard/DashboardMediaRequestBridge.tsx");
  assert.match(bridge, /legacyDetach/);
  assert.match(bridge, /assetId: pending\.assetId/);
  const route = read("app/api/upload/route.ts");
  const legacySection = route.slice(route.indexOf('searchParams.get("legacyDetach")'), route.indexOf('const assetId'));
  assert.match(legacySection, /detachedOnly: true/);
  assert.doesNotMatch(legacySection, /deleteMedia|secureDelete|lookupMediaUrl/);
});

test("new dashboard media keeps url and assetId for safe cleanup", () => {
  const client = read("lib/media/client.ts");
  assert.match(client, /pendingAssets\.set\(asset\.url, asset\)/);
  assert.match(client, /assetId: asset\.assetId/);
  assert.match(client, /deleteUnsavedDashboardMedia/);
  assert.match(client, /cleanupManagedDashboardMediaAfterSave/);
});

test("profile avatar is isolated from admin media and is self-only", () => {
  const uploader = read("app/[locale]/profile/_components/AvatarUploader.tsx");
  assert.match(uploader, /\/api\/users\/me\/avatar/);
  assert.doesNotMatch(uploader, /\/api\/upload/);
  const route = read("app/api/users/me/avatar/route.ts");
  assert.match(route, /session\.user\.id/);
  assert.match(route, /formData\.has\("userId"\)/);
  assert.doesNotMatch(route, /where:\s*\{\s*id:\s*formData/);
});

test("donation-new is a safe legacy redirect with no upload or donation mutation", () => {
  const source = read("app/(dashboard)/dashboard/donations/new/page.tsx");
  assert.match(source, /redirect\("\/dashboard\/campaigns\/new"\)/);
  assert.doesNotMatch(source, /\/api\/upload|\/api\/donations|prisma|payment/i);
});
