// Returns a `{ locale: slug }` map for a slugged entity (campaign | category | post).
// Used by the language switcher on slug-bearing localized pages so changing
// language hops to the target locale's slug instead of keeping the previous one.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  slugByLocaleMap,
  whereByIdOrAnyLocaleSlug,
} from "@/lib/slug";
import { SUPPORTED_LOCALES } from "@/lib/locales";

type EntityType = "campaign" | "category" | "post";

const ALLOWED_TYPES: ReadonlyArray<EntityType> = ["campaign", "category", "post"];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") as EntityType | null;
  const key = url.searchParams.get("key");

  if (!type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json(
      { error: "Invalid or missing `type` (expected campaign|category|post)" },
      { status: 400 }
    );
  }
  if (!key) {
    return NextResponse.json({ error: "Missing `key`" }, { status: 400 });
  }

  try {
    const where = whereByIdOrAnyLocaleSlug(key);
    const select = {
      id: true,
      slug: true,
      translations: { select: { locale: true, slug: true } },
    } as const;

    const entity =
      type === "campaign"
        ? await prisma.campaign.findFirst({ where, select })
        : type === "category"
          ? await prisma.category.findFirst({ where, select })
          : await prisma.post.findFirst({ where, select });

    if (!entity) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const map = slugByLocaleMap(
      entity.slug,
      entity.translations,
      SUPPORTED_LOCALES as unknown as string[]
    );

    return NextResponse.json(
      { id: entity.id, slugs: map },
      {
        headers: {
          // Slugs rarely change — cache briefly at the edge so the dropdown
          // open doesn't always pay the DB roundtrip.
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    console.error("slug-map lookup failed", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
