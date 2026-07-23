import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { resolveDashboardPageAccess } from "@/lib/dashboard/page-access";
import { getAdAccountsReadiness } from "@/lib/platform-connections/readiness";
import { PageHeader, Card, CardHeader, StatusBadge, fmtDate } from "../_components/ui";
import { ConnectionsPageClient } from "../../marketing/connections/_components/ConnectionsPageClient";
import MarketingDataSyncPage from "../../marketing/data-sync/page";

export const metadata = { title: "الحسابات والمزامنة | ربط المنصات والإرسال" };
export const dynamic = "force-dynamic";

export default async function AdAccountsPage() {
  const access = resolveDashboardPageAccess(await getServerSession(authOptions), "platformConnections");
  if (!access.allowed) redirect(access.redirectTo);
  const { rows, connectedCount } = await getAdAccountsReadiness();

  return <main className="space-y-8 p-4 sm:p-6" dir="rtl">
    <PageHeader eyebrow="ربط المنصات والإرسال / الحسابات الإعلانية" title="الحسابات والمزامنة" subtitle="إدارة الحسابات، حالة الاتصال، وآخر المزامنات وتشغيل سحب يدوي صريح من مكان واحد." />
    <Card><CardHeader title="حالة المنصات الإعلانية" description={connectedCount === 0 ? "لا توجد حسابات مربوطة بعد." : `${connectedCount} حساب مربوط.`} action={<Link href="#manage" className="text-xs font-bold text-[#025EB8]">إدارة الحسابات</Link>} /><div className="grid gap-3 p-4 lg:grid-cols-2">{rows.map((row) => <div key={row.key} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-2"><span className="font-black">{row.label}</span><StatusBadge status={row.status} /></div><div className="mt-3 grid gap-1.5 text-xs text-slate-500"><div className="flex justify-between"><span>مربوط</span><span>{row.connected ? "نعم" : "لا"}</span></div><div className="flex justify-between"><span>اكتمال الإعداد</span><span>{row.completionPercent}%</span></div><div className="flex justify-between"><span>آخر مزامنة</span><span>{fmtDate(row.lastSyncAt)}</span></div>{row.lastError ? <div className="mt-1 rounded-md bg-rose-50 px-2 py-1 text-rose-700">تعذر آخر تشغيل. راجع السجلات الآمنة.</div> : null}</div></div>)}</div></Card>
    <section id="manage" className="overflow-hidden rounded-2xl border"><ConnectionsPageClient /></section>
    <section id="sync" className="overflow-hidden rounded-2xl border"><MarketingDataSyncPage /></section>
    <p className="rounded-lg border bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-500">لا تُعرض مفاتيح أوTokens هنا. تشغيل المزامنة يتم فقط بعد ضغط المستخدم على زر السحب.</p>
  </main>;
}
