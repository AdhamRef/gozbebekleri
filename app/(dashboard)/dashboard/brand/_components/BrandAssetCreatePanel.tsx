"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const assetTypes = ["LOGO", "ICON", "TEMPLATE", "CERTIFICATE", "WATERMARK", "VIDEO_INTRO", "VIDEO_OUTRO", "BRAND_GUIDE"];
const assetFormats = ["SVG", "PNG", "JPG", "PDF", "FIGMA", "VIDEO", "DOC", "URL"];
const locales = ["all", "ar", "tr", "en", "fr", "id", "pt", "es", "de"];

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

export function BrandAssetCreatePanel({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("LOGO");
  const [format, setFormat] = useState("URL");
  const [fileUrl, setFileUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [usage, setUsage] = useState("");
  const [locale, setLocale] = useState("all");
  const [downloadable, setDownloadable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    const response = await fetch("/api/admin/brand/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        title,
        type,
        format,
        fileUrl: fileUrl || undefined,
        previewUrl: previewUrl || undefined,
        usage: usage || undefined,
        locale,
        downloadable,
        status: "TO_VERIFY",
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.message || "فشل حفظ أصل الهوية" });
      return;
    }

    setTitle("");
    setFileUrl("");
    setPreviewUrl("");
    setUsage("");
    setDownloadable(false);
    setFeedback({ tone: "success", message: "تم حفظ أصل الهوية" });
    router.refresh();
  }

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm" aria-label="إضافة أصل هوية">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#025EB8]">Brand asset authoring</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">إضافة أصل هوية برابط موثق</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">يحفظ الرابط كسجل يدوي يحتاج تحقق. لا رفع ملفات، لا تحميل تلقائي، ولا اتصال خارجي.</p>
        </div>
        <FilePlus2 className="hidden h-7 w-7 text-[#025EB8] sm:block" aria-hidden="true" />
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.6fr_0.6fr_1.2fr_0.6fr_auto]">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: Minber-i Aksa primary logo" minLength={2} maxLength={160} required aria-label="عنوان أصل الهوية" />
        <select value={type} onChange={(event) => setType(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm" aria-label="نوع الأصل">
          {assetTypes.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={format} onChange={(event) => setFormat(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm" aria-label="صيغة الأصل">
          {assetFormats.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <Input value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} type="url" placeholder="https://..." required aria-label="رابط الملف" dir="ltr" />
        <select value={locale} onChange={(event) => setLocale(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm" aria-label="لغة الأصل">
          {locales.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
        </select>
        <Button type="submit" disabled={saving} className="gap-2 font-bold">
          <Save className="h-4 w-4" /> {saving ? "جاري الحفظ" : "حفظ"}
        </Button>
        <Input value={previewUrl} onChange={(event) => setPreviewUrl(event.target.value)} type="url" placeholder="Preview URL اختياري" aria-label="رابط المعاينة" dir="ltr" />
        <Input value={usage} onChange={(event) => setUsage(event.target.value)} placeholder="الاستخدام: website header / certificate / social" className="lg:col-span-3" aria-label="الاستخدام" />
        <label className="flex min-h-9 items-center gap-2 rounded-md border px-3 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={downloadable} onChange={(event) => setDownloadable(event.target.checked)} /> Downloadable
        </label>
      </form>

      {feedback ? (
        <p className={`mt-3 rounded-lg border px-3 py-2 text-sm font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
