import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import {
  resolveGeoFromRequest,
  type ResolvedUserGeo,
} from "@/lib/geo/country-from-request";
import { countryNameFromIsoCode } from "@/lib/geo/intl-country-name";

function hasNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parseGeoFromClientBody(body: Record<string, unknown> | null): ResolvedUserGeo | null {
  if (!body) return null;
  const codeRaw = body.countryCode;
  const code = typeof codeRaw === "string" ? codeRaw.trim().toUpperCase() : "";
  if (!/^[A-Z]{2}$/.test(code) || code === "XX") return null;
  const nameRaw = body.countryName;
  const countryName =
    typeof nameRaw === "string" && nameRaw.trim()
      ? nameRaw.trim()
      : countryNameFromIsoCode(code);
  const region = hasNonEmptyString(body.region) ? body.region.trim() : null;
  const city = hasNonEmptyString(body.city) ? body.city.trim() : null;
  return { countryCode: code, countryName, region, city };
}

async function readJsonBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const text = await request.text();
    if (!text.trim()) return null;
    const v = JSON.parse(text) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function mergeGeo(
  fromServer: ResolvedUserGeo | null,
  fromClient: ResolvedUserGeo | null
): ResolvedUserGeo | null {
  if (fromServer && fromClient) {
    return {
      countryCode: fromServer.countryCode,
      countryName: fromServer.countryName,
      region: fromServer.region ?? fromClient.region,
      city: fromServer.city ?? fromClient.city,
    };
  }
  return fromServer ?? fromClient;
}

/**
 * Fills `countryCode`, `countryName`, `region`, `city` (+ legacy `country` = countryName)
 * from edge / IP geo when structured country fields are still empty.
 * Optional JSON body with the same fields (used from the browser after ipapi.co/json).
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error("country-from-ip: NEXTAUTH_SECRET missing");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const token = await getToken({ req: request, secret });
    const userId = token?.sub;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await readJsonBody(request);
    const clientGeo = parseGeoFromClientBody(body);

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        country: true,
        countryCode: true,
        countryName: true,
        region: true,
        city: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const allLocationFilled =
      hasNonEmptyString(existing.countryCode) &&
      hasNonEmptyString(existing.countryName) &&
      hasNonEmptyString(existing.city) &&
      hasNonEmptyString(existing.region);
    if (allLocationFilled) {
      return NextResponse.json({
        updated: false,
        countryCode: existing.countryCode,
        countryName: existing.countryName,
        region: existing.region,
        city: existing.city,
      });
    }

    const serverGeo = await resolveGeoFromRequest(request);
    const mergedRaw = mergeGeo(serverGeo, clientGeo);

    if (!mergedRaw) {
      return NextResponse.json({ updated: false, reason: "no_geo" }, { status: 200 });
    }

    const merged: ResolvedUserGeo = {
      countryCode: hasNonEmptyString(existing.countryCode)
        ? String(existing.countryCode).trim().toUpperCase()
        : mergedRaw.countryCode,
      countryName: hasNonEmptyString(existing.countryName)
        ? String(existing.countryName).trim()
        : mergedRaw.countryName,
      region: hasNonEmptyString(existing.region)
        ? String(existing.region).trim()
        : mergedRaw.region,
      city: hasNonEmptyString(existing.city)
        ? String(existing.city).trim()
        : mergedRaw.city,
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        countryCode: merged.countryCode,
        countryName: merged.countryName,
        region: merged.region,
        city: merged.city,
        country: merged.countryName,
      },
    });

    return NextResponse.json({
      updated: true,
      countryCode: merged.countryCode,
      countryName: merged.countryName,
      region: merged.region,
      city: merged.city,
    });
  } catch (e) {
    console.error("country-from-ip:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
