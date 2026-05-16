import type { PrismaClient } from "@prisma/client";

export interface GuestPayload {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  countryCode?: string | null;
  city?: string | null;
  region?: string | null;
}

export interface ResolvedDonor {
  donorId: string;
  donorName: string | null;
  /** True when we attached to an existing user instead of creating a new guest. */
  matched: boolean;
}

interface ResolveOptions {
  preferredLang: string | null;
}

/**
 * Look up (or create) the User that owns this guest donation.
 *
 * Matching order:
 *   1. Email — uses the unique index, so always definitive.
 *   2. Phone — best-effort match against the stored E.164 string. Prefers
 *      registered users (password set) over other guests when more than one
 *      record has the same phone.
 *
 * On a match we backfill empty profile fields with what the guest just
 * provided so the next email / WhatsApp / certificate has everything it
 * needs. On a miss we create a fresh guest user.
 */
export async function resolveGuestDonor(
  prisma: PrismaClient,
  guest: GuestPayload,
  opts: ResolveOptions
): Promise<ResolvedDonor> {
  const email = guest.email?.trim().toLowerCase() || null;
  const phone = guest.phone?.trim() || null;
  const name = [guest.firstName, guest.lastName].filter(Boolean).join(" ").trim() || null;
  const countryCode = guest.countryCode || null;
  const city = guest.city || null;
  const region = guest.region || null;

  // 1. Email match — @unique, so at most one row.
  if (email) {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, name: true, phone: true, countryCode: true, city: true, region: true,
      },
    });
    if (existing) {
      await backfillExistingUser(prisma, existing.id, existing, { name, phone, countryCode, city, region });
      return { donorId: existing.id, donorName: existing.name ?? name, matched: true };
    }
  }

  // 2. Phone match — pick a registered user first, then any guest.
  if (phone) {
    const candidates = await prisma.user.findMany({
      where: { phone },
      select: {
        id: true, name: true, email: true, password: true,
        countryCode: true, city: true, region: true,
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    });
    const chosen =
      candidates.find((u) => u.password != null) ?? candidates[0] ?? null;
    if (chosen) {
      await backfillExistingUser(prisma, chosen.id, chosen, {
        name: chosen.name ? null : name,
        email: chosen.email ? null : email,
        countryCode,
        city,
        region,
      });
      return { donorId: chosen.id, donorName: chosen.name ?? name, matched: true };
    }
  }

  // 3. Create a new guest user.
  const created = await prisma.user.create({
    data: {
      email: email ?? undefined,
      name: name ?? "Guest",
      phone: phone ?? undefined,
      countryCode: countryCode ?? undefined,
      city: city ?? undefined,
      region: region ?? undefined,
      preferredLang: opts.preferredLang ?? undefined,
    },
    select: { id: true, name: true },
  });
  return { donorId: created.id, donorName: created.name, matched: false };
}

type ExistingShape = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  countryCode?: string | null;
  city?: string | null;
  region?: string | null;
};

type IncomingShape = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  countryCode?: string | null;
  city?: string | null;
  region?: string | null;
};

async function backfillExistingUser(
  prisma: PrismaClient,
  userId: string,
  existing: ExistingShape,
  incoming: IncomingShape
): Promise<void> {
  const data: Record<string, unknown> = {};
  if (!existing.name && incoming.name) data.name = incoming.name;
  if (!existing.email && incoming.email) data.email = incoming.email;
  if (!existing.phone && incoming.phone) data.phone = incoming.phone;
  if (!existing.countryCode && incoming.countryCode) data.countryCode = incoming.countryCode;
  if (!existing.city && incoming.city) data.city = incoming.city;
  if (!existing.region && incoming.region) data.region = incoming.region;
  if (Object.keys(data).length === 0) return;
  await prisma.user.update({ where: { id: userId }, data });
}
