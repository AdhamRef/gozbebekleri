import { redirect } from "next/navigation";

export default function LegacyPage() {
  redirect("/dashboard/marketing/attribution#builder");
}
