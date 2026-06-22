import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";

export function jsonNoStore(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(body, { ...init, headers });
}

export async function requireBrandApiAccess() {
  const session = await getServerSession(authOptions);
  return {
    session,
    denied: requireAdminOrDashboardPermission(session, "brand"),
  };
}

export async function readJson(request: Request) {
  return request.json().catch(() => ({}));
}
