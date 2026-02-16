import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const { slides } = body;
    if (!Array.isArray(slides)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    await prisma.$transaction(slides.map(({ id, order }: { id: string; order: number }) => prisma.slide.update({ where: { id }, data: { order } })));
    return NextResponse.json({ message: 'Slides reordered' }, { status: 200 });
  } catch (error) {
    console.error('Error reordering slides:', error);
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
  }
}
