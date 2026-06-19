import Link from "next/link";
import { ArrowLeft, ExternalLink, Link2, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CampaignLink = {
  _id?: { $oid?: string } | string;
  name?: string;
  platform?: string;
  channel?: string;
  url?: string;
  status?: string;
  saveCount?: number;
  utmCampaign?: string | null;
  campaignId?: string | null;
  adsetId?: string | null;
  adGroupId?: string | null;
  adId?: string | null;
  targetCountry?: string | null;
  objective?: string | null;
  updatedAt?: string | { $date?: string };
};

type RegistryResponse = {
  ok: boolean;
  links: CampaignLink[];
};

export const metadata = {
  title: "سجل روابط الحملات | لوحة التحكم",
};

function objectId(value: CampaignLink["_id"]) {
  if (typeof value === "string") return value;
  return value?.$oid ?? "";
}

function dateLabel(value: CampaignLink["updatedAt"]) {
  const raw = typeof value === "string" ? value : value?.$date;
  if (!raw) return "—";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" });
}

function healthScore(link: CampaignLink) {
  let score = 20;
  if (link.utmCampaign) score += 20;
  if (link.campaignId) score += 20;
  if (link.adsetId || link.adGroupId) score += 10;
  if (link.adId) score += 15;
  if (link.targetCountry) score += 10;
  if (link.url) score += 5;
  return Math.min(score, 100);
}

function healthClass(score: number) {
  if (score >= 75) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (score >= 55) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

async function getRegistry(): Promise<RegistryResponse> {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
  try {
    const res = await fetch(`${base}/api/admin/marketing-intelligence/campaign-links?limit=100&status=ACTIVE`, { cache: "no-store" });
    const data = await res.json().catch(() => null) as RegistryResponse | null;
    if (!res.ok || !data?.ok) throw new Error("failed");
    return data;
  } catch {
    return { ok: false, links: [] };
  }
}

export default async function CampaignLinksRegistryPage() {
  const data = await getRegistry();
  const links = data.links ?? [];
  const healthy = links.filter((link) => healthScore(link) >= 75).length;
  const needsWork = links.filter((link) => healthScore(link) < 55).length;

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="rounded-2xl border bg-gradient-to-l from-slate-950 via-[#025EB8] to-slate-900 p-5 text-white shadow-sm">
        <p className="text-xs text-white/70">Package 3 / Campaign Registry</p>
        <h1 className="mt-1.5 text-2xl font-black">سجل روابط الحملات</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
          سجل تشغيلي للروابط التسويقية المحفوظة. الهدف أن يصبح كل رابط قابلًا للقياس والمراجعة قبل استخدامه في الإعلانات أو الرسائل.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard/link-generator" className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-bold text-[#025EB8] hover:bg-white/90"><PlusCircle className="h-4 w-4" />إنشاء رابط</Link>
          <Link href="/dashboard/marketing/campaign-operating-center" className="inline-flex items-center gap-2 rounded-md border border-white/30 px-3 py-2 text-sm font-bold text-white hover:bg-white/10">مركز تشغيل الحملات<ArrowLeft className="h-4 w-4" /></Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Summary title="روابط محفوظة" value={links.length} />
        <Summary title="روابط صحية" value={healthy} />
        <Summary title="تحتاج تحسين" value={needsWork} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الروابط المحفوظة</CardTitle>
          <CardDescription>ابدأ من هذه الصفحة لمراجعة جودة كل رابط قبل زيادة الميزانية أو إرسال الرسائل.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {links.length > 0 ? links.map((link) => {
            const score = healthScore(link);
            return (
              <div key={objectId(link._id) || link.url || link.name} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-[#025EB8]"><Link2 className="h-4 w-4" /></span>
                      <h2 className="font-black text-slate-900">{link.name ?? link.utmCampaign ?? "Marketing link"}</h2>
                      <Badge variant="outline" className={healthClass(score)}>Health {score}%</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">{link.platform ?? "UNKNOWN"}</Badge>
                      {link.channel ? <Badge variant="outline">{link.channel}</Badge> : null}
                      {link.targetCountry ? <Badge variant="outline">{link.targetCountry}</Badge> : null}
                      {link.status ? <Badge variant="outline">{link.status}</Badge> : null}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">آخر تحديث: {dateLabel(link.updatedAt)}</div>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                  <p><span className="font-bold text-slate-900">UTM:</span> {link.utmCampaign ?? "—"}</p>
                  <p><span className="font-bold text-slate-900">Campaign:</span> {link.campaignId ?? "—"}</p>
                  <p><span className="font-bold text-slate-900">Adset:</span> {link.adsetId ?? link.adGroupId ?? "—"}</p>
                  <p><span className="font-bold text-slate-900">Ad:</span> {link.adId ?? "—"}</p>
                </div>

                {link.url ? (
                  <a href={link.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#025EB8] hover:underline">
                    فتح الرابط
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            );
          }) : <div className="rounded-2xl border bg-slate-50 p-5 text-sm text-slate-600">لا توجد روابط محفوظة بعد. ابدأ من منشئ الحملات والروابط.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ title, value }: { title: string; value: number }) {
  return <Card><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader></Card>;
}
