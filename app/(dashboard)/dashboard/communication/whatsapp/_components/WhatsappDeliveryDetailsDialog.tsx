"use client";

import { MessageCircle, TriangleAlert, SlashIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fmtFull } from "../../_shared/channel-ui";
import { buildStages, type WhatsappRow } from "./WhatsappChannelDashboard";

type Props = {
  row: WhatsappRow | null;
  trackingLive: boolean;
  onClose: () => void;
};

/**
 * One WhatsApp message's full lifecycle.
 *
 * Stages that did NOT happen are still listed: "delivered, never read" is the single most useful
 * thing this view can tell you, and a timeline that only prints the events it has would hide it.
 */
export function WhatsappDeliveryDetailsDialog({ row, trackingLive, onClose }: Props) {
  if (!row) return null;

  const failed = row.status === "FAILED" || row.status === "BOUNCED";
  const skipped = row.status === "SKIPPED";
  const stages = buildStages(row);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent dir="rtl" className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-1 border-b border-slate-100 px-5 py-4 text-right">
          <DialogTitle className="flex items-center gap-2.5 text-base font-semibold text-slate-900">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
              <MessageCircle className="h-4 w-4" />
            </span>
            {row.templateName || "رسالة واتساب"}
          </DialogTitle>
          <p className="text-[11px] text-slate-500">
            {row.recipientName || "—"} · <span dir="ltr">{row.recipientPhone || "—"}</span>
          </p>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-auto p-5">
          {failed && row.errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div className="min-w-0 text-xs leading-5 text-rose-900">
                <b className="block">سبب الفشل</b>
                <span className="break-words">{row.errorMessage}</span>
              </div>
            </div>
          )}

          {skipped && (
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <SlashIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0 text-xs leading-5 text-slate-700">
                <b className="block">لم تُرسل</b>
                <span className="break-words">{row.errorMessage || "تم تخطّي هذه الرسالة قبل الإرسال."}</span>
              </div>
            </div>
          )}

          {row.renderedBody && (
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">نص الرسالة</h3>
              <div className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs leading-6 text-slate-700">
                {row.renderedBody}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">المسار الزمني</h3>
            <ol className="relative space-y-0">
              {stages.map((stage, i) => {
                const done = Boolean(stage.at);
                const blind = !done && !stage.local && !trackingLive;
                const Icon = stage.icon;
                const last = i === stages.length - 1;
                return (
                  <li key={stage.key} className="relative flex gap-3 pb-4 last:pb-0">
                    {!last && (
                      <span
                        aria-hidden
                        className={cn("absolute top-7 h-[calc(100%-1.75rem)] w-px", done ? "bg-brand/25" : "bg-slate-200")}
                        style={{ insetInlineStart: "0.875rem" }}
                      />
                    )}
                    <span
                      className={cn(
                        "z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                        done ? "border-brand/25 bg-brand/10 text-brand" : "border-slate-200 bg-white text-slate-300",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className={cn("text-xs font-semibold", done ? "text-slate-900" : "text-slate-400")}>{stage.label}</p>
                      <p className="text-[11px] tabular-nums text-slate-500" dir="ltr">{done ? fmtFull(stage.at) : "—"}</p>
                      {blind && <p className="text-[10px] text-amber-600">لا توجد بيانات تتبّع لهذه المرحلة</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "الحالة", value: row.status },
              { label: "المصدر", value: row.origin },
              { label: "معرّف المزود", value: row.providerMessageId || "—", ltr: true },
              { label: "معرّف المحادثة", value: row.providerConversationId || "—", ltr: true },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] text-slate-400">{item.label}</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-800" dir={item.ltr ? "ltr" : undefined}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
