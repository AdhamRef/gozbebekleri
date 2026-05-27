"use client";

import * as React from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ConversionEventRow = {
  _id?: { $oid?: string } | string;
  eventId?: string;
  eventName?: string;
  platform?: string;
  channel?: string;
  status?: string;
  donationId?: string;
  value?: number;
  currency?: string;
  attempts?: number;
  error?: string | null;
  createdAt?: string | { $date?: string };
  sentAt?: string | { $date?: string } | null;
};

type ApiResponse = {
  ok: boolean;
  total: number;
  events: ConversionEventRow[];
};

function renderDate(value: ConversionEventRow["createdAt"]) {
  if (!value) return "—";
  const raw = typeof value === "string" ? value : value.$date;
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar", { dateStyle: "short", timeStyle: "short" });
}

function rowKey(row: ConversionEventRow, index: number) {
  if (typeof row._id === "string") return row._id;
  return row._id?.$oid ?? row.eventId ?? String(index);
}

export default function ConversionEventsPage() {
  const [events, setEvents] = React.useState<ConversionEventRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [platform, setPlatform] = React.useState("all");
  const [channel, setChannel] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [days, setDays] = React.useState("7");
  const [q, setQ] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ platform, channel, status, days, limit: "100" });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/conversion-events?${params.toString()}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !data?.ok) throw new Error("failed");
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("تعذر تحميل أحداث التحويل");
      setEvents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [platform, channel, status, days, q]);

  React.useEffect(() => { void load(); }, [load]);

  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black text-slate-950">أحداث التحويل</h1>
        <p className="mt-1 text-sm text-slate-500">سجل ConversionEvent الموحد لفحص إرسال التحويلات حسب المنصة والقناة والحالة.</p>
      </div>
      <Button onClick={load} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>الفلاتر</CardTitle>
        <CardDescription>اعرض آخر أحداث التحويل أو ابحث برقم التبرع أو event id أو الخطأ.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Select value={platform} onValueChange={setPlatform}><SelectTrigger><SelectValue placeholder="المنصة" /></SelectTrigger><SelectContent><SelectItem value="all">كل المنصات</SelectItem><SelectItem value="META">Meta</SelectItem><SelectItem value="GA4">GA4</SelectItem><SelectItem value="GOOGLE_ADS">Google Ads</SelectItem><SelectItem value="TIKTOK">TikTok</SelectItem><SelectItem value="X">X</SelectItem><SelectItem value="VERCEL">Vercel</SelectItem></SelectContent></Select>
        <Select value={channel} onValueChange={setChannel}><SelectTrigger><SelectValue placeholder="القناة" /></SelectTrigger><SelectContent><SelectItem value="all">كل القنوات</SelectItem><SelectItem value="server">Server</SelectItem><SelectItem value="browser">Browser</SelectItem></SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem><SelectItem value="SENT">SENT</SelectItem><SelectItem value="FAILED">FAILED</SelectItem><SelectItem value="SKIPPED">SKIPPED</SelectItem><SelectItem value="PENDING">PENDING</SelectItem></SelectContent></Select>
        <Select value={days} onValueChange={setDays}><SelectTrigger><SelectValue placeholder="الفترة" /></SelectTrigger><SelectContent><SelectItem value="1">آخر يوم</SelectItem><SelectItem value="7">آخر 7 أيام</SelectItem><SelectItem value="30">آخر 30 يوم</SelectItem><SelectItem value="90">آخر 90 يوم</SelectItem></SelectContent></Select>
        <div className="relative"><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." className="pr-9" /></div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>السجل</CardTitle>
        <CardDescription>إجمالي مطابق للفلاتر: {total}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex min-h-[18rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 text-right">التاريخ</th>
                <th className="px-3 py-2 text-right">المنصة</th>
                <th className="px-3 py-2 text-right">القناة</th>
                <th className="px-3 py-2 text-right">الحدث</th>
                <th className="px-3 py-2 text-right">الحالة</th>
                <th className="px-3 py-2 text-right">المبلغ</th>
                <th className="px-3 py-2 text-right">محاولات</th>
                <th className="px-3 py-2 text-right">Donation ID</th>
                <th className="px-3 py-2 text-right">Event ID</th>
                <th className="px-3 py-2 text-right">خطأ</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? <tr><td colSpan={10} className="px-3 py-10 text-center text-slate-500">لا توجد أحداث مطابقة.</td></tr> : events.map((row, index) => <tr key={rowKey(row, index)} className="border-t">
                <td className="whitespace-nowrap px-3 py-2">{renderDate(row.createdAt)}</td>
                <td className="px-3 py-2 font-semibold">{row.platform ?? "—"}</td>
                <td className="px-3 py-2">{row.channel ?? "—"}</td>
                <td className="px-3 py-2">{row.eventName ?? "—"}</td>
                <td className="px-3 py-2">{row.status ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2">{typeof row.value === "number" ? `${row.value} ${row.currency ?? ""}` : "—"}</td>
                <td className="px-3 py-2">{row.attempts ?? 0}</td>
                <td className="max-w-[13rem] truncate px-3 py-2 font-mono text-xs">{row.donationId ?? "—"}</td>
                <td className="max-w-[16rem] truncate px-3 py-2 font-mono text-xs">{row.eventId ?? "—"}</td>
                <td className="max-w-[20rem] truncate px-3 py-2 text-xs text-rose-700">{row.error ?? "—"}</td>
              </tr>)}
            </tbody>
          </table>
        </div>}
      </CardContent>
    </Card>
  </div>;
}
