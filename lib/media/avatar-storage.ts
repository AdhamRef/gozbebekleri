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

function avatarAssetId(userId: string, extension: ValidatedAvatar["extension"]): string {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeUserId || safeUserId !== userId) throw new Error("Invalid authenticated user id");
  return `gozbebekleri/avatars/${safeUserId}/${randomUUID()}.${extension}`;
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

export async function deleteNewAvatar(assetId: string, userId: string): Promise<void> {
  const prefix = `gozbebekleri/avatars/${userId}/`;
  if (!assetId.startsWith(prefix) || assetId.slice(prefix.length).includes("/")) return;
  if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[0-9a-f-]+\.(jpg|png|webp)$/i.test(assetId)) return;
  await cloudinary.uploader.destroy(assetId.replace(/\.[^.]+$/, ""), {
    resource_type: "image",
    invalidate: true,
  }).catch(() => undefined);
}
