// app/api/campaigns/[id]/translations/route.ts
// Endpoint to fetch all translations for a campaign (for editing purposes)
// GET /api/campaigns/[id]/translations - Returns all translations (en, fr, etc.)

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

interface Params {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    // ✅ Fetch all translations for the campaign
    const translations = await prisma.campaignTranslation.findMany({
      where: {
        campaignId: id,
      },
      select: {
        locale: true,
        title: true,
        description: true,
      },
    });

    return NextResponse.json(translations);
    
  } catch (error) {
    console.error("Error fetching campaign translations:", error);
    return NextResponse.json(
      { error: "Failed to fetch translations" },
      { status: 500 }
    );
  }
}