import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from "../../auth/[...nextauth]/options";

// GET: localized categories with optional campaigns (limited per-category), cursor pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 100);
    const locale = searchParams.get('locale') || 'ar';
    const includeCampaigns = searchParams.get('includeCampaigns') === 'true';
    const campaignLimit = Math.min(Number(searchParams.get('campaignLimit')) || 3, 20);
    const includeCounts = searchParams.get('counts') === 'true';

    // Fetch categories (no heavy nested relations by default)
    const categories = await prisma.category.findMany({
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        image: true,
        icon: true,
        order: true,
        translations: { where: { locale }, take: 1, select: { locale: true, name: true, description: true } },
        ...(includeCounts ? { _count: { select: { campaigns: true } } } : {})
      }
    });

    const hasMore = categories.length > limit;
    const page = hasMore ? categories.slice(0, -1) : categories;
    const nextCursor = hasMore ? page[page.length - 1]?.id : null;

    // If campaigns requested, batch fetch limited campaigns per category in parallel
    let campaignsByCategory: Record<string, any[]> = {};
    if (includeCampaigns && page.length > 0) {
      const campaignFetches = page.map(cat =>
        prisma.campaign.findMany({
          where: { categoryId: cat.id },
          take: campaignLimit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            images: true,
            targetAmount: true,
            currentAmount: true,
            isActive: true,
            priority: true,
            createdAt: true,
            translations: { where: { locale }, take: 1, select: { title: true, description: true } },
            _count: { select: { donations: true } }
          }
        }).then(list => ({ id: cat.id, list }))
      );

      const resolved = await Promise.all(campaignFetches);
      campaignsByCategory = resolved.reduce((acc, cur) => {
        acc[cur.id] = cur.list;
        return acc;
      }, {} as Record<string, any[]>);
    }

    const transformed = page.map(cat => ({
      id: cat.id,
      name: cat.translations[0]?.name || cat.name,
      description: cat.translations[0]?.description || cat.description,
      image: cat.image,
      icon: cat.icon,
      order: cat.order,
      campaignCount: cat._count?.campaigns ?? undefined,
      campaigns: includeCampaigns ? (campaignsByCategory[cat.id] || []).map(c => ({
        id: c.id,
        title: c.translations[0]?.title || c.title,
        description: c.translations[0]?.description || c.description,
        images: c.images,
        targetAmount: c.targetAmount,
        currentAmount: c.currentAmount,
        isActive: c.isActive,
        priority: c.priority,
        donationCount: c._count?.donations ?? 0,
        progress: (c.currentAmount / Math.max(c.targetAmount, 1)) * 100,
        createdAt: c.createdAt
      })) : undefined
    }));

    return NextResponse.json({ items: transformed, nextCursor, hasMore });

  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

// POST: admin-only; supports translations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Only admins can create categories' }, { status: 401 });
    }

    const data = await request.json();
    const { name, description, image, icon, order, translations } = data;

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const translationData: { locale: string; name: string; description?: string }[] = [];
    if (translations && typeof translations === 'object') {
      for (const [locale, t] of Object.entries(translations)) {
        if (locale === 'ar') continue;
        if (t && typeof t === 'object' && (t as any).name) {
          translationData.push({ locale, name: (t as any).name, description: (t as any).description || '' });
        }
      }
    }

    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({ data: {
        name,
        description: description || '',
        image: image || '',
        icon: icon || '',
        order: order ?? 0
      }});

      if (translationData.length > 0) {
        await tx.categoryTranslation.createMany({ data: translationData.map(t => ({ categoryId: created.id, locale: t.locale, name: t.name, description: t.description || '' })) });
      }

      return created;
    });

    const full = await prisma.category.findUnique({ where: { id: category.id }, select: { id: true, name: true, description: true, image: true, icon: true, order: true, translations: { select: { locale: true, name: true, description: true } } } });

    return NextResponse.json(full, { status: 201 });

  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
