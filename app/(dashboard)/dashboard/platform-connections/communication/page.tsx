import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { PageHeader } from "../_components/ui";
import { userHasDashboardPermission } from "@/lib/dashboard/permissions";
import { INTEGRATION_PROVIDERS } from "@/lib/integration-settings/catalog";
import { integrationSettingsService } from "@/lib/integration-settings/prisma-service";
import { getSchedulerStatus } from "@/lib/communication/scheduler-status";
import { IntegrationSettingsManager } from "./_components/IntegrationSettingsManager";

export const metadata = { title: "مزودو التواصل والإرسال | ربط المنصات والإرسال" };
export const dynamic = "force-dynamic";

export default async function CommunicationConnectionsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const permissions = {
    canView: userHasDashboardPermission(user, "platformConnections"),
    canTest: userHasDashboardPermission(user, "platformConnectionsTest"),
    canManage: userHasDashboardPermission(user, "platformConnectionsManage"),
    canAdmin: userHasDashboardPermission(user, "platformConnectionsAdmin"),
  };

  const actor = {
    actorId: String((user as { id?: string } | undefined)?.id ?? "dashboard-user"),
    actorName: user?.name ?? null,
    actorRole: String((user as { role?: string } | undefined)?.role ?? "STAFF"),
  };

  const [initialProviders, scheduler] = await Promise.all([
    Promise.all(INTEGRATION_PROVIDERS.map((provider) => integrationSettingsService.getProviderSnapshot(provider, actor))),
    getSchedulerStatus(),
  ]);

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <PageHeader
        eyebrow="ربط المنصات والإرسال / المزودون"
        title="مزودو التواصل والإرسال"
        subtitle="إدارة بيانات واتساب والإيميل والرسائل القصيرة والجدولة من مكان واحد. احفظ التغييرات ثم اختبرها من السيرفر قبل اعتمادها."
      />
      <IntegrationSettingsManager initialProviders={initialProviders} permissions={permissions} scheduler={scheduler} />
    </main>
  );
}
