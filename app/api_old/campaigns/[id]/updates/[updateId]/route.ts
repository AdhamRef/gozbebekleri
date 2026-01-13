import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/options";

interface Params {
  params: {
    id: string;
    updateId: string;
  };
}

// Delete update
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Unauthorized - Only admins can delete updates" },
        { status: 401 }
      );
    }

    await prisma.update.delete({
      where: { id: params.updateId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting update:", error);
    return NextResponse.json(
      { error: "Failed to delete update" },
      { status: 500 }
    );
  }
}

// Update an update
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Unauthorized - Only admins can modify updates" },
        { status: 401 }
      );
    }

    const data = await request.json();
    const updatedUpdate = await prisma.update.update({
      where: { id: params.updateId },
      data: {
        title: data.title,
        description: data.description,
        image: data.image,
        videoUrl: data.videoUrl,
      },
    });

    return NextResponse.json(updatedUpdate);
  } catch (error) {
    console.error("Error updating update:", error);
    return NextResponse.json(
      { error: "Failed to modify update" },
      { status: 500 }
    );
  }
} 