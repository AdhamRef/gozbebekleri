import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from "../auth/[...nextauth]/options";

// GET: list post categories with locale-aware translations, search, and paging
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const cursor = params.get('cursor');
    const limit = Math.min(Number(params.get('limit')) || 100, 1000);
    const locale = params.get('locale') || 'ar';
    const search = params.get('search')?.toLowerCase();
    const includeCounts = params.get('counts') === 'true';

    const categories = await prisma.postCategory.findMany({
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        title: true,
        description: true,
        image: true,
        createdAt: true,
        translations: { where: { locale }, take: 1, select: { locale: true, name: true, title: true, description: true, image: true } },
        ...(includeCounts ? { _count: { select: { posts: true } } } : {}),
      }
    });

    let filtered = categories;
    if (search) {
      filtered = categories.filter(cat => {
        const name = cat.translations[0]?.name || cat.name || '';
        const title = cat.translations[0]?.title || cat.title || '';
        const desc = cat.translations[0]?.description || cat.description || '';
        return (
          name.toLowerCase().includes(search) ||
          title.toLowerCase().includes(search) ||
          desc.toLowerCase().includes(search)
        );
      });
    }

    const hasMore = filtered.length > limit;
    const items = hasMore ? filtered.slice(0, -1) : filtered;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    const transformed = items.map(cat => ({
      id: cat.id,
      name: cat.translations[0]?.name || cat.name,
      title: cat.translations[0]?.title || cat.title,
      description: cat.translations[0]?.description || cat.description,
      image: cat.translations[0]?.image || cat.image,
      postCount: cat._count?.posts ?? undefined,
      createdAt: cat.createdAt,
    }));

    return NextResponse.json({ items: transformed, nextCursor, hasMore, filters: { locale, limit, search } });
  } catch (error) {
    console.error('Error fetching post categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST: create post category (admin-only) with optional translations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Only admins can create categories' }, { status: 401 });
    }

    const data = await request.json();
    const { name, title, description, image, translations } = data;

    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

    const translationData: { locale: string; name: string; title?: string; description?: string; image?: string }[] = [];
    if (translations && typeof translations === 'object') {
      for (const [locale, t] of Object.entries(translations)) {
        if (locale !== 'ar' && t && typeof t === 'object') {
          const tt: any = t;
          if (tt.name) {
            translationData.push({ locale, name: tt.name, title: tt.title || '', description: tt.description || '', image: tt.image || '' });
          }
        }
      }
    }

    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.postCategory.create({ data: { name, title: title || '', description: description || '', image: image || '' } });

      if (translationData.length > 0) {
        await tx.postCategoryTranslation.createMany({ data: translationData.map(t => ({ categoryId: created.id, locale: t.locale, name: t.name, title: t.title, description: t.description, image: t.image })) });
      }

      return created;
    });

    const full = await prisma.postCategory.findUnique({ where: { id: category.id }, select: { id: true, name: true, title: true, description: true, image: true, translations: { select: { locale: true, name: true, title: true, description: true, image: true } } } });

    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    console.error('Error creating post category:', error);
    if (error instanceof Error && (error.message.includes('Unique') || error.message.includes('unique'))) {
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}