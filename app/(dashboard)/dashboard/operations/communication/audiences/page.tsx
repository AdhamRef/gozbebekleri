import Link from "next/link";
import { ArrowLeft, Users, Mail, MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAudienceOverview, type AudienceOverview } from "@/lib/communication/audience-service";

export const dynamic = "force-dynamic";

function num(value: number) {
  return value.toLocaleString();
}

export default async function CommunicationAudiencesPage() {
  let overview: AudienceOverview | null = null;
  let failed = false;
  try {
    overview = await getAudienceOverview();
  } catch {
    failed = true;
  }

  const hasDonors = (overview?.totals.donors ?? 0) > 0;

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <section className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs text-white/70">مركز التواصل</p>
            <h1 className="mt-1.5 text-2xl font-black">جماهير المتبرعين حسب اللغة</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
              شرائح تُحسب مباشرة من قاعدة المتبرعين. اختر الشريحة ثم القناة لاحقًا عند إنشاء حملة — قائمة واحدة لكل لغة تخدم واتساب والإيميل والرسائل معًا.
            </p>
          </div>
          <Button asChild variant="secondary" className="gap-2 font-bold">
            <Link href="/dashboard/operations/communication">العودة لمركز التواصل <ArrowLeft className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {failed ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-6 text-center text-sm font-semibold text-rose-700">
            تعذّر تحميل الجماهير الآن. حدّث الصفحة، وإذا استمرت المشكلة راجع اتصال قاعدة البيانات.
          </CardContent>
        </Card>
      ) : !hasDonors ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-slate-500">
            لا يوجد متبرعون بعد لبناء شرائح لغوية. ستظهر الشرائح تلقائيًا بعد أول تبرع.
          </CardContent>
        </Card>
      ) : overview ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Stat title="إجمالي المتبرعين" value={num(overview.totals.donors)} icon={<Users className="h-4 w-4" />} />
            <Stat title="مؤهّل للإيميل" value={num(overview.totals.emailEligible)} icon={<Mail className="h-4 w-4" />} />
            <Stat title="مؤهّل للرسائل" value={num(overview.totals.smsEligible)} icon={<Phone className="h-4 w-4" />} />
            <Stat title="واتساب — يحتاج مراجعة" value={num(overview.totals.whatsappNeedsReview)} icon={<MessageCircle className="h-4 w-4" />} />
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">الشرائح حسب اللغة</CardTitle>
              <CardDescription>لكل لغة: العدد الكلي والقنوات المتاحة. اللغة تُشتق من تفضيل المتبرع.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[46rem] text-sm">
                  <thead className="border-b bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="p-3 text-right font-semibold">اللغة</th>
                      <th className="p-3 text-center font-semibold">المتبرعون</th>
                      <th className="p-3 text-center font-semibold">لديهم إيميل</th>
                      <th className="p-3 text-center font-semibold">لديهم هاتف</th>
                      <th className="p-3 text-center font-semibold">إيميل مؤهّل</th>
                      <th className="p-3 text-center font-semibold">رسائل مؤهّلة</th>
                      <th className="p-3 text-center font-semibold">واتساب مؤهّل</th>
                      <th className="p-3 text-center font-semibold">واتساب (مراجعة)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.languages.map((lang) => (
                      <tr key={lang.id} className="border-b last:border-0">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{lang.nativeLabel}</div>
                          <div className="text-xs text-slate-400">{lang.label}</div>
                        </td>
                        <td className="p-3 text-center font-black text-slate-900">{num(lang.total)}</td>
                        <td className="p-3 text-center text-slate-600">{num(lang.withEmail)}</td>
                        <td className="p-3 text-center text-slate-600">{num(lang.withPhone)}</td>
                        <td className="p-3 text-center"><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{num(lang.emailEligible)}</Badge></td>
                        <td className="p-3 text-center"><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{num(lang.smsEligible)}</Badge></td>
                        <td className="p-3 text-center"><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{num(lang.whatsappEligible)}</Badge></td>
                        <td className="p-3 text-center"><Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">{num(lang.whatsappNeedsReview)}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-sm leading-6 text-amber-900">{overview.consentNote}</CardContent>
          </Card>
        </>
      ) : null}
    </main>
  );
}

function Stat({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">{icon}{title}</div>
        <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
      </CardContent>
    </Card>
  );
}
