import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/otp";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const baseUrl =
    process.env.NEXTAUTH_URL ??
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  if (!token || !email) {
    return NextResponse.redirect(`${baseUrl}/?verified=invalid`);
  }

  const normalizedEmail = decodeURIComponent(email).toLowerCase().trim();

  const result = await verifyToken(normalizedEmail, token, "VERIFY_EMAIL");

  if (!result.success) {
    const reason = result.error === "EXPIRED" ? "expired" : "invalid";
    return NextResponse.redirect(`${baseUrl}/?verified=${reason}`);
  }

  // Mark email as verified
  await prisma.user.update({
    where: { email: normalizedEmail },
    data: { emailVerified: new Date() },
  });

  return NextResponse.redirect(`${baseUrl}/?verified=success`);
}
