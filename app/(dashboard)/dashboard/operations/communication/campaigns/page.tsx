"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Plus, RefreshCw, Megaphone } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignActionsMenu } from "./_components/CampaignActionsMenu";

type Campaign = { id: string; name: string; channel: string; purpose: string; status: string; updatedAt: string };

const channelLabel: Record<string, string> = { WHATSAPP: "واتساب", EMAIL: "إيميل", SMS: "رسائل SMS" };
const statusLabel: Record<string, string> = {
  DRAFT: "مسودة",
  REVIEW: "قيد المراجعة",
  APPROVED: "معتمدة",
  SCHEDULED: "مجدولة",
  SENDING: "جارٍ الإرسال",
  SENT: "أُرسلت",
  SENT_WITH_ISSUES: "أُرسلت مع ملاحظات",
  BLOCKED: "محجوبة",
  CANCELLED: "ملغاة",
  FAILED: "فشلت",
};
const statusClass: Record<string, string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-600",
  REVIEW: "border-blue-200 bg-blue-50 text-blue-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SCHEDULED: "border-violet-200 bg-violet-50 text-violet-700",
  SENT_WITH_ISSUES: "border-amber-200 bg-amber-50 text-amber-700",
  BLOCKED: "border-amber-200 bg-amber-50 text-amber-700",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-500",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function CampaignsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillListId = searchParams.get("list");
  const [items, setItems] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [channel, setChannel] = React.useState("WHATSAPP");
  const [purpose, setPurpose] = React.useState("MARKETING");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/operations/communication/campaigns", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error();
      setItems(json.campaigns ?? []);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!name.trim()) {
      toast.error("أدخل اسم الحملة");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/operations/communication/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, channel, purpose, ...(prefillListId ? { audienceSegmentKey: `list:${prefillListId}` } : {}) }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "failed");
      toast.success("تم إنشاء الحملة");
      router.push(`/dashboard/operations/communication/campaigns/${json.campaign.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الإنشاء");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-5" dir="rtl">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold text-[#025EB8]">مركز التواصل</p>
            <h1 className="mt-1 text-xl font-black text-slate-900">حملات التواصل</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              جهّز حملات واتساب أو إيميل أو رسائل خطوة بخطوة: الجمهور، القالب، تغطية اللغات، التوجيه، ثم الاعتماد. لا إرسال فعلي بعد.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
            </Button>
            <Button className="gap-2 font-bold" onClick={() => setCreating((v) => !v)}>
              <Plus className="h-4 w-4" /> حملة جديدة
            </Button>
          </div>
        </div>
      </section>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 text-sm font-semibold leading-6 text-amber-800">
          الإرسال الفعلي معطّل حتى ربط المزود. يمكنك تجهيز الحملة، معاينة القوالب، وإنشاء سجلات تجهيز آمنة دون إرسال أي رسالة.
        </CardContent>
      </Card>

      {creating ? (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">حملة جديدة</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <label className="block text-sm md:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-500">اسم الحملة</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#025EB8]" /></label>
            <label className="block text-sm"><span className="mb-1 block text-xs font-bold text-slate-500">القناة</span>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option value="WHATSAPP">واتساب</option><option value="EMAIL">إيميل</option><option value="SMS" disabled>رسائل SMS (قريبًا)</option></select></label>
            <label className="block text-sm"><span className="mb-1 block text-xs font-bold text-slate-500">الغرض</span>
              <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option value="MARKETING">تسويقي</option><option value="UTILITY">خدمي</option><option value="TRANSACTIONAL">تشغيلي</option><option value="AUTHENTICATION">تحقق</option></select></label>
            <div className="flex items-end gap-2 md:col-span-4">
              <Button onClick={create} disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} إنشاء وفتح</Button>
              <Button variant="outline" onClick={() => setCreating(false)}>إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="flex min-h-[12rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div>
      ) : failed ? (
        <Card className="border-rose-200 bg-rose-50"><CardContent className="p-6 text-center text-sm font-semibold text-rose-700">تعذّر تحميل الحملات. حدّث الصفحة.</CardContent></Card>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-slate-500">لا توجد حملات بعد. ابدأ بإنشاء أول حملة.</CardContent></Card>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((c) => (
            <Card key={c.id} className="h-full transition hover:border-[#025EB8]/40 hover:shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/dashboard/operations/communication/campaigns/${c.id}`} className="min-w-0 flex-1">
                    <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4 shrink-0 text-[#025EB8]" /> <span className="truncate">{c.name}</span></CardTitle>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className={statusClass[c.status] ?? "border-slate-200 bg-slate-50 text-slate-600"}>{statusLabel[c.status] ?? c.status}</Badge>
                    <CampaignActionsMenu id={c.id} status={c.status} />
                  </div>
                </div>
                <Link href={`/dashboard/operations/communication/campaigns/${c.id}`}>
                  <CardDescription>{channelLabel[c.channel] ?? c.channel} · {c.purpose}</CardDescription>
                </Link>
              </CardHeader>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}
