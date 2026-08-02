import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDashed, PlugZap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProviderConnectionsReadiness } from "@/lib/communication/provider-connections";

function statusLabel(status: string) {
  const labels: Record<string, string> = { CONFIGURED: "مكتمل", NEEDS_ATTENTION: "يحتاج استكمال", NOT_CONFIGURED: "غير مربوط", DISABLED: "غير مستخدم" };
  return labels[status] ?? status;
}
function statusClass(status: string) {
  if (status === "CONFIGURED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "NEEDS_ATTENTION") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default async function ProviderConnectionsPage() {
  const providers = await getProviderConnectionsReadiness();
  return (
    <main className="space-y-5" dir="rtl">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold text-brand">مركز التواصل</p>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">ربط مزودي التواصل</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">الجاهزية تعتمد على الإعدادات الفعالة المعتمدة، ثم إعدادات السيرفر كاحتياط، دون عرض أي سر.</p>
          </div>
          <Button asChild variant="outline" className="gap-2 font-bold"><Link href="/dashboard/operations/communication">العودة لمركز التواصل <ArrowLeft className="h-4 w-4" /></Link></Button>
        </div>
      </section>
      <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm font-semibold leading-6 text-amber-800">هذه الصفحة تعرض الحالة فقط ولا تنفذ إرسالًا أو اختبار اتصال خارجيًا.</CardContent></Card>
      <section className="grid gap-4 xl:grid-cols-2">
        {providers.map((provider) => (
          <Card key={provider.key} className="overflow-hidden">
            <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardDescription>{provider.channel}</CardDescription><CardTitle className="mt-1 flex items-center gap-2 text-lg"><PlugZap className="h-5 w-5 text-brand" /> {provider.name}</CardTitle></div><Badge variant="outline" className={statusClass(provider.status)}>{statusLabel(provider.status)}</Badge></div></CardHeader>
            <CardContent className="space-y-4">
              <div><div className="flex items-center justify-between text-xs font-bold text-slate-500"><span>جاهزية الربط</span><span>{provider.configuredRequiredCount}/{provider.requiredCount}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${provider.readinessPercent}%` }} /></div></div>
              <div className="space-y-2">{provider.requirements.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border bg-slate-50 px-3 py-2 text-sm"><span className="font-semibold text-slate-700">{item.label}</span><span className={`inline-flex items-center gap-1 text-xs font-bold ${item.configured ? "text-emerald-700" : "text-slate-500"}`}>{item.configured ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}{item.configured ? "جاهز" : item.required ? "مطلوب" : "اختياري"}</span></div>)}</div>
              <div className="rounded-xl border bg-white p-3 text-xs leading-5 text-slate-500"><p className="font-bold text-slate-700">الحالة التالية: {provider.actionLabel}</p><p className="mt-1">{provider.notes}</p></div>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
