import type { PrismaClient } from "@prisma/client";

export function normalizeDonorCountryCode(code: string | null | undefined): string | null {
  if (code == null || typeof code !== "string") return null;
  const t = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(t)) return null;
  return t;
}

export async function getDonorCountryCodeForSnapshot(
  prisma: PrismaClient,
  donorId: string
): Promise<string | null> {
  const u = await prisma.user.findUnique({
    where: { id: donorId },
    select: { countryCode: true },
  });
  return normalizeDonorCountryCode(u?.countryCode);
}
