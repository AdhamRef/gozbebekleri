import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OperationsSchedulerPage() {
  redirect("/dashboard/operations/calendar?view=schedule");
}
