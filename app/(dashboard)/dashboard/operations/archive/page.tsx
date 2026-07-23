import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OperationsArchivePage() {
  redirect("/dashboard/archive/assets");
}
