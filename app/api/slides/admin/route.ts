import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from "../../auth/[...nextauth]/options";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const locale = params.get('locale') || 'ar';

    const slides = await prisma.slide.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        image: true,
        isActive: true,
        showButton: true,
        buttonText: true,
        buttonLink: true,
        order: true,
        translations: { where: { locale }, take: 1, select: { title: true, description: true, buttonText: true } },
      },
    });

    const items = slides.map(s => ({
      id: s.id,
      title: s.translations[0]?.title ?? s.title,
      description: s.translations[0]?.description ?? s.description ?? '',
      image: s.image,
      isActive: s.isActive,
      showButton: s.showButton,
      buttonText: s.translations[0]?.buttonText ?? s.buttonText ?? '',
      buttonLink: s.buttonLink ?? '#quick_donate',
      order: s.order,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching slides:', error);
    return NextResponse.json({ error: 'Failed to fetch slides' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await request.json();
    const { title, description, image, showButton, buttonText, buttonLink, isActive, order, translations } = data;
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const translationData: { locale: string; title: string; description?: string; buttonText?: string }[] = [];
    if (translations && typeof translations === 'object') {
      for (const [locale, t] of Object.entries(translations)) {
        if (locale !== 'ar' && t && typeof t === 'object' && (t as any).title) {
          const tt = t as any;
          translationData.push({ locale, title: tt.title, description: tt.description || '', buttonText: tt.buttonText || '' });
        }
      }
    }

    const slide = await prisma.$transaction(async (tx) => {
      const created = await tx.slide.create({
        data: {
          title,
          description: description ?? '',
          image: image ?? '',
          showButton: showButton ?? true,
          buttonText: buttonText ?? '',
          buttonLink: buttonLink ?? '',
          isActive: isActive !== false,
          order: order ?? 0,
        },
      });
      if (translationData.length) {
        await tx.slideTranslation.createMany({
          data: translationData.map(t => ({ slideId: created.id, locale: t.locale, title: t.title, description: t.description ?? '', buttonText: t.buttonText ?? '' })),
        });
      }
      return created;
    });

    const full = await prisma.slide.findUnique({
      where: { id: slide.id },
      select: { id: true, title: true, description: true, image: true, showButton: true, buttonText: true, buttonLink: true, isActive: true, order: true, translations: { select: { locale: true, title: true, description: true, buttonText: true } } },
    });
    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    console.error('Error creating slide:', error);
    return NextResponse.json({ error: 'Failed to create slide' }, { status: 500 });
  }
}
