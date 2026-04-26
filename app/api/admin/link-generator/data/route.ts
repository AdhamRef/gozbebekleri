import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { routing } from "@/i18n/routing.config";
import { URL_CURRENCY_CODES_ORDERED } from "@/lib/currency-link";

function nonEmpty(s: string | null | undefined) {
  return typeof s === "string" && s.trim().length > 0;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "referrals");
    if (denied) return denied;

    const [campaigns, categories, posts, postCategories] = await Promise.all([
      prisma.campaign.findMany({
        select: {
          id: true,
          slug: true,
          title: true,
          translations: { select: { locale: true, title: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 8000,
      }),
      prisma.category.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          translations: { select: { locale: true, name: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.post.findMany({
        select: {
          id: true,
          slug: true,
          title: true,
          published: true,
          translations: { select: { locale: true, title: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 3000,
      }),
      prisma.postCategory.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          translations: { select: { locale: true, name: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const campaignRows = campaigns.map((c) => {
      const supportedLocales = new Set<string>();
      if (nonEmpty(c.title)) supportedLocales.add("ar");
      for (const t of c.translations) {
        if (nonEmpty(t.title)) supportedLocales.add(t.locale);
      }
      return {
        id: c.id,
        slug: c.slug ?? null,
        title: c.title,
        supportedLocales: [...supportedLocales],
      };
    });

    const categoryRows = categories.map((c) => {
      const supportedLocales = new Set<string>();
      if (nonEmpty(c.name)) supportedLocales.add("ar");
      for (const t of c.translations) {
        if (nonEmpty(t.name)) supportedLocales.add(t.locale);
      }
      return {
        id: c.id,
        slug: c.slug ?? null,
        name: c.name,
        supportedLocales: [...supportedLocales],
      };
    });

    const postRows = posts.map((p) => {
      const supportedLocales = new Set<string>();
      if (nonEmpty(p.title)) supportedLocales.add("ar");
      for (const t of p.translations) {
        if (nonEmpty(t.title)) supportedLocales.add(t.locale);
      }
      return {
        id: p.id,
        slug: p.slug ?? null,
        title: p.title || "—",
        published: p.published,
        supportedLocales: [...supportedLocales],
      };
    });

    const postCategoryRows = postCategories.map((c) => {
      const supportedLocales = new Set<string>();
      if (nonEmpty(c.name)) supportedLocales.add("ar");
      for (const t of c.translations) {
        if (nonEmpty(t.name)) supportedLocales.add(t.locale);
      }
      return {
        id: c.id,
        slug: c.slug ?? null,
        name: c.name,
        supportedLocales: [...supportedLocales],
      };
    });

    return NextResponse.json({
      locales: [...routing.locales],
      currencies: [...URL_CURRENCY_CODES_ORDERED],
      campaigns: campaignRows,
      categories: categoryRows,
      posts: postRows,
      postCategories: postCategoryRows,
    });
  } catch (e) {
    console.error("link-generator data", e);
    return NextResponse.json({ error: "Failed to load link data" }, { status: 500 });
  }
}
