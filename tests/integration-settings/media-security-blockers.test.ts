import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import {
  IMAGE_MAX_BYTES,
  MediaSecurityError,
  assertSafeAssetId,
  validateMediaFile,
  type FileLike,
} from "../../lib/media/security-core";
import { validateAvatarFile } from "../../lib/media/avatar-core";
import {
  validateArchiveChunkRequest,
  validateArchiveCompletion,
  type ExistingArchiveChunk,
} from "../../lib/media/archive-chunks-core";
import { validateArchiveMediaFile } from "../../lib/media/archive-security";
import { hasArchiveBlobReference } from "../../lib/media/archive-reference-core";

function file(name: string, type: string, bytes: Uint8Array, size = bytes.byteLength, onRead?: () => void): FileLike {
  return {
    name,
    type,
    size,
    arrayBuffer: async () => {
      onRead?.();
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
  };
}

async function rejectsCode(action: () => Promise<unknown>, code: string, status = 400) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof MediaSecurityError);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  });
}

const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

function workbook(format: "xlsx" | "xls") {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["ok"], [1]]), "Sheet1");
  return new Uint8Array(XLSX.write(book, { type: "buffer", bookType: format }));
}

test("declared oversized media is rejected before arrayBuffer", async () => {
  let reads = 0;
  await rejectsCode(
    () => validateMediaFile(file("large.jpg", "image/jpeg", jpeg, IMAGE_MAX_BYTES + 1, () => { reads += 1; }), "blog"),
    "FILE_TOO_LARGE",
    413,
  );
  assert.equal(reads, 0);
});

test("asset ids require exactly scope plus UUID and extension", () => {
  const valid = "gozbebekleri/media/blog/12345678-1234-4234-9234-123456789abc.webp";
  assert.equal(assertSafeAssetId(valid, "blog"), valid);
  for (const invalid of [
    "gozbebekleri/media/blog/extra/12345678-1234-4234-9234-123456789abc.webp",
    "gozbebekleri/media/blog/not-a-uuid.webp",
    "gozbebekleri/media/blog/12345678-1234-4234-9234-123456789abc.mp4",
  ]) assert.throws(() => assertSafeAssetId(invalid, "blog"), MediaSecurityError);
});

test("avatar accepts only real JPEG PNG WebP and rejects oversized before read", async () => {
  assert.equal((await validateAvatarFile(file("a.jpg", "image/jpeg", jpeg))).mimeType, "image/jpeg");
  assert.equal((await validateAvatarFile(file("a.png", "image/png", png))).mimeType, "image/png");
  assert.equal((await validateAvatarFile(file("a.webp", "image/webp", webp))).mimeType, "image/webp");
  let reads = 0;
  await rejectsCode(
    () => validateAvatarFile(file("a.jpg", "image/jpeg", jpeg, 2 * 1024 * 1024 + 1, () => { reads += 1; })),
    "FILE_TOO_LARGE",
    413,
  );
  assert.equal(reads, 0);
});

test("profile avatar route is self-only and ignores client user ids", () => {
  const route = readFileSync("app/api/users/me/avatar/route.ts", "utf8");
  assert.match(route, /session\.user\.id/);
  assert.match(route, /formData\.has\("userId"\)/);
  assert.doesNotMatch(route, /api\/users\/\$\{|params.*userId|where:\s*\{\s*id:\s*formData/);
  const client = readFileSync("app/[locale]/profile/_components/AvatarUploader.tsx", "utf8");
  assert.match(client, /\/api\/users\/me\/avatar/);
  assert.doesNotMatch(client, /\/api\/upload|\/api\/users\/\$\{userId\}/);
});

test("chunk validation enforces active parent bounds duplicate and cumulative size", () => {
  const parent = { uploadStatus: "UPLOADING", category: "DOCUMENTS", chunkCount: 2, sizeBytes: 6 };
  assert.deepEqual(validateArchiveChunkRequest({ parent, index: 0, total: 2, chunkSize: 3, existing: [] }), {
    duplicate: false,
    cumulativeSize: 3,
  });
  assert.deepEqual(validateArchiveChunkRequest({
    parent,
    index: 0,
    total: 2,
    chunkSize: 3,
    existing: [{ index: 0, total: 2, sizeBytes: 3 }],
  }), { duplicate: true, cumulativeSize: 3 });
  assert.throws(() => validateArchiveChunkRequest({ parent, index: 2, total: 2, chunkSize: 1, existing: [] }), MediaSecurityError);
  assert.throws(() => validateArchiveChunkRequest({ parent, index: 0, total: 3, chunkSize: 1, existing: [] }), MediaSecurityError);
  assert.throws(() => validateArchiveChunkRequest({
    parent,
    index: 1,
    total: 2,
    chunkSize: 4,
    existing: [{ index: 0, total: 2, sizeBytes: 3 }],
  }), MediaSecurityError);
});

test("completion requires exactly indexes 0 through expected minus one and exact size", () => {
  const parent = { uploadStatus: "UPLOADING", category: "MARKETING", chunkCount: 2, sizeBytes: 6 };
  const valid: ExistingArchiveChunk[] = [
    { index: 1, total: 2, sizeBytes: 3, base64: "YmJi" },
    { index: 0, total: 2, sizeBytes: 3, base64: "YWFh" },
  ];
  assert.deepEqual(validateArchiveCompletion({ parent, chunks: valid }).map((chunk) => chunk.index), [0, 1]);
  assert.throws(() => validateArchiveCompletion({ parent, chunks: [valid[0]] }), MediaSecurityError);
  assert.throws(() => validateArchiveCompletion({ parent, chunks: [valid[0], { ...valid[0] }] }), MediaSecurityError);
  assert.throws(() => validateArchiveCompletion({ parent, chunks: [{ ...valid[0], index: 2 }, valid[1]] }), MediaSecurityError);
  assert.throws(() => validateArchiveCompletion({ parent, chunks: [{ ...valid[0], sizeBytes: 2 }, valid[1]] }), MediaSecurityError);
});

test("archive validates PDF XLSX and XLS structures", async () => {
  const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
  assert.equal((await validateArchiveMediaFile(file("a.pdf", "application/pdf", pdf))).extension, "pdf");
  await rejectsCode(
    () => validateArchiveMediaFile(file("a.pdf", "application/pdf", new TextEncoder().encode("%PDF-1.4 broken"))),
    "CORRUPT_PDF",
  );

  const xlsx = workbook("xlsx");
  assert.equal((await validateArchiveMediaFile(file("a.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsx))).extension, "xlsx");
  const normalZip = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
  await rejectsCode(
    () => validateArchiveMediaFile(file("a.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", normalZip)),
    "CORRUPT_XLSX",
  );

  const xls = workbook("xls");
  assert.equal((await validateArchiveMediaFile(file("a.xls", "application/vnd.ms-excel", xls))).extension, "xls");
  const arbitraryOle = Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]);
  await rejectsCode(() => validateArchiveMediaFile(file("a.xls", "application/vnd.ms-excel", arbitraryOle)), "CORRUPT_XLS");
  await rejectsCode(() => validateArchiveMediaFile(file("a.xlsx", "application/pdf", xlsx)), "MIME_MISMATCH");
  await rejectsCode(() => validateArchiveMediaFile(file("a.xls", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsx)), "MIME_MISMATCH");

  let reads = 0;
  await rejectsCode(
    () => validateArchiveMediaFile(file("large.pdf", "application/pdf", pdf, 30 * 1024 * 1024 + 1, () => { reads += 1; })),
    "FILE_TOO_LARGE",
    413,
  );
  assert.equal(reads, 0);
});

test("shared blob reference scan finds a reference after row 500", async () => {
  const rows = Array.from({ length: 601 }, (_, index) => ({
    id: String(index).padStart(4, "0"),
    metadata: { blobPathname: index === 550 ? "gozbebekleri/archive/documents/shared.pdf" : `other-${index}` },
  }));
  const found = await hasArchiveBlobReference({
    currentId: "0000",
    pathname: "gozbebekleri/archive/documents/shared.pdf",
    pageSize: 250,
    readPage: async ({ cursor, take }) => {
      const start = cursor ? rows.findIndex((row) => row.id === cursor) + 1 : 0;
      return rows.slice(start, start + take);
    },
  });
  assert.equal(found, true);
});

test("chunk and complete routes recheck document permission before file data operations", () => {
  const chunk = readFileSync("app/api/admin/archive/uploaded-files/[id]/chunk/route.ts", "utf8");
  assert.ok(chunk.indexOf("requireArchiveUploadedFileListAccess") < chunk.indexOf("request.formData()"));
  const complete = readFileSync("app/api/admin/archive/uploaded-files/[id]/complete/route.ts", "utf8");
  assert.match(complete, /requireArchiveUploadedFileListAccess\("DOCUMENTS"\)/);
  assert.ok(complete.indexOf("validateArchiveCompletion") < complete.indexOf("assembleValidatedChunks"));
});

test("donation-new remains a real page and media work does not change donation APIs", () => {
  const source = readFileSync("app/(dashboard)/dashboard/donations/new/page.tsx", "utf8");
  assert.doesNotMatch(source, /redirect\("\/dashboard\/campaigns\/new"\)/);
  assert.doesNotMatch(source, /api\/donations|api\/payments|prisma|payment/i);
  assert.match(source, /export default function NewCampaignPage/);
});
