import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function BrandFrameworksPage() {
  redirect("/dashboard/operations/communication/templates?tab=legacy-frameworks");
}
