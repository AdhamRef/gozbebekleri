import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// GET: list posts with locale-aware translations, search, and paging
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const cursor = params.get('cursor');
    const limit = Math.min(Number(params.get('limit')) || 50, 1000);
    const locale = params.get('locale') || 'ar';
    const search = params.get('search')?.toLowerCase();

    const posts = await prisma.post.findMany({
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        image: true,
        published: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            translations: { where: { locale }, take: 1, select: { name: true } }
          }
        },
        translations: { where: { locale }, take: 1, select: { locale: true, title: true, description: true, content: true, image: true } }
      }
    });

    let filtered = posts;
    if (search) {
      filtered = posts.filter(p => {
        const title = p.translations[0]?.title || p.title || '';
        const desc = p.translations[0]?.description || p.description || '';
        return title.toLowerCase().includes(search) || desc.toLowerCase().includes(search);
      });
    }

    const hasMore = filtered.length > limit;
    const items = hasMore ? filtered.slice(0, -1) : filtered;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    const transformed = items.map(p => ({
      id: p.id,
      title: p.translations[0]?.title || p.title,
      description: p.translations[0]?.description || p.description,
      content: p.translations[0]?.content || p.content,
      image: p.translations[0]?.image || p.image,
      published: p.published,
      category: p.category ? { id: p.category.id, name: p.category.translations[0]?.name || p.category.name } : null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({ items: transformed, nextCursor, hasMore, filters: { locale, limit, search } });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST: create a new post (admin-only) and optionally create translations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Only admins can create posts' }, { status: 401 });
    }

    const data = await request.json();
    const { title, description, content, image, published, categoryId, translations } = data;

    const translationData: { locale: string; title?: string; description?: string; content?: string; image?: string }[] = [];
    if (translations && typeof translations === 'object') {
      for (const [locale, t] of Object.entries(translations)) {
        if (locale !== 'ar' && t && typeof t === 'object') {
          const tt: any = t;
          translationData.push({ locale, title: tt.title, description: tt.description, content: tt.content, image: tt.image });
        }
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({ data: { title: title || '', description: description || '', content: content || '', image: image || '', published: !!published, categoryId: categoryId || null } });

      if (translationData.length > 0) {
        await tx.postTranslation.createMany({ data: translationData.map(t => ({ postId: post.id, locale: t.locale, title: t.title || '', description: t.description || '', content: t.content || '', image: t.image || '' })) });
      }

      return post;
    });

    const full = await prisma.post.findUnique({ where: { id: created.id }, select: { id: true, title: true, description: true, content: true, image: true, published: true, categoryId: true, translations: { select: { locale: true, title: true, description: true, content: true, image: true } } } });

    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
