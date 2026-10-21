import { redirect } from "next/navigation";
import { isValidLocale } from "@/lib/locales";

// A success receipt must come from a real donation record. The unqualified
// legacy URL must never display sample donors, amounts or confirmation IDs.
export default async function DonationSuccessEntry({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: candidate } = await params;
  const locale = isValidLocale(candidate) ? candidate : "ar";
  const query = await searchParams || {};
  const donationId = query.donationId;
  if (typeof donationId === "string" && /^[a-f0-9]{24}$/i.test(donationId)) {
    redirect(`/${locale}/success/${donationId}`);
  }
  redirect(`/${locale}/campaigns`);
}
