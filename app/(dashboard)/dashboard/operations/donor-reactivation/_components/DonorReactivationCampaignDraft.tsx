"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Megaphone } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LOCALE_OPTIONS } from "@/lib/locales";

/**
 * Creates a DRAFT communication campaign for the reactivation cohort and opens the campaign
 * builder. Never sends — the campaign starts in DRAFT and goes through the normal approval flow.
 */
export function DonorReactivationCampaignDraft() {
  const router = useRouter();
  const [channel, setChannel] = React.useState("WHATSAPP");
  const [locale, setLocale] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function draft() {
    setSaving(true);
    try {
      const chLabel = channel === "WHATSAPP" ? "واتساب" : channel === "EMAIL" ? "إيميل" : "رسائل";
      const res = await fetch("/api/dashboard/operations/communication/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `تنشيط المتبرعين — ${chLabel}`, channel, purpose: "MARKETING" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "failed");
      // Set the audience language segment on the new draft, then open the builder.
      if (locale) {
        await fetch(`/api/dashboard/operations/communication/campaigns/${json.campaign.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audienceSegmentKey: locale }),
        }).catch(() => {});
      }
      toast.success("تم إنشاء مسودة حملة");
      router.push(`/dashboard/operations/communication/campaigns/${json.campaign.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر إنشاء المسودة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-5 w-5 text-[#025EB8]" /> إنشاء مسودة حملة تنشيط</CardTitle>
        <CardDescription>تُنشأ الحملة كمسودة في مركز التواصل وتمر بالمراجعة والاعتماد. لا إرسال تلقائي.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <label className="text-sm"><span className="mb-1 block text-xs font-bold text-slate-500">القناة</span>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm"><option value="WHATSAPP">واتساب</option><option value="EMAIL">إيميل</option><option value="SMS">رسائل SMS</option></select></label>
        <label className="text-sm"><span className="mb-1 block text-xs font-bold text-slate-500">اللغة</span>
          <select value={locale} onChange={(e) => setLocale(e.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm"><option value="">كل اللغات</option>{LOCALE_OPTIONS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select></label>
        <Button onClick={draft} disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} إنشاء مسودة وفتحها</Button>
      </CardContent>
    </Card>
  );
}
