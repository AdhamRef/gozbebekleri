import type { DashboardPermissionKey } from "@/lib/dashboard/permissions";
import { MediaSecurityError, parseMediaScope, type MediaScope } from "./security-core";

const PERMISSION_BY_SCOPE: Record<MediaScope, DashboardPermissionKey> = {
  campaigns: "campaigns",
  blog: "blog",
  slides: "slides",
  categories: "categories",
  ticker: "ticker",
};

export function permissionForMediaScope(scope: MediaScope): DashboardPermissionKey {
  return PERMISSION_BY_SCOPE[scope];
}

export function inferMediaScope(requestUrl: string, referer: string | null): MediaScope {
  const explicit = new URL(requestUrl).searchParams.get("scope");
  if (explicit) return parseMediaScope(explicit);
  if (!referer) {
    throw new MediaSecurityError("A media scope is required", 400, "INVALID_SCOPE");
  }
  let pathname = "";
  try {
    pathname = new URL(referer).pathname;
  } catch {
    throw new MediaSecurityError("A valid media scope is required", 400, "INVALID_SCOPE");
  }
  if (pathname.includes("/dashboard/campaigns")) return "campaigns";
  if (pathname.includes("/dashboard/blog") || pathname.includes("/blog/")) return "blog";
  if (pathname.includes("/dashboard/slides")) return "slides";
  if (pathname.includes("/dashboard/categories")) return "categories";
  if (pathname.includes("/dashboard/ticker")) return "ticker";
  throw new MediaSecurityError("A media scope is required", 400, "INVALID_SCOPE");
}
