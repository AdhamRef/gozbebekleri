import { MediaSecurityError } from "./security-core";

const ARCHIVE_MAX_FILE_BYTES = 30 * 1024 * 1024;

export type ArchiveUploadParent = {
  uploadStatus: string;
  category: string;
  chunkCount: number;
  sizeBytes: number;
};

export type ExistingArchiveChunk = {
  index: number;
  total: number;
  sizeBytes: number;
  base64?: string;
};

export function validateArchiveChunkRequest(input: {
  parent: ArchiveUploadParent;
  index: number;
  total: number;
  chunkSize: number;
  existing: readonly ExistingArchiveChunk[];
}): { duplicate: boolean; cumulativeSize: number } {
  const { parent, index, total, chunkSize, existing } = input;
  if (parent.uploadStatus !== "UPLOADING") {
    throw new MediaSecurityError("Archive upload is not accepting chunks", 400, "UPLOAD_NOT_ACTIVE");
  }
  if (!Number.isInteger(parent.chunkCount) || parent.chunkCount < 1 || parent.chunkCount > 40) {
    throw new MediaSecurityError("Invalid stored chunk count", 400, "INVALID_PARENT_CHUNK_COUNT");
  }
  if (!Number.isFinite(parent.sizeBytes) || parent.sizeBytes <= 0 || parent.sizeBytes > ARCHIVE_MAX_FILE_BYTES) {
    throw new MediaSecurityError("Invalid stored archive size", 400, "INVALID_PARENT_SIZE");
  }
  if (!Number.isInteger(total) || total < 1 || total > 40 || total !== parent.chunkCount) {
    throw new MediaSecurityError("Chunk total does not match the upload", 400, "CHUNK_TOTAL_MISMATCH");
  }
  if (!Number.isInteger(index) || index < 0 || index >= total) {
    throw new MediaSecurityError("Chunk index is out of range", 400, "CHUNK_INDEX_OUT_OF_RANGE");
  }
  if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
    throw new MediaSecurityError("Empty archive chunks are not allowed", 400, "EMPTY_CHUNK");
  }

  const duplicate = existing.some((item) => item.index === index);
  const cumulativeSize = existing.reduce((sum, item) => sum + item.sizeBytes, 0) + (duplicate ? 0 : chunkSize);
  if (cumulativeSize > parent.sizeBytes || cumulativeSize > ARCHIVE_MAX_FILE_BYTES) {
    throw new MediaSecurityError("Archive chunks exceed the declared size", 413, "CHUNKS_TOO_LARGE");
  }
  return { duplicate, cumulativeSize };
}

export function validateArchiveCompletion(input: {
  parent: ArchiveUploadParent;
  chunks: readonly ExistingArchiveChunk[];
}): ExistingArchiveChunk[] {
  const { parent, chunks } = input;
  if (parent.uploadStatus !== "UPLOADING") {
    throw new MediaSecurityError("Archive upload is not ready for completion", 400, "UPLOAD_NOT_ACTIVE");
  }
  if (!Number.isInteger(parent.chunkCount) || parent.chunkCount < 1 || parent.chunkCount > 40) {
    throw new MediaSecurityError("Invalid stored chunk count", 400, "INVALID_PARENT_CHUNK_COUNT");
  }
  if (!Number.isFinite(parent.sizeBytes) || parent.sizeBytes <= 0 || parent.sizeBytes > ARCHIVE_MAX_FILE_BYTES) {
    throw new MediaSecurityError("Invalid stored archive size", 400, "INVALID_PARENT_SIZE");
  }
  if (chunks.length !== parent.chunkCount) {
    throw new MediaSecurityError("Archive chunks are incomplete", 400, "MISSING_CHUNKS");
  }

  const seen = new Set<number>();
  let totalBytes = 0;
  for (const chunk of chunks) {
    if (!Number.isInteger(chunk.index) || chunk.index < 0 || chunk.index >= parent.chunkCount) {
      throw new MediaSecurityError("Archive chunk index is out of range", 400, "CHUNK_INDEX_OUT_OF_RANGE");
    }
    if (chunk.total !== parent.chunkCount) {
      throw new MediaSecurityError("Archive chunk total is inconsistent", 400, "CHUNK_TOTAL_MISMATCH");
    }
    if (seen.has(chunk.index)) {
      throw new MediaSecurityError("Duplicate archive chunk index", 400, "DUPLICATE_CHUNK");
    }
    seen.add(chunk.index);
    if (!Number.isFinite(chunk.sizeBytes) || chunk.sizeBytes <= 0) {
      throw new MediaSecurityError("Invalid archive chunk size", 400, "INVALID_CHUNK_SIZE");
    }
    totalBytes += chunk.sizeBytes;
    if (totalBytes > parent.sizeBytes || totalBytes > ARCHIVE_MAX_FILE_BYTES) {
      throw new MediaSecurityError("Archive chunks exceed the declared size", 413, "CHUNKS_TOO_LARGE");
    }
  }

  for (let index = 0; index < parent.chunkCount; index += 1) {
    if (!seen.has(index)) {
      throw new MediaSecurityError("Archive chunk index is missing", 400, "MISSING_CHUNKS");
    }
  }
  if (totalBytes !== parent.sizeBytes) {
    throw new MediaSecurityError("Archive chunk sizes do not match the declared file size", 400, "SIZE_MISMATCH");
  }
  return [...chunks].sort((a, b) => a.index - b.index);
}

export function assembleValidatedChunks(chunks: readonly ExistingArchiveChunk[]): Buffer {
  const buffers = chunks.map((chunk) => {
    if (!chunk.base64) throw new MediaSecurityError("Archive chunk data is missing", 400, "MISSING_CHUNK_DATA");
    const buffer = Buffer.from(chunk.base64, "base64");
    if (buffer.byteLength !== chunk.sizeBytes) {
      throw new MediaSecurityError("Archive chunk data size mismatch", 400, "SIZE_MISMATCH");
    }
    return buffer;
  });
  return Buffer.concat(buffers);
}
