import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from "../../auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { writeAuditLog, auditActorFromDashboardSession } from "@/lib/audit-log";
import { pickTranslation, translationLocaleWhere } from "@/lib/i18n/translation-fallback";
import {
  generateUniqueSlug,
  generateUniqueLocaleSlug,
  normalizeUserSlug,
  whereByIdOrSlug,
  whereByIdOrLocaleSlug,
} from "@/lib/slug";

// GET: return a single category (localized) with optional counts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paramsUrl = request.nextUrl.searchParams;
    const locale = paramsUrl.get('locale') || 'ar';
    const includeCounts = paramsUrl.get('counts') === 'true';
    const allTranslations = paramsUrl.get('allTranslations') === 'true';

    const category = await prisma.category.findFirst({
      where: whereByIdOrLocaleSlug(id, locale),
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        image: true,
        icon: true,
        order: true,
        translations: allTranslations
          ? { select: { locale: true, name: true, description: true, slug: true } }
          : {
              where: translationLocaleWhere(locale),
              take: 2,
              select: { locale: true, name: true, description: true, slug: true },
            },
        ...(includeCounts ? { _count: { select: { campaigns: true } } } : {})
      }
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (allTranslations) {
      return NextResponse.json({
        ...category,
        campaignCount: (category as any)._count?.campaigns ?? undefined
      });
    }

    const t = pickTranslation(category.translations, locale);
    const localized = {
      id: category.id,
      // Locale-aware slug: per-locale translation slug → base slug → null.
      slug: (t as { slug?: string | null } | undefined)?.slug || category.slug || null,
      baseSlug: category.slug ?? null,
      name: t?.name || category.name,
      description: t?.description || category.description,
      image: category.image,
      icon: category.icon,
      order: category.order,
      campaignCount: (category as any)._count?.campaigns ?? undefined
    };

    return NextResponse.json(localized);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}

// PUT: admin-only; supports updating base fields and upserting translations in a transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idOrSlug } = await params;
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, 'categories');
    if (denied) return denied;

    const body = await request.json();
    const { name, description, image, icon, order, translations } = body;

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const existing = await prisma.category.findFirst({
      where: whereByIdOrSlug(idOrSlug),
      select: { id: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    const id = existing.id;

    // Slug: explicit value, or auto-regenerate from English name (with fallbacks).
    let nextSlug: string | undefined;
    if (body.slug !== undefined) {
      const cleaned = normalizeUserSlug(body.slug);
      let base = cleaned ?? "";
      if (!base) {
        const newEnName =
          typeof body?.translations?.en?.name === "string"
            ? body.translations.en.name.trim()
            : "";
        if (newEnName) {
          base = newEnName;
        } else {
          const existingEn = await prisma.categoryTranslation.findFirst({
            where: { categoryId: id, locale: "en" },
            select: { name: true },
          });
          base = existingEn?.name?.trim() || name || existing.name;
        }
      }
      nextSlug = await generateUniqueSlug(
        prisma.category as any,
        base,
        { fallbackPrefix: "category", currentId: id }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedCat = await tx.category.update({
        where: { id },
        data: {
          name,
          description: description || '',
          image: image || '',
          icon: icon || '',
          order: order ?? 0,
          ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        }
      });

      // Upsert translations (skip default locale 'ar'). Sequential because the per-locale
      // slug uniqueness check must observe in-flight writes.
      if (translations && typeof translations === 'object') {
        for (const [locale, t] of Object.entries(translations)) {
          if (locale === 'ar') continue;
          if (!t || typeof t !== 'object') continue;
          const tt: any = t;
          if (!tt.name) continue; // skip incomplete translations

          // Optional per-locale slug. If caller passes one, normalize + dedupe; otherwise
          // auto-generate from the translated name (so admins get clean URLs by default).
          const requestedSlug = normalizeUserSlug(tt.slug);
          const existingTrans = await tx.categoryTranslation.findUnique({
            where: { categoryId_locale: { categoryId: id, locale } as any },
            select: { id: true, slug: true },
          });
          let localeSlug: string | null = existingTrans?.slug ?? null;
          if (Object.prototype.hasOwnProperty.call(tt, "slug")) {
            // Explicit caller intent: empty/blank clears, otherwise dedupe.
            localeSlug = requestedSlug
              ? await generateUniqueLocaleSlug(
                  tx.categoryTranslation as any,
                  requestedSlug,
                  {
                    locale,
                    fallbackPrefix: "category",
                    currentTranslationId: existingTrans?.id,
                  }
                )
              : null;
          } else if (!existingTrans?.slug && tt.name) {
            // No existing slug → auto-generate from the translated name on first save.
            localeSlug = await generateUniqueLocaleSlug(
              tx.categoryTranslation as any,
              tt.name,
              {
                locale,
                fallbackPrefix: "category",
                currentTranslationId: existingTrans?.id,
              }
            );
          }

          await tx.categoryTranslation.upsert({
            where: { categoryId_locale: { categoryId: id, locale } as any },
            update: {
              name: tt.name,
              description: tt.description || '',
              slug: localeSlug,
            },
            create: {
              categoryId: id,
              locale,
              name: tt.name,
              description: tt.description || '',
              slug: localeSlug,
            },
          });
        }
      }

      return updatedCat;
    });

    // Return fresh record with translations (including per-locale slug)
    const full = await prisma.category.findUnique({
      where: { id: updated.id },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        image: true,
        icon: true,
        order: true,
        translations: {
          select: { locale: true, name: true, description: true, slug: true },
        }
      }
    });

    const actor = auditActorFromDashboardSession(session!);
    await writeAuditLog({
      ...actor,
      action: "CATEGORY_UPDATE",
      messageAr: `${actor.actorName ?? "مسؤول"} عدّل الحملة: ${full?.name ?? name}`,
      entityType: "Category",
      entityId: id,
    });

    return NextResponse.json(full);
  } catch (error) {
    console.error('Error updating category:', error);
    if (error instanceof Error) {
      if (error.message.includes('Unique') || error.message.includes('unique')) {
        return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 });
      }
    }
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

// DELETE: admin-only; refuse to delete if campaigns exist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idOrSlug } = await params;
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, 'categories');
    if (denied) return denied;

    const cat = await prisma.category.findFirst({
      where: whereByIdOrSlug(idOrSlug),
      select: { id: true, name: true },
    });
    if (!cat) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    const id = cat.id;

    const campaignCount = await prisma.campaign.count({ where: { categoryId: id } });
    if (campaignCount > 0) {
      return NextResponse.json({ error: 'Category has campaigns. Delete or move campaigns before deleting the category.' }, { status: 400 });
    }

    await prisma.category.delete({ where: { id } });

    const actor = auditActorFromDashboardSession(session!);
    await writeAuditLog({
      ...actor,
      action: "CATEGORY_DELETE",
      messageAr: `${actor.actorName ?? "مسؤول"} حذف الحملة: ${cat?.name ?? id}`,
      entityType: "Category",
      entityId: id,
    });

    return NextResponse.json({ message: 'Category deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
} 