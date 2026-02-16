import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { categoryId: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { categoryId } = params;

    const translations = await prisma.postCategoryTranslation.findMany({
      where: { categoryId },
      select: { locale: true, name: true, title: true, description: true, image: true }
    });

    return NextResponse.json(translations);
  } catch (error) {
    console.error('Error fetching post category translations:', error);
    return NextResponse.json({ error: 'Failed to fetch translations' }, { status: 500 });
  }
}