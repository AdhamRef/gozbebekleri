import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Fetch all categories with the first 5 campaigns for each category
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        campaigns: {
          take: 5, // Get the first 5 campaigns
          select: {
            id: true,
            title: true,
            description: true,
            targetAmount: true,
            currentAmount: true,
            images: true,
            isActive: true,
          },
          orderBy: {
            createdAt: 'desc', // Optional: Get the most recent campaigns
          },
        },
      },
    });

    // Format the response to include only necessary data
    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      campaigns: category.campaigns, // Include the first 5 campaigns
    }));

    return NextResponse.json(formattedCategories);
  } catch (error) {
    console.error('Error fetching categories with campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories with campaigns' },
      { status: 500 }
    );
  }
} 