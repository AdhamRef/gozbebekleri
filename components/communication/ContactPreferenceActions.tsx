"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ContactPreference } from "@/lib/communication/communication-types";

export function ContactPreferenceActions({ preference }: { preference: ContactPreference }) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(operation: "SAVE" | "REMOVE", item: ContactPreference) {
    setIsBusy(true);
    setError(null);
    const response = await fetch("/api/dashboard/operations/communication/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation, item }),
    });
    const payload = await response.json().catch(() => null);
    setIsBusy(false);
    if (!response.ok) {
      setError(payload?.message || payload?.error || "تعذر تحديث التفضيلات.");
      return;
    }
    router.refresh();
  }

  return <div className="mt-3 flex flex-wrap gap-2">
    <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={() => submit("SAVE", { ...preference, doNotContact: !preference.doNotContact })}>{preference.doNotContact ? "إلغاء عدم التواصل" : "تفعيل عدم التواصل"}</Button>
    <Button type="button" size="sm" variant="destructive" disabled={isBusy} onClick={() => submit("REMOVE", preference)}>حذف</Button>
    {error ? <p className="w-full text-xs font-semibold text-red-600">{error}</p> : null}
  </div>;
}
