import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OperationsProductionPage() {
  redirect("/dashboard/operations/content?view=production");
}
