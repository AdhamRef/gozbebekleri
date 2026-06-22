"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const contentTypes = ["DESIGN", "VIDEO", "REEL", "CAROUSEL", "STORY", "SEO_ARTICLE", "EMAIL", "WHATSAPP", "SMS"];
const statuses = ["IDEA", "WRITING", "DESIGN", "REVIEW", "APPROVED"];
const channels = ["Social", "Website", "Instagram / TikTok", "WhatsApp", "Email", "Meta Ads"];

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

export function ContentItemCreatePanel() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("DESIGN");
  const [status, setStatus] = useState("IDEA");
  const [channel, setChannel] = useState("Social");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setSaving(true);

    const response = await fetch("/api/dashboard/operations/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type, status, channel, due: due || undefined }),
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
    setFeedback({ tone: "success", message: "تم حفظ عنصر المحتوى" });
    router.refresh();
  }

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm" aria-label="إنشاء عنصر محتوى">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#025EB8]">Content authoring</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">إضافة عنصر محتوى عملي</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">يحفظ العنصر في سجل قاعدة البيانات ويظهر فورًا داخل مراحل الإنتاج. لا نشر تلقائي ولا إرسال تلقائي.</p>
        </div>
        <PlusCircle className="hidden h-8 w-8 text-[#025EB8] sm:block" aria-hidden="true" />
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_0.7fr_auto]">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="مثال: سكريبت Reel عن وقف القدس"
          minLength={2}
          maxLength={160}
          required
          aria-label="عنوان عنصر المحتوى"
        />
        <select value={type} onChange={(event) => setType(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm" aria-label="نوع المحتوى">
          {contentTypes.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm" aria-label="حالة المحتوى">
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={channel} onChange={(event) => setChannel(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm" aria-label="قناة النشر">
          {channels.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <Input value={due} onChange={(event) => setDue(event.target.value)} type="date" aria-label="موعد التسليم" />
        <Button type="submit" disabled={saving} className="gap-2 font-bold">
          <Save className="h-4 w-4" /> {saving ? "جاري الحفظ" : "حفظ"}
        </Button>
      </form>

      {feedback ? (
        <p className={`mt-3 rounded-lg border px-3 py-2 text-sm font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
