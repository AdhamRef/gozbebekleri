"use client";

import { Mail, MailCheck, MailOpen, MousePointerClick, Send, TriangleAlert, SlashIcon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { EmailRow } from "./EmailChannelDashboard";

type Props = {
  row: EmailRow | null;
  trackingLive: boolean;
  onClose: () => void;
};

function fmt(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "Europe/Istanbul" })} · ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Europe/Istanbul" })}`;
}

/**
 * One message's full lifecycle.
 *
 * The vertical timeline is deliberately ordered by the stage, not by which timestamps happen to
 * exist — a reader needs to see the gap ("delivered, never opened") as much as the events, and a
 * list that silently omits unreached stages hides exactly that.
 */
export function EmailDeliveryDetailsDialog({ row, trackingLive, onClose }: Props) {
  if (!row) return null;

  const failed = row.status === "FAILED" || row.status === "BOUNCED";
  const skipped = row.status === "SKIPPED";

  const stages = [
    { label: "أُنشئت", at: row.createdAt, icon: Send, always: true },
    { label: "سُلّمت للمزود", at: row.sentAt, icon: Mail, always: true },
    { label: "وصلت للمستلم", at: row.deliveredAt, icon: MailCheck },
    { label: "فُتحت", at: row.openedAt, icon: MailOpen },
    { label: "نُقر على رابط", at: row.clickedAt, icon: MousePointerClick },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent dir="rtl" className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-1 border-b border-slate-100 px-5 py-4 text-right">
          <DialogTitle className="flex items-center gap-2.5 text-base font-semibold text-slate-900">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
              <Mail className="h-4 w-4" />
            </span>
            {row.renderedSubject || "رسالة بريد"}
          </DialogTitle>
          <p className="text-[11px] text-slate-500">
            {row.templateName || "—"} · <span dir="ltr">{row.recipientEmail || "—"}</span>
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

          <div>
            <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">المسار الزمني</h3>
            <ol className="relative space-y-0">
              {stages.map((stage, i) => {
                const done = Boolean(stage.at);
                const blind = !done && !stage.always && !trackingLive;
                const Icon = stage.icon;
                const last = i === stages.length - 1;
                return (
                  <li key={stage.label} className="relative flex gap-3 pb-4 last:pb-0">
                    {!last && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-7 h-[calc(100%-1.75rem)] w-px",
                          done ? "bg-brand/25" : "bg-slate-200",
                        )}
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
                      <p className={cn("text-xs font-semibold", done ? "text-slate-900" : "text-slate-400")}>
                        {stage.label}
                      </p>
                      <p className="text-[11px] tabular-nums text-slate-500" dir="ltr">
                        {done ? fmt(stage.at) : blind ? "—" : "—"}
                      </p>
                      {blind && (
                        <p className="text-[10px] text-amber-600">لا توجد بيانات تتبّع لهذه المرحلة</p>
                      )}
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
              { label: "المستلم", value: row.recipientName || "—" },
              { label: "معرّف المزود", value: row.providerMessageId || "—", ltr: true },
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
