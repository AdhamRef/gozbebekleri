import type { Session } from "next-auth";
import type { DashboardPermissionKey } from "./permissions";
import {
  getFirstAllowedDashboardHref,
  userHasDashboardPermission,
} from "./permissions";
import {
  DASHBOARD_NAV_HREFS_ORDERED,
  dashboardHrefToPermissionKey,
} from "./nav-config";

export type AuthenticatedDashboardSession = Session & {
  user: NonNullable<Session["user"]>;
};

export type DashboardPageAccess =
  | { allowed: true; session: AuthenticatedDashboardSession }
  | { allowed: false; redirectTo: string };

export function resolveDashboardPageAccess(
  session: Session | null,
  requiredPermission: DashboardPermissionKey,
): DashboardPageAccess {
  const user = session?.user;

  if (!user) {
    return { allowed: false, redirectTo: "/ar/auth/signin" };
  }

  if (!userHasDashboardPermission(user, requiredPermission)) {
    const fallback = getFirstAllowedDashboardHref(
      user,
      DASHBOARD_NAV_HREFS_ORDERED,
      dashboardHrefToPermissionKey,
    );
    return { allowed: false, redirectTo: fallback ?? "/" };
  }

  return { allowed: true, session: { ...session, user } };
}
