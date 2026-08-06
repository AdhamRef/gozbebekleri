import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";
import { donorChannelEligibility } from "@/lib/communication/audience-service";
import { isCommunicationChannel } from "@/lib/communication/communication-runtime-types";
import { isValidLocale, DEFAULT_LOCALE } from "@/lib/locales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Donors as campaign candidates, for the audience step of the wizard.
 *
 * Deliberately not `/api/users?scope=donors`. That endpoint knows nothing about channels, and for
 * this screen the channel is the whole point: a donor with no phone is a perfectly good donor and a
 * dead SMS recipient. Selecting them there would produce a campaign whose real reach is a fraction
 * of the number shown, discovered only after sending. So each row carries its eligibility for the
 * campaign's channel, and the counts distinguish "matched your filter" from "can actually receive
 * this".
 *
 * `NEEDS_REVIEW` is WhatsApp-specific and is kept distinct from `UNAVAILABLE` rather than folded
 * into it: those donors have a phone but no recorded opt-in, which is a consent decision for a
 * human, not a filtering accident.
 */

const PAGE_SIZE_MAX = 100;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "messages");
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const channel = sp.get("channel");
  if (!isCommunicationChannel(channel)) {
    return NextResponse.json({ ok: false, error: "channel must be EMAIL, WHATSAPP or SMS" }, { status: 400 });
  }

  const search = sp.get("search")?.trim() || "";
  const localeFilter = sp.get("locale") || "all";
  const countryFilter = sp.get("country") || "all";
  const eligibilityFilter = sp.get("eligibility") || "all"; // all | eligible | ineligible
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(sp.get("limit") || "25")));

  const where: Prisma.UserWhereInput = { role: "DONOR" };
  if (localeFilter !== "all" && isValidLocale(localeFilter)) where.preferredLang = localeFilter;
  if (countryFilter !== "all") where.countryCode = countryFilter;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  const select = {
    id: true,
    name: true,
    email: true,
    phone: true,
    image: true,
    preferredLang: true,
    countryCode: true,
    countryName: true,
    emailNotifications: true,
    smsNotifications: true,
  } satisfies Prisma.UserSelect;

  /** Attach per-channel eligibility, preferring the consent profile over the legacy User flags. */
  const decorate = async (rows: Prisma.UserGetPayload<{ select: typeof select }>[]) => {
    const profiles = rows.length
      ? await prisma.donorCommunicationProfile
          .findMany({
            where: { userId: { in: rows.map((r) => r.id) } },
            select: { userId: true, whatsappOptIn: true, emailOptIn: true, smsOptIn: true, doNotContact: true },
          })
          .catch(() => [])
      : [];
    const byUser = new Map(profiles.map((p) => [p.userId, p]));
    return rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      image: u.image,
      locale: u.preferredLang && isValidLocale(u.preferredLang) ? u.preferredLang : DEFAULT_LOCALE,
      countryCode: u.countryCode,
      countryName: u.countryName,
      eligibility: donorChannelEligibility(
        { email: u.email, phone: u.phone, emailNotifications: u.emailNotifications, smsNotifications: u.smsNotifications },
        channel,
        byUser.get(u.id) ?? null,
      ),
    }));
  };

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, select, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
  ]);

  let donors = await decorate(rows);
  if (eligibilityFilter === "eligible") donors = donors.filter((d) => d.eligibility === "ELIGIBLE");
  else if (eligibilityFilter === "ineligible") donors = donors.filter((d) => d.eligibility !== "ELIGIBLE");

  return NextResponse.json({ ok: true, donors, pagination: { total, page, limit } });
}

/**
 * Resolve the full id list for the current filter, so «تحديد كل النتائج» selects what the operator
 * sees rather than only the loaded page.
 *
 * A separate POST rather than an ever-growing page size: the answer can be thousands of ids and is
 * only ever needed at the moment of the click, not on every keystroke of the search box.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "messages");
  if (denied) return denied;

  let body: { channel?: string; search?: string; locale?: string; country?: string; eligibility?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!isCommunicationChannel(body.channel)) {
    return NextResponse.json({ ok: false, error: "channel must be EMAIL, WHATSAPP or SMS" }, { status: 400 });
  }

  const where: Prisma.UserWhereInput = { role: "DONOR" };
  if (body.locale && body.locale !== "all" && isValidLocale(body.locale)) where.preferredLang = body.locale;
  if (body.country && body.country !== "all") where.countryCode = body.country;
  if (body.search?.trim()) {
    where.OR = [
      { name: { contains: body.search.trim(), mode: "insensitive" } },
      { email: { contains: body.search.trim(), mode: "insensitive" } },
      { phone: { contains: body.search.trim() } },
    ];
  }

  const rows = await prisma.user.findMany({
    where,
    select: { id: true, email: true, phone: true, emailNotifications: true, smsNotifications: true },
    take: 5000,
  });
  const profiles = await prisma.donorCommunicationProfile
    .findMany({
      where: { userId: { in: rows.map((r) => r.id) } },
      select: { userId: true, whatsappOptIn: true, emailOptIn: true, smsOptIn: true, doNotContact: true },
    })
    .catch(() => []);
  const byUser = new Map(profiles.map((p) => [p.userId, p]));

  const wantEligibleOnly = body.eligibility !== "all" && body.eligibility !== "ineligible";
  const ids = rows
    .filter((u) => {
      if (body.eligibility === "all") return true;
      const e = donorChannelEligibility(
        { email: u.email, phone: u.phone, emailNotifications: u.emailNotifications, smsNotifications: u.smsNotifications },
        body.channel as "EMAIL" | "SMS" | "WHATSAPP",
        byUser.get(u.id) ?? null,
      );
      return wantEligibleOnly ? e === "ELIGIBLE" : e !== "ELIGIBLE";
    })
    .map((u) => u.id);

  return NextResponse.json({ ok: true, ids, truncated: rows.length >= 5000 });
}
