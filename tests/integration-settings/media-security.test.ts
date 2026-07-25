import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  MediaSecurityError,
  assertSafeAssetId,
  createSecureMediaDeleter,
  normalizeUploadResponse,
  validateFileCount,
  validateMediaFile,
  type FileLike,
} from "../../lib/media/security-core";
import { permissionForMediaScope } from "../../lib/media/access";
import { userHasDashboardPermission } from "../../lib/dashboard/permissions";

function file(name: string, type: string, bytes: number[]): FileLike {
  const data = Uint8Array.from(bytes);
  return {
    name,
    type,
    size: data.byteLength,
    arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  };
}

const jpeg = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0];
const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0];
const webp = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const validAssetId = "gozbebekleri/media/blog/12345678-1234-4234-9234-123456789abc.jpg";

async function expectMediaError(action: () => Promise<unknown>, code: string) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof MediaSecurityError);
    assert.equal(error.code, code);
    return true;
  });
}

test("real JPEG PNG and WebP signatures pass", async () => {
  assert.equal((await validateMediaFile(file("photo.jpg", "image/jpeg", jpeg), "blog")).mimeType, "image/jpeg");
  assert.equal((await validateMediaFile(file("photo.png", "image/png", png), "slides")).mimeType, "image/png");
  assert.equal((await validateMediaFile(file("photo.webp", "image/webp", webp), "campaigns")).mimeType, "image/webp");
});

test("forged MIME extension unsupported payload and file counts are rejected", async () => {
  await expectMediaError(() => validateMediaFile(file("photo.jpg", "image/png", jpeg), "blog"), "MIME_MISMATCH");
  await expectMediaError(() => validateMediaFile(file("photo.png", "image/jpeg", jpeg), "blog"), "EXTENSION_MISMATCH");
  await expectMediaError(() => validateMediaFile(file("x.svg", "image/svg+xml", Array.from(new TextEncoder().encode("<svg/>"))), "blog"), "UNSUPPORTED_TYPE");
  assert.throws(() => validateFileCount([{}, {}]), MediaSecurityError);
});

test("unsafe asset identifiers are rejected before provider dependencies run", async () => {
  for (const value of ["../secret.jpg", "%2e%2e%2fsecret.jpg", "custom/folder/a.jpg", "https://evil.test/a.jpg"]) {
    assert.throws(() => assertSafeAssetId(value, "blog"), MediaSecurityError);
  }
  let calls = 0;
  const remove = createSecureMediaDeleter({
    lookupUrl: async () => { calls += 1; return null; },
    isReferenced: async () => false,
    remove: async () => { calls += 1; return { deleted: true, notFound: false }; },
  });
  await assert.rejects(() => remove("../outside.jpg", "blog"), MediaSecurityError);
  assert.equal(calls, 0);
});

test("secure deletion is idempotent and protects referenced assets", async () => {
  let removed = 0;
  const missing = createSecureMediaDeleter({
    lookupUrl: async () => null,
    isReferenced: async () => false,
    remove: async () => { removed += 1; return { deleted: true, notFound: false }; },
  });
  assert.deepEqual(await missing(validAssetId, "blog"), { deleted: false, notFound: true });
  assert.equal(removed, 0);

  const inUse = createSecureMediaDeleter({
    lookupUrl: async () => "https://example.test/a.jpg",
    isReferenced: async () => true,
    remove: async () => { removed += 1; return { deleted: true, notFound: false }; },
  });
  assert.deepEqual(await inUse(validAssetId, "blog"), { deleted: false, notFound: false, inUse: true });
  assert.equal(removed, 0);
});

test("ADMIN and correctly permitted STAFF can access media sections", () => {
  assert.equal(userHasDashboardPermission({ role: "ADMIN", dashboardPermissions: [] }, permissionForMediaScope("blog")), true);
  assert.equal(userHasDashboardPermission({ role: "STAFF", dashboardPermissions: ["blog"] }, permissionForMediaScope("blog")), true);
  assert.equal(userHasDashboardPermission({ role: "STAFF", dashboardPermissions: ["slides"] }, permissionForMediaScope("blog")), false);
  assert.equal(userHasDashboardPermission({ role: "DONOR", dashboardPermissions: ["blog"] }, permissionForMediaScope("blog")), false);
});

test("normalized response exposes no provider secrets or raw payload", () => {
  const response = normalizeUploadResponse({
    url: "https://example.test/a.webp",
    assetId: "gozbebekleri/media/blog/12345678-1234-4234-9234-123456789abc.webp",
    type: "image",
    mimeType: "image/webp",
    size: 12345,
  });
  assert.deepEqual(Object.keys(response).sort(), ["assetId", "mimeType", "size", "type", "url"]);
  assert.doesNotMatch(JSON.stringify(response), /apiKey|secret|signature|public_id|raw/i);
});

test("upload authorization and content length checks happen before body parsing", () => {
  const source = readFileSync("app/api/upload/route.ts", "utf8");
  const post = source.slice(source.indexOf("export async function POST"), source.indexOf("const secureDelete"));
  assert.ok(post.indexOf("await authorize(request)") < post.indexOf("request.formData()"));
  assert.ok(post.indexOf("assertContentLength") < post.indexOf("request.formData()"));
  assert.ok(post.indexOf("request.formData()") < post.indexOf("uploadMedia("));
});

test("media security TypeScript scope includes core adapters and routes", () => {
  const config = JSON.parse(readFileSync("tsconfig.media-security.json", "utf8")) as { include: string[]; compilerOptions: Record<string, unknown> };
  for (const path of [
    "lib/media/security-core.ts",
    "lib/media/avatar-storage.ts",
    "lib/media/archive-chunks-core.ts",
    "app/api/upload/route.ts",
    "app/api/users/me/avatar/route.ts",
    "app/api/admin/archive/uploaded-files/[id]/chunk/route.ts",
    "app/api/admin/archive/uploaded-files/[id]/complete/route.ts",
  ]) assert.ok(config.include.includes(path), `${path} missing from targeted scope`);
  assert.equal(config.compilerOptions.strict, true);
  assert.equal(config.compilerOptions.noEmit, true);
  assert.equal(config.compilerOptions.allowJs, false);
});

test("strict targeted media security TypeScript check passes", () => {
  const result = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.media-security.json"], {
    encoding: "utf8",
    env: process.env,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("media scope excludes donation import and payment implementation", () => {
  const config = readFileSync("tsconfig.media-security.json", "utf8");
  assert.doesNotMatch(config, /bulk-import|payments?\//i);
  const route = readFileSync("app/api/upload/route.ts", "utf8");
  assert.doesNotMatch(route, /Donation|Payment|bulkImport|bulk-import/);
});
