import Link from "next/link";
import { MessageCircle, Mail, MessageSquare, Inbox, AlertTriangle, ClipboardCheck, ScrollText, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCommunicationReport,
  reachedCount,
  engagedCount,
  sentOutCount,
  type CommunicationReport,
  type ReportRange,
  type StatusCounts,
} from "@/lib/communication/reports-service";
import { getSchedulerStatus } from "@/lib/communication/scheduler-status";
import { getCommunicationDonationOverview } from "@/lib/communication/campaign-attribution-service";
import { getBrevoSmsConfig, getNetgsmSmsConfig } from "@/lib/communication/provider-env";

export const dynamic = "force-dynamic";

const RANGES: { key: ReportRange; label: string }[] = [
  { key: "today", label: "اليوم" },
  { key: "7d", label: "آخر 7 أيام" },
  { key: "30d", label: "آخر 30 يوم" },
  { key: "all", label: "الكل" },
];

const CHANNELS: { key: string; label: string; icon: typeof MessageCircle; color: string }[] = [
  { key: "WHATSAPP", label: "واتساب", icon: MessageCircle, color: "text-emerald-600" },
  { key: "EMAIL", label: "الإيميل", icon: Mail, color: "text-[#025EB8]" },
  { key: "SMS", label: "الرسائل القصيرة", icon: MessageSquare, color: "text-amber-600" },
];

const INBOX = "/dashboard/operations/communication/inbox";
const NEW_CAMPAIGN = "/dashboard/operations/communication/campaigns";
const ADVANCED_LOGS = "/dashboard/operations/communication/delivery-logs";

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const p = pct(value, total);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-bold text-slate-700">{value.toLocaleString("ar")}{total > 0 ? <span className="text-slate-400"> · {p}%</span> : null}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

function ChannelCard({ label, icon: Icon, color, counts, disabled }: { label: string; icon: typeof MessageCircle; color: string; counts: StatusCounts; disabled?: boolean }) {
  const prepared = counts.total;
  const sentOut = sentOutCount(counts);
  const reached = reachedCount(counts);
  const engaged = engagedCount(counts);
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 ${color}`} /> {label}
          {disabled ? <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">غير مفعّل</span> : null}
        </CardTitle>
        <CardDescription>{disabled ? "الإرسال عبر هذه القناة غير مفعّل بعد." : prepared > 0 ? <>تم تجهيز <b className="text-slate-700">{prepared.toLocaleString("ar")}</b> رسالة في هذه الفترة.</> : "لا رسائل في هذه الفترة."}</CardDescription>
      </CardHeader>
      {!disabled && prepared > 0 ? (
        <CardContent className="space-y-2.5">
          <Bar label="أُرسلت" value={sentOut} total={prepared} color="bg-slate-400" />
          <Bar label="وصلت" value={reached} total={prepared} color="bg-emerald-500" />
          <Bar label="تمت القراءة / فُتحت" value={engaged} total={prepared} color="bg-[#025EB8]" />
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs">
            {counts.replied > 0 ? <span className="text-emerald-700">رد المتبرع: <b>{counts.replied.toLocaleString("ar")}</b></span> : null}
            <span className="text-rose-700">فشلت: <b>{counts.failed.toLocaleString("ar")}</b></span>
            <span className="text-amber-700">لم تُرسل: <b>{counts.skipped.toLocaleString("ar")}</b></span>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

function HeadlineCard({ label, value, caption, tone, href, cta }: { label: string; value: number; caption: string; tone?: "bad" | "warn" | "ok"; href?: string; cta?: string }) {
  const valueColor = tone === "bad" ? "text-rose-700" : tone === "warn" ? "text-amber-700" : tone === "ok" ? "text-emerald-700" : "text-slate-900";
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="text-xs text-slate-500">{label}</div>
        <div className={`mt-1 text-2xl font-black ${valueColor}`}>{value.toLocaleString("ar")}</div>
        <div className="mt-0.5 text-[11px] text-slate-400">{caption}</div>
        {href && cta ? <Link href={href} className="mt-1.5 inline-block text-xs font-semibold text-[#025EB8] underline">{cta}</Link> : null}
      </CardContent>
    </Card>
  );
}

export default async function CommunicationReportsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const range: ReportRange = RANGES.some((r) => r.key === sp.range) ? (sp.range as ReportRange) : "30d";

  let report: CommunicationReport | null = null;
  try {
    report = await getCommunicationReport(range);
  } catch {
    report = null;
  }
  const scheduler = await getSchedulerStatus().catch(() => null);
  const donations = await getCommunicationDonationOverview().catch(() => null);
  const smsEnabled = getBrevoSmsConfig().configured || getNetgsmSmsConfig().configured;
  const empty = !report || report.totalDeliveries === 0;
  const money = (n: number) => `${n.toLocaleString("ar")}$`;

  // Consolidated "needs action now" items — the first thing a manager should see.
  const pastDue = scheduler?.dueCount ?? 0;
  const actionItems = report
    ? [
        { key: "failed", count: report.headline.failed, label: "رسائل فشلت", href: ADVANCED_LOGS, cta: "فتح السجل", tone: "bad" as const },
        { key: "skipped", count: report.totals.skipped, label: "رسائل لم تُرسل بسبب إعداد ناقص", href: ADVANCED_LOGS, cta: "فتح السجل", tone: "warn" as const },
        { key: "replies", count: report.headline.repliesNeedingAction, label: "ردود تحتاج متابعة", href: INBOX, cta: "فتح الصندوق", tone: "warn" as const },
        { key: "pastDue", count: pastDue, label: "حملات مجدولة فات موعدها ولم تُرسل", href: NEW_CAMPAIGN, cta: "فتح الحملات", tone: "warn" as const },
      ].filter((a) => a.count > 0)
    : [];

  return (
    <main className="space-y-5" dir="rtl">
      {/* Header — compact */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold text-[#025EB8]">مركز التواصل / النتائج</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">نتائج التواصل</h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">أداء رسائل واتساب، الإيميل، والرسائل القصيرة حسب القناة واللغة.</p>
          </div>
          <Button asChild variant="outline" className="gap-2 font-bold"><Link href={ADVANCED_LOGS}><ScrollText className="h-4 w-4" /> فتح سجل الرسائل</Link></Button>
        </div>
        {/* Date filter */}
        <div className="mt-4 inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {RANGES.map((r) => {
            const active = r.key === range;
            return (
              <Link key={r.key} href={`?range=${r.key}`} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${active ? "bg-[#025EB8] text-white" : "text-slate-600 hover:bg-slate-200"}`}>{r.label}</Link>
            );
          })}
        </div>
      </section>

      {empty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <p className="text-sm text-slate-500">لا توجد رسائل في هذه الفترة بعد.</p>
            <Button asChild className="gap-2"><Link href={NEW_CAMPAIGN}><Megaphone className="h-4 w-4" /> إنشاء حملة</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Headline metrics */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <HeadlineCard label="تم التجهيز/الإرسال" value={report!.headline.prepared} caption="كل الرسائل المُجهّزة" />
            <HeadlineCard label="وصل / قُبل" value={report!.headline.reached} caption="وصلت إلى المستلمين" tone="ok" />
            <HeadlineCard label="قرأ / فتح" value={report!.headline.engaged} caption="قرأها أو فتحها المستلمون" />
            <HeadlineCard label="فشل" value={report!.headline.failed} caption="لم تنجح" tone={report!.headline.failed > 0 ? "bad" : undefined} />
            <HeadlineCard label="ردود تحتاج متابعة" value={report!.headline.repliesNeedingAction} caption="محادثات واتساب بانتظار الرد" tone={report!.headline.repliesNeedingAction > 0 ? "warn" : undefined} href={INBOX} cta="فتح الصندوق" />
          </section>

          {/* 1. What needs action now */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-500"><AlertTriangle className="h-4 w-4 text-amber-600" /> ما يحتاج تدخل الآن</h2>
            <Card className="border-slate-200">
              <CardContent className="p-0">
                {actionItems.length === 0 ? (
                  <p className="p-6 text-center text-sm text-emerald-700">لا توجد مشاكل واضحة في هذه الفترة.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {actionItems.map((a) => (
                      <li key={a.key} className="flex items-center justify-between gap-3 p-3.5 text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-black ${a.tone === "bad" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{a.count.toLocaleString("ar")}</span>
                          <span className="font-semibold text-slate-800">{a.label}</span>
                        </div>
                        <Link href={a.href} className="shrink-0 text-xs font-bold text-[#025EB8] underline-offset-4 hover:underline">{a.cta} ←</Link>
                      </li>
                    ))}
                    {scheduler && pastDue > 0 && !scheduler.configured ? (
                      <li className="bg-amber-50 p-3 text-xs leading-6 text-amber-900">التنفيذ التلقائي غير مفعّل — فعّل Cron أو شغّل الحملات يدويًا من صفحة الحملة.</li>
                    ) : null}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          {/* 2. Performance by channel */}
          <section>
            <h2 className="mb-3 text-sm font-bold text-slate-500">الأداء حسب القناة</h2>
            <div className="grid gap-3 lg:grid-cols-3">
              {CHANNELS.map((ch) => {
                const row = report!.byChannel.find((c) => c.channel === ch.key);
                const counts = row?.counts ?? { total: 0, sent: 0, delivered: 0, read: 0, opened: 0, clicked: 0, replied: 0, failed: 0, skipped: 0 };
                return <ChannelCard key={ch.key} label={ch.label} icon={ch.icon} color={ch.color} counts={counts} disabled={ch.key === "SMS" && !smsEnabled && counts.total === 0} />;
              })}
            </div>
          </section>

          {/* 2. Performance by language */}
          {report!.byLanguage.length > 0 ? (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">الأداء حسب اللغة</CardTitle></CardHeader>
              <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[40rem] text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500"><tr>
                  <th className="p-3 text-right">اللغة</th><th className="p-3 text-center">المجموع</th><th className="p-3 text-center">أُرسلت</th><th className="p-3 text-center">وصلت</th><th className="p-3 text-center">تمت القراءة/فُتحت</th><th className="p-3 text-center">فشلت</th><th className="p-3 text-center">لم تُرسل</th>
                </tr></thead>
                <tbody>{report!.byLanguage.map((l) => (
                  <tr key={l.locale} className="border-b last:border-0">
                    <td className="p-3 font-semibold">{l.label}</td>
                    <td className="p-3 text-center">{l.counts.total.toLocaleString("ar")}</td>
                    <td className="p-3 text-center text-slate-600">{sentOutCount(l.counts).toLocaleString("ar")}</td>
                    <td className="p-3 text-center text-emerald-700">{reachedCount(l.counts).toLocaleString("ar")}</td>
                    <td className="p-3 text-center text-blue-700">{engagedCount(l.counts).toLocaleString("ar")}</td>
                    <td className="p-3 text-center text-rose-700">{l.counts.failed.toLocaleString("ar")}</td>
                    <td className="p-3 text-center text-amber-700">{l.counts.skipped.toLocaleString("ar")}</td>
                  </tr>
                ))}</tbody>
              </table></div></CardContent>
            </Card>
          ) : null}

          {/* 3. Top failure reasons */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-rose-600" /> أكثر أسباب الفشل</CardTitle></CardHeader>
            <CardContent>
              {report!.failureReasons.length === 0 ? (
                <p className="py-4 text-center text-sm text-emerald-700">لا توجد رسائل فاشلة في هذه الفترة.</p>
              ) : (
                <ul className="space-y-2">{report!.failureReasons.map((f) => (
                  <li key={f.reason} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-700">{f.reason}</span>
                    <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">{f.count.toLocaleString("ar")}</Badge>
                  </li>
                ))}</ul>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* 4. Conversations needing reply */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Inbox className="h-4 w-4 text-amber-600" /> محادثات تحتاج رد</CardTitle></CardHeader>
              <CardContent>
                {report!.conversationsNeedingReply.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">لا توجد محادثات تنتظر الرد.</p>
                ) : (
                  <ul className="space-y-2">{report!.conversationsNeedingReply.map((c) => (
                    <li key={c.phone} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">{c.name ?? "متبرع غير معروف"}</span>
                        <span dir="ltr" className="text-xs text-slate-400">{c.phone}</span>
                      </div>
                      {c.lastInboundText ? <p className="mt-0.5 truncate text-xs text-slate-500">{c.lastInboundText}</p> : null}
                    </li>
                  ))}</ul>
                )}
                <Link href={INBOX} className="mt-3 inline-block text-xs font-semibold text-[#025EB8] underline">فتح صندوق الوارد</Link>
              </CardContent>
            </Card>

            {/* 5. Campaigns needing review */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4 text-[#025EB8]" /> حملات تحتاج مراجعة</CardTitle></CardHeader>
              <CardContent>
                {report!.campaignsNeedingReview.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">لا توجد حملات تنتظر إجراءً.</p>
                ) : (
                  <ul className="space-y-2">{report!.campaignsNeedingReview.map((c) => (
                    <li key={c.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                      <Link href={`${NEW_CAMPAIGN}/${c.id}`} className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-slate-800">{c.name}</span>
                        <Badge variant="outline" className="shrink-0 border-amber-200 bg-amber-50 text-amber-700">{c.reason}</Badge>
                      </Link>
                    </li>
                  ))}</ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 6. Skipped due to missing setup / approval */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">رسائل لم تُرسل — تحتاج إعدادًا أو موافقة</CardTitle>
              <CardDescription>رسائل تخطّاها النظام بأمان بدل إرسالها ناقصة. عالِج السبب ثم أعد المحاولة.</CardDescription>
            </CardHeader>
            <CardContent>
              {report!.skippedReasons.length === 0 ? (
                <p className="py-4 text-center text-sm text-emerald-700">لا توجد رسائل متخطاة في هذه الفترة.</p>
              ) : (
                <ul className="space-y-2">{report!.skippedReasons.map((s) => (
                  <li key={s.reason} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-700">{s.reason}</span>
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">{s.count.toLocaleString("ar")}</Badge>
                  </li>
                ))}</ul>
              )}
              {report!.missingTemplateLanguages.length > 0 ? (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
                  <b>لغات لها متبرعون بلا قالب:</b>{" "}
                  {report!.missingTemplateLanguages.map((m) => `${CHANNELS.find((c) => c.key === m.channel)?.label ?? m.channel}: ${m.locales.join(", ")}`).join(" · ")}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* ── Donation attribution (real data via tracking links) ── */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-500">التبرعات المنسوبة لحملات التواصل</h2>
            {!donations || !donations.hasData ? (
              <Card><CardContent className="p-6 text-center text-sm text-slate-500">لا توجد تبرعات منسوبة بعد. اربط روابط تتبع بحملاتك ليُحسب أثرها على التبرعات. الزيارات غير مُسجّلة (غير متاحة).</CardContent></Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {/* 1. By channel */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">التبرعات حسب القناة</CardTitle></CardHeader>
                  <CardContent>
                    {donations.byChannel.length === 0 ? <p className="py-3 text-center text-sm text-slate-400">غير متاح</p> : (
                      <ul className="space-y-2">{donations.byChannel.map((c) => (
                        <li key={c.source} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                          <span className="font-semibold text-slate-700">{c.label}</span>
                          <span className="text-slate-500">{c.count.toLocaleString("ar")} تبرع · <b className="text-emerald-700">{money(c.valueUSD)}</b></span>
                        </li>
                      ))}</ul>
                    )}
                  </CardContent>
                </Card>

                {/* 2. By language */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">التبرعات حسب اللغة</CardTitle></CardHeader>
                  <CardContent>
                    {donations.byLanguage.length === 0 ? <p className="py-3 text-center text-sm text-slate-400">غير متاح</p> : (
                      <ul className="space-y-2">{donations.byLanguage.map((l) => (
                        <li key={l.locale} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                          <span className="font-semibold text-slate-700">{l.label}</span>
                          <span className="text-slate-500">{l.count.toLocaleString("ar")} تبرع · <b className="text-emerald-700">{money(l.valueUSD)}</b></span>
                        </li>
                      ))}</ul>
                    )}
                  </CardContent>
                </Card>

                {/* 3. Best campaigns */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">أفضل حملات التواصل</CardTitle></CardHeader>
                  <CardContent>
                    {donations.bestCampaigns.length === 0 ? <p className="py-3 text-center text-sm text-slate-400">غير متاح</p> : (
                      <ul className="space-y-2">{donations.bestCampaigns.map((c) => (
                        <li key={c.campaignId} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                          <Link href={`/dashboard/operations/communication/campaigns/${c.campaignId}`} className="flex items-center justify-between gap-2">
                            <span className="truncate font-semibold text-slate-800">{c.name}</span>
                            <span className="shrink-0 text-slate-500">{c.count.toLocaleString("ar")} · <b className="text-emerald-700">{money(c.valueUSD)}</b></span>
                          </Link>
                        </li>
                      ))}</ul>
                    )}
                  </CardContent>
                </Card>

                {/* 4. Campaigns without tracking links + 5. Failed attempts */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">حملات بدون روابط تتبع</CardTitle><CardDescription>لا يمكن حساب تبرعاتها بدقة حتى تُربط برابط تتبع.</CardDescription></CardHeader>
                    <CardContent>
                      {donations.campaignsWithoutLinks.length === 0 ? <p className="py-3 text-center text-sm text-emerald-700">كل الحملات مرتبطة بروابط تتبع.</p> : (
                        <ul className="space-y-1.5">{donations.campaignsWithoutLinks.map((c) => (
                          <li key={c.id}><Link href={`/dashboard/operations/communication/campaigns/${c.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs"><span className="truncate font-semibold text-slate-700">{c.name}</span><span className="shrink-0 text-slate-400">ربط رابط ←</span></Link></li>
                        ))}</ul>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">محاولات دفع فاشلة</CardTitle></CardHeader>
                    <CardContent>
                      {donations.failed ? (
                        <p className="text-sm text-slate-600"><b className="text-rose-700">{donations.failed.count.toLocaleString("ar")}</b> محاولة فاشلة منسوبة · قيمة تقديرية <b>{money(donations.failed.valueUSD)}</b></p>
                      ) : (
                        <p className="text-sm text-slate-400">لا يوجد محاولات دفع فاشلة منسوبة في هذه البيانات.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </section>

          {/* Advanced logs link — kept out of the way, not the primary view */}
          <div className="flex justify-center pt-1">
            <Button asChild variant="outline" className="gap-2"><Link href={ADVANCED_LOGS}><ScrollText className="h-4 w-4" /> فتح سجل الرسائل المتقدم</Link></Button>
          </div>
        </>
      )}
    </main>
  );
}
