import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from "../../auth/[...nextauth]/options";

export async function GET(
  req: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const { categoryId } = params;
    const locale = req.headers.get('x-locale') || new URL(req.url).searchParams.get('locale') || 'ar';

    const category = await prisma.postCategory.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        title: true,
        description: true,
        image: true,
        createdAt: true,
        translations: { where: { locale }, take: 1, select: { locale: true, name: true, title: true, description: true, image: true } },
        posts: {
          select: {
            id: true,
            title: true,
            description: true,
            content: true,
            image: true,
            published: true,
            createdAt: true,
            updatedAt: true,
            translations: { where: { locale }, take: 1, select: { title: true, description: true, content: true, image: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const transformed = {
      id: category.id,
      name: category.translations[0]?.name || category.name,
      title: category.translations[0]?.title || category.title,
      description: category.translations[0]?.description || category.description,
      image: category.translations[0]?.image || category.image,
      posts: category.posts.map(p => ({
        id: p.id,
        title: p.translations[0]?.title || p.title,
        description: p.translations[0]?.description || p.description,
        content: p.translations[0]?.content || p.content,
        image: p.translations[0]?.image || p.image,
        published: p.published,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      createdAt: category.createdAt,
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('[CATEGORY_GET]', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { categoryId } = params;
    const body = await req.json();

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.image !== undefined) updateData.image = body.image;

    const translationUpdates: { locale: string; data: any }[] = [];
    if (body.translations && typeof body.translations === 'object') {
      for (const [locale, t] of Object.entries(body.translations)) {
        if (locale !== 'ar' && t && typeof t === 'object') translationUpdates.push({ locale, data: t as any });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cat = await tx.postCategory.update({ where: { id: categoryId }, data: updateData });

      for (const { locale, data } of translationUpdates) {
        const td: any = {};
        if (data.name !== undefined) td.name = data.name;
        if (data.title !== undefined) td.title = data.title;
        if (data.description !== undefined) td.description = data.description;
        if (data.image !== undefined) td.image = data.image;
        if (Object.keys(td).length === 0) continue;

        await tx.postCategoryTranslation.upsert({
          where: { categoryId_locale: { categoryId, locale } },
          update: td,
          create: { categoryId, locale, ...td }
        });
      }

      return cat;
    });

    const full = await prisma.postCategory.findUnique({ where: { id: updated.id }, select: { id: true, name: true, title: true, description: true, image: true, translations: { select: { locale: true, name: true, title: true, description: true, image: true } } } });

    return NextResponse.json(full);
  } catch (error) {
    console.error('[CATEGORY_PATCH]', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { categoryId } = params;
    const force = req.nextUrl.searchParams.get('force') === 'true';

    const postCount = await prisma.post.count({ where: { category_id: categoryId } });
    if (postCount > 0 && !force) return NextResponse.json({ error: 'Category has posts. Use force=true to delete.' }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      if (postCount > 0 && force) {
        await tx.post.deleteMany({ where: { category_id: categoryId } });
      }
      await tx.postCategoryTranslation.deleteMany({ where: { categoryId } });
      await tx.postCategory.delete({ where: { id: categoryId } });
    });

    return NextResponse.json({ message: 'Category deleted' });
  } catch (error) {
    console.error('[CATEGORY_DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}