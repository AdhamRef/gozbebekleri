npm run backfill:donation-countries/**
 * Backfill Donation.donorCountryCode from linked User.countryCode.
 * Run: npx tsx scripts/backfill-donation-donor-country.ts
 * Requires DATABASE_URL in the environment.
 */
import { PrismaClient } from "@prisma/client";
import { getDonorCountryCodeForSnapshot } from "../lib/donations/donor-country-code";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.donation.findMany({
    where: { donorCountryCode: null },
    select: { id: true, donorId: true },
  });

  let updated = 0;
  for (const r of rows) {
    const code = await getDonorCountryCodeForSnapshot(prisma, r.donorId);
    if (code) {
      await prisma.donation.update({
        where: { id: r.id },
        data: { donorCountryCode: code },
      });
      updated++;
    }
  }

  console.log(`Scanned ${rows.length} donation(s) with no country; updated ${updated}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
