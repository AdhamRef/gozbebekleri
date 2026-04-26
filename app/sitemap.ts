import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL, LOCALES } from "@/lib/seo";

const STATIC_PATHS = [
  { path: "", changeFreq: "daily" as const, priority: 1.0 },
  { path: "/campaigns", changeFreq: "daily" as const, priority: 0.9 },
  { path: "/about-us", changeFreq: "monthly" as const, priority: 0.7 },
  { path: "/contact-us", changeFreq: "monthly" as const, priority: 0.6 },
  { path: "/blog", changeFreq: "weekly" as const, priority: 0.8 },
];

function buildAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = `${SITE_URL}/${locale}${path}`;
  }
  languages["x-default"] = `${SITE_URL}/ar${path}`;
  return languages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // ── Static pages (all locales) ───────────────────────────────────────────
  for (const { path, changeFreq, priority } of STATIC_PATHS) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: changeFreq,
        priority,
        alternates: { languages: buildAlternates(path) },
      });
    }
  }

  // ── Dynamic campaign pages ───────────────────────────────────────────────
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    for (const campaign of campaigns) {
      const path = `/campaign/${campaign.slug || campaign.id}`;
      for (const locale of LOCALES) {
        entries.push({
          url: `${SITE_URL}/${locale}${path}`,
          lastModified: campaign.updatedAt,
          changeFrequency: "weekly",
          priority: 0.85,
          alternates: { languages: buildAlternates(path) },
        });
      }
    }
  } catch {
    // DB unavailable during build — skip dynamic entries
  }

  // ── Dynamic blog posts ───────────────────────────────────────────────────
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    for (const post of posts) {
      const path = `/blog/${post.slug || post.id}`;
      for (const locale of LOCALES) {
        entries.push({
          url: `${SITE_URL}/${locale}${path}`,
          lastModified: post.updatedAt,
          changeFrequency: "monthly",
          priority: 0.65,
          alternates: { languages: buildAlternates(path) },
        });
      }
    }
  } catch {
    // DB unavailable during build — skip
  }

  return entries;
}
