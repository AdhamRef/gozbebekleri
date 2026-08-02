import Link from "next/link";
import { ArrowLeft, Megaphone, Send } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOperationsOverview } from "@/lib/operations/service";
import { readAuditBackedContentPublications } from "@/lib/operations/content-publication-repository";
import { PublishingManualActions } from "./_components/PublishingManualActions";

export const metadata = {
  title: "النشر اليدوي | لوحة التحكم",
};

const publishingPlatforms = [
  "Facebook",
  "Instagram",
  "TikTok",
  "YouTube",
  "X",
  "Telegram",
  "Website",
  "Email",
  "WhatsApp",
  "SMS",
] as const;

const statusClass: Record<string, string> = {
  READY_FOR_MANUAL_SEND: "border-blue-200 bg-blue-50 text-brand",
  PUBLISHED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MANUALLY_SENT: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SCHEDULED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  FAILED: "border-amber-200 bg-amber-50 text-amber-700",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
  PENDING: "border-slate-200 bg-slate-50 text-slate-600",
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ar-EG", { month: "short", day: "numeric", year: "numeric" });
}

function markerTime(marker?: { publishedAt: string | null; scheduledAt: string | null }) {
  return marker?.publishedAt ?? marker?.scheduledAt ?? null;
}

export default async function OperationsPublishingPage() {
  const [overview, publications] = await Promise.all([
    getOperationsOverview(),
    readAuditBackedContentPublications(),
  ]);
  const publicationMap = new Map(publications.map((publication) => [`${publication.contentItemId}:${publication.platform}`, publication]));
  const readyCount = publications.filter((publication) => publication.status === "READY_FOR_MANUAL_SEND").length;
  const publishedCount = publications.filter((publication) => ["PUBLISHED", "MANUALLY_SENT"].includes(publication.status)).length;
  const issueCount = publications.filter((publication) => ["FAILED", "CANCELLED"].includes(publication.status)).length;

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        eyebrow="المحتوى والعمليات / النشر"
        title="النشر اليدوي"
        description="قائمة متابعة لكل مادة عبر المنصات. الأزرار تسجّل حالة يدوية فقط، بدون نشر تلقائي أو اتصال بأي منصة خارجية."
        icon={Send}
        actions={
          <Link href="/dashboard/operations/content" className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-brand/50 hover:text-brand">
            فتح عناصر المحتوى
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="عناصر المحتوى" value={overview.items.length} />
        <SummaryCard title="منصات لكل عنصر" value={publishingPlatforms.length} />
        <SummaryCard title="في الطابور" value={readyCount} />
        <SummaryCard title="منشور يدويًا" value={publishedCount} />
        <SummaryCard title="تحتاج مراجعة" value={issueCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة النشر حسب المنصة</CardTitle>
          <CardDescription>ابدأ بوضع المنصة في طابور النشر اليدوي، ثم سجل الرابط أو الفشل بعد التنفيذ البشري.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {overview.items.length ? overview.items.map((item) => (
            <div key={item.id ?? item.title} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-brand"><Megaphone className="h-4 w-4" /></span>
                    <h2 className="font-black text-slate-900">{item.title}</h2>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.type} · {item.channel} · due {item.due}</p>
                </div>
                <Badge variant="outline">{item.status}</Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {publishingPlatforms.map((platform) => {
                  const marker = item.id ? publicationMap.get(`${item.id}:${platform}`) : undefined;
                  const status = marker?.status ?? "PENDING";
                  const date = formatDate(markerTime(marker));
                  return (
                    <div key={`${item.id ?? item.title}-${platform}`} className="rounded-2xl border bg-slate-50">
                      <div className="flex items-center justify-between gap-2">
                        <b className="text-sm text-slate-900">{platform}</b>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${statusClass[status] ?? statusClass.PENDING}`}>{status}</span>
                      </div>
                      <p className="mt-2 min-h-8 text-xs leading-5 text-slate-500">
                        {marker?.publishedUrl ? <a className="font-bold text-brand underline" href={marker.publishedUrl} target="_blank" rel="noreferrer">فتح رابط النشر</a> : date ? `آخر تحديث: ${date}` : "لم يتم تسجيل إجراء بعد"}
                      </p>
                      {item.id ? <PublishingManualActions contentItemId={item.id} title={item.title} platform={platform} /> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed bg-slate-50 p-6 text-center text-sm text-slate-600">
              لا توجد عناصر محتوى بعد. ابدأ من صفحة عناصر المحتوى ثم ارجع لقائمة النشر.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return <Card><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader></Card>;
}
