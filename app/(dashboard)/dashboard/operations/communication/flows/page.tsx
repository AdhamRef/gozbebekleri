import Link from "next/link";
import { ArrowLeft, GitBranch, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTransactionalFlowsOverview } from "@/lib/communication/transactional-flows-repository";

function statusLabel(status: string) {
  const labels: Record<string, string> = { DRAFT: "مسودة", ACTIVE: "جاهز داخلي", PAUSED: "متوقف" };
  return labels[status] ?? status;
}

function statusClass(status: string) {
  if (status === "ACTIVE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PAUSED") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default async function TransactionalFlowsPage() {
  const overview = await getTransactionalFlowsOverview();

  return <main className="space-y-5 p-4 sm:p-6" dir="rtl">
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold text-[#025EB8]">مركز التواصل</p>
          <h1 className="mt-1 text-xl font-black text-slate-900">التدفقات التشغيلية</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">محاكاة داخلية لتسلسل رسائل التبرع الناجح، فشل الدفع، الإيصال، والتبرعات الكبيرة.</p>
        </div>
        <Button asChild variant="outline" className="gap-2 font-bold"><Link href="/dashboard/operations/communication">العودة لمركز التواصل <ArrowLeft className="h-4 w-4" /></Link></Button>
      </div>
    </section>

    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <Metric title="التدفقات" value={overview.summary.flows} />
      <Metric title="جاهز داخلي" value={overview.summary.active} />
      <Metric title="مسودة" value={overview.summary.draft} />
      <Metric title="متوقف" value={overview.summary.paused} />
      <Metric title="الخطوات" value={overview.summary.steps} />
    </section>

    <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm font-semibold leading-6 text-amber-800">{overview.safety.note}</CardContent></Card>

    <section className="grid gap-4 xl:grid-cols-2">
      {overview.flows.map((flow) => <Card key={flow.id}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><CardDescription>{flow.eventKey}</CardDescription><CardTitle className="mt-1 flex items-center gap-2 text-lg"><GitBranch className="h-5 w-5 text-[#025EB8]" /> {flow.title}</CardTitle></div>
            <Badge variant="outline" className={statusClass(flow.status)}>{statusLabel(flow.status)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {flow.steps.map((step, index) => <div key={step.id} className="rounded-xl border bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-800">{index + 1}. {step.channel} · {step.providerKey}</p>
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-600"><TimerReset className="ml-1 h-3.5 w-3.5" /> بعد {step.delayMinutes} دقيقة</Badge>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">القالب: {step.templateId}</p>
            <p className="text-xs leading-5 text-slate-500">يتطلب موافقة: {step.requiresConsent ? "نعم" : "لا"}</p>
            {step.fallbackProviderKey ? <p className="text-xs leading-5 text-slate-500">مزود احتياطي: {step.fallbackProviderKey}</p> : null}
          </div>)}
        </CardContent>
      </Card>)}
    </section>
  </main>;
}

function Metric({ title, value }: { title: string; value: number }) {
  return <Card><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader></Card>;
}
