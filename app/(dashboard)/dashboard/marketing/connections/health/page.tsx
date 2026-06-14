import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, AlertTriangle, CheckCircle2, ClipboardCheck, Layers3, PlugZap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProviderHealthOverview } from "@/lib/marketing/integrations/provider-health";
import type { ProviderCategory } from "@/lib/marketing/integrations/provider-types";

export const metadata = {
  title: "صحة تكاملات المنصات | لوحة التحكم",
};

const categoryLabel: Record<ProviderCategory, string> = {
  PIXELS_AND_APIS: "Pixels & APIs",
  AD_ACCOUNT: "حسابات إعلانية",
  ANALYTICS_ACCOUNT: "تحليلات",
  MESSAGING_PROVIDER: "رسائل",
  EMAIL_PROVIDER: "بريد إلكتروني",
  AI_PROVIDER: "ذكاء اصطناعي",
  INTERNAL_API: "واجهات داخلية",
};

const statusLabel = {
  READY: "جاهز",
  PARTIAL: "جزئي",
  MISSING: "ناقص",
  PLANNED: "مخطط",
};

const statusClass = {
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PARTIAL: "border-amber-200 bg-amber-50 text-amber-700",
  MISSING: "border-rose-200 bg-rose-50 text-rose-700",
  PLANNED: "border-slate-200 bg-slate-50 text-slate-700",
};

export default function ProviderHealthPage() {
  const overview = getProviderHealthOverview();

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs text-white/70">Shared Connections / Health Layer</p>
            <h1 className="mt-1.5 text-2xl font-black">صحة تكاملات المنصات</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
              تقييم أولي مبني على Provider Catalog يوضح جاهزية كل مزود قبل أي OAuth أو مزامنة فعلية أو كشف أسرار.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/marketing/connections/catalog"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#025EB8] shadow-sm hover:bg-white/90"
            >
              دليل التكاملات
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/marketing/connections"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/25 hover:bg-white/15"
            >
              إدارة الاتصالات
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard title="كل المزودين" value={overview.summary.total} icon={<PlugZap className="h-5 w-5" />} />
        <SummaryCard title="متوسط الجاهزية" value={`${overview.summary.averageScore}%`} icon={<Activity className="h-5 w-5" />} />
        <SummaryCard title="جاهز" value={overview.summary.ready} icon={<CheckCircle2 className="h-5 w-5" />} />
        <SummaryCard title="جزئي" value={overview.summary.partial} icon={<Layers3 className="h-5 w-5" />} />
        <SummaryCard title="ناقص" value={overview.summary.missing} icon={<AlertTriangle className="h-5 w-5" />} />
        <SummaryCard title="مخطط" value={overview.summary.planned} icon={<ClipboardCheck className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {overview.items.map((item) => (
          <Card key={item.providerKey} className="overflow-hidden">
            <CardHeader className="border-b bg-slate-50/80">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">{item.displayName}</CardTitle>
                    <Badge variant="outline" className={statusClass[item.status]}>
                      {statusLabel[item.status]}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">
                    {categoryLabel[item.category]} · {item.providerKey}
                  </CardDescription>
                </div>
                <div className="rounded-2xl border bg-white px-4 py-2 text-center shadow-sm">
                  <p className="text-xs text-slate-500">Health Score</p>
                  <p className="text-2xl font-black text-slate-900">{item.score}%</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Metric label="Capabilities" value={item.capabilityCount} />
                <Metric label="Required" value={item.requiredFields} />
                <Metric label="Secrets" value={item.secretFields} />
                <Metric label="Public" value={item.publicFields} />
              </div>

              <div>
                <p className="text-sm font-black text-slate-900">طبقات الجاهزية</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.readinessLayers.map((layer) => (
                    <Badge key={layer} variant="secondary" className="rounded-full">
                      {layer}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-3">
                <p className="text-sm font-black text-slate-900">الخطوة التالية</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.nextStep}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: number | string; icon: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{title}</CardDescription>
        <span className="text-[#025EB8]">{icon}</span>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-slate-50/70 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
