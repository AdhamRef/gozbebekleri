import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import type { Session } from "next-auth";
import { resolveDashboardPageAccess } from "../../lib/dashboard/page-access";
import {
  createDashboardPageDataLoader,
  createDashboardPagePermissionGuard,
} from "../../lib/dashboard/page-permission";
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

class RedirectSignal extends Error {
  constructor(readonly redirectTo: string) {
    super(`redirect:${redirectTo}`);
  }
}

function guardedLoaderFor(session: Session | null) {
  const guard = createDashboardPagePermissionGuard(
    async () => session,
    (redirectTo) => {
      throw new RedirectSignal(redirectTo);
    },
  );
  return createDashboardPageDataLoader(guard);
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

test("denied sessions redirect before data loaders or Prisma mocks run", async () => {
  for (const deniedSession of [
    null,
    sessionFor("DONOR"),
    sessionFor("STAFF", ["campaigns"]),
  ]) {
    let loaderCalls = 0;
    let postCategoryReads = 0;
    let campaignReads = 0;
    const prismaMock = {
      postCategory: {
        findMany: async () => {
          postCategoryReads += 1;
          return [];
        },
      },
      campaign: {
        findMany: async () => {
          campaignReads += 1;
          return [];
        },
      },
    };

    const loadDashboardPageData = guardedLoaderFor(deniedSession);
    await assert.rejects(
      loadDashboardPageData("blog", async () => {
        loaderCalls += 1;
        await Promise.all([
          prismaMock.postCategory.findMany(),
          prismaMock.campaign.findMany(),
        ]);
        return true;
      }),
      RedirectSignal,
    );

    assert.equal(loaderCalls, 0);
    assert.equal(postCategoryReads, 0);
    assert.equal(campaignReads, 0);
  }
});

test("admin and staff with the exact permission can run guarded data loaders", async () => {
  for (const allowedSession of [
    sessionFor("ADMIN"),
    sessionFor("STAFF", ["blog"]),
  ]) {
    let loaderCalls = 0;
    let prismaReads = 0;
    const loadDashboardPageData = guardedLoaderFor(allowedSession);
    const result = await loadDashboardPageData("blog", async (session) => {
      loaderCalls += 1;
      prismaReads += 2;
      return session.user.role;
    });

    assert.equal(loaderCalls, 1);
    assert.equal(prismaReads, 2);
    assert.equal(result, allowedSession?.user?.role);
  }
});

test("layouts remain an additional defense while blog reads use the page data guard", () => {
  for (const permission of protectedSections) {
    const layout = readFileSync(
      `app/(dashboard)/dashboard/${permission}/layout.tsx`,
      "utf8",
    );
    assert.match(layout, /requireDashboardPagePermission/);
    assert.match(layout, new RegExp(`requireDashboardPagePermission\\(\"${permission}\"\\)`));
  }

  for (const path of [
    "app/(dashboard)/dashboard/blog/create/page.tsx",
    "app/(dashboard)/dashboard/blog/create/[postId]/page.tsx",
  ]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /loadDashboardPageData\(\s*"blog"/);
  }
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
    const directAuthIndex = handler.indexOf("contentLocalizationPermissionForSection(section)");
    const delegatedAuthIndex = handler.indexOf("authorize(section)");
    const authIndex = directAuthIndex >= 0 ? directAuthIndex : delegatedAuthIndex;
    const loadIndex = handler.indexOf("loadPreviewRows(") >= 0
      ? handler.indexOf("loadPreviewRows(")
      : handler.indexOf("loadItems(section)");
    assert.ok(parseIndex >= 0, `${path} must parse a known section`);
    assert.ok(authIndex > parseIndex, `${path} must authorize the parsed section`);
    assert.ok(loadIndex > authIndex, `${path} must authorize before loading section data`);
    assert.doesNotMatch(source, /requireAdminOrDashboardPermission\([^)]*["']content["']/s);
    assert.match(source, /contentLocalizationPermissionForSection\(section\)/);
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

test("read-only localization audit retains actionable item details", () => {
  const card = readFileSync(
    "app/(dashboard)/dashboard/_components/ContentLocalizationAuditCard.tsx",
    "utf8",
  );
  assert.match(card, /العناصر التي تحتاج عملًا/);
  assert.match(card, /item\.label/);
  assert.match(card, /item\.typeLabel/);
  assert.match(card, /missingFields/);
  assert.match(card, /emptyFields/);
  assert.match(card, /identicalToArabicFields/);
  assert.match(card, /ملاحظات جودة العربية/);
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
