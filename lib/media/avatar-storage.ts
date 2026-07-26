import "server-only";

import { randomUUID } from "node:crypto";
import cloudinary from "@/lib/cloudinary";
import type { ValidatedAvatar } from "./avatar-core";

export type StoredAvatar = {
  url: string;
  assetId: string;
  type: "image";
  mimeType: ValidatedAvatar["mimeType"];
  size: number;
};

function safeUserId(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safe || safe !== userId) throw new Error("Invalid authenticated user id");
  return safe;
}

function avatarAssetId(userId: string, extension: ValidatedAvatar["extension"]): string {
  return `gozbebekleri/avatars/${safeUserId(userId)}/${randomUUID()}.${extension}`;
}

export function managedAvatarAssetIdFromUrl(url: string | null | undefined, userId: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = "/upload/";
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;
    const candidate = decodeURIComponent(parsed.pathname.slice(index + marker.length)).replace(/^v\d+\//, "");
    const prefix = `gozbebekleri/avatars/${safeUserId(userId)}/`;
    if (!candidate.startsWith(prefix) || candidate.slice(prefix.length).includes("/")) return null;
    if (!/^[a-zA-Z0-9_-]+\/avatars\/[a-zA-Z0-9_-]+\/[0-9a-f-]+\.(jpg|png|webp)$/i.test(candidate)) return null;
    return candidate;
  } catch {
    return null;
  }
}

export async function uploadAvatar(userId: string, avatar: ValidatedAvatar): Promise<StoredAvatar> {
  const assetId = avatarAssetId(userId, avatar.extension);
  const publicId = assetId.replace(/\.[^.]+$/, "");
  const dataUri = `data:${avatar.mimeType};base64,${Buffer.from(avatar.bytes).toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    public_id: publicId,
    overwrite: false,
    unique_filename: false,
    resource_type: "image",
  });
  return {
    url: result.secure_url,
    assetId,
    type: "image",
    mimeType: avatar.mimeType,
    size: avatar.size,
  };
}

export async function deleteManagedAvatar(assetId: string, userId: string): Promise<void> {
  const prefix = `gozbebekleri/avatars/${safeUserId(userId)}/`;
  if (!assetId.startsWith(prefix) || assetId.slice(prefix.length).includes("/")) return;
  if (!/^[a-zA-Z0-9_-]+\/avatars\/[a-zA-Z0-9_-]+\/[0-9a-f-]+\.(jpg|png|webp)$/i.test(assetId)) return;
  await cloudinary.uploader.destroy(assetId.replace(/\.[^.]+$/, ""), {
    resource_type: "image",
    invalidate: true,
  }).catch(() => undefined);
}

export const deleteNewAvatar = deleteManagedAvatar;
