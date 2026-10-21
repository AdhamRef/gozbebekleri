import {
  applyEditorialSeo,
  readPublicEditorialSeo,
} from "@/lib/content-editor/public-seo";
import { EditorialFaq } from "@/components/content/EditorialFaq";
import { statuses } from "@/lib/content-editor/contracts";
import { SUPPORTED_LOCALES } from "@/lib/locales";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";
import { pickTranslation } from "@/lib/i18n/translation-fallback";
import { localizeContentHref } from "@/lib/content-editor/urls";
import { decodeRouteKey } from "@/lib/slug";
async function read(slug: string) {
  return prisma.superCategory.findFirst({
    where: { slug: decodeRouteKey(slug), isActive: true },
    include: {
      translations: true,
      blocks: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        include: { translations: true },
      },
      items: { orderBy: { order: "asc" } },
    },
  });
}
type Props = { params: Promise<{ locale: string; slug: string }> };
async function generateBaseMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug: routeSlug } = await params,
    slug = decodeRouteKey(routeSlug),
    row = await read(slug);
  if (!row) return { robots: { index: false } };
  const t = pickTranslation(row.translations, locale),
    title =
      t?.metaTitle ||
      (locale === "ar" ? row.metaTitle : null) ||
      t?.title ||
      row.title,
    description =
      t?.metaDescription ||
      (locale === "ar" ? row.metaDescription : null) ||
      t?.intro ||
      row.intro ||
      "";
  const state = statuses("super-categories", row);
  const languages = Object.fromEntries(
    SUPPORTED_LOCALES.filter((code) => state[code].complete).map((code) => [
      code,
      `${SITE_URL}/${code}/programs/${encodeURIComponent(slug)}`,
    ]),
  );
  return {
    title,
    description,
    robots: { index: state[locale]?.complete || false, follow: true },
    alternates: {
      canonical: `${SITE_URL}/${locale}/programs/${encodeURIComponent(slug)}`,
      languages,
    },
    openGraph: {
      title,
      description,
      images: row.heroImage
        ? [{ url: row.heroImage, alt: t?.imageAlt || row.imageAlt || title }]
        : [],
    },
  };
}
export default async function ProgramPage({ params }: Props) {
  const { locale, slug: routeSlug } = await params,
    slug = decodeRouteKey(routeSlug),
    row = await read(slug);
  if (!row) notFound();
  const t = pickTranslation(row.translations, locale);
  const campaignIds = row.items
      .filter((i) => i.kind === "CAMPAIGN")
      .map((i) => i.refId),
    postIds = row.items.filter((i) => i.kind === "POST").map((i) => i.refId);
  const [campaigns, posts] = await Promise.all([
    prisma.campaign.findMany({
      where: {
        id: { in: campaignIds },
        isActive: true,
        OR: [{ isDeleted: false }, { isDeleted: { isSet: false } }],
      },
      include: { translations: true },
    }),
    prisma.post.findMany({
      where: { id: { in: postIds }, published: true },
      include: { translations: true },
    }),
  ]);
  const cards = {
    CAMPAIGNS: campaignIds.flatMap((id) => {
      const c = campaigns.find((c) => c.id === id);
      if (!c) return [];
      const ct = pickTranslation(c.translations, locale);
      return [
        {
          id: c.id,
          title: ct?.title || c.title,
          href: `/${locale}/campaign/${encodeURIComponent(ct?.slug || c.slug || c.id)}`,
        },
      ];
    }),
    POSTS: postIds.flatMap((id) => {
      const p = posts.find((p) => p.id === id);
      if (!p) return [];
      const pt = pickTranslation(p.translations, locale);
      return [
        {
          id: p.id,
          title: pt?.title || p.title || "",
          href: `/${locale}/blog/${encodeURIComponent(pt?.slug || p.slug || p.id)}`,
        },
      ];
    }),
  };
  const ctas = [
    [t?.ctaPrimaryLabel || row.ctaPrimaryLabel, row.ctaPrimaryHref],
    [t?.ctaSecondaryLabel || row.ctaSecondaryLabel, row.ctaSecondaryHref],
    [t?.ctaTertiaryLabel || row.ctaTertiaryLabel, row.ctaTertiaryHref],
  ];
  return (
    <article className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <header
        className="space-y-4 rounded-xl p-4"
        style={{ borderTop: `6px solid ${row.accentColor || "#1c6651"}` }}
      >
        {t?.logoImage || row.logoImage ? (
          <img
            src={t?.logoImage || row.logoImage || ""}
            alt={t?.title || row.title}
            className="h-20 max-w-60 object-contain"
          />
        ) : null}
        {row.heroImage ? (
          <img
            className="max-h-96 w-full rounded-xl object-cover"
            src={row.heroImage}
            alt={t?.imageAlt || row.imageAlt || t?.title || row.title}
          />
        ) : null}
        {row.heroVideoId &&
        /^[a-zA-Z0-9_-]{11}$/.test(row.heroVideoId) &&
        (!row.heroVideoLocales.length ||
          row.heroVideoLocales.includes(locale)) ? (
          <iframe
            title={t?.title || row.title}
            src={`https://www.youtube-nocookie.com/embed/${row.heroVideoId}`}
            className="aspect-video w-full"
            allowFullScreen
          />
        ) : null}
        <h1 className="text-3xl font-bold">{t?.title || row.title}</h1>
        <p className="text-xl">{t?.subtitle || row.subtitle}</p>
        {row.verseArabic ? (
          <p lang="ar" dir="rtl" className="text-center text-2xl">
            {row.verseArabic}
          </p>
        ) : null}
        <p>{t?.verseTranslation || row.verseTranslation}</p>
        <small>{t?.verseAttribution || row.verseAttribution}</small>
        <p className="whitespace-pre-wrap">{t?.intro || row.intro}</p>
        <div className="flex flex-wrap gap-3">
          {ctas.map(([label, href], i) =>
            label && href ? (
              <Link
                key={i}
                className="rounded bg-emerald-700 px-5 py-3 text-white"
                href={localizeContentHref(href, locale)}
              >
                {label}
              </Link>
            ) : null,
          )}
        </div>
      </header>
      {row.blocks.map((block) => {
        const bt = pickTranslation(block.translations, locale),
          list =
            block.kind === "CAMPAIGNS"
              ? cards.CAMPAIGNS
              : block.kind === "POSTS"
                ? cards.POSTS
                : [];
        return (
          <section
            id={block.anchor || undefined}
            key={block.id}
            className="space-y-4 rounded-xl border p-5"
          >
            <p>{bt?.eyebrow || block.eyebrow}</p>
            <h2 className="text-2xl font-bold">{bt?.title || block.title}</h2>
            <p>{bt?.subtitle || block.subtitle}</p>
            <p className="whitespace-pre-wrap">{bt?.body || block.body}</p>
            {block.image ? (
              <img
                className="max-h-80 rounded-lg object-cover"
                src={block.image}
                alt={bt?.title || block.title || ""}
              />
            ) : null}
            {block.kind === "VIDEO" &&
            block.youtubeId &&
            /^[a-zA-Z0-9_-]{11}$/.test(block.youtubeId) ? (
              <iframe
                title={bt?.title || block.title || "فيديو"}
                src={`https://www.youtube-nocookie.com/embed/${block.youtubeId}`}
                className="aspect-video w-full"
                allowFullScreen
              />
            ) : null}
            <div className="grid gap-4 md:grid-cols-3">
              {list.slice(0, block.maxItems || undefined).map((card) => (
                <Link
                  className="rounded-lg border p-4"
                  key={card.id}
                  href={card.href}
                >
                  {card.title}
                </Link>
              ))}
            </div>
            {block.linkUrl && (bt?.linkLabel || block.linkLabel) ? (
              <Link
                className="underline"
                href={localizeContentHref(block.linkUrl, locale)}
              >
                {bt?.linkLabel || block.linkLabel}
              </Link>
            ) : null}
          </section>
        );
      })}
      <EditorialFaq
        kind="super-categories"
        contentKey={row.id}
        locale={locale}
      />
    </article>
  );
}

export async function generateMetadata(args: Props): Promise<Metadata> {
  const { slug, locale } = await args.params;
  const [base, extra] = await Promise.all([
    generateBaseMetadata(args),
    readPublicEditorialSeo(
      "super-categories",
      decodeRouteKey(slug),
      locale,
    ),
  ]);
  return applyEditorialSeo(base, extra);
}
