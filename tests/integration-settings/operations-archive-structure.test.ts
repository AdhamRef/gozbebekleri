import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DASHBOARD_NAV_GROUPS } from "../../lib/dashboard/nav-config";

const read = (path: string) => readFileSync(path, "utf8");

test("operations navigation exposes exactly five approved pages", () => {
  const operations = DASHBOARD_NAV_GROUPS.find((group) => group.group === "التشغيل");
  assert.ok(operations);
  assert.deepEqual(
    operations.items.filter((item) => item.key === "operations").map((item) => item.href),
    [
      "/dashboard/operations/tasks",
      "/dashboard/operations/content",
      "/dashboard/operations/calendar",
      "/dashboard/operations/publishing",
      "/dashboard/operations/donor-reactivation",
    ],
  );
});

test("operations and archive are protected before nested page reads", () => {
  for (const path of [
    "app/(dashboard)/dashboard/operations/layout.tsx",
    "app/(dashboard)/dashboard/archive/layout.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /getServerSession/);
    assert.match(source, /resolveDashboardPageAccess/);
    assert.match(source, /redirect\(access\.redirectTo\)/);
  }
});

test("legacy operations pages redirect to canonical destinations", () => {
  const redirects: Record<string, string> = {
    "app/(dashboard)/dashboard/operations/page.tsx": "/dashboard/operations/tasks",
    "app/(dashboard)/dashboard/operations/command-center/page.tsx": "/dashboard/operations/tasks",
    "app/(dashboard)/dashboard/operations/workflow/page.tsx": "/dashboard/operations/tasks?view=workflow",
    "app/(dashboard)/dashboard/operations/production/page.tsx": "/dashboard/operations/content?view=production",
    "app/(dashboard)/dashboard/operations/scheduler/page.tsx": "/dashboard/operations/calendar?view=schedule",
    "app/(dashboard)/dashboard/operations/messaging/page.tsx": "/dashboard/operations/communication",
    "app/(dashboard)/dashboard/operations/marketing-performance/page.tsx": "/dashboard/marketing/performance",
    "app/(dashboard)/dashboard/operations/archive/page.tsx": "/dashboard/archive/assets",
  };

  for (const [path, destination] of Object.entries(redirects)) {
    const source = read(path);
    assert.match(source, /from "next\/navigation"/);
    assert.ok(source.includes(`redirect("${destination}")`), `${path} must redirect to ${destination}`);
  }
});

test("archive root and duplicate upload routes redirect to canonical pages", () => {
  const redirects: Record<string, string> = {
    "app/(dashboard)/dashboard/archive/page.tsx": "/dashboard/archive/collections",
    "app/(dashboard)/dashboard/archive/marketing-files/page.tsx": "/dashboard/archive/assets?category=MARKETING",
    "app/(dashboard)/dashboard/archive/documents/page.tsx": "/dashboard/archive/assets?category=DOCUMENTS",
  };

  for (const [path, destination] of Object.entries(redirects)) {
    assert.ok(read(path).includes(`redirect("${destination}")`));
  }
});

test("donor reactivation masks contact data by default", () => {
  const source = read("app/(dashboard)/dashboard/operations/donor-reactivation/page.tsx");
  assert.match(source, /function maskEmail/);
  assert.match(source, /function maskPhone/);
  assert.match(source, /maskEmail\(candidate\.donorEmail\)/);
  assert.match(source, /maskPhone\(candidate\.donorPhone\)/);
  assert.doesNotMatch(source, /\{candidate\.donorEmail \?\?/);
  assert.doesNotMatch(source, /\{candidate\.donorPhone \?\?/);
});
