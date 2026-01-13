import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get cursor and limit from URL params
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');  // Last item's ID from previous batch
    const limit = Number(searchParams.get('limit')) || 10;  // Default to 10 items

    // Fetch categories with cursor-based pagination
    const categories = await prisma.category.findMany({
      take: limit + 1, // Fetch one extra to determine if there are more items
      ...(cursor && {
        skip: 1, // Skip the cursor item
        cursor: {
          id: cursor,
        },
      }),
      orderBy: { order: "asc" },
      include: { campaigns: true },
    });

    // Check if there are more items
    const hasMore = categories.length > limit;
    const items = hasMore ? categories.slice(0, -1) : categories;

    // Get the next cursor
    const nextCursor = hasMore ? categories[categories.length - 2].id : null;

    // Transform the response
    const transformedCategories = items.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      image: category.image,
      icon: category.icon,
      order: category.order,
      campaigns: category.campaigns,
    }));

    return NextResponse.json({
      items: transformedCategories,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, image, icon, order } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
        description: description || "", // Provide default empty string
        image: image || "", // Provide default empty string
        icon: icon || "", // Handle icon
        order: order || 0, // Handle order, default to 0
      },
    });

    return NextResponse.json(newCategory);
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
