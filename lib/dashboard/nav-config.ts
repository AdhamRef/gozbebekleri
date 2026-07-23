import type { DashboardPermissionKey } from "./permissions";

// Sidebar Information Architecture — daily work is intentionally limited to focused routes.
// Technical/provider setup remains under "ربط المنصات والإرسال" and developer-only pages stay hidden.
export const DASHBOARD_NAV_GROUPS: {
  group: string;
  items: { key: Dashboard