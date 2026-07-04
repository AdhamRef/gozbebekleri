"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ContactPreferenceCreate() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setIsSaving(true);
    setError(null);
    const contactId = String(formData.get("contactId") || "").trim();
    const preferredLanguage = String(formData.get("preferredLanguage") || "").trim();
    const countryCode = String(formData.get("countryCode") || "").trim();
    const consentSource = String(formData.get("consentSource") || "manual-dashboard").trim();

    const response = await fetch("/api/dashboard/operations/communication/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "SAVE",
        item: {
          contactId,
          preferredLanguage,
          countryCode,
          consentSource,
          emailOptIn: formData.get("emailOptIn") === "on",
          smsOptIn: formData.get("smsOptIn") === "on",
          whatsappOptIn: formData.get("whatsappOptIn") === "on",
          doNotContact: formData.get("doNotContact") === "on",
        },
      }),
    });

    const payload = await response.json().catch(() => null);
    setIsSaving(false);
    if (!response.ok) {
      setError(payload?.message || payload?.error || "تعذر حفظ تفضيلات التواصل.");
      return;
    }
    router.refresh();
  }

  return <Card>
    <CardHeader>
      <CardTitle>إضافة تفضيلات تواصل</CardTitle>
      <CardDescription>إضافة سجل داخلي للتفضيلات بدون أي إرسال أو اتصال خارجي.</CardDescription>
    </CardHeader>
    <CardContent>
      <form action={onSubmit} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <input name="contactId" required placeholder="معرف المتبرع أو جهة الاتصال" className="rounded-xl border px-3 py-2 text-sm" />
          <input name="preferredLanguage" placeholder="اللغة المفضلة: tr / ar / en" className="rounded-xl border px-3 py-2 text-sm" />
          <input name="countryCode" placeholder="الدولة: TR / US / GLOBAL" className="rounded-xl border px-3 py-2 text-sm" />
          <input name="consentSource" placeholder="مصدر الموافقة" defaultValue="manual-dashboard" className="rounded-xl border px-3 py-2 text-sm" />
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <Check name="emailOptIn" label="موافقة الإيميل" />
          <Check name="smsOptIn" label="موافقة SMS" />
          <Check name="whatsappOptIn" label="موافقة واتساب" />
          <Check name="doNotContact" label="عدم التواصل نهائيًا" danger />
        </div>

        {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <Button type="submit" disabled={isSaving} className="w-full font-bold">{isSaving ? "جار الحفظ..." : "حفظ التفضيلات"}</Button>
      </form>
    </CardContent>
  </Card>;
}

function Check({ name, label, danger }: { name: string; label: string; danger?: boolean }) {
  return <label className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${danger ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-700"}`}>
    <input type="checkbox" name={name} />
    {label}
  </label>;
}
