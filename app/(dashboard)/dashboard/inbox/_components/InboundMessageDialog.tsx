"use client";

import * as React from "react";
import { toast } from "react-hot-toast";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, Globe, Calendar, Copy, Reply, UserCheck, UserRound } from "lucide-react";
import { subjectLabel } from "@/lib/messages/subjects";
import { LOCALE_LABELS } from "@/lib/locales";
import { cn } from "@/lib/utils";
import { type InboundMessage, senderOf, absoluteDate } from "./inbound-types";

/**
 * The full message.
 *
 * Three faults carried over from the version embedded in the old tab:
 *  - No close control at all. It was rendered with `hideCloseButton` and nothing put back, so the
 *    only exits were Esc and an overlay click — neither discoverable, and neither obvious on touch.
 *  - No scroll. The body sat in a fixed box, so a long message ran off the bottom of the viewport
 *    with no way to reach the end. It now has a scroll region and a capped height.
 *  - Nothing to do with it. This is an inbox; the point of opening a message is answering it, so
 *    the sender's address is one click to a reply and one click to the clipboard.
 */
export function InboundMessageDialog({
  message,
  locale,
  onClose,
}: {
  message: InboundMessage | null;
  locale: string;
  onClose: () => void;
}) {
  const copyEmail = React.useCallback(async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("تم نسخ البريد");
    } catch {
      toast.error("تعذّر النسخ");
    }
  }, []);

  if (!message) return null;
  const sender = senderOf(message);
  const localeLabel = LOCALE_LABELS[message.locale as keyof typeof LOCALE_LABELS] ?? message.locale;
  const replySubject = `رد على رسالتك — ${subjectLabel(message.subject, locale)}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton
        dir="rtl"
        className="flex max-h-[88vh] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-slate-200 p-4">
          <Avatar className="h-11 w-11 shrink-0 rounded-full ring-2 ring-white shadow-sm">
            <AvatarImage src={sender.image ?? undefined} alt="" />
            <AvatarFallback
              className={cn(
                "rounded-full text-sm font-semibold text-white",
                sender.isRegistered
                  ? "bg-gradient-to-br from-brand-400 to-brand-700"
                  : "bg-gradient-to-br from-slate-400 to-slate-600",
              )}
            >
              {sender.initial}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <DialogTitle className="flex items-center gap-1.5 truncate text-[15px] font-bold text-slate-900">
              {sender.isRegistered ? (
                <UserCheck className="h-4 w-4 shrink-0 text-brand" />
              ) : (
                <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
              )}
              <span className="truncate">{sender.displayName}</span>
            </DialogTitle>
            <DialogDescription className="truncate text-xs text-slate-500">
              {sender.email ?? "بلا بريد"}
            </DialogDescription>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                {subjectLabel(message.subject, locale)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
                <Globe className="h-3 w-3" />
                {localeLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
                <Calendar className="h-3 w-3" />
                {absoluteDate(message.createdAt, "long")}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="-me-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <p className="whitespace-pre-wrap break-words text-[14px] leading-7 text-slate-800">
            {message.body}
          </p>
        </div>

        {sender.email && (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copyEmail(sender.email!)}>
              <Copy className="h-3.5 w-3.5" />
              نسخ البريد
            </Button>
            <Button size="sm" className="gap-1.5 bg-brand hover:bg-brand/90" asChild>
              <a href={`mailto:${sender.email}?subject=${encodeURIComponent(replySubject)}`}>
                <Reply className="h-3.5 w-3.5" />
                رد بالبريد
              </a>
            </Button>
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}
