"use client";

import { CheckCircle2, CircleAlert, Clock3, Mail, MessageCircle, MessageSquare, Settings2 } from "lucide-react";
import type { IntegrationProvider } from "@/lib/integration-settings/catalog";
import { INTEGRATION_UI_STATUS_LABEL, PROVIDER_UI_LABEL, PROVIDER_USAGE, uiStatus } from "@/lib/integration-settings/ui";
import type { IntegrationUiSnapshot } from "./model";

const icons = {
  META_WHATSAPP: MessageCircle,
  BREVO: Mail,
  NETGSM: MessageSquare,
  SYSTEM: Clock3,
} satisfies Record<IntegrationProvider, typeof MessageCircle>;

export function IntegrationProviderCards({ providers, active, onOpen }: {
  providers: IntegrationUiSnapshot[];
  active: IntegrationProvider;
  onOpen: (provider: IntegrationProvider) => void;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="حالة مزودي التواصل">
      {providers.map((snapshot) => {
        const provider = snapshot.provider;
        const Icon = icons[provider];
        const status = uiStatus(snapshot);
        const infrastructureOnly = provider === "SYSTEM";
        const completed = infrastructureOnly ? (snapshot.activeTest.lastTestResult === "SUCCESS" ? 1 : 0) : snapshot.fields.filter((field) => field.configured).length;
        const total = infrastructureOnly ? 1 : snapshot.fields.length;
        const missing = infrastructureOnly ? (completed ? 0 : 1) : snapshot.missingRequiredFields.length;
        const isActive = active === provider;
        return (
          <article key={provider} className={`flex min-h-[230px] flex-col rounded-xl border bg-white p-4 shadow-sm transition ${isActive ? "border-[#025EB8] ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"}`}>
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#025EB8]"><Icon className="h-5 w-5" /></span>
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700">
                {status === "READY" || status === "PENDING_ACTIVATION" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <CircleAlert className="h-3.5 w-3.5 text-amber-600" />}
                {INTEGRATION_UI_STATUS_LABEL[status]}
              </span>
            </div>
            <h2 className="mt-3 text-base font-black text-slate-900">{PROVIDER_UI_LABEL[provider]}</h2>
            <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{PROVIDER_USAGE[provider]}</p>
            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <p>الإعدادات المكتملة: <b className="text-slate-900">{completed}/{total}</b></p>
              <p>الإعدادات الناقصة: <b className={missing ? "text-amber-700" : "text-emerald-700"}>{missing}</b></p>
              <p>آخر فحص للتكوين العامل: <b className="text-slate-900">{snapshot.activeTest.lastTestAt ? new Date(snapshot.activeTest.lastTestAt).toLocaleString("ar") : "لم يتم"}</b></p>
              {snapshot.candidate.hasChanges ? <p className="font-bold text-amber-700">توجد تغييرات بانتظار الاختبار أو الاعتماد.</p> : null}
            </div>
            <button type="button" onClick={() => onOpen(provider)} className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#025EB8] px-3 text-xs font-bold text-white transition hover:bg-[#024a92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <Settings2 className="h-4 w-4" /> فتح الإعدادات
            </button>
          </article>
        );
      })}
    </section>
  );
}
