"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { operationsContentTypeLabel, operationsStatusLabel } from "@/lib/operations/display-labels";

const contentTypes = ["DESIGN", "VIDEO", "REEL", "CAROUSEL", "STORY", "EMAIL", "MESSAGE"];
const statuses = ["IDEA", "WRITING", "DESIGN", "REVIEW", "APPROVED"];
const channels = [
  ["Social", "السوشيال"],
  ["Website", "الموقع"],
  ["Short Video", "فيديو قصير"],
  ["Message", "رسائل"],
  ["Email", "إيميل"],
  ["Campaign", "حملة"],
] as const;

type FeedbackState = { tone: "success" | "error"; message: string } | null;

const initialDetails = {
  owner: "",
  language: "تركي",
  theme: "",
  hook: "",
  cta: "",
  copy: "",
  figmaUrl: "",
  driveUrl: "",
  videoUrl: "",
  finalAssetUrl: "",
};

function optional(value: string) {
  return value.trim() || undefined;
}

export function ContentItemCreatePanel() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("DESIGN");
  const [status, setStatus] = useState("IDEA");
  const [channel, setChannel] = useState("Social");
  const [due, setDue] = useState("");
  const [details, setDetails] = useState(initialDetails);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setSaving(true);

    const response = await fetch("/api/dashboard/operations/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        type,
        status,
        channel,
        due: optional(due),
        owner: optional(details.owner),
        language: optional(details.language),
        theme: optional(details.theme),
        hook: optional(details.hook),
        cta: optional(details.cta),
        copy: optional(details.copy),
        figmaUrl: optional(details.figmaUrl),
        driveUrl: optional(details.driveUrl),
        videoUrl: optional(details.videoUrl),
        finalAssetUrl: optional(details.finalAssetUrl),
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.message || "فشل حفظ عنصر المحتوى" });
      return;
    }

    setTitle("");
    setDue("");
    setStatus("IDEA");
    setType("DESIGN");
    setChannel("Social");
    setDetails(initialDetails);
    setFeedback({ tone: "success", message: "تم حفظ عنصر المحتوى" });
    router.refresh();
  }

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm" aria-label="إنشاء عنصر محتوى">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold text-brand">إضافة محتوى</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">عنصر محتوى جديد</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">سجل فكرة أو مادة مطلوبة بكل تفاصيلها حتى تظهر داخل مراحل الإنتاج والمتابعة.</p>
        </div>
        <PlusCircle className="hidden h-8 w-8 text-brand sm:block" aria-hidden="true" />
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_0.7fr_auto]">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: فيديو قصير عن وقف القدس" minLength={2} maxLength={160} required aria-label="عنوان عنصر المحتوى" />
          <select value={type} onChange={(event) => setType(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm" aria-label="نوع المحتوى">
            {contentTypes.map((item) => <option key={item} value={item}>{operationsContentTypeLabel(item)}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm" aria-label="حالة المحتوى">
            {statuses.map((item) => <option key={item} value={item}>{operationsStatusLabel(item)}</option>)}
          </select>
          <select value={channel} onChange={(event) => setChannel(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm" aria-label="قناة النشر">
            {channels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <Input value={due} onChange={(event) => setDue(event.target.value)} type="date" aria-label="موعد التسليم" />
          <Button type="submit" disabled={saving} className="gap-2 font-bold"><Save className="h-4 w-4" /> {saving ? "جاري الحفظ" : "حفظ"}</Button>
        </div>

        <div className="grid gap-3 rounded-2xl border bg-slate-50 p-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <Input value={details.owner} onChange={(event) => setDetails((value) => ({ ...value, owner: event.target.value }))} placeholder="المسؤول" aria-label="المسؤول" />
          <Input value={details.language} onChange={(event) => setDetails((value) => ({ ...value, language: event.target.value }))} placeholder="اللغة" aria-label="اللغة" />
          <Input value={details.theme} onChange={(event) => setDetails((value) => ({ ...value, theme: event.target.value }))} placeholder="المحور" aria-label="المحور" />
          <Input value={details.cta} onChange={(event) => setDetails((value) => ({ ...value, cta: event.target.value }))} placeholder="الدعوة لاتخاذ إجراء" aria-label="CTA" />
          <Input value={details.hook} onChange={(event) => setDetails((value) => ({ ...value, hook: event.target.value }))} placeholder="الفكرة / Hook" aria-label="الفكرة" />
          <Input value={details.figmaUrl} onChange={(event) => setDetails((value) => ({ ...value, figmaUrl: event.target.value }))} placeholder="رابط Figma" aria-label="رابط Figma" />
          <Input value={details.driveUrl} onChange={(event) => setDetails((value) => ({ ...value, driveUrl: event.target.value }))} placeholder="رابط Drive" aria-label="رابط Drive" />
          <Input value={details.videoUrl} onChange={(event) => setDetails((value) => ({ ...value, videoUrl: event.target.value }))} placeholder="رابط الفيديو" aria-label="رابط الفيديو" />
          <Input value={details.finalAssetUrl} onChange={(event) => setDetails((value) => ({ ...value, finalAssetUrl: event.target.value }))} placeholder="رابط النسخة النهائية" aria-label="رابط النسخة النهائية" />
          <textarea value={details.copy} onChange={(event) => setDetails((value) => ({ ...value, copy: event.target.value }))} placeholder="النص أو ملاحظات الإنتاج" className="min-h-20 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand md:col-span-2 xl:col-span-3" aria-label="النص" />
        </div>
      </form>

      {feedback ? <p className={`mt-3 rounded-lg border px-3 py-2 text-sm font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{feedback.message}</p> : null}
    </section>
  );
}
