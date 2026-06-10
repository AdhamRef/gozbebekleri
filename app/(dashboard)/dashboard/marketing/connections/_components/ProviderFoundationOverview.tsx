import { ExternalLink, Layers3 } from "lucide-react";
import { integrationProviderCatalog } from "@/lib/marketing/integrations/provider-catalog";
import type { IntegrationProviderDefinition } from "@/lib/marketing/integrations/provider-types";

const CATEGORY_LABELS: Record<IntegrationProviderDefinition["category"], string> = {
  PIXELS_AND_APIS: "Pixels & APIs",
  AD_ACCOUNTS: "Ad Accounts",
  ANALYTICS: "Analytics",
  MESSAGING: "Messaging",
  AI: "AI",
  INTERNAL: "Internal",
};

const STATUS_LABELS: Record<IntegrationProviderDefinition["implementationStatus"], string> = {
  READY: "Ready",
  PARTIAL: "Partial",
  PLANNED: "Planned",
};

const STATUS_STYLES: Record<IntegrationProviderDefinition["implementationStatus"], string> = {
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PARTIAL: "border-amber-200 bg-amber-50 text-amber-700",
  PLANNED: "border-slate-200 bg-slate-50 text-slate-600",
};

const ORDERED_CATEGORIES: IntegrationProviderDefinition["category"][] = [
  "PIXELS_AND_APIS",
  "AD_ACCOUNTS",
  "ANALYTICS",
  "MESSAGING",
  "AI",
  "INTERNAL",
];

export function ProviderFoundationOverview() {
  const providersByCategory = ORDERED_CATEGORIES.map((category) => ({
    category,
    providers: integrationProviderCatalog.filter((provider) => provider.category === category),
  })).filter((group) => group.providers.length > 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 flex items-start gap-3">
        <span className="rounded-xl bg-[#025EB8]/10 text-[#025EB8] p-2">
          <Layers3 className="w-4 h-4" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-slate-900">خريطة مزودي الربط الرسمية</h2>
          <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed max-w-3xl">
            هذه الطبقة تقرأ من Provider Catalog المركزي. الهدف منها تنظيم الصفحة الحالية فقط،
            وليس تنفيذ OAuth أو مزامنة فعلية. أي تكامل حقيقي يجب أن يبدأ من التوثيق الرسمي
            ثم readiness checks ثم التنفيذ الآمن.
          </p>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
        {providersByCategory.map((group) => (
          <div key={group.category} className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xs font-bold text-slate-800">{CATEGORY_LABELS[group.category]}</h3>
              <span className="text-[10px] rounded-full bg-white border border-slate-200 px-2 py-0.5 text-slate-500">
                {group.providers.length} providers
              </span>
            </div>

            <div className="space-y-2">
              {group.providers.map((provider) => (
                <article key={provider.key} className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">{provider.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                        {provider.notes}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${STATUS_STYLES[provider.implementationStatus]}`}>
                      {STATUS_LABELS[provider.implementationStatus]}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {provider.readinessLayers.map((layer) => (
                      <span key={layer} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">
                        {layer}
                      </span>
                    ))}
                  </div>

                  {provider.officialDocs.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {provider.officialDocs.slice(0, 2).map((doc) => (
                        <a
                          key={doc.url}
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-[#025EB8] hover:bg-sky-50"
                        >
                          {doc.label}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[10px] text-amber-700">
                      يحتاج تحديد المزود النهائي ثم إضافة روابط التوثيق الرسمي قبل التنفيذ.
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
