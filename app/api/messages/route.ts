import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { isValidLocale } from "@/lib/locales";

// POST /api/messages - Submit a message (public; optional session)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const messageBody = typeof body?.body === "string" ? body.body.trim() : "";
    const locale = isValidLocale(body?.locale) ? body.locale : "ar";

    if (!messageBody || messageBody.length < 3) {
      return NextResponse.json(
        { error: "Message body is required (min 3 characters)" },
        { status: 400 }
      );
    }

    const data: {
      body: string;
      locale: string;
      userId?: string;
      guestName?: string | null;
      guestEmail?: string | null;
    } = {
      body: messageBody,
      locale,
    };

    if (session?.user?.id) {
      data.userId = session.user.id;
    } else {
      const guestName = typeof body.guestName === "string" ? body.guestName.trim() || null : null;
      const guestEmail = typeof body.guestEmail === "string" ? body.guestEmail.trim() || null : null;
      data.guestName = guestName;
      data.guestEmail = guestEmail;
    }

    const message = await prisma.message.create({
      data: {
        body: data.body,
        locale: data.locale,
        userId: data.userId ?? null,
        guestName: data.guestName ?? null,
        guestEmail: data.guestEmail ?? null,
      },
    });

    return NextResponse.json({ success: true, id: message.id });
  } catch (err) {
    console.error("Error creating message:", err);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
