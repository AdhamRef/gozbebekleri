import "server-only";

import { randomUUID } from "node:crypto";
import cloudinary from "@/lib/cloudinary";
import {
  assertSafeAssetId,
  buildAssetId,
  normalizeUploadResponse,
  type MediaScope,
  type NormalizedUploadResponse,
  type ValidatedMedia,
} from "./security-core";

function toDataUri(media: ValidatedMedia): string {
  return `data:${media.mimeType};base64,${Buffer.from(media.bytes).toString("base64")}`;
}

export async function uploadMedia(
  media: ValidatedMedia,
  scope: MediaScope,
): Promise<NormalizedUploadResponse> {
  const assetId = buildAssetId(scope, randomUUID(), media.extension);
  const publicId = assetId.replace(/\.[^.]+$/, "");
  const result = await cloudinary.uploader.upload(toDataUri(media), {
    public_id: publicId,
    overwrite: false,
    unique_filename: false,
    resource_type: media.type === "video" ? "video" : "image",
  });

  return normalizeUploadResponse({
    url: result.secure_url,
    assetId,
    type: media.type,
    mimeType: media.mimeType,
    size: media.size,
  });
}

export type DeleteMediaResult = { deleted: boolean; notFound: boolean };

export async function deleteMedia(assetId: string, scope: MediaScope): Promise<DeleteMediaResult> {
  const safeAssetId = assertSafeAssetId(assetId, scope);
  const publicId = safeAssetId.replace(/\.[^.]+$/, "");
  const resourceType = safeAssetId.endsWith(".mp4") ? "video" : "image";
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
  if (result.result === "not found") {
    return { deleted: false, notFound: true };
  }
  return { deleted: result.result === "ok", notFound: false };
}
