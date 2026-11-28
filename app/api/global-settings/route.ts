import { parseCartUpsell, validateCartUpsellBody } from "@/lib/minbar/cart-upsell";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import {
  parseSuggestedTeamSupport,
  validateSuggestedTeamSupportBody,
} from "@/lib/campaign/suggested-team-support";
import { Prisma } from "@prisma/client";

/** Fetch the single GlobalSettings record, creating an empty one on first read. */
async function getOrCreateSettings() {
  const existing = await prisma.globalSettings.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.globalSettings.create({ data: {} });
}

/** Public GET — exposes only the donation-flow defaults clients need. */
export async function GET() {
  try {
    const settings = await prisma.globalSettings.findFirst({
      orderBy: { createdAt: "asc" },
      select: { suggestedTeamSupport: true, payforEnabled: true, teamSupportEnabled: true, cartUpsell: true },
    });
    return NextResponse.json({
      suggestedTeamSupport: parseSuggestedTeamSupport(settings?.suggestedTeamSupport),
      // Default true — first read before any record exists must still let
      // PayFor remain available for TRY donors.
      payforEnabled: settings?.payforEnabled ?? true,
      // Cart settings (Minber #308 cart-settings page). Team support is on unless switched off.
      teamSupportEnabled: settings?.teamSupportEnabled !== false,
      cartUpsell: parseCartUpsell(settings?.cartUpsell),
    });
  } catch (e) {
    console.error("Error fetching global settings:", e);
    return NextResponse.json(
      { error: "Failed to fetch global settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT — partial update. Each field has its own permission requirement:
 *   - suggestedTeamSupport → `campaigns` perm
 *   - payforEnabled       → `generalSettings` perm
 *   - teamSupportEnabled, cartUpsell → `campaigns` perm (cart settings)
 * A single request mixing both must satisfy both checks.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (body.suggestedTeamSupport !== undefined || body.teamSupportEnabled !== undefined || body.cartUpsell !== undefined) {
      const denied = requireAdminOrDashboardPermission(session, "campaigns");
      if (denied) return denied;
    }
    if (body.payforEnabled !== undefined) {
      const denied = requireAdminOrDashboardPermission(session, "generalSettings");
      if (denied) return denied;
    }

    const updateData: Prisma.GlobalSettingsUpdateInput = {};

    if (body.suggestedTeamSupport !== undefined) {
      try {
        if (body.suggestedTeamSupport === null) {
          updateData.suggestedTeamSupport = Prisma.JsonNull;
        } else {
          const v = validateSuggestedTeamSupportBody(body.suggestedTeamSupport);
          if (v) {
            updateData.suggestedTeamSupport = v as unknown as Prisma.InputJsonValue;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid suggestedTeamSupport";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    if (body.teamSupportEnabled !== undefined) {
      if (typeof body.teamSupportEnabled !== "boolean") {
        return NextResponse.json({ error: "teamSupportEnabled must be a boolean" }, { status: 400 });
      }
      updateData.teamSupportEnabled = body.teamSupportEnabled;
    }

    if (body.cartUpsell !== undefined) {
      try {
        updateData.cartUpsell = body.cartUpsell === null ? null : (validateCartUpsellBody(body.cartUpsell) as unknown as Prisma.InputJsonValue);
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid cartUpsell" }, { status: 400 });
      }
    }

    if (body.payforEnabled !== undefined) {
      if (typeof body.payforEnabled !== "boolean") {
        return NextResponse.json(
          { error: "payforEnabled must be a boolean" },
          { status: 400 }
        );
      }
      updateData.payforEnabled = body.payforEnabled;
    }

    const existing = await getOrCreateSettings();
    const saved = await prisma.globalSettings.update({
      where: { id: existing.id },
      data: updateData,
      select: { suggestedTeamSupport: true, payforEnabled: true, teamSupportEnabled: true, cartUpsell: true },
    });

    return NextResponse.json({
      suggestedTeamSupport: parseSuggestedTeamSupport(saved.suggestedTeamSupport),
      payforEnabled: saved.payforEnabled,
      teamSupportEnabled: saved.teamSupportEnabled !== false,
      cartUpsell: parseCartUpsell(saved.cartUpsell),
    });
  } catch (e) {
    console.error("Error updating global settings:", e);
    return NextResponse.json(
      { error: "Failed to update global settings" },
      { status: 500 }
    );
  }
}
