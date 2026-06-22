"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const guidelineSections = ["voice", "copy", "proof", "donor-dignity", "cta", "localization"];

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

export function BrandGuidelineCreatePanel({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [section, setSection] = useState("copy");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [examplesText, setExamplesText] = useState("");
  const [order, setOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    const examples = examplesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 8);

    const response = await fetch("/api/admin/brand/guidelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        section,
        title,
        body,
        examples,
        order: order ? Number(order) : undefined,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.message || "فشل حفظ قاعدة الهوية" });
      return;
    }

    setTitle("");
    setBody("");
    setExamplesText("");
    setOrder("0");
    setFeedback({ tone: "success", message: "تم حفظ قاعدة الهوية" });
    router.refresh();
  }

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm" aria-label="إضافة قاعدة هوية">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#025EB8]">Brand rule authoring</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">إضافة قاعدة صوت وكتابة</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">يحفظ القاعدة في BrandGuideline الحقيقي. كل قاعدة تحتاج مراجعة بشرية قبل استخدامها كمرجع نهائي.</p>
        </div>
        <FileText className="hidden h-7 w-7 text-[#025EB8] sm:block" aria-hidden="true" />
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3">
        <div className="grid gap-3 lg:grid-cols-[0.7fr_1.5fr_0.45fr_auto]">
          <select value={section} onChange={(event) => setSection(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm" aria-label="قسم القاعدة">
            {guidelineSections.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: لا تستخدم صورًا تنتقص من كرامة المستفيد" minLength={2} maxLength={140} required aria-label="عنوان القاعدة" />
          <Input value={order} onChange={(event) => setOrder(event.target.value)} type="number" min={0} max={999} aria-label="ترتيب القاعدة" />
          <Button type="submit" disabled={saving} className="gap-2 font-bold">
            <Save className="h-4 w-4" /> {saving ? "جاري الحفظ" : "حفظ"}
          </Button>
        </div>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="اكتب القاعدة بوضوح: متى تطبق، لماذا مهمة، وكيف يتصرف الكاتب أو المصمم."
          minLength={10}
          maxLength={1400}
          required
          aria-label="نص القاعدة"
          className="min-h-28 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
        <textarea
          value={examplesText}
          onChange={(event) => setExamplesText(event.target.value)}
          placeholder="أمثلة اختيارية، مثال في كل سطر"
          maxLength={1200}
          aria-label="أمثلة القاعدة"
          className="min-h-20 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {feedback ? (
        <p className={`mt-3 rounded-lg border px-3 py-2 text-sm font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
