import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from "../../auth/[...nextauth]/options";

// GET: return a single category (localized) with optional counts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paramsUrl = request.nextUrl.searchParams;
    const locale = paramsUrl.get('locale') || 'ar';
    const includeCounts = paramsUrl.get('counts') === 'true';
    const allTranslations = paramsUrl.get('allTranslations') === 'true';

    const category = await prisma.category.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        description: true,
        image: true,
        icon: true,
        order: true,
        translations: allTranslations
          ? { select: { locale: true, name: true, description: true } }
          : { where: { locale }, take: 1, select: { locale: true, name: true, description: true } },
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

    const localized = {
      id: category.id,
      name: category.translations[0]?.name || category.name,
      description: category.translations[0]?.description || category.description,
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Only admins can update categories' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, image, icon, order, translations } = body;

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedCat = await tx.category.update({
        where: { id: params.id },
        data: {
          name,
          description: description || '',
          image: image || '',
          icon: icon || '',
          order: order ?? 0,
        }
      });

      // Upsert translations (skip default locale 'ar')
      if (translations && typeof translations === 'object') {
        const ops: Promise<any>[] = [];
        for (const [locale, t] of Object.entries(translations)) {
          if (locale === 'ar') continue;
          if (!t || typeof t !== 'object') continue;
          const tt: any = t;
          if (!tt.name) continue; // skip incomplete translations

          ops.push(tx.categoryTranslation.upsert({
            where: { categoryId_locale: { categoryId: params.id, locale } as any },
            update: { name: tt.name, description: tt.description || '' },
            create: { categoryId: params.id, locale, name: tt.name, description: tt.description || '' }
          }));
        }
        await Promise.all(ops);
      }

      return updatedCat;
    });

    // Return fresh record with translations
    const full = await prisma.category.findUnique({
      where: { id: updated.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Only admins can delete categories' }, { status: 401 });
    }

    const campaignCount = await prisma.campaign.count({ where: { categoryId: params.id } });
    if (campaignCount > 0) {
      return NextResponse.json({ error: 'Category has campaigns. Delete or move campaigns before deleting the category.' }, { status: 400 });
    }

    await prisma.category.delete({ where: { id: params.id } });

    return NextResponse.json({ message: 'Category deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
} 