import { requireDashboardPagePermission } from "@/lib/dashboard/require-page-permission";
import { subscriptionRequestsOpen } from "@/lib/donations/subscription-request-gate";
import { SubscriptionRequestsQueue } from "@/components/dashboard/SubscriptionRequestsQueue";

export const dynamic = "force-dynamic";
export default async function SubscriptionRequestsPage() {
  await requireDashboardPagePermission("monthly");
  return <main dir="rtl" className="mx-auto max-w-6xl space-y-6 p-3 sm:p-6">
    <div><h1 className="text-2xl font-bold">طلبات إدارة التبرعات الدورية</h1>
      <p className="mt-2 text-sm text-slate-600">مراجعة طلبات تعديل المبلغ والإيقاف والإلغاء. تسجيل الطلب لا يغير أي دفعة.</p>
    </div>
    <SubscriptionRequestsQueue released={subscriptionRequestsOpen()}/>
  </main>;
}
