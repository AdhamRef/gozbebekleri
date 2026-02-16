import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from "../auth/[...nextauth]/options";

// GET: supports locale-aware translations, search, cursor pagination, optional counts, and sorting
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const cursor = params.get('cursor');
    const limit = Math.min(Number(params.get('limit')) || 100, 1000); // caps at 1000
    const locale = params.get('locale') || 'ar';
    const search = params.get('search')?.toLowerCase();
    const includeCounts = params.get('counts') === 'true';
    const sortBy = params.get('sortBy') || 'order';

    // Build order
    const orderBy: any = sortBy === 'name' ? { name: 'asc' } : { order: 'asc' };

    const categories = await prisma.category.findMany({
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy,
      select: {
        id: true,
        name: true,
        description: true,
        image: true,
        icon: true,
        order: true,
        translations: {
          where: { locale },
          take: 1,
          select: { locale: true, name: true, description: true }
        },
        ...(includeCounts ? { _count: { select: { campaigns: true } } } : {})
      }
    });

    // Search filtering (in-memory for translated fields)
    let filtered = categories;
    if (search) {
      filtered = categories.filter(cat => {
        const name = cat.translations[0]?.name || cat.name || '';
        const description = cat.translations[0]?.description || cat.description || '';
        return (
          name.toLowerCase().includes(search) ||
          description.toLowerCase().includes(search)
        );
      });
    }

    const hasMore = filtered.length > limit;
    const items = hasMore ? filtered.slice(0, -1) : filtered;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    const transformed = items.map(cat => ({
      id: cat.id,
      name: cat.translations[0]?.name || cat.name,
      description: cat.translations[0]?.description || cat.description,
      image: cat.image,
      icon: cat.icon,
      order: cat.order,
      campaignCount: cat._count?.campaigns ?? undefined,
    }));

    return NextResponse.json({
      items: transformed,
      nextCursor,
      hasMore,
      filters: { search, locale, includeCounts, sortBy, limit }
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST: admin-only; supports creating translations in a transaction
export async function POST(request: NextRequest) {
  try {
    // Auth check: only admins can create categories
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Only admins can create categories' }, { status: 401 });
    }

    const data = await request.json();
    const { name, description, image, icon, order, translations } = data;

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // Prepare translations payload (exclude default locale 'ar')
    const translationData: { locale: string; name: string; description?: string }[] = [];
    if (translations && typeof translations === 'object') {
      for (const [locale, t] of Object.entries(translations)) {
        if (locale !== 'ar' && t && typeof t === 'object') {
          const tt: any = t;
          if (tt.name) {
            translationData.push({ locale, name: tt.name, description: tt.description || '' });
          }
        }
      }
    }

    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: {
          name,
          description: description || '',
          image: image || '',
          icon: icon || '',
          order: order ?? 0,
        }
      });

      if (translationData.length > 0) {
        await tx.categoryTranslation.createMany({
          data: translationData.map(t => ({
            categoryId: created.id,
            locale: t.locale,
            name: t.name,
            description: t.description || '',
          }))
        });
      }

      return created;
    });

    const full = await prisma.category.findUnique({
      where: { id: category.id },
      select: {
        id: true,
        name: true,
        description: true,
        image: true,
        icon: true,
        order: true,
        translations: { select: { locale: true, name: true, description: true } }
      }
    });

    return NextResponse.json(full, { status: 201 });

  } catch (error) {
    console.error('Error creating category:', error);

    if (error instanceof Error) {
      if (error.message.includes('Unique') || error.message.includes('unique')) {
        return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}