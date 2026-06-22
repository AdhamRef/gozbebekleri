"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgePlus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

type Props = {
  assetId: string;
  disabled?: boolean;
  disabledReason?: string | null;
};

export function ArchiveAssetBrandAssetAction({ assetId, disabled = false, disabledReason }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function saveToBrandAssets() {
    if (disabled || saving) return;
    const confirmed = window.confirm("سيتم حفظ هذا الأصل في مركز الهوية كسجل يحتاج تحقق بشري. لن يتم رفع أو تحميل أي ملف.");
    if (!confirmed) return;

    setSaving(true);
    setFeedback(null);

    const response = await fetch(`/api/admin/archive/assets/${encodeURIComponent(assetId)}/add-to-brand-assets`, {
      method: "POST",
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.error || result?.message || "فشل إضافة الأصل إلى مركز الهوية" });
      return;
    }

    setFeedback({ tone: "success", message: result?.message || "تمت إضافة الأصل إلى مركز الهوية" });
    router.refresh();
  }

  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={disabled || saving} onClick={saveToBrandAssets} className="gap-2 font-bold">
          <BadgePlus className="h-4 w-4" /> {saving ? "جاري الحفظ" : "Add to Brand Assets"}
        </Button>
        {feedback?.tone === "success" ? (
          <Link href="/dashboard/brand/assets" className="inline-flex items-center gap-1 text-xs font-bold text-[#025EB8] hover:underline">
            Open Brand Assets <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      {disabled && disabledReason ? <p className="mt-2 text-xs font-semibold text-slate-500">{disabledReason}</p> : null}
      {feedback ? (
        <p className={`mt-2 rounded-md border px-3 py-2 text-xs font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
