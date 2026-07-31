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

function providerIdentity(assetId: string, scope: MediaScope) {
  const safeAssetId = assertSafeAssetId(assetId, scope);
  return {
    safeAssetId,
    publicId: safeAssetId.replace(/\.[^.]+$/, ""),
    resourceType: safeAssetId.endsWith(".mp4") ? ("video" as const) : ("image" as const),
  };
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

export async function lookupMediaUrl(assetId: string, scope: MediaScope): Promise<string | null> {
  const { publicId, resourceType } = providerIdentity(assetId, scope);
  try {
    const result = await cloudinary.api.resource(publicId, { resource_type: resourceType });
    return typeof result.secure_url === "string" ? result.secure_url : null;
  } catch (error) {
    const candidate = error as { error?: { http_code?: number }; http_code?: number };
    const status = candidate.error?.http_code ?? candidate.http_code;
    if (status === 404) return null;
    throw error;
  }
}

export type DeleteMediaResult = { deleted: boolean; notFound: boolean };

export async function deleteMedia(assetId: string, scope: MediaScope): Promise<DeleteMediaResult> {
  const { publicId, resourceType } = providerIdentity(assetId, scope);
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
  if (result.result === "not found") {
    return { deleted: false, notFound: true };
  }
  return { deleted: result.result === "ok", notFound: false };
}
