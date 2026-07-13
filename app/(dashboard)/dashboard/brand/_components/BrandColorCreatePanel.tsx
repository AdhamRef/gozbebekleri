"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Palette, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const colorUsages = ["PRIMARY", "CTA", "BACKGROUND", "ACCENT", "TEXT", "STATUS"];

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

export function BrandColorCreatePanel({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#D39A27");
  const [usage, setUsage] = useState("ACCENT");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    const response = await fetch("/api/admin/brand/colors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        name,
        hex,
        usage,
        description: description || undefined,
        order: order ? Number(order) : undefined,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.message || "فشل حفظ لون الهوية" });
      return;
    }

    setName("");
    setDescription("");
    setOrder("0");
    setFeedback({ tone: "success", message: "تم حفظ لون الهوية" });
    router.refresh();
  }

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm" aria-label="إضافة لون هوية">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold text-[#025EB8]">ألوان الهوية</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">إضافة لون معتمد</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">يُحفظ اللون في سجل الهوية مع مراجعة بشرية قبل اعتماده.</p>
        </div>
        <Palette className="hidden h-7 w-7 text-[#025EB8] sm:block" aria-hidden="true" />
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.45fr_0.65fr_0.55fr_1.2fr_0.45fr_auto]">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: Aqsa Gold" minLength={2} maxLength={80} required aria-label="اسم اللون" />
        <Input value={hex} onChange={(event) => setHex(event.target.value)} type="color" required aria-label="اختيار اللون" className="h-9 p-1" />
        <Input value={hex} onChange={(event) => setHex(event.target.value)} placeholder="#D39A27" pattern="^#?[0-9a-fA-F]{6}$" required aria-label="قيمة HEX" dir="ltr" />
        <select value={usage} onChange={(event) => setUsage(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm" aria-label="استخدام اللون">
          {colorUsages.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="الاستخدام: CTA / خلفيات / نصوص / حالة" maxLength={300} aria-label="وصف اللون" />
        <Input value={order} onChange={(event) => setOrder(event.target.value)} type="number" min={0} max={999} aria-label="ترتيب اللون" />
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
