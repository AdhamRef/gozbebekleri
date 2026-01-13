import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const prioritizedCampaigns = await prisma.campaign.findMany({
      where: {
        priority: {
          not: null, // Assuming that a non-null priority indicates a prioritized campaign
        },
      },
      orderBy: { priority: "asc" }, // Order by priority
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
      },
    });

    // Map to add donation count to each campaign using prisma.count
    const campaignsWithDonationCount = await Promise.all(prioritizedCampaigns.map(async (campaign) => {
      const donationCount = await prisma.donationItem.count({
        where: {
          campaignId: campaign.id, // Assuming there's a campaignId in the donationItem table
        },
      });
      return {
        ...campaign,
        donationCount, // Add the donation count
      };
    }));

    return NextResponse.json(campaignsWithDonationCount || []);
  } catch (error) {
    console.error("Error fetching prioritized campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch prioritized campaigns. Please try again later." },
      { status: 500 }
    );
  }
} 