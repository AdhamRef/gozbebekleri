import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

interface Params {
  params: { postId: string };
}

// GET /api/posts/[postId]/translations - return all translations for a post
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { postId } = params;

    const translations = await prisma.postTranslation.findMany({
      where: { postId },
      select: { locale: true, title: true, description: true, content: true, image: true }
    });

    return NextResponse.json(translations);
  } catch (error) {
    console.error('Error fetching post translations:', error);
    return NextResponse.json({ error: 'Failed to fetch translations' }, { status: 500 });
  }
}