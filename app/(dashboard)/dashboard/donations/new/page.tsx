import { redirect } from "next/navigation";

export default function LegacyDonationNewPage() {
  redirect("/dashboard/campaigns/new");
}
