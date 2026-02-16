import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * GET: Fetch live donation ticker configuration
 * Returns the active ticker config with all settings
 */
export async function GET(request: NextRequest) {
  try {
    // Get the first active ticker configuration
    const ticker = await prisma.liveDonationTicker.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' }
    });

    if (!ticker) {
      return NextResponse.json(
        { error: 'No active ticker configuration found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: ticker.id,
      donorNames: ticker.donorNames,
      amountRanges: ticker.amountRanges,
      minIntervalSeconds: ticker.minIntervalSeconds,
      maxIntervalSeconds: ticker.maxIntervalSeconds,
    });
  } catch (error) {
    console.error('Error fetching ticker config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticker configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create or update ticker configuration (admin-only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Only admins can configure the ticker' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const {
      donorNames,
      amountRanges,
      minIntervalSeconds,
      maxIntervalSeconds,
      isActive = true,
    } = data;

    // Validate amount ranges
    if (amountRanges && Array.isArray(amountRanges)) {
      for (const range of amountRanges) {
        if (!range.minAmount || !range.maxAmount || !range.probability || !range.label) {
          return NextResponse.json(
            { error: 'Invalid amount range format. Each range must have minAmount, maxAmount, probability, and label' },
            { status: 400 }
          );
        }
        if (range.minAmount >= range.maxAmount) {
          return NextResponse.json(
            { error: 'minAmount must be less than maxAmount' },
            { status: 400 }
          );
        }
      }
    }

    // Deactivate all existing tickers
    await prisma.liveDonationTicker.updateMany({
      where: {},
      data: { isActive: false }
    });

    // Create new ticker configuration
    const ticker = await prisma.liveDonationTicker.create({
      data: {
        isActive,
        donorNames: donorNames || [],
        amountRanges: amountRanges || [],
        minIntervalSeconds: minIntervalSeconds || 3,
        maxIntervalSeconds: maxIntervalSeconds || 8,
      }
    });

    return NextResponse.json(ticker, { status: 201 });
  } catch (error) {
    console.error('Error creating ticker config:', error);
    return NextResponse.json(
      { error: 'Failed to create ticker configuration' },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update existing ticker configuration (admin-only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Only admins can update the ticker' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { id, ...updates } = data;

    if (!id) {
      return NextResponse.json(
        { error: 'Ticker ID is required' },
        { status: 400 }
      );
    }

    // Validate amount ranges if provided
    if (updates.amountRanges && Array.isArray(updates.amountRanges)) {
      for (const range of updates.amountRanges) {
        if (!range.minAmount || !range.maxAmount || !range.probability || !range.label) {
          return NextResponse.json(
            { error: 'Invalid amount range format' },
            { status: 400 }
          );
        }
        if (range.minAmount >= range.maxAmount) {
          return NextResponse.json(
            { error: 'minAmount must be less than maxAmount' },
            { status: 400 }
          );
        }
      }
    }

    const ticker = await prisma.liveDonationTicker.update({
      where: { id },
      data: updates
    });

    return NextResponse.json(ticker);
  } catch (error) {
    console.error('Error updating ticker config:', error);
    return NextResponse.json(
      { error: 'Failed to update ticker configuration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete ticker configuration (admin-only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Only admins can delete the ticker' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Ticker ID is required' },
        { status: 400 }
      );
    }

    await prisma.liveDonationTicker.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Ticker configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticker config:', error);
    return NextResponse.json(
      { error: 'Failed to delete ticker configuration' },
      { status: 500 }
    );
  }
}