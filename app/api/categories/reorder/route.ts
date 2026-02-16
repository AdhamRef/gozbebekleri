import { NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { categories } = body;

    // Validate the request body
    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Update all categories in a single transaction
    await prisma.$transaction(
      categories.map(({ id, order }) =>
        prisma.category.update({
          where: { id },
          data: { order },
        })
      )
    );

    return NextResponse.json(
      { message: 'Categories reordered successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error reordering categories:', error);
    return NextResponse.json(
      { error: 'Failed to reorder categories' },
      { status: 500 }
    );
  }
} 