"use client";

import { useEffect, useState } from "react";
import type { IntegrationProvider } from "@/lib/integration-settings/catalog";
import type { SafeIntegrationProviderSnapshot, SafeProviderConnectionTestResponse } from "@/lib/integration-settings/types";
import { safeErrorMessage } from "@/lib/integration-settings/ui";

type Notice = { kind: "success" | "error"; text: string } | null;
type Drafts = Record<string, string>;

async function json(response: Response): Promise<Record<string, any>> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || "تعذر تنفيذ العملية."), { code: body.code });
  return body;
}

export function useIntegrationSettings(initialProviders: SafeIntegrationProviderSnapshot[]) {
  const [providers, setProviders] = useState(initialProviders);
  const [active, setActive] = useState<IntegrationProvider>("META_WHATSAPP");
  const [drafts, setDrafts] = useState<Drafts>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [lastTest, setLastTest] = useState<SafeProviderConnectionTestResponse | null>(null);
  const snapshot = providers.find((item) => item.provider === active)!;
  const hasDirty = dirty.size > 0;

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasDirty]);

  useEffect(() => {
    const next: Drafts = {};
    for (const field of snapshot.fields) next[field.key] = field.isSecret ? "" : field.displayValue ?? "";
    setDrafts(next);
    setDirty(new Set());
    setLastTest(null);
    setNotice(null);
  }, [active, snapshot.provider, snapshot.candidate.version]);

  function replaceSnapshot(next: SafeIntegrationProviderSnapshot) {
    setProviders((current) => current.map((item) => item.provider === next.provider ? next : item));
  }

  function chooseProvider(provider: IntegrationProvider) {
    if (provider === active) return;
    if (hasDirty && !window.confirm("لديك تغييرات لم يتم حفظها. هل تريد الانتقال دون حفظها؟")) return;
    setActive(provider);
  }

  function updateDraft(key: string, value: string) {
    setDrafts((current) => ({ ...current, [key]: value }));
    setDirty((current) => new Set(current).add(key));
    setNotice(null);
  }

  async function refreshProvider() {
    const body = await json(await fetch(`/api/admin/integration-settings/${active}`, { cache: "no-store" }));
    replaceSnapshot(body.provider);
    return body.provider as SafeIntegrationProviderSnapshot;
  }

  async function saveChanges() {
    const settings = snapshot.fields
      .filter((field) => dirty.has(field.key))
      .filter((field) => !field.isSecret || drafts[field.key]?.length > 0)
      .map((field) => ({ key: field.key, value: drafts[field.key] ?? "" }));
    if (!settings.length) return setNotice({ kind: "error", text: "لا توجد تغييرات صالحة للحفظ." });
    if (!snapshot.encryptionKeyConfigured && settings.some((item) => snapshot.fields.find((field) => field.key === item.key)?.isSecret)) {
      return setNotice({ kind: "error", text: "مفتاح تشفير إعدادات التكاملات غير مضبوط على السيرفر." });
    }
    setBusy("save");
    try {
      const body = await json(await fetch(`/api/admin/integration-settings/${active}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ settings }),
      }));
      replaceSnapshot(body.snapshot);
      const clean: Drafts = {};
      for (const field of body.snapshot.fields as SafeIntegrationProviderSnapshot["fields"]) clean[field.key] = field.isSecret ? "" : field.displayValue ?? "";
      setDrafts(clean);
      setDirty(new Set());
      setNotice({ kind: "success", text: "تم حفظ التغييرات بأمان، ويجب اختبار الاتصال قبل اعتمادها." });
    } catch (error) {
      const e = error as Error & { code?: string };
      setNotice({ kind: "error", text: safeErrorMessage(e.code, e.message) });
    } finally { setBusy(null); }
  }

  async function testConnection() {
    setBusy("test");
    setNotice(null);
    try {
      const body = await json(await fetch(`/api/admin/integration-settings/${active}/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }));
      setLastTest(body as unknown as SafeProviderConnectionTestResponse);
      await refreshProvider();
      setNotice({ kind: body.success ? "success" : "error", text: body.success ? "نجح الاتصال. يمكنك الآن اعتماد الإعدادات." : `${safeErrorMessage(body.failureCode, body.messageAr)} الإعدادات الحالية العاملة لم تتغير.` });
    } catch (error) {
      const e = error as Error & { code?: string };
      setNotice({ kind: "error", text: safeErrorMessage(e.code, e.message) });
    } finally { setBusy(null); }
  }

  async function activateCandidate() {
    const candidateVersion = snapshot.candidate.version;
    if (!candidateVersion) return;
    setBusy("activate");
    try {
      const body = await json(await fetch(`/api/admin/integration-settings/${active}/activate-candidate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidateVersion }),
      }));
      replaceSnapshot(body.provider);
      setDrafts(Object.fromEntries(body.provider.fields.map((field: any) => [field.key, field.isSecret ? "" : field.displayValue ?? ""])));
      setDirty(new Set());
      setLastTest(null);
      setNotice({ kind: "success", text: "تم اعتماد الإعدادات بنجاح." });
    } catch (error) {
      const e = error as Error & { code?: string };
      if (e.code === "CANDIDATE_VERSION_MISMATCH" || e.code === "CANDIDATE_NOT_VERIFIED") await refreshProvider().catch(() => null);
      setNotice({ kind: "error", text: safeErrorMessage(e.code, e.message) });
    } finally { setBusy(null); }
  }

  async function discardCandidate() {
    const candidateVersion = snapshot.candidate.version;
    if (!candidateVersion || !window.confirm("سيتم حذف التغييرات غير المعتمدة، وستظل الإعدادات الحالية تعمل. هل تريد المتابعة؟")) return;
    setBusy("discard");
    try {
      const body = await json(await fetch(`/api/admin/integration-settings/${active}/discard-candidate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidateVersion }),
      }));
      replaceSnapshot(body.provider);
      setDirty(new Set());
      setLastTest(null);
      setNotice({ kind: "success", text: "تم إلغاء التغييرات، ولم تتأثر الإعدادات الحالية." });
    } catch (error) {
      const e = error as Error & { code?: string };
      setNotice({ kind: "error", text: safeErrorMessage(e.code, e.message) });
    } finally { setBusy(null); }
  }

  async function deleteField(key: string, label: string) {
    if (!window.confirm(`سيتم حذف إعداد «${label}». قد يعود النظام إلى قيمة إعدادات السيرفر إن كانت موجودة. هل تريد المتابعة؟`)) return;
    setBusy(`delete:${key}`);
    try {
      const body = await json(await fetch(`/api/admin/integration-settings/${active}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, confirm: true }),
      }));
      replaceSnapshot(body.provider);
      setNotice({ kind: "success", text: `تم حذف إعداد ${label}.` });
    } catch (error) {
      const e = error as Error & { code?: string };
      setNotice({ kind: "error", text: safeErrorMessage(e.code, e.message) });
    } finally { setBusy(null); }
  }

  async function toggleProvider() {
    const action = snapshot.enabled ? "DISABLE" : "ENABLE";
    const warning = active === "BREVO" ? "تعطيل Brevo قد يوقف الإيميل وSMS الدولي." : "تعطيل المزود قد يوقف إرسال الرسائل المرتبطة به.";
    if (!window.confirm(`${warning} هل تريد المتابعة؟`)) return;
    setBusy("toggle");
    try {
      const body = await json(await fetch(`/api/admin/integration-settings/${active}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      }));
      replaceSnapshot(body.provider);
      setNotice({ kind: "success", text: action === "ENABLE" ? "تم تفعيل المزود." : "تم تعطيل المزود." });
    } catch (error) {
      const e = error as Error & { code?: string };
      setNotice({ kind: "error", text: safeErrorMessage(e.code, e.message) });
    } finally { setBusy(null); }
  }

  return { providers, active, snapshot, drafts, dirty, busy, notice, lastTest, hasDirty, chooseProvider, updateDraft, saveChanges, testConnection, activateCandidate, discardCandidate, deleteField, toggleProvider, setNotice };
}
