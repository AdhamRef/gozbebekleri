import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createVerificationToken } from "@/lib/otp";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, phone, email, password, locale, callbackUrl } = await req.json();

    // ── Validate ──────────────────────────────────────────────────────────
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "PASSWORD_TOO_SHORT" }, { status: 400 });
    }

    // ── Check duplicate ───────────────────────────────────────────────────
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });
    }

    // ── Create user (unverified) ──────────────────────────────────────────
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.toLowerCase().trim(),
        password: hashed,
        phone: phone?.trim() || null,
        role: "DONOR",
        emailVerified: null,
      },
    });

    // ── Send verification link ────────────────────────────────────────────
    const normalizedEmail = email.toLowerCase().trim();
    const token = await createVerificationToken(normalizedEmail, "VERIFY_EMAIL");

    const baseUrl =
      process.env.NEXTAUTH_URL ??
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const safeCallback = typeof callbackUrl === "string" && callbackUrl.startsWith("/") ? callbackUrl : "/";
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}&callbackUrl=${encodeURIComponent(safeCallback)}`;

    await sendVerificationEmail(normalizedEmail, verificationUrl, locale ?? "en");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
