import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, CircleAlert, FileText, Layers3, Plug, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { serializeConnection } from "@/lib/marketing/connection-serializer";
import { buildProviderHealthOverview, type ProviderHealthStatus } from "@/lib/marketing/integrations/provider-health-service";
import type { ProviderCatalogEntry, ProviderCategory } from "@/lib/marketing/integrations/provider-types";

export const metadata = {
  title: "دليل تكاملات المنصات | لوحة التحكم",
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

const implementationLabel: Record<ProviderCatalogEntry["implementationStatus"], string> = {
  READY: "جاهز",
  PARTIAL: "جزئي",
  PLANNED: "مخطط",
};

const implementationClass: Record<ProviderCatalogEntry["implementationStatus"], string> = {
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PARTIAL: "border-amber-200 bg-amber-50 text-amber-700",
  PLANNED: "border-slate-200 bg-slate-50 text-slate-700",
};

const healthLabel: Record<ProviderHealthStatus, string> = {
  READY: "متصل وجاهز",
  PARTIAL: "متصل جزئيًا",
  MISSING: "إعداد ناقص",
  NOT_CONNECTED: "غير متصل",
};

const healthClass: Record<ProviderHealthStatus, string> = {
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PARTIAL: "border-amber-200 bg-amber-50 text-amber-700",
  MISSING: "border-rose-200 bg-rose-50 text-rose-700",
  NOT_CONNECTED: "border-slate-200 bg-slate-50 text-slate-700",
};

async function getHealthOverview() {
  const rows = await prisma.marketingPlatformConnection.findMany({
    orderBy: [
      { defaultForPlatform: "desc" },
      { category: "asc" },
      { platform: "asc" },
      { name: "asc" },
    ],
  });

  return buildProviderHealthOverview(rows.map(serializeConnection));
}

export default async function ProviderCatalogPage() {
  const overview = await getHealthOverview();

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs text-white/70">Shared Connections / Provider Health</p>
            <h1 className="mt-1.5 text-2xl font-black">صحة تكاملات المنصات</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
              يربط هذا العرض بين كاتالوج المزودين والاتصالات الحالية، لتمييز المنصات الجاهزة والناقصة وغير المتصلة بدون تنفيذ أي API خارجي.
            </p>
          </div>
          <Link
            href="/dashboard/marketing/connections"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#025EB8] shadow-sm hover:bg-white/90"
          >
            إدارة الاتصالات
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="كل المزودين" value={overview.summary.totalProviders} icon={<Plug className="h-5 w-5" />} />
        <SummaryCard title="جاهز" value={overview.summary.ready} icon={<CheckCircle2 className="h-5 w-5" />} />
        <SummaryCard title="جزئي" value={overview.summary.partial} icon={<Layers3 className="h-5 w-5" />} />
        <SummaryCard title="ناقص" value={overview.summary.missing} icon={<CircleAlert className="h-5 w-5" />} />
        <SummaryCard title="غير متصل" value={overview.summary.notConnected} icon={<FileText className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>توزيع الفئات</CardTitle>
          <CardDescription>يعرض هذا القسم كيف يتم تقسيم المنصات داخل Shared Connections Layer.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(overview.summary.categories).map(([category, count]) => (
              <div key={category} className="rounded-2xl border bg-slate-50/70 p-3">
                <p className="text-xs text-slate-500">{categoryLabel[category as ProviderCategory]}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {overview.providers.map((item) => {
          const provider = item.provider;
          return (
            <Card key={provider.key} className="overflow-hidden">
              <CardHeader className="border-b bg-slate-50/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">{provider.displayName}</CardTitle>
                      <Badge variant="outline" className={healthClass[item.status]}>
                        {healthLabel[item.status]}
                      </Badge>
                      <Badge variant="outline" className={implementationClass[provider.implementationStatus]}>
                        {implementationLabel[provider.implementationStatus]}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {categoryLabel[provider.category]} · {provider.key}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {item.bestCompletionPercent}% جاهزية
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-2 sm:grid-cols-4">
                  <MiniMetric label="اتصالات" value={item.connectionCount} />
                  <MiniMetric label="جاهزة" value={item.readyConnections} />
                  <MiniMetric label="جزئية" value={item.partialConnections} />
                  <MiniMetric label="معطلة" value={item.disabledConnections} />
                </div>

                <div className="rounded-2xl border bg-white p-3">
                  <p className="text-sm font-black text-slate-900">الخطوة التالية</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.nextStep}</p>
                  {item.lastError ? <p className="mt-2 text-xs text-rose-600">آخر خطأ: {item.lastError}</p> : null}
                </div>

                {item.missingRequiredFields.length > 0 ? (
                  <div>
                    <p className="text-sm font-black text-slate-900">حقول مطلوبة ناقصة</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.missingRequiredFields.map((field) => (
                        <Badge key={field} variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className="text-sm font-black text-slate-900">القدرات</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {provider.capabilities.map((capability) => (
                      <Badge key={capability} variant="secondary" className="rounded-full">
                        {capability}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-black text-slate-900">حقول الاعتماد</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {provider.credentialFields.map((field) => (
                      <div key={field.key} className="rounded-xl border bg-white p-2 text-xs text-slate-600">
                        <span className="font-bold text-slate-900">{field.label}</span>
                        <span className="mx-1">·</span>
                        <span>{field.secret ? "سري" : "عام"}</span>
                        <span className="mx-1">·</span>
                        <span>{field.required ? "مطلوب" : "اختياري"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {provider.officialDocs.length > 0 ? (
                  <div>
                    <p className="text-sm font-black text-slate-900">الوثائق الرسمية</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {provider.officialDocs.map((doc) => (
                        <a
                          key={doc.url}
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-[#025EB8] hover:bg-slate-50"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          {doc.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
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

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-slate-50/70 p-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}
