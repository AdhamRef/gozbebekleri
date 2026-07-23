import Link from "next/link";
import { ArrowLeft, Database, Layers3, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getDashboardDbContractsSnapshot,
  type DashboardDbContractContext,
  type DashboardDbContractStatus,
} from "@/lib/dashboard/db-contracts";

const contextLabels: Record<DashboardDbContractContext, string> = {
  operations: "Operations",
  archive: "Smart Archive",
  brand: "Backend-only legacy data",
  ai: "Shared AI Core",
};

const statusLabels: Record<DashboardDbContractStatus, string> = {
  FOUNDATION: "Foundation",
  PRISMA_READY: "Prisma ready",
  DB_BACKED: "DB backed",
};

function statusClass(status: DashboardDbContractStatus) {
  if (status === "DB_BACKED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PRISMA_READY") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function DashboardDbContractsPage() {
  const snapshot = getDashboardDbContractsSnapshot();
  const visibleContexts = snapshot.byContext.filter((group) => group.context !== "brand");

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-2xl border bg-slate-950 p-5 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-white/65">Operations / System / DB Contracts</p>
          <h1 className="mt-1.5 text-2xl font-black">عقود قاعدة بيانات الداشبورد</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/80">
            هذه الصفحة تثبت الموديلات التي يمكن تحويلها إلى Prisma بدون تغيير الدفع أوالتتبع أوإرسال أي بيانات لمنصات خارجية.
          </p>
        </div>
        <Button asChild variant="secondary" className="gap-2 font-bold">
          <Link href="/dashboard/operations/system">
            العودة لحالة النظام <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader><CardDescription>إجمالي الموديلات</CardDescription><CardTitle className="text-3xl">{snapshot.summary.totalModels}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>جاهز لـ Prisma</CardDescription><CardTitle className="text-3xl">{snapshot.summary.prismaReadyModels}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>DB backed الآن</CardDescription><CardTitle className="text-3xl">{snapshot.summary.dbBackedModels}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Foundation فقط</CardDescription><CardTitle className="text-3xl">{snapshot.summary.foundationModels}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Low risk</CardDescription><CardTitle className="text-3xl">{snapshot.summary.lowRiskModels}</CardTitle></CardHeader></Card>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/60">
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-950">
              <ShieldCheck className="h-5 w-5 text-emerald-700" /> قواعد الأمان
            </CardTitle>
            <CardDescription className="mt-2 leading-6 text-slate-700">
              العقود هنا تعريفية وتجهيزية فقط. لا توجد migration كبيرة، ولا إرسال تلقائي، ولا أسرار أمامية، ولا تغيير في runtime المالي أوالتتبعي.
            </CardDescription>
          </div>
          <Badge className="w-fit bg-emerald-700">Read-only foundation</Badge>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.safetyRules.map((rule) => (
            <div key={rule} className="rounded-xl border border-emerald-100 bg-white p-3 text-sm font-semibold text-slate-700">{rule}</div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {visibleContexts.map((group) => (
          <Card key={group.context}>
            <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers3 className="h-5 w-5 text-[#025EB8]" /> {contextLabels[group.context]}
                </CardTitle>
                <CardDescription className="mt-2">{group.total} models, {group.prismaReady} ready for Prisma, {group.dbBacked} DB-backed.</CardDescription>
              </div>
              <Badge variant="outline">{group.prismaReady}/{group.total} ready</Badge>
            </CardHeader>
            <CardContent className="grid gap-3 xl:grid-cols-2">
              {group.contracts.map((contract) => (
                <div key={contract.name} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-black text-slate-950">{contract.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{contract.purpose}</p>
                    </div>
                    <Badge variant="outline" className={statusClass(contract.status)}>{statusLabels[contract.status]}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-xs font-bold text-slate-500">Current persistence</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{contract.currentPersistence}</p>
                    </div>
                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-xs font-bold text-slate-500">Next model</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{contract.nextModel}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div><p className="text-xs font-bold text-slate-500">Key fields</p><p className="mt-1 text-xs leading-5 text-slate-600">{contract.fields.slice(0, 10).join(", ")}</p></div>
                    <div><p className="text-xs font-bold text-slate-500">Indexes</p><p className="mt-1 text-xs leading-5 text-slate-600">{contract.indexes.join(", ")}</p></div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline">Owner: {contract.repositoryOwner}</Badge>
                    <Badge variant="outline">Risk: {contract.migrationRisk}</Badge>
                    <Badge variant="outline">{contract.readyForPrisma ? "Ready" : "Needs review"}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-[#025EB8]" /> الحزمة التالية المقترحة</CardTitle>
          <CardDescription>{snapshot.nextRecommendedPackage.scope}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <h3 className="font-black text-slate-950">{snapshot.nextRecommendedPackage.title}</h3>
          <div className="flex flex-wrap gap-2">
            {snapshot.nextRecommendedPackage.firstSlice.map((model) => <Badge key={model} variant="outline" className="bg-slate-50">{model}</Badge>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
