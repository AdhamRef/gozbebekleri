"use client";

import axios from "axios";
import type { MediaScope, NormalizedUploadResponse } from "./security-core";

export type DashboardMediaAsset = NormalizedUploadResponse;

const pendingAssets = new Map<string, DashboardMediaAsset>();

export async function uploadDashboardMedia(
  file: File,
  scope: MediaScope,
): Promise<DashboardMediaAsset> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axios.post<DashboardMediaAsset>(
    `/api/upload?scope=${encodeURIComponent(scope)}`,
    formData,
  );
  const asset = response.data;
  if (!asset?.url || !asset?.assetId) {
    throw new Error("Upload response is missing url or assetId");
  }
  pendingAssets.set(asset.url, asset);
  return asset;
}

export function pendingDashboardAsset(url: string): DashboardMediaAsset | null {
  return pendingAssets.get(url) ?? null;
}

export function markDashboardAssetPersisted(url: string): void {
  pendingAssets.delete(url);
}

export async function deleteUnsavedDashboardMedia(
  url: string,
  scope: MediaScope,
): Promise<boolean> {
  const asset = pendingAssets.get(url);
  if (!asset) return false;
  await axios.delete("/api/upload", {
    params: { scope, assetId: asset.assetId },
  });
  pendingAssets.delete(url);
  return true;
}

export async function cleanupManagedDashboardMediaAfterSave(
  previousUrl: string | null | undefined,
  scope: MediaScope,
): Promise<boolean> {
  if (!previousUrl) return false;
  const asset = pendingAssets.get(previousUrl);
  if (!asset) return false;
  await axios.delete("/api/upload", {
    params: { scope, assetId: asset.assetId },
  });
  pendingAssets.delete(previousUrl);
  return true;
}
