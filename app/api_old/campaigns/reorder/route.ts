import { NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { campaigns } = body;

    // Validate the request body
    if (!Array.isArray(campaigns)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Update all campaigns in a single transaction
    await prisma.$transaction(
      campaigns.map(({ id, order }) =>
        prisma.campaign.update({
          where: { id },
          data: { priority: order },
        })
      )
    );

    return NextResponse.json(
      { message: 'Campaigns reordered successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error reordering campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to reorder campaigns' },
      { status: 500 }
    );
  }
} 