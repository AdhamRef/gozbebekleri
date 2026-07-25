import type { DashboardPermissionKey } from "@/lib/dashboard/permissions";
import { parseMediaScope, type MediaScope } from "./security-core";

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

export function explicitMediaScope(requestUrl: string): MediaScope {
  return parseMediaScope(new URL(requestUrl).searchParams.get("scope"));
}
