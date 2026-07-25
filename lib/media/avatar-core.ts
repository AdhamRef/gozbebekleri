import {
  MediaSecurityError,
  detectMediaType,
  extensionFromName,
  type FileLike,
} from "./security-core";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export type ValidatedAvatar = {
  bytes: Uint8Array;
  extension: "jpg" | "png" | "webp";
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  size: number;
};

const MIME_BY_EXTENSION: Record<string, ValidatedAvatar["mimeType"]> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function validateAvatarFile(file: FileLike): Promise<ValidatedAvatar> {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new MediaSecurityError("No avatar file uploaded", 400, "MISSING_FILE");
  }
  if (file.size <= 0) {
    throw new MediaSecurityError("Empty avatar files are not allowed", 400, "EMPTY_FILE");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new MediaSecurityError("Avatar exceeds 2MB", 413, "FILE_TOO_LARGE");
  }

  const extension = extensionFromName(file.name);
  if (!(extension in MIME_BY_EXTENSION)) {
    throw new MediaSecurityError("Only JPEG, PNG, and WebP avatars are supported", 400, "UNSUPPORTED_TYPE");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength !== file.size) {
    throw new MediaSecurityError("Avatar size mismatch", 400, "SIZE_MISMATCH");
  }
  const detected = detectMediaType(bytes);
  if (detected.type !== "image" || detected.extension === "mp4") {
    throw new MediaSecurityError("Only images can be used as avatars", 400, "UNSUPPORTED_TYPE");
  }
  if (MIME_BY_EXTENSION[extension] !== detected.mimeType) {
    throw new MediaSecurityError("Avatar extension does not match its content", 400, "EXTENSION_MISMATCH");
  }
  if (file.type.toLowerCase() !== detected.mimeType) {
    throw new MediaSecurityError("Avatar MIME type does not match its content", 400, "MIME_MISMATCH");
  }

  return {
    bytes,
    extension: detected.extension,
    mimeType: detected.mimeType,
    size: file.size,
  };
}

export type AvatarAuthorizationInput = {
  sessionUserId?: string | null;
  requestedUserId?: string | null;
};

export function assertAvatarSelfAccess(input: AvatarAuthorizationInput): string {
  if (!input.sessionUserId) {
    throw new MediaSecurityError("Unauthorized", 400, "UNAUTHORIZED");
  }
  if (input.requestedUserId && input.requestedUserId !== input.sessionUserId) {
    throw new MediaSecurityError("Cannot update another user's avatar", 400, "FORBIDDEN_USER_ID");
  }
  return input.sessionUserId;
}
