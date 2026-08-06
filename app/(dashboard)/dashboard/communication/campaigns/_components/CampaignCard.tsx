"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Users, Send, CheckCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCALE_LABELS } from "@/lib/locales";
import { type CampaignRow, channelMeta, statusMeta, hasResults, audienceLabel } from "./campaign-ui";

/** A metric only earns a slot once it can be non-zero — an all-zero row of stats reads as broken. */
function Stat({ icon: Icon, value, label, tone }: { icon: typeof Send; value: number; label: string; tone?: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className={cn("flex items-center gap-1 text-sm font-bold tabular-nums", tone ?? "text-slate-900")}>
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
        {value.toLocaleString("en-US")}
      </p>
      <p className="truncate text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

/**
 * One campaign.
 *
 * The card links to two different places on purpose. The body opens the campaign itself — audience,
 * template, the send controls. The footer link jumps to the channel dashboard scoped to this
 * campaign, which is where its delivery funnel actually lives. Duplicating that funnel here would
 * mean two implementations of the same numbers, free to disagree.
 */
export function CampaignCard({ campaign }: { campaign: CampaignRow }) {
  const ch = channelMeta(campaign.channel);
  const st = statusMeta(campaign.status);
  const Icon = ch.icon;
  const showResults = hasResults(campaign);

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-brand/40 hover:shadow-md">
      <Link
        href={`/dashboard/communication/campaigns/${campaign.id}`}
        className="flex flex-1 flex-col gap-3 p-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
      >
        <div className="flex items-start gap-2.5">
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", ch.tile)}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-slate-900">{campaign.name}</p>
            <p className="truncate text-[11px] text-slate-500">{ch.label}</p>
          </div>
          <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", st.tone)}>
            {st.label}
          </span>
        </div>

        {showResults ? (
          <div className="flex items-stretch gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2">
            <Stat icon={Send} value={campaign.sentCount} label="أُرسلت" />
            <Stat icon={CheckCheck} value={campaign.deliveredCount} label="وصلت" tone="text-emerald-700" />
            {campaign.failedCount > 0 && (
              <Stat icon={TriangleAlert} value={campaign.failedCount} label="فشلت" tone="text-rose-700" />
            )}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-2 py-2 text-[11px] text-slate-500">
            لم تُرسل بعد — لا توجد نتائج لعرضها.
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {audienceLabel(campaign.audienceSegmentKey, LOCALE_LABELS)}
          </span>
          {campaign.scheduledAt && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(campaign.scheduledAt).toLocaleDateString("ar-EG", { dateStyle: "medium" })}
            </span>
          )}
        </div>
      </Link>

      {showResults && (
        <Link
          href={`${ch.href}?campaign=${campaign.id}`}
          className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-3.5 py-2 text-[11px] font-medium text-slate-500 transition-colors hover:bg-brand-50 hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
        >
          <span>عرض الأداء في صفحة {ch.label}</span>
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
