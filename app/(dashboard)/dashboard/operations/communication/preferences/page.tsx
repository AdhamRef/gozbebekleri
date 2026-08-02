import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Ban, Mail, MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactPreferenceActions } from "@/components/communication/ContactPreferenceActions";
import { ContactPreferenceCreate } from "@/components/communication/ContactPreferenceCreate";
import { contactChannelEligibility } from "@/lib/communication/consent-eligibility";
import { getContactPreferencesOverview } from "@/lib/communication/contact-preferences-repository";
import { listProfiles } from "@/lib/communication/donor-communication-profile-service";

export const dynamic = "force-dynamic";

function optBadge(value: boolean) {
  return value ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500";
}

function yesNo(value: boolean) {
  return value ? "موافق" : "غير موافق";
}

function badgeClass(value: boolean) {
  return value ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600";
}

export default async function ContactPreferencesPage() {
  const [overview, profiles] = await Promise.all([getContactPreferencesOverview(), listProfiles({ take: 50 })]);

  return <main className="space-y-5 p-4 sm:p-6" dir="rtl">
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold text-brand">مركز التواصل</p>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">الموافقات وتفضيلات التواصل</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">تسجيل موافقات الإيميل، SMS، واتساب، وحالات عدم التواصل قبل أي بناء لإرسال حقيقي.</p>
        </div>
        <Button asChild variant="outline" className="gap-2 font-bold"><Link href="/dashboard/operations/communication">العودة لمركز التواصل <ArrowLeft className="h-4 w-4" /></Link></Button>
      </div>
    </section>

    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <Metric title="جهات الاتصال" value={overview.summary.contacts} />
      <Metric title="إيميل" value={overview.summary.emailOptIn} />
      <Metric title="SMS" value={overview.summary.smsOptIn} />
      <Metric title="واتساب" value={overview.summary.whatsappOptIn} />
      <Metric title="عدم التواصل" value={overview.summary.doNotContact} />
    </section>

    <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm font-semibold leading-6 text-amber-800">{overview.safety.note}</CardContent></Card>

    <ContactPreferenceCreate />

    <section className="grid gap-4 xl:grid-cols-2">
      {overview.preferences.map((preference) => {
        const emailMarketing = contactChannelEligibility(preference, "EMAIL", "MARKETING");
        const smsMarketing = contactChannelEligibility(preference, "SMS", "MARKETING");
        const whatsappMarketing = contactChannelEligibility(preference, "WHATSAPP", "MARKETING");
        return <Card key={preference.contactId} className={preference.doNotContact ? "border-red-200" : undefined}>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><CardDescription>{preference.countryCode || "غير محدد"} · {preference.preferredLanguage || "بدون لغة"}</CardDescription><CardTitle className="text-lg">{preference.contactId}</CardTitle></div>
              {preference.doNotContact ? <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700"><Ban className="ml-1 h-3.5 w-3.5" /> عدم التواصل</Badge> : <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">نشط</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <Channel icon={<Mail className="h-4 w-4" />} title="Email" value={yesNo(preference.emailOptIn)} ok={emailMarketing.eligible} reason={emailMarketing.reason} />
              <Channel icon={<Phone className="h-4 w-4" />} title="SMS" value={yesNo(preference.smsOptIn)} ok={smsMarketing.eligible} reason={smsMarketing.reason} />
              <Channel icon={<MessageCircle className="h-4 w-4" />} title="WhatsApp" value={yesNo(preference.whatsappOptIn)} ok={whatsappMarketing.eligible} reason={whatsappMarketing.reason} />
            </div>
            <div className="rounded-xl border bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              <p>مصدر الموافقة: <b>{preference.consentSource || "غير محدد"}</b></p>
              <p>آخر تحديث موافقة: <b>{preference.lastConsentAt || "غير محدد"}</b></p>
            </div>
            <ContactPreferenceActions preference={preference} />
          </CardContent>
        </Card>;
      })}
    </section>

    <Card>
      <CardHeader>
        <CardTitle className="text-base">ملفات تواصل المتبرعين</CardTitle>
        <CardDescription>تُنشأ وتُحدَّث تلقائيًا بعد كل تبرع ناجح: اللغة المفضّلة، القنوات المتاحة، وحالة الموافقة. واتساب لا يُعدّ مؤهّلًا إلا بموافقة صريحة.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {profiles.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">لا توجد ملفات بعد. ستظهر تلقائيًا بعد أول تبرع ناجح.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="border-b bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-3 text-right font-semibold">المتبرع</th>
                  <th className="p-3 text-right font-semibold">اللغة</th>
                  <th className="p-3 text-center font-semibold">إيميل</th>
                  <th className="p-3 text-center font-semibold">SMS</th>
                  <th className="p-3 text-center font-semibold">واتساب</th>
                  <th className="p-3 text-center font-semibold">تبرعات</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{p.email || p.phone || "متبرع"}</div>
                      <div className="text-xs text-slate-400">{p.countryCode || "بلد غير محدد"}</div>
                    </td>
                    <td className="p-3">{p.preferredLocale || "—"}</td>
                    <td className="p-3 text-center"><Badge variant="outline" className={optBadge(p.emailOptIn)}>{p.emailOptIn ? "موافق" : "لا"}</Badge></td>
                    <td className="p-3 text-center"><Badge variant="outline" className={optBadge(p.smsOptIn)}>{p.smsOptIn ? "موافق" : "لا"}</Badge></td>
                    <td className="p-3 text-center"><Badge variant="outline" className={p.whatsappOptIn ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{p.whatsappOptIn ? "موافق" : "يحتاج مراجعة"}</Badge></td>
                    <td className="p-3 text-center font-bold">{p.totalDonations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  </main>;
}

function Metric({ title, value }: { title: string; value: number }) {
  return <Card><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader></Card>;
}

function Channel({ icon, title, value, ok, reason }: { icon: ReactNode; title: string; value: string; ok: boolean; reason: string }) {
  return <div className="rounded-xl border bg-white p-3">
    <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-black text-slate-800">{icon}{title}</span><Badge variant="outline" className={badgeClass(ok)}>{value}</Badge></div>
    <p className="mt-2 text-xs leading-5 text-slate-500">{reason}</p>
  </div>;
}
