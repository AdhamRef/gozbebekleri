"use client";

import Link from "next/link";
import { CheckCircle2, Clipboard, Loader2, RotateCcw, Save, TestTube2, Trash2, XCircle } from "lucide-react";
import type { SafeProviderConnectionTestResponse, SafeIntegrationProviderSnapshot } from "@/lib/integration-settings/types";
import { FIELD_HELP, INTEGRATION_UI_STATUS_LABEL, PROVIDER_UI_LABEL, safeErrorMessage, uiStatus } from "@/lib/integration-settings/ui";
import { ADVANCED_LINKS, WEBHOOKS, sourceLabel, type IntegrationUiPermissions, type SchedulerUiStatus } from "./model";

export function ProviderFieldsPanel({
  snapshot,
  permissions,
  scheduler,
  drafts,
  dirty,
  busy,
  notice,
  lastTest,
  onDraft,
  onSave,
  onTest,
  onActivate,
  onDiscard,
  onDelete,
  onToggle,
  onNotice,
}: {
  snapshot: SafeIntegrationProviderSnapshot;
  permissions: IntegrationUiPermissions;
  scheduler: SchedulerUiStatus;
  drafts: Record<string, string>;
  dirty: Set<string>;
  busy: string | null;
  notice: { kind: "success" | "error"; text: string } | null;
  lastTest: SafeProviderConnectionTestResponse | null;
  onDraft: (key: string, value: string) => void;
  onSave: () => void;
  onTest: () => void;
  onActivate: () => void;
  onDiscard: () => void;
  onDelete: (key: string, label: string) => void;
  onToggle: () => void;
  onNotice: (value: { kind: "success" | "error"; text: string } | null) => void;
}) {
  const active = snapshot.provider;
  const completed = snapshot.fields.filter((field) => field.configured).length;
  const encryptionBlocked = !snapshot.encryptionKeyConfigured;

  async function copyPath(path: string) {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    onNotice({ kind: "success", text: "تم نسخ الرابط." });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold text-[#025EB8]">{PROVIDER_UI_LABEL[active]}</p>
          <h2 className="mt-1 text-lg font-black text-slate-900">إعدادات المزود</h2>
          <p className="mt-1 text-xs text-slate-500">{completed}/{snapshot.fields.length} حقل مكتمل · الحالة: {INTEGRATION_UI_STATUS_LABEL[uiStatus(snapshot)]}</p>
        </div>
        {permissions.canAdmin && (
          <button type="button" disabled={!!busy} onClick={onToggle} className="h-9 rounded-md border border-slate-300 px-3 text-xs font-bold text-slate-700 disabled:opacity-50">
            {snapshot.enabled ? "تعطيل المزود" : "تفعيل المزود"}
          </button>
        )}
      </header>

      <div className="space-y-5 p-4 sm:p-5">
        {notice && (
          <div role="status" className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${notice.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
            {notice.kind === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {snapshot.fields.map((field) => (
            <div key={field.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <label htmlFor={`${active}-${field.key}`} className="text-sm font-black text-slate-900">{field.labelAr}{field.required ? " *" : ""}</label>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{FIELD_HELP[field.key]}</p>
                </div>
                <span className="shrink-0 rounded border bg-white px-2 py-1 text-[10px] font-bold text-slate-500">{sourceLabel(field.source)}</span>
              </div>

              {permissions.canManage ? (
                <div className="mt-3">
                  <input
                    id={`${active}-${field.key}`}
                    type={field.isSecret ? "password" : "text"}
                    value={drafts[field.key] ?? ""}
                    onChange={(event) => onDraft(field.key, event.target.value)}
                    placeholder={field.isSecret ? (field.configured ? "اتركه فارغًا للاحتفاظ بالقيمة المحفوظة" : "أدخل القيمة السرية") : "أدخل القيمة"}
                    autoComplete={field.isSecret ? "new-password" : "off"}
                    disabled={!!busy || (field.isSecret && encryptionBlocked)}
                    aria-describedby={`${active}-${field.key}-help`}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#025EB8] focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                  <p id={`${active}-${field.key}-help`} className="mt-1.5 text-[11px] text-slate-500">
                    {field.isSecret ? field.configured ? `محفوظ: ${field.maskedValue ?? "قيمة آمنة"}` : "غير محفوظ" : field.hasPendingValue ? "توجد قيمة جديدة بانتظار الاختبار أو الاعتماد." : dirty.has(field.key) ? "تم تعديل القيمة ولم تحفظ بعد." : "القيمة قابلة للعرض والتعديل."}
                  </p>
                </div>
              ) : (
                <div className="mt-3 rounded-md border bg-white px-3 py-2 text-sm text-slate-700">
                  {field.isSecret ? field.configured ? `محفوظ: ${field.maskedValue}` : "غير محفوظ" : field.displayValue || "غير مضبوط"}
                </div>
              )}

              {permissions.canAdmin && field.configured && (
                <div className="mt-3 border-t pt-2 text-left">
                  <button type="button" disabled={!!busy} onClick={() => onDelete(field.key, field.labelAr)} className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> حذف الإعداد</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {WEBHOOKS[active] && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-black text-blue-950">{WEBHOOKS[active]!.label}</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 overflow-x-auto rounded bg-white px-3 py-2 text-xs text-slate-700">{WEBHOOKS[active]!.path}</code>
              <button type="button" onClick={() => copyPath(WEBHOOKS[active]!.path)} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-blue-300 bg-white px-3 text-xs font-bold text-blue-800"><Clipboard className="h-4 w-4" /> نسخ الرابط</button>
            </div>
            {active === "META_WHATSAPP" && <p className="mt-2 text-xs text-blue-900">استخدم Webhook Verify Token نفسه داخل Meta. التحقق منه محلي ولا يعني أن Meta اختبرته خارجيًا.</p>}
            {active === "SYSTEM" && <p className="mt-2 text-xs text-blue-900">طريقة الحماية: Authorization Bearer.</p>}
          </div>
        )}

        {active === "SYSTEM" && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="حالة الجدولة" value={scheduler.configured ? "مفعلة" : "تحتاج إعداد"} />
            <Stat label="آخر تشغيل" value={scheduler.lastRunAt ? new Date(scheduler.lastRunAt).toLocaleString("ar") : "لم تعمل بعد"} />
            <Stat label="حملات مجدولة" value={String(scheduler.scheduledCount)} />
            <Stat label="مستحقة الآن" value={String(scheduler.dueCount)} />
          </div>
        )}

        {lastTest && (
          <div className={`rounded-xl border p-4 ${lastTest.success ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
            <p className="font-black">{lastTest.success ? "نجح الاتصال" : "فشل الاتصال"}</p>
            <p className="mt-1 text-sm">{safeErrorMessage(lastTest.failureCode, lastTest.messageAr)}</p>
            <p className="mt-1 text-xs text-slate-600">وقت الاختبار: {new Date(lastTest.testedAt).toLocaleString("ar")}</p>
            {!lastTest.success && <p className="mt-2 text-xs font-bold">الإعدادات الحالية العاملة لم تتغير.</p>}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t pt-4">
          {permissions.canManage && <ActionButton disabled={!!busy || dirty.size === 0} loading={busy === "save"} onClick={onSave} icon={<Save className="h-4 w-4" />} label="حفظ التغييرات" primary />}
          {permissions.canTest && <ActionButton disabled={!!busy || !snapshot.candidate.hasChanges} loading={busy === "test"} onClick={onTest} icon={<TestTube2 className="h-4 w-4" />} label="اختبار الاتصال" />}
          {permissions.canManage && snapshot.candidate.lastTestResult === "SUCCESS" && snapshot.candidate.version && <ActionButton disabled={!!busy} loading={busy === "activate"} onClick={onActivate} icon={<CheckCircle2 className="h-4 w-4" />} label="اعتماد الإعدادات" success />}
          {permissions.canManage && snapshot.candidate.hasChanges && <ActionButton disabled={!!busy} loading={busy === "discard"} onClick={onDiscard} icon={<RotateCcw className="h-4 w-4" />} label="إلغاء التغييرات" danger />}
        </div>

        {ADVANCED_LINKS[active]?.length ? (
          <div className="flex flex-wrap gap-3 border-t pt-4 text-xs font-bold text-[#025EB8]">
            {ADVANCED_LINKS[active]!.map((item) => <Link key={item.href} href={item.href} className="hover:underline">{item.label} ←</Link>)}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ActionButton({ disabled, loading, onClick, icon, label, primary, success, danger }: { disabled: boolean; loading: boolean; onClick: () => void; icon: React.ReactNode; label: string; primary?: boolean; success?: boolean; danger?: boolean }) {
  const style = primary ? "bg-[#025EB8] text-white" : success ? "bg-emerald-600 text-white" : danger ? "border border-rose-300 bg-white text-rose-700" : "border border-blue-300 bg-white text-blue-800";
  return <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${style}`}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}{label}</button>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-[11px] font-bold text-slate-500">{label}</p><p className="mt-1 text-sm font-black text-slate-900">{value}</p></div>;
}
