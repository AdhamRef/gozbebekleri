import Link from "next/link";
import { ArrowLeft, Ban, Mail, MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactPreferenceActions } from "@/components/communication/ContactPreferenceActions";
import { ContactPreferenceCreate } from "@/components/communication/ContactPreferenceCreate";
import { contactChannelEligibility } from "@/lib/communication/consent-eligibility";
import { getContactPreferencesOverview } from "@/lib/communication/contact-preferences-repository";

function yesNo(value: boolean) {
  return value ? "موافق" : "غير موافق";
}

function badgeClass(value: boolean) {
  return value ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600";
}

export default async function ContactPreferencesPage() {
  const overview = await getContactPreferencesOverview();

  return <main className="space-y-5 p-4 sm:p-6" dir="rtl">
    <section className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-white/70">Communication Center</p>
          <h1 className="mt-1.5 text-2xl font-black">الموافقات وتفضيلات التواصل</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">تسجيل موافقات الإيميل، SMS، واتساب، وحالات عدم التواصل قبل أي بناء لإرسال حقيقي.</p>
        </div>
        <Button asChild variant="secondary" className="gap-2 font-bold"><Link href="/dashboard/operations/communication">العودة لمركز التواصل <ArrowLeft className="h-4 w-4" /></Link></Button>
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
  </main>;
}

function Metric({ title, value }: { title: string; value: number }) {
  return <Card><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader></Card>;
}

function Channel({ icon, title, value, ok, reason }: { icon: React.ReactNode; title: string; value: string; ok: boolean; reason: string }) {
  return <div className="rounded-xl border bg-white p-3">
    <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-black text-slate-800">{icon}{title}</span><Badge variant="outline" className={badgeClass(ok)}>{value}</Badge></div>
    <p className="mt-2 text-xs leading-5 text-slate-500">{reason}</p>
  </div>;
}
