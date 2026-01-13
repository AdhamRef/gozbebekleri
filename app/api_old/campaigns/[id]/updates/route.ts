import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";

interface Params {
  params: {
    id: string;
  };
}

// Get campaign updates
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const updates = await prisma.update.findMany({
      where: {
        campaignId: params.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(updates);
  } catch (error) {
    console.error("Error fetching updates:", error);
    return NextResponse.json(
      { error: "Failed to fetch updates" },
      { status: 500 }
    );
  }
}

// Add new update
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Unauthorized - Only admins can add updates" },
        { status: 401 }
      );
    }

    const data = await request.json();
    const update = await prisma.update.create({
      data: {
        title: data.title,
        description: data.description,
        image: data.image,
        videoUrl: data.videoUrl,
        campaignId: params.id,
      },
    });

    return NextResponse.json(update);
  } catch (error) {
    console.error("Error creating update:", error);
    return NextResponse.json(
      { error: "Failed to create update" },
      { status: 500 }
    );
  }
} 