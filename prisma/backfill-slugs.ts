// One-shot backfill: assigns a unique slug to every Campaign, Category, Post,
// and PostCategory row that doesn't already have one.
//
// Slug source priority:
//   1. English translation (title or name) — preferred since slugs should be ASCII/SEO-friendly
//   2. Fallback: the model's base (Arabic) field
//
// Safe to re-run — only touches rows where `slug` is null.
//
// Run with:  npx tsx prisma/backfill-slugs.ts

import { PrismaClient } from "@prisma/client";
import { generateUniqueSlug } from "../lib/slug";

const prisma = new PrismaClient();

async function backfillCampaigns() {
  const rows = await prisma.campaign.findMany({
    where: { slug: null },
    select: {
      id: true,
      title: true,
      translations: {
        where: { locale: "en" },
        select: { title: true },
        take: 1,
      },
    },
  });
  if (rows.length === 0) {
    console.log("[Campaign] nothing to backfill.");
    return;
  }
  for (const row of rows) {
    const enTitle = row.translations[0]?.title?.trim();
    const base = enTitle || row.title || "";
    const slug = await generateUniqueSlug(prisma.campaign as any, base, {
      fallbackPrefix: "campaign",
      currentId: row.id,
    });
    await prisma.campaign.update({ where: { id: row.id }, data: { slug } });
  }
  console.log(`[Campaign] backfilled ${rows.length} row(s).`);
}

async function backfillCategories() {
  const rows = await prisma.category.findMany({
    where: { slug: null },
    select: {
      id: true,
      name: true,
      translations: {
        where: { locale: "en" },
        select: { name: true },
        take: 1,
      },
    },
  });
  if (rows.length === 0) {
    console.log("[Category] nothing to backfill.");
    return;
  }
  for (const row of rows) {
    const enName = row.translations[0]?.name?.trim();
    const base = enName || row.name || "";
    const slug = await generateUniqueSlug(prisma.category as any, base, {
      fallbackPrefix: "category",
      currentId: row.id,
    });
    await prisma.category.update({ where: { id: row.id }, data: { slug } });
  }
  console.log(`[Category] backfilled ${rows.length} row(s).`);
}

async function backfillPosts() {
  const rows = await prisma.post.findMany({
    where: { slug: null },
    select: {
      id: true,
      title: true,
      translations: {
        where: { locale: "en" },
        select: { title: true },
        take: 1,
      },
    },
  });
  if (rows.length === 0) {
    console.log("[Post] nothing to backfill.");
    return;
  }
  for (const row of rows) {
    const enTitle = row.translations[0]?.title?.trim();
    const base = enTitle || row.title || "";
    const slug = await generateUniqueSlug(prisma.post as any, base, {
      fallbackPrefix: "post",
      currentId: row.id,
    });
    await prisma.post.update({ where: { id: row.id }, data: { slug } });
  }
  console.log(`[Post] backfilled ${rows.length} row(s).`);
}

async function backfillPostCategories() {
  const rows = await prisma.postCategory.findMany({
    where: { slug: null },
    select: {
      id: true,
      name: true,
      translations: {
        where: { locale: "en" },
        select: { name: true },
        take: 1,
      },
    },
  });
  if (rows.length === 0) {
    console.log("[PostCategory] nothing to backfill.");
    return;
  }
  for (const row of rows) {
    const enName = row.translations[0]?.name?.trim();
    const base = enName || row.name || "";
    const slug = await generateUniqueSlug(prisma.postCategory as any, base, {
      fallbackPrefix: "blog-category",
      currentId: row.id,
    });
    await prisma.postCategory.update({ where: { id: row.id }, data: { slug } });
  }
  console.log(`[PostCategory] backfilled ${rows.length} row(s).`);
}

async function main() {
  await backfillCampaigns();
  await backfillCategories();
  await backfillPosts();
  await backfillPostCategories();
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
