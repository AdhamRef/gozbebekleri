import Link from "next/link";
import { ArrowLeft, Braces, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCommunicationCenterOverview } from "@/lib/communication/communication-service";
import { renderTemplatePreview } from "@/lib/communication/template-renderer";
import { communicationTemplateVariables } from "@/lib/communication/template-variables";

function statusLabel(status: string) {
  const labels: Record<string, string> = { DRAFT: "مسودة", NEEDS_REVIEW: "تحتاج مراجعة", APPROVED: "معتمد", ARCHIVED: "مؤرشف" };
  return labels[status] ?? status;
}

function purposeLabel(purpose: string) {
  return purpose === "TRANSACTIONAL" ? "تشغيلي" : "تسويقي";
}

export default async function CommunicationTemplatesPage() {
  const overview = await getCommunicationCenterOverview();
  return <main className="space-y-5 p-4 sm:p-6" dir="rtl">
    <section className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-white/70">Communication Center</p>
          <h1 className="mt-1.5 text-2xl font-black">القوالب والمتغيرات</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">قوالب موحدة لكل القنوات مع متغيرات ومعاينة آمنة قبل أي إرسال أو ربط مزود.</p>
        </div>
        <Button asChild variant="secondary" className="gap-2 font-bold"><Link href="/dashboard/operations/communication">العودة لمركز التواصل <ArrowLeft className="h-4 w-4" /></Link></Button>
      </div>
    </section>

    <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm font-semibold leading-6 text-amber-800">المعاينة هنا داخلية فقط. لا يوجد إرسال ولا اتصال بـ Meta أو Brevo.</CardContent></Card>

    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {communicationTemplateVariables.map((variable) => <Card key={variable.key}><CardHeader><CardDescription>{variable.category}</CardDescription><CardTitle className="flex items-center gap-2 text-base"><Braces className="h-4 w-4 text-[#025EB8]" /> {variable.label}</CardTitle></CardHeader><CardContent><code className="rounded-lg bg-slate-100 px-2 py-1 text-xs">{`{{${variable.key}}}`}</code><p className="mt-2 text-xs text-slate-500">مثال: {variable.sample}</p></CardContent></Card>)}
    </section>

    <section className="grid gap-4 xl:grid-cols-2">
      {overview.templates.map((template) => {
        const preview = renderTemplatePreview(template.body);
        return <Card key={template.id}>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><CardDescription>{template.channel} · {purposeLabel(template.purpose)} · {template.providerKey}</CardDescription><CardTitle className="mt-1 text-lg">{template.title}</CardTitle></div>
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">{statusLabel(template.reviewStatus)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border bg-slate-50 p-3"><p className="mb-2 flex items-center gap-2 text-xs font-black text-slate-500"><Eye className="h-3.5 w-3.5" /> المعاينة</p><p className="text-sm leading-7 text-slate-700">{preview.rendered}</p></div>
            <div className="flex flex-wrap gap-2">{preview.variables.length ? preview.variables.map((item) => <Badge key={item} variant="outline">{`{{${item}}}`}</Badge>) : <Badge variant="outline">لا توجد متغيرات</Badge>}</div>
            {preview.unknownVariables.length ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">متغيرات غير معرفة: {preview.unknownVariables.join(", ")}</p> : null}
          </CardContent>
        </Card>;
      })}
    </section>
  </main>;
}
