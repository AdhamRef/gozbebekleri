import Link from "next/link";
import { ArrowLeft, GitBranch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOperationsHubOverview } from "@/lib/operations/hub/hub-service";

export default async function OperationsWorkflowPage() {
  const overview = await getOperationsHubOverview();

  return <main className="min-h-screen bg-[#FFFDF8] p-4 text-slate-950 sm:p-6" dir="rtl">
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black text-[#025EB8]">العمليات والمحتوى</p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-black sm:text-3xl"><GitBranch className="h-6 w-6 text-[#025EB8]" /> سير العمل</h1>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">تابع رحلة كل محتوى من الفكرة إلى النشر والنتائج والدروس المستفادة.</p>
        </div>
        <Link href="/dashboard/operations" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-white px-4 text-sm font-bold text-slate-800 hover:border-[#025EB8] hover:text-[#025EB8]"><ArrowLeft className="h-4 w-4" /> مركز العمليات</Link>
      </div>
    </section>

    <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {overview.workflow.map((stage, index) => <Card key={stage.key} className="h-full">
        <CardHeader>
          <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-[#025EB8]">{index + 1}</span>
          <CardTitle>{stage.title}</CardTitle>
          <CardDescription className="leading-6">{stage.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-black text-slate-950">{stage.count}</p>
          <p className="mt-1 text-xs text-slate-500">عنصر محتوى في هذه المرحلة</p>
        </CardContent>
      </Card>)}
    </section>
  </main>;
}
