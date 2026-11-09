/**
 * READ ONLY. Never merges/deletes or changes Stripe/Prisma records.
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/audit-goz-subscription-duplicates-readonly.ts
 *   node --env-file=.env --import tsx scripts/audit-goz-subscription-duplicates-readonly.ts --subscription-id=<internal ID>
 *
 * Output is an investigative shortlist; only independent Stripe payment
 * evidence can confirm duplicates. No donor names, emails, card data or secrets.
 */
import { prisma } from "@/lib/prisma";
import { auditSubscriptionDuplicates } from "@/lib/donations/subscription-dedupe-audit";

async function main() {
  const supplied = process.argv.find((arg) => arg.startsWith("--subscription-id="));
  const subscriptionId = supplied?.slice("--subscription-id=".length);
  if (supplied && (!subscriptionId || !/^[a-f0-9]{24}$/i.test(subscriptionId))) {
    throw new Error("Invalid internal subscription ID");
  }

  const rows = await prisma.donation.findMany({
    where: { subscriptionId: subscriptionId ? subscriptionId : { not: null } },
    select: {
      id: true, subscriptionId: true, status: true, paidAt: true,
      createdAt: true, providerOrderId: true, billingReason: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const findings = auditSubscriptionDuplicates(rows);
  console.log(JSON.stringify({
    mode: "READ_ONLY",
    checkedRows: rows.length,
    sameInvoiceGroups: findings.filter((f) => f.category === "SAME_STRIPE_INVOICE").length,
    possibleSignupShadows: findings.filter((f) => f.category === "POSSIBLE_SIGNUP_SHADOW").length,
    findings,
    caveat: "Potential shadow is not proof of a duplicate financial transaction; compare Stripe invoices before any data correction.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Audit failed");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
