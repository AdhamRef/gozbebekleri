"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

export function BrandFontCreatePanel({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [usage, setUsage] = useState("");
  const [fallback, setFallback] = useState("system-ui, sans-serif");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    const response = await fetch("/api/admin/brand/fonts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        name,
        usage,
        fallback: fallback || undefined,
        source: source || undefined,
        notes: notes || undefined,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.message || "فشل حفظ خط الهوية" });
      return;
    }

    setName("");
    setUsage("");
    setSource("");
    setNotes("");
    setFeedback({ tone: "success", message: "تم حفظ خط الهوية" });
    router.refresh();
  }

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm" aria-label="إضافة خط هوية">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#025EB8]">Typography authoring</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">إضافة خط هوية</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">يحفظ الخط كسجل يدوي يحتاج تحقق. لا تحميل ملفات، لا اتصال خارجي، ولا نشر تلقائي.</p>
        </div>
        <Type className="hidden h-7 w-7 text-[#025EB8] sm:block" aria-hidden="true" />
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.2fr_1fr_1fr_auto]">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: Inter / Noto Kufi Arabic" minLength={2} maxLength={120} required aria-label="اسم الخط" />
        <Input value={usage} onChange={(event) => setUsage(event.target.value)} placeholder="الاستخدام: headings / body / Arabic UI" minLength={2} maxLength={180} required aria-label="استخدام الخط" />
        <Input value={fallback} onChange={(event) => setFallback(event.target.value)} placeholder="Fallback" maxLength={180} aria-label="Fallback" dir="ltr" />
        <Input value={source} onChange={(event) => setSource(event.target.value)} placeholder="المصدر أو الترخيص" maxLength={180} aria-label="مصدر الخط" />
        <Button type="submit" disabled={saving} className="gap-2 font-bold">
          <Save className="h-4 w-4" /> {saving ? "جاري الحفظ" : "حفظ"}
        </Button>
        <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="ملاحظات الاستخدام أو التحقق" maxLength={500} className="lg:col-span-4" aria-label="ملاحظات الخط" />
      </form>

      {feedback ? (
        <p className={`mt-3 rounded-lg border px-3 py-2 text-sm font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
