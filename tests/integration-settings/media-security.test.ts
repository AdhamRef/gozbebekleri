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

function file(name: string, type: string, bytes: number[], declaredSize = bytes.length): FileLike {
  const data = Uint8Array.from(bytes);
  return {
    name,
    type,
    size: declaredSize,
    arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  };
}

const jpeg = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0];
const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0];
const webp = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

async function expectMediaError(action: () => Promise<unknown>, code: string, status = 400) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof MediaSecurityError);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  });
}

test("real JPEG PNG and WebP signatures pass", async () => {
  assert.equal((await validateMediaFile(file("photo.jpg", "image/jpeg", jpeg), "blog")).mimeType, "image/jpeg");
  assert.equal((await validateMediaFile(file("photo.png", "image/png", png), "slides")).mimeType, "image/png");
  assert.equal((await validateMediaFile(file("photo.webp", "image/webp", webp), "campaigns")).mimeType, "image/webp");
});

test("forged MIME and forged extension are rejected", async () => {
  await expectMediaError(() => validateMediaFile(file("photo.jpg", "image/png", jpeg), "blog"), "MIME_MISMATCH");
  await expectMediaError(() => validateMediaFile(file("photo.png", "image/jpeg", jpeg), "blog"), "EXTENSION_MISMATCH");
});

test("SVG HTML JavaScript executables and suspicious double extensions are rejected", async () => {
  const text = (value: string) => Array.from(new TextEncoder().encode(value));
  await expectMediaError(() => validateMediaFile(file("x.svg", "image/svg+xml", text("<svg></svg>")), "blog"), "UNSUPPORTED_TYPE");
  await expectMediaError(() => validateMediaFile(file("x.html", "text/html", text("<!doctype html><html>")), "blog"), "UNSUPPORTED_TYPE");
  await expectMediaError(() => validateMediaFile(file("x.js", "application/javascript", text("<script>alert(1)</script>")), "blog"), "UNSUPPORTED_TYPE");
  await expectMediaError(() => validateMediaFile(file("x.exe", "application/octet-stream", [0x4d, 0x5a, 0, 0]), "blog"), "UNSUPPORTED_TYPE");
  await expectMediaError(() => validateMediaFile(file("photo.exe.jpg", "image/jpeg", jpeg), "blog"), "INVALID_EXTENSION");
});

test("empty oversized and excessive file counts are rejected", async () => {
  await expectMediaError(() => validateMediaFile(file("empty.jpg", "image/jpeg", []), "blog"), "EMPTY_FILE");
  const oversized = new Uint8Array(10 * 1024 * 1024 + 1);
  oversized.set(jpeg);
  await expectMediaError(
    () => validateMediaFile({ name: "large.jpg", type: "image/jpeg", size: oversized.byteLength, arrayBuffer: async () => oversized.buffer }, "blog"),
    "FILE_TOO_LARGE",
    413,
  );
  assert.throws(() => validateFileCount([{}, {}]), (error: unknown) => error instanceof MediaSecurityError && error.code === "TOO_MANY_FILES");
});

test("MP4 is accepted only for campaign media", async () => {
  const mp4 = [0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d];
  assert.equal((await validateMediaFile(file("video.mp4", "video/mp4", mp4), "campaigns")).type, "video");
  await expectMediaError(() => validateMediaFile(file("video.mp4", "video/mp4", mp4), "blog"), "TYPE_NOT_ALLOWED_FOR_SCOPE");
});

test("unsafe asset identifiers are rejected before deletion dependencies run", async () => {
  for (const value of [
    "../secret.jpg",
    "%2e%2e%2fsecret.jpg",
    "gozbebekleri/media/blog/a\0.jpg",
    "https://evil.example/a.jpg",
    "/gozbebekleri/media/blog/a.jpg",
    "custom/folder/a.jpg",
    "campaigns/client-public-id.jpg",
  ]) {
    assert.throws(() => assertSafeAssetId(value, "blog"), MediaSecurityError);
  }

  let providerCalls = 0;
  const remove = createSecureMediaDeleter({
    lookupUrl: async () => { providerCalls += 1; return null; },
    isReferenced: async () => false,
    remove: async () => { providerCalls += 1; return { deleted: true, notFound: false }; },
  });
  await assert.rejects(() => remove("../outside.jpg", "blog"), MediaSecurityError);
  assert.equal(providerCalls, 0);
});

test("secure deletion is idempotent and protects referenced assets", async () => {
  const assetId = "gozbebekleri/media/blog/12345678-1234-1234-1234-123456789abc.jpg";
  let removed = 0;
  const missing = createSecureMediaDeleter({
    lookupUrl: async () => null,
    isReferenced: async () => false,
    remove: async () => { removed += 1; return { deleted: true, notFound: false }; },
  });
  assert.deepEqual(await missing(assetId, "blog"), { deleted: false, notFound: true });
  assert.equal(removed, 0);

  const inUse = createSecureMediaDeleter({
    lookupUrl: async () => "https://res.cloudinary.com/example/image/upload/x.jpg",
    isReferenced: async () => true,
    remove: async () => { removed += 1; return { deleted: true, notFound: false }; },
  });
  assert.deepEqual(await inUse(assetId, "blog"), { deleted: false, notFound: false, inUse: true });
  assert.equal(removed, 0);

  const deletable = createSecureMediaDeleter({
    lookupUrl: async () => "https://res.cloudinary.com/example/image/upload/x.jpg",
    isReferenced: async () => false,
    remove: async () => { removed += 1; return { deleted: true, notFound: false }; },
  });
  assert.deepEqual(await deletable(assetId, "blog"), { deleted: true, notFound: false, inUse: false });
  assert.equal(removed, 1);
});

test("ADMIN and correctly permitted STAFF can access each media section", () => {
  const admin = { role: "ADMIN", dashboardPermissions: [] };
  const blogStaff = { role: "STAFF", dashboardPermissions: ["blog"] };
  const wrongStaff = { role: "STAFF", dashboardPermissions: ["slides"] };
  const donor = { role: "DONOR", dashboardPermissions: ["blog"] };
  assert.equal(userHasDashboardPermission(admin, permissionForMediaScope("blog")), true);
  assert.equal(userHasDashboardPermission(blogStaff, permissionForMediaScope("blog")), true);
  assert.equal(userHasDashboardPermission(wrongStaff, permissionForMediaScope("blog")), false);
  assert.equal(userHasDashboardPermission(donor, permissionForMediaScope("blog")), false);
});

test("normalized response exposes no provider secrets or raw payload", () => {
  const response = normalizeUploadResponse({
    url: "https://example.test/a.webp",
    assetId: "gozbebekleri/media/blog/12345678-1234-1234-1234-123456789abc.webp",
    type: "image",
    mimeType: "image/webp",
    size: 12345,
  });
  assert.deepEqual(Object.keys(response).sort(), ["assetId", "mimeType", "size", "type", "url"]);
  const serialized = JSON.stringify(response);
  assert.doesNotMatch(serialized, /apiKey|secret|signature|public_id|raw/i);
});

test("upload authorization happens before body parsing and storage calls", () => {
  const source = readFileSync("app/api/upload/route.ts", "utf8");
  const post = source.slice(source.indexOf("export async function POST"), source.indexOf("const secureDelete"));
  const auth = post.indexOf("await authorize(request)");
  const denied = post.indexOf("if (denied");
  const formData = post.indexOf("request.formData()");
  const storage = post.indexOf("uploadMedia(");
  assert.ok(auth >= 0 && denied > auth && formData > denied && storage > formData);
  assert.doesNotMatch(post.slice(0, denied), /request\.formData|uploadMedia\(/);
});

test("archive authorization precedes file reads and archive deletion uses internal pathname", () => {
  const upload = readFileSync("app/api/admin/archive/uploaded-files/route.ts", "utf8");
  const post = upload.slice(upload.indexOf("export async function POST"));
  assert.ok(post.indexOf('requireArchiveActionAccess("archiveUpload")') < post.indexOf("request.formData()"));
  assert.match(post, /deleteArchiveBlobFile\(blob\.blobPathname\)/);

  const deletion = readFileSync("app/api/admin/archive/uploaded-files/[id]/route.ts", "utf8");
  const section = deletion.slice(deletion.indexOf("export async function DELETE"));
  assert.match(section, /requireArchiveActionAccess\("archiveDelete"\)/);
  assert.match(section, /metadata\.blobPathname/);
  assert.doesNotMatch(section, /metadata\.blobUrl\)\s*\|\|/);
  assert.match(section, /assertArchiveBlobPathname/);
});

test("media security TypeScript scope includes core adapters and routes", () => {
  const config = JSON.parse(readFileSync("tsconfig.media-security.json", "utf8")) as { include: string[]; compilerOptions: Record<string, unknown> };
  for (const path of [
    "lib/media/security-core.ts",
    "lib/media/storage-adapter.ts",
    "app/api/upload/route.ts",
    "app/api/admin/archive/uploaded-files/route.ts",
    "app/api/admin/archive/uploaded-files/[id]/route.ts",
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

test("media changes do not reference donation import or payment implementation", () => {
  const config = readFileSync("tsconfig.media-security.json", "utf8");
  assert.doesNotMatch(config, /bulk-import|donations\/|payments?\//i);
  const route = readFileSync("app/api/upload/route.ts", "utf8");
  assert.doesNotMatch(route, /Donation|Payment|bulkImport|bulk-import/);
});
