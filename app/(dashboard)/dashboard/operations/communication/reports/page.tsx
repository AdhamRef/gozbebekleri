import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCommunicationReport, type CommunicationReport } from "@/lib/communication/reports-service";

export const dynamic = "force-dynamic";

const channelLabel: Record<string, string> = { WHATSAPP: "واتساب", EMAIL: "إيميل", SMS: "رسائل SMS" };

function StatusRow({ label, counts }: { label: string; counts: CommunicationReport["byChannel"][number]["counts"] }) {
  return (
    <tr className="border-b last:border-0">
      <td className="p-3 font-semibold">{label}</td>
      <td className="p-3 text-center">{counts.total}</td>
      <td className="p-3 text-center text-emerald-700">{counts.delivered}</td>
      <td className="p-3 text-center text-blue-700">{counts.read}</td>
      <td className="p-3 text-center text-slate-500">{counts.sent}</td>
      <td className="p-3 text-center text-amber-700">{counts.skipped}</td>
      <td className="p-3 text-center text-rose-700">{counts.failed}</td>
    </tr>
  );
}

export default async function CommunicationReportsPage() {
  let report: CommunicationReport | null = null;
  try {
    report = await getCommunicationReport();
  } catch {
    report = null;
  }

  const empty = !report || report.totalDeliveries === 0;

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <section className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs text-white/70">مركز التواصل</p>
            <h1 className="mt-1.5 text-2xl font-black">تقارير التواصل</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">أداء الإرسال حسب القناة واللغة والمُرسِل، الإخفاقات، الموافقات الناقصة، واللغات بلا قوالب.</p>
          </div>
          <Button asChild variant="secondary" className="gap-2 font-bold"><Link href="/dashboard/operations/communication">العودة <ArrowLeft className="h-4 w-4" /></Link></Button>
        </div>
      </section>

      {/* Action signals */}
      <section className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">ردود واتساب بحاجة إجراء</div><div className="mt-1 text-2xl font-black">{report?.repliesNeedingAction ?? 0}</div><Link href="/dashboard/operations/communication/inbox" className="mt-1 inline-block text-xs text-[#025EB8] underline">فتح الصندوق</Link></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">واتساب بلا موافقة (يحتاج مراجعة)</div><div className="mt-1 text-2xl font-black">{report?.missingConsentWhatsApp ?? 0}</div><Link href="/dashboard/operations/communication/audiences" className="mt-1 inline-block text-xs text-[#025EB8] underline">فتح الجماهير</Link></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">إجمالي سجلات الإرسال</div><div className="mt-1 text-2xl font-black">{report?.totalDeliveries ?? 0}</div></CardContent></Card>
      </section>

      {report && report.missingTemplateLanguages.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm leading-6 text-amber-900">
            <b>لغات لها متبرعون بلا قالب:</b>{" "}
            {report.missingTemplateLanguages.map((m) => `${channelLabel[m.channel] ?? m.channel}: ${m.locales.join(", ")}`).join(" · ")}
          </CardContent>
        </Card>
      ) : null}

      {empty ? (
        <Card><CardContent className="p-10 text-center text-sm text-slate-500">لا توجد بيانات كافية بعد. ستظهر التقارير بعد تجهيز حملات ووصول أحداث المزودين.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">الأداء حسب القناة</CardTitle></CardHeader>
            <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[44rem] text-sm">
              <thead className="border-b bg-slate-50 text-xs text-slate-500"><tr><th className="p-3 text-right">القناة</th><th className="p-3 text-center">الكل</th><th className="p-3 text-center">وصل</th><th className="p-3 text-center">قُرئ</th><th className="p-3 text-center">أُرسل</th><th className="p-3 text-center">متخطّى</th><th className="p-3 text-center">فشل</th></tr></thead>
              <tbody>{report!.byChannel.map((c) => <StatusRow key={c.channel} label={channelLabel[c.channel] ?? c.channel} counts={c.counts} />)}</tbody>
            </table></div></CardContent>
          </Card>

          {report!.byLanguage.length > 0 ? (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">الأداء حسب اللغة</CardTitle></CardHeader>
              <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[44rem] text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500"><tr><th className="p-3 text-right">اللغة</th><th className="p-3 text-center">الكل</th><th className="p-3 text-center">وصل</th><th className="p-3 text-center">قُرئ</th><th className="p-3 text-center">أُرسل</th><th className="p-3 text-center">متخطّى</th><th className="p-3 text-center">فشل</th></tr></thead>
                <tbody>{report!.byLanguage.map((l) => <StatusRow key={l.locale} label={l.label} counts={l.counts} />)}</tbody>
              </table></div></CardContent>
            </Card>
          ) : null}

          {report!.bySender.length > 0 ? (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">أداء المُرسِلين</CardTitle></CardHeader>
              <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[44rem] text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500"><tr><th className="p-3 text-right">المُرسِل</th><th className="p-3 text-center">الكل</th><th className="p-3 text-center">وصل</th><th className="p-3 text-center">قُرئ</th><th className="p-3 text-center">أُرسل</th><th className="p-3 text-center">متخطّى</th><th className="p-3 text-center">فشل</th></tr></thead>
                <tbody>{report!.bySender.map((s) => <StatusRow key={s.senderId} label={s.name} counts={s.counts} />)}</tbody>
              </table></div></CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">إخفاقات ومتخطّى حديثة</CardTitle><CardDescription>آخر السجلات غير المُرسَلة مع السبب.</CardDescription></CardHeader>
            <CardContent className="p-0">
              {report!.failedRecent.length === 0 ? (
                <div className="p-6 text-center text-sm text-emerald-700">لا توجد إخفاقات حديثة.</div>
              ) : (
                <div className="overflow-x-auto"><table className="w-full min-w-[40rem] text-sm">
                  <thead className="border-b bg-slate-50 text-xs text-slate-500"><tr><th className="p-3 text-right">القناة</th><th className="p-3 text-right">اللغة</th><th className="p-3 text-right">السبب</th><th className="p-3 text-right">التاريخ</th></tr></thead>
                  <tbody>{report!.failedRecent.map((f) => (
                    <tr key={f.id} className="border-b last:border-0"><td className="p-3">{channelLabel[f.channel] ?? f.channel}</td><td className="p-3">{f.locale ?? "—"}</td><td className="p-3"><Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">{f.reason ?? "—"}</Badge></td><td className="p-3 text-xs text-slate-400">{new Date(f.at).toLocaleString("ar")}</td></tr>
                  ))}</tbody>
                </table></div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
