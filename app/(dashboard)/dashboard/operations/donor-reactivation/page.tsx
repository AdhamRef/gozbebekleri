import Link from "next/link";
import { ArrowLeft, Bell, CheckCircle2, Mail, MessageCircle, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDonorReactivationOverview } from "@/lib/operations/donor-reactivation/donor-reactivation-service";
import type { DonorReactivationCandidate } from "@/lib/operations/donor-reactivation/donor-reactivation-types";
import { DonorReactivationActions } from "./_components/DonorReactivationActions";
import { DonorReactivationCampaignDraft } from "./_components/DonorReactivationCampaignDraft";

export const dynamic = "force-dynamic";

const channelLabel = {
  WHATSAPP_OR_SMS: "WhatsApp / SMS",
  EMAIL: "Email",
  NO_CHANNEL: "No channel",
};

const channelClass = {
  WHATSAPP_OR_SMS: "border-emerald-200 bg-emerald-50 text-emerald-700",
  EMAIL: "border-blue-200 bg-blue-50 text-blue-700",
  NO_CHANNEL: "border-slate-200 bg-slate-50 text-slate-600",
};

function money(candidate: DonorReactivationCandidate) {
  return `${candidate.lastDonationAmount.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${candidate.lastDonationCurrency}`;
}

function maskEmail(value: string | null) {
  if (!value) return "لا يوجد بريد";
  const [local, domain] = value.split("@");
  if (!domain) return "••••";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

function maskPhone(value: string | null) {
  if (!value) return "لا يوجد هاتف";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `${"•".repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
}

export default async function DonorReactivationPage() {
  const overview = await getDonorReactivationOverview();
  const canMutate = overview.persistence.mode === "prisma" && !overview.persistence.readOnly;

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-l from-slate-950 to-brand p-5 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-white/70">العمليات / تنشيط المتبرعين</p>
          <h1 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight">تنشيط المتبرعين</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
            ترشيح المتبرعين الذين لم يتبرعوا منذ 30 يومًا أو أكثر، مع إجراءات يدوية فقط: تسجيل تواصل، تخطي، استبعاد، أو إنشاء مهمة متابعة.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">بدون إرسال تلقائي</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">بيانات الاتصال مخفية افتراضيًا</span>
          </div>
        </div>
        <Link href="/dashboard/operations/tasks" className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-brand shadow-sm hover:bg-white/90">
          فتح مهام الفريق
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Card><CardHeader><CardDescription>مرشحون للتنشيط</CardDescription><CardTitle className="text-3xl">{overview.summary.candidates}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>واتساب / رسائل</CardDescription><CardTitle className="text-3xl">{overview.summary.whatsappOrSms}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>الإيميل</CardDescription><CardTitle className="text-3xl">{overview.summary.email}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>بدون قناة مناسبة</CardDescription><CardTitle className="text-3xl">{overview.summary.noChannel}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>تم التعامل آخر 30 يوم</CardDescription><CardTitle className="text-3xl">{overview.summary.recentlyHandled}</CardTitle></CardHeader></Card>
      </div>

      <DonorReactivationCampaignDraft />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-950"><ShieldCheck className="h-5 w-5" /> Manual-first</CardTitle>
            <CardDescription className="leading-6 text-emerald-800">هذه الصفحة لا ترسل WhatsApp أو Email أو SMS. كل شيء تسجيل يدوي أو مهمة متابعة.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-brand" /> قاعدة الترشيح</CardTitle>
            <CardDescription className="leading-6">آخر تبرع ناجح منذ 30 يومًا أو أكثر، ولا يوجد تواصل مسجّل خلال آخر 30 يومًا.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-brand" /> الحدود</CardTitle>
            <CardDescription className="leading-6">لا AI generation، لا external platform calls، لا auto-publish، ولا تعديل payment/tracking.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-brand" /> قائمة التنشيط</CardTitle>
          <CardDescription className="leading-6">ابدأ بالمتبرعين الأقدم في آخر تبرع. استخدم مهمة متابعة عندما تحتاج مراجعة بشرية قبل أي تواصل.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {overview.candidates.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-slate-50 p-8 text-center lg:col-span-2">
              <UserRoundCheck className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 font-black text-slate-900">لا توجد ترشيحات جاهزة الآن</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">إما لا توجد قاعدة بيانات متاحة، أو لا يوجد متبرعون ينطبق عليهم الشرط، أو تم التعامل معهم مؤخرًا.</p>
            </div>
          ) : null}

          {overview.candidates.map((candidate) => (
            <div key={candidate.donorId} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-900">{candidate.donorName}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">آخر تبرع: {money(candidate)} · منذ {candidate.daysSinceLastDonation} يوم</p>
                </div>
                <Badge variant="outline" className={channelClass[candidate.channel]}>{channelLabel[candidate.channel]}</Badge>
              </div>

              <div className="mt-4 grid gap-2 text-sm leading-6 text-slate-600 md:grid-cols-2">
                <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand" /> {maskEmail(candidate.donorEmail)}</span>
                <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-brand" /> {maskPhone(candidate.donorPhone)}</span>
                <span>اللغة: <b>{candidate.locale}</b></span>
                <span>الدولة: <b>{candidate.country ?? "غير محدد"}</b></span>
              </div>

              <p className="mt-3 rounded-xl border bg-white p-3 text-sm leading-6 text-slate-600">{candidate.suggestedMessage}</p>
              <DonorReactivationActions donorId={candidate.donorId} canMutate={canMutate} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-brand/20 bg-blue-50/60">
        <CardHeader>
          <CardTitle>ماذا أفعل الآن؟</CardTitle>
          <CardDescription className="leading-6">
            راجع القناة واللغة، اختر Assign follow-up task لو يحتاج صياغة أو مراجعة، وبعد التواصل اليدوي سجّل Mark manually sent حتى لا يظهر نفس المتبرع خلال نفس الشهر.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
