import Link from "next/link";
import { ClipboardCheck, MessageSquareWarning, AlertOctagon, FileWarning, Megaphone, Inbox, Users, Settings2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCommunicationHome } from "@/lib/communication/home-service";

export const dynamic = "force-dynamic";

const channelLabel: Record<string, string> = { WHATSAPP: "واتساب", EMAIL: "إيميل", SMS: "رسائل" };
const statusLabel: Record<string, string> = { DRAFT: "مسودة", REVIEW: "بانتظار المراجعة", APPROVED: "معتمدة", SCHEDULED: "مجدولة", SENDING: "جارٍ الإرسال", SENT: "أُرسلت", SENT_WITH_ISSUES: "أُرسلت مع ملاحظات", BLOCKED: "محجوبة", CANCELLED: "ملغاة", FAILED: "فشلت" };

function readiness(ok: boolean, sms = false) {
  if (sms) return { text: "غير مفعّل", cls: "text-slate-400" };
  return ok ? { text: "جاهز", cls: "text-emerald-600" } : { text: "يحتاج إعداد", cls: "text-amber-600" };
}

export default async function CommunicationHomePage() {
  const home = await getCommunicationHome();

  const actions = [
    { n: home.campaignsInReview, label: "حملات بانتظار المراجعة", href: "/dashboard/operations/communication/campaigns", cta: "مراجعة", icon: ClipboardCheck, tone: "text-blue-600" },
    { n: home.repliesNeedingAction, label: "محادثات تحتاج رد", href: "/dashboard/operations/communication/inbox", cta: "فتح المحادثات", icon: MessageSquareWarning, tone: "text-amber-600" },
    { n: home.failedDeliveries, label: "رسائل فشلت وتحتاج متابعة", href: "/dashboard/operations/communication/reports", cta: "عرض التقارير", icon: AlertOctagon, tone: "text-rose-600" },
    { n: home.incompleteTemplates, label: "قوالب ناقصة أو غير جاهزة", href: "/dashboard/operations/communication/templates", cta: "إكمال القوالب", icon: FileWarning, tone: "text-violet-600" },
  ];

  const quick = [
    { label: "إنشاء حملة جديدة", href: "/dashboard/operations/communication/campaigns", icon: Megaphone },
    { label: "مراجعة المحادثات", href: "/dashboard/operations/communication/inbox", icon: Inbox },
    { label: "إدارة الجمهور", href: "/dashboard/operations/communication/audiences", icon: Users },
    { label: "فحص إعدادات الإرسال", href: "/dashboard/operations/communication/settings", icon: Settings2 },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs text-slate-400">التشغيل / التواصل</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">مركز التواصل</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">أرسل حملات واتساب وإيميل ورسائل حسب اللغة، وتابع المحادثات والنتائج من مكان واحد.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="gap-2"><Link href="/dashboard/operations/communication/campaigns"><Megaphone className="h-4 w-4" /> إنشاء حملة</Link></Button>
          <Button asChild variant="outline" className="gap-2"><Link href="/dashboard/operations/communication/inbox"><Inbox className="h-4 w-4" /> فتح المحادثات</Link></Button>
        </div>
      </div>

      {/* Four action cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Card key={a.label} className="border-slate-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className={`text-3xl font-black text-slate-900`}>{a.n}</span>
                  <Icon className={`h-5 w-5 ${a.tone}`} />
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-700">{a.label}</p>
                <Link href={a.href} className="mt-2 inline-block text-xs font-bold text-[#025EB8]">{a.cta} ←</Link>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Quick start */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-500">ابدأ بسرعة</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quick.map((q) => {
            const Icon = q.icon;
            return (
              <Link key={q.label} href={q.href} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-[#025EB8]/40 hover:shadow-sm">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#025EB8]"><Icon className="h-4 w-4" /></span>
                <span className="text-sm font-semibold text-slate-700">{q.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        {/* Recent activity */}
        <section>
          <h2 className="mb-3 text-sm font-bold text-slate-500">آخر الحملات</h2>
          <Card className="border-slate-200">
            <CardContent className="p-0">
              {home.recentCampaigns.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">لا توجد حملات بعد. ابدأ بإنشاء حملة واتساب أو إيميل حسب لغة المتبرعين.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {home.recentCampaigns.map((c) => (
                    <li key={c.id}>
                      <Link href={`/dashboard/operations/communication/campaigns/${c.id}`} className="flex items-center justify-between gap-2 p-4 hover:bg-slate-50">
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        <span className="flex items-center gap-2 text-xs text-slate-400">{channelLabel[c.channel] ?? c.channel}<Badge variant="outline" className="text-xs">{statusLabel[c.status] ?? c.status}</Badge></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Sending status (compact) */}
        <section>
          <h2 className="mb-3 text-sm font-bold text-slate-500">حالة الإرسال</h2>
          <Card className="border-slate-200">
            <CardContent className="space-y-2 p-4 text-sm">
              {([["واتساب", readiness(home.providers.whatsapp)], ["الإيميل", readiness(home.providers.email)], ["الرسائل القصيرة", readiness(false, true)]] as const).map(([label, r]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-slate-600">{label}</span>
                  <span className={`font-bold ${r.cls}`}>{r.text}</span>
                </div>
              ))}
              <Link href="/dashboard/operations/communication/settings" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#025EB8]">الإعدادات المتقدمة <ArrowLeft className="h-3 w-3" /></Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
