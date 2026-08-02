"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MessagingTemplateCreate() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveTemplate() {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/dashboard/operations/messaging", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "template",
        operation: "SAVE",
        item: {
          id: `template_${Date.now()}`,
          title,
          body,
          channel: "WHATSAPP",
          category: "عام",
          language: "Turkish",
          status: "DRAFT",
        },
      }),
    });
    const result = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok || !result?.ok) {
      setMessage(result?.message || "فشل حفظ القالب");
      return;
    }
    setTitle("");
    setBody("");
    setMessage("تم حفظ القالب");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="font-black text-slate-900">إضافة قالب رسالة</h2>
      <div className="mt-3 space-y-2 text-sm">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="اسم القالب" className="w-full rounded-lg border px-3 py-2 outline-none focus:border-brand" />
        <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="نص الرسالة" className="min-h-24 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand" />
        <Button type="button" disabled={busy || !title || !body} onClick={saveTemplate} className="gap-2 font-bold"><Save className="h-4 w-4" /> حفظ القالب</Button>
        {message ? <p className="text-xs font-semibold text-slate-500">{message}</p> : null}
      </div>
    </div>
  );
}
