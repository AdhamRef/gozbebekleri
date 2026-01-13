import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import cloudinary from "cloudinary";
interface Params {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: {
        id: params.id,
      },
      include: {
        category: true,

        donations: {
          select: {
            amount: true,
            amountUSD: true,
            donation: {
              select: {
                donor: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        updates: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Safely calculate amount raised
    const amountRaised = campaign.donations.reduce(
      (sum, donation) => sum + (donation.amountUSD ?? 0),
      0
    );

    // Safely handle donation statistics
    const donations = campaign.donations || [];
    const firstDonation =
      donations.length > 0 ? donations[donations.length - 1] : null;
    const lastDonation = donations.length > 0 ? donations[0] : null;
    const largestDonation =
      donations.length > 0
        ? [...donations].sort((a, b) => (b.amountUSD ?? 0) - (a.amountUSD ?? 0))[0]
        : null;

    // Transform the response with safe values and explicit null handling
    const response = {
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      images: campaign.images || [],
      targetAmount: campaign.targetAmount,
      currentAmount: campaign.currentAmount,
      amountRaised: amountRaised,
      isActive: campaign.isActive,
      donationCount: campaign.donations.length,
      progress:
        campaign.targetAmount > 0
          ? Math.min((amountRaised / campaign.targetAmount) * 100, 100)
          : 0,
      category: {
        id: campaign.category.id,
        name: campaign.category.name,
        icon: campaign.category.icon,
      },
      updates: campaign.updates,
      donationStats: {
        first: firstDonation
          ? {
              amount: firstDonation.amount ?? 0,
              amountUSD: firstDonation.amountUSD,
              donor: firstDonation.donation.donor?.name ?? "Anonymous",
            }
          : null,
        largest: largestDonation
          ? {
              amount: largestDonation.amount ?? 0,
              amountUSD: largestDonation.amountUSD,
              donor: largestDonation.donation.donor?.name ?? "Anonymous",
            }
          : null,
        last: lastDonation
          ? {
              amount: lastDonation.amount ?? 0,
              amountUSD: lastDonation.amountUSD,
              donor: lastDonation.donation.donor?.name ?? "Anonymous",
            }
          : null,
      },
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch campaign",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();

    // Destructure and validate fields
    const { title, description, targetAmount, images, videoUrl, categoryId } =
      body;

    // Check if campaign exists
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Validate required fields if they're being updated
    if (title && !title.trim()) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      );
    }

    if (description && !description.trim()) {
      return NextResponse.json(
        { error: "Description cannot be empty" },
        { status: 400 }
      );
    }

    if (targetAmount && targetAmount <= 0) {
      return NextResponse.json(
        { error: "Target amount must be greater than 0" },
        { status: 400 }
      );
    }

    if (images && (!Array.isArray(images) || images.length === 0)) {
      return NextResponse.json(
        { error: "At least one image URL is required" },
        { status: 400 }
      );
    }

    // Update campaign with validated data
    const updatedCampaign = await prisma.campaign.update({
      where: { id: params.id },
      data: {
        ...(title && { title: title.trim() }),
        ...(description && { description: description.trim() }),
        ...(targetAmount && { targetAmount: Number(targetAmount) }),
        ...(images && { images: Array.isArray(images) ? images : [] }),
        ...(videoUrl !== undefined && { videoUrl: videoUrl?.trim() || null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
      },
    });

    return NextResponse.json(updatedCampaign);
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get campaign images before deletion
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      select: { images: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Delete images from Cloudinary
    await Promise.all(
      campaign.images.map(async (imageUrl) => {
        try {
          const publicId = imageUrl.split("/").slice(-1)[0].split(".")[0];
          if (publicId) {
            await cloudinary.uploader.destroy(`campaigns/${publicId}`);
          }
        } catch (error) {
          console.error("Error deleting image from Cloudinary:", error);
        }
      })
    );

    // Delete the campaign
    await prisma.campaign.delete({
      where: { id: params.id },
    });

    return NextResponse.json(
      { message: "Campaign deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      targetAmount,
      categoryId,
      isActive,
      images,
      videoUrl,
    } = body;

    // Get existing campaign to compare images
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      select: { images: true },
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Find images that were removed
    const removedImages = existingCampaign.images.filter(
      (oldImage) => !images.includes(oldImage)
    );

    // Delete removed images from Cloudinary
    await Promise.all(
      removedImages.map(async (imageUrl) => {
        try {
          const publicId = imageUrl.split("/").slice(-1)[0].split(".")[0];
          if (publicId) {
            await cloudinary.uploader.destroy(`campaigns/${publicId}`);
          }
        } catch (error) {
          console.error("Error deleting image from Cloudinary:", error);
        }
      })
    );

    const updatedCampaign = await prisma.campaign.update({
      where: { id: params.id },
      data: {
        title,
        description,
        targetAmount,
        categoryId,
        isActive,
        images: Array.isArray(images) ? images : [],
        videoUrl: videoUrl || null,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(updatedCampaign);
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}
