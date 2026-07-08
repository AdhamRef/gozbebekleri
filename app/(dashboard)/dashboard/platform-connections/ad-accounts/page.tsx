import Link from "next/link";
import { getAdAccountsReadiness } from "@/lib/platform-connections/readiness";
import { PageHeader, Card, CardHeader, StatusBadge, fmtDate } from "../_components/ui";

export const metadata = { title: "الحسابات الإعلانية | ربط المنصات والإرسال" };
export const dynamic = "force-dynamic";

const CONNECTIONS = "/dashboard/marketing/connections";
const SYNC_LOG = "/dashboard/marketing/sync-log";

export default async function AdAccountsPage() {
  const { rows, connectedCount } = await getAdAccountsReadiness();

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <PageHeader
        eyebrow="ربط المنصات والإرسال / الحسابات الإعلانية"
        title="الحسابات الإعلانية"
        subtitle="حالة ربط ومزامنة حسابات الإعلانات. الإدارة الكاملة تتم من صفحة ربط الحسابات."
      />

      <Card>
        <CardHeader
          title="المنصات الإعلانية"
          description={connectedCount === 0 ? "لا توجد حسابات مربوطة بعد." : `${connectedCount} حساب مربوط.`}
          action={<Link href={CONNECTIONS} className="text-xs font-bold text-[#025EB8] hover:underline">ربط حساب جديد</Link>}
        />
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {rows.map((r) => (
            <div key={r.key} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-slate-900">{r.label}</span>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-3 grid gap-1.5 text-xs text-slate-500">
                <div className="flex justify-between"><span>مربوط</span><span className="font-semibold text-slate-700">{r.connected ? "نعم" : "لا"}</span></div>
                <div className="flex justify-between"><span>اكتمال الإعداد</span><span className="font-semibold text-slate-700">{r.completionPercent}%</span></div>
                <div className="flex justify-between"><span>آخر مزامنة</span><span className="font-semibold text-slate-700">{fmtDate(r.lastSyncAt)}</span></div>
                {r.lastError ? <div className="mt-1 rounded-md bg-rose-50 px-2 py-1 text-rose-700">آخر خطأ: {r.lastError}</div> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-[#025EB8]">
                <Link href={CONNECTIONS} className="hover:underline">فتح الإعدادات</Link>
                <Link href={SYNC_LOG} className="hover:underline">فتح السجل</Link>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <p className="max-w-2xl rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-500">
        تتم إدارة بيانات الربط والمزامنة من <Link href={CONNECTIONS} className="font-bold text-[#025EB8] hover:underline">صفحة ربط الحسابات</Link>. لا تُعرض أي مفاتيح أو رموز سرية هنا.
      </p>
    </main>
  );
}
