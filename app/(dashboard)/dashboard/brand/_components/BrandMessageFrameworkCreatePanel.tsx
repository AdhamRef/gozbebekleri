"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const frameworkTypes = ["FRIDAY", "THANK_YOU", "ZAKAT", "WAQF", "EMERGENCY", "DONOR_REACTIVATION", "RAMADAN", "GENERAL"];
const locales = ["ar", "tr", "en", "fr", "id", "pt", "es", "de"];

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

function lines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function BrandMessageFrameworkCreatePanel({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("GENERAL");
  const [locale, setLocale] = useState("tr");
  const [structureText, setStructureText] = useState("hook\nempathy\nproof\ncta");
  const [sampleText, setSampleText] = useState("");
  const [doText, setDoText] = useState("");
  const [dontText, setDontText] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    const response = await fetch("/api/admin/brand/frameworks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        name,
        type,
        locale,
        structure: lines(structureText),
        sampleText: sampleText || undefined,
        doList: lines(doText),
        dontList: lines(dontText),
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.message || "فشل حفظ إطار الرسالة" });
      return;
    }

    setName("");
    setSampleText("");
    setDoText("");
    setDontText("");
    setFeedback({ tone: "success", message: "تم حفظ إطار الرسالة" });
    router.refresh();
  }

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm" aria-label="إضافة إطار رسالة">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#025EB8]">Message framework authoring</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">إضافة إطار رسالة للحملات</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">يحفظ كمسودة مراجعة بشرية. لا AI، لا إرسال، ولا نشر تلقائي.</p>
        </div>
        <Sparkles className="hidden h-7 w-7 text-[#025EB8] sm:block" aria-hidden="true" />
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.75fr_0.55fr_auto]">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: Friday giving WhatsApp" minLength={2} maxLength={140} required aria-label="اسم إطار الرسالة" />
          <select value={type} onChange={(event) => setType(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm" aria-label="نوع الإطار">
            {frameworkTypes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={locale} onChange={(event) => setLocale(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm" aria-label="لغة الإطار">
            {locales.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
          </select>
          <Button type="submit" disabled={saving} className="gap-2 font-bold">
            <Save className="h-4 w-4" /> {saving ? "جاري الحفظ" : "حفظ"}
          </Button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <textarea value={structureText} onChange={(event) => setStructureText(event.target.value)} placeholder="الهيكل: خطوة في كل سطر" aria-label="هيكل إطار الرسالة" className="min-h-24 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
          <textarea value={sampleText} onChange={(event) => setSampleText(event.target.value)} placeholder="نص عينة اختياري" maxLength={1200} aria-label="نص عينة" className="min-h-24 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
          <textarea value={doText} onChange={(event) => setDoText(event.target.value)} placeholder="Do: قاعدة في كل سطر" aria-label="قائمة Do" className="min-h-24 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
          <textarea value={dontText} onChange={(event) => setDontText(event.target.value)} placeholder="Do not: قاعدة في كل سطر" aria-label="قائمة Do not" className="min-h-24 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
      </form>

      {feedback ? (
        <p className={`mt-3 rounded-lg border px-3 py-2 text-sm font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
