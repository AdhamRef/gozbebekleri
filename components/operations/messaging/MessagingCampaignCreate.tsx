"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MessagingCampaignCreate() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("");
  const [objective, setObjective] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveCampaign() {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/dashboard/operations/messaging", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "campaign",
        operation: "SAVE",
        item: {
          id: `campaign_${Date.now()}`,
          title,
          audience,
          objective,
          channel: "WHATSAPP",
          status: "PLANNING",
        },
      }),
    });
    const result = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok || !result?.ok) {
      setMessage(result?.message || "فشل حفظ الحملة");
      return;
    }
    setTitle("");
    setAudience("");
    setObjective("");
    setMessage("تم حفظ الحملة");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="font-black text-slate-900">إضافة حملة رسائل</h2>
      <div className="mt-3 space-y-2 text-sm">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="اسم الحملة" className="w-full rounded-lg border px-3 py-2 outline-none focus:border-brand" />
        <input value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="الجمهور" className="w-full rounded-lg border px-3 py-2 outline-none focus:border-brand" />
        <input value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="الهدف" className="w-full rounded-lg border px-3 py-2 outline-none focus:border-brand" />
        <Button type="button" disabled={busy || !title} onClick={saveCampaign} className="gap-2 font-bold"><Save className="h-4 w-4" /> حفظ الحملة</Button>
        {message ? <p className="text-xs font-semibold text-slate-500">{message}</p> : null}
      </div>
    </div>
  );
}
