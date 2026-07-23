import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import type { Session } from "next-auth";
import { resolveDashboardPageAccess } from "../../lib/dashboard/page-access";
import {
  contentLocalizationPermissionForSection,
  parseContentLocalizationSection,
} from "../../lib/content-localization/access";

function sessionFor(
  role: "ADMIN" | "STAFF" | "DONOR",
  permissions: string[] = [],
): Session {
  return {
    expires: new Date(Date.now() + 60_000).toISOString(),
    user: {
      id: `test-${role.toLowerCase()}`,
      name: "Test User",
      email: "test@example.org",
      role,
      dashboardPermissions: permissions,
    },
  } as Session;
}

const protectedSections = ["campaigns", "categories", "blog"] as const;

test("unauthenticated and donor users cannot enter protected content sections", () => {
  for (const permission of protectedSections) {
    assert.deepEqual(resolveDashboardPageAccess(null, permission), {
      allowed: false,
      redirectTo: "/ar/auth/signin",
    });
    assert.equal(resolveDashboardPageAccess(sessionFor("DONOR"), permission).allowed, false);
  }
});

test("staff without permissions cannot enter protected content sections", () => {
  for (const permission of protectedSections) {
    assert.equal(resolveDashboardPageAccess(sessionFor("STAFF"), permission).allowed, false);
  }
});

for (const ownPermission of protectedSections) {
  test(`staff with ${ownPermission} can enter only that section`, () => {
    const session = sessionFor("STAFF", [ownPermission]);
    for (const requiredPermission of protectedSections) {
      assert.equal(
        resolveDashboardPageAccess(session, requiredPermission).allowed,
        requiredPermission === ownPermission,
      );
    }
  });
}

test("admin can enter campaigns categories and blog", () => {
  const session = sessionFor("ADMIN");
  for (const permission of protectedSections) {
    assert.equal(resolveDashboardPageAccess(session, permission).allowed, true);
  }
});

test("section layouts enforce permission before rendering nested server pages", () => {
  for (const permission of protectedSections) {
    const path = `app/(dashboard)/dashboard/${permission}/layout.tsx`;
    const source = readFileSync(path, "utf8");
    const guardIndex = source.indexOf("resolveDashboardPageAccess");
    const permissionIndex = source.indexOf(`\"${permission}\"`);
    const redirectIndex = source.indexOf("redirect(access.redirectTo)");
    const childrenIndex = source.indexOf("return children");
    assert.ok(guardIndex >= 0, `${path} must resolve server access`);
    assert.ok(permissionIndex > guardIndex, `${path} must require ${permission}`);
    assert.ok(redirectIndex > permissionIndex, `${path} must redirect denied users`);
    assert.ok(childrenIndex > redirectIndex, `${path} must not render children before redirect`);
  }
});

test("blog create and edit data reads remain nested behind the blog server guard", () => {
  const layout = readFileSync("app/(dashboard)/dashboard/blog/layout.tsx", "utf8");
  const create = readFileSync("app/(dashboard)/dashboard/blog/create/page.tsx", "utf8");
  const edit = readFileSync("app/(dashboard)/dashboard/blog/create/[postId]/page.tsx", "utf8");
  assert.match(layout, /resolveDashboardPageAccess[\s\S]*"blog"/);
  assert.match(layout, /redirect\(access\.redirectTo\)[\s\S]*return children/);
  assert.match(create, /prisma\.(postCategory|campaign)\.findMany/);
  assert.match(edit, /(getPost\(|prisma\.(postCategory|campaign)\.findMany)/);
});

test("localization sections map only to existing section permissions", () => {
  assert.equal(contentLocalizationPermissionForSection("campaigns"), "campaigns");
  assert.equal(contentLocalizationPermissionForSection("categories"), "categories");
  assert.equal(contentLocalizationPermissionForSection("blog"), "blog");
  assert.equal(parseContentLocalizationSection("content"), null);
  assert.equal(parseContentLocalizationSection("unknown"), null);
});

test("localization audit and preview authorize by requested section", () => {
  for (const path of [
    "app/api/admin/content-localization/audit/route.ts",
    "app/api/admin/content-localization/preview/route.ts",
  ]) {
    const source = readFileSync(path, "utf8");
    const handler = source.slice(source.indexOf("export async function GET"));
    const parseIndex = handler.indexOf("parseContentLocalizationSection");
    const authIndex = handler.indexOf("contentLocalizationPermissionForSection(section)");
    const loadIndex = handler.indexOf("loadPreviewRows(") >= 0
      ? handler.indexOf("loadPreviewRows(")
      : handler.indexOf("loadItems(section)");
    assert.ok(parseIndex >= 0, `${path} must parse a known section`);
    assert.ok(authIndex > parseIndex, `${path} must authorize the parsed section`);
    assert.ok(loadIndex > authIndex, `${path} must authorize before loading section data`);
    assert.doesNotMatch(source, /requireAdminOrDashboardPermission\([^)]*["']content["']/s);
  }
});

test("direct bulk Arabic mutation is disabled without OpenAI or database access", () => {
  const source = readFileSync(
    "app/api/admin/content-localization/arabic-bulk-proofread/route.ts",
    "utf8",
  );
  assert.match(source, /Direct bulk proofreading is temporarily disabled/);
  assert.match(source, /status: 409/);
  assert.doesNotMatch(source, /api\.openai\.com|OPENAI_API_KEY|prisma\.|saveArabicItem|proofreadArabic/);
});

test("localization preview cannot apply or save database changes", () => {
  const api = readFileSync("app/api/admin/content-localization/preview/route.ts", "utf8");
  const dialog = readFileSync(
    "app/(dashboard)/dashboard/_components/ContentLocalizationPreviewDialog.tsx",
    "utf8",
  );
  const card = readFileSync(
    "app/(dashboard)/dashboard/_components/ContentLocalizationAuditCard.tsx",
    "utf8",
  );
  assert.match(api, /body\?\.action !== "generate"/);
  assert.match(api, /status: 409/);
  assert.doesNotMatch(api, /\.update\(|\.upsert\(|\.create\(|\.delete\(/);
  assert.doesNotMatch(dialog, /saveRows|حفظ بعد التدقيق|rows:\s*changedRows/);
  assert.doesNotMatch(card, /arabic-bulk-proofread|تدقيق العربي بالكامل/);
});

test("operations content permission boundary remains unchanged", () => {
  const source = readFileSync("app/(dashboard)/dashboard/operations/layout.tsx", "utf8");
  assert.match(source, /resolveDashboardPageAccess[\s\S]*"operations"/);
});

test("targeted CMS security TypeScript check passes", () => {
  execFileSync(process.execPath, [
    "node_modules/typescript/bin/tsc",
    "-p",
    "tsconfig.cms-security.json",
  ], { stdio: "pipe" });
});

test("primary Prisma schema validates without modification", () => {
  execFileSync(process.execPath, [
    "node_modules/prisma/build/index.js",
    "validate",
    "--schema",
    "prisma/schema.prisma",
  ], { stdio: "pipe" });
});
