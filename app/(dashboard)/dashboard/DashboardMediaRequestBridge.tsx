"use client";

import { useEffect } from "react";
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import type { MediaScope, NormalizedUploadResponse } from "@/lib/media/security-core";

const pendingByLegacyPublicId = new Map<string, { assetId: string; scope: MediaScope }>();

function scopeForPath(pathname: string): MediaScope | null {
  if (pathname.startsWith("/dashboard/campaigns")) return "campaigns";
  if (pathname.startsWith("/dashboard/blog")) return "blog";
  if (pathname.startsWith("/dashboard/slides")) return "slides";
  if (pathname.startsWith("/dashboard/categories")) return "categories";
  if (pathname.startsWith("/dashboard/ticker")) return "ticker";
  return null;
}

function publicIdFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split("/").at(-1)?.replace(/\.[^.]+$/, "") || null;
  } catch {
    return null;
  }
}

function addScope(config: InternalAxiosRequestConfig, scope: MediaScope): void {
  const params = new URLSearchParams(
    typeof config.params === "object" && config.params
      ? Object.entries(config.params).map(([key, value]) => [key, String(value)])
      : [],
  );
  params.set("scope", scope);
  config.params = Object.fromEntries(params.entries());
}

export default function DashboardMediaRequestBridge() {
  useEffect(() => {
    const requestId = axios.interceptors.request.use((config) => {
      const rawUrl = String(config.url || "");
      if (!rawUrl.startsWith("/api/upload")) return config;
      const scope = scopeForPath(window.location.pathname);
      if (!scope) return config;
      addScope(config, scope);

      if (config.method?.toLowerCase() === "delete") {
        const parsed = new URL(rawUrl, window.location.origin);
        const legacyPublicId = parsed.searchParams.get("publicId");
        if (legacyPublicId) {
          const pending = pendingByLegacyPublicId.get(legacyPublicId);
          config.url = "/api/upload";
          config.params = pending
            ? { scope: pending.scope, assetId: pending.assetId }
            : { scope, legacyDetach: "1" };
        }
      }
      return config;
    });

    const responseId = axios.interceptors.response.use((response: AxiosResponse<unknown>) => {
      const requestUrl = String(response.config.url || "");
      if (!requestUrl.startsWith("/api/upload")) return response;
      const data = response.data as Partial<NormalizedUploadResponse> | null;
      if (!data?.url || !data.assetId) return response;
      const publicId = publicIdFromUrl(data.url);
      const scope = scopeForPath(window.location.pathname);
      if (publicId && scope) pendingByLegacyPublicId.set(publicId, { assetId: data.assetId, scope });
      return response;
    });

    return () => {
      axios.interceptors.request.eject(requestId);
      axios.interceptors.response.eject(responseId);
    };
  }, []);

  return null;
}
