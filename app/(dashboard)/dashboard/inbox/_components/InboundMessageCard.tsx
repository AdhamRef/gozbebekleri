"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Globe, UserCheck, UserRound } from "lucide-react";
import { subjectLabel } from "@/lib/messages/subjects";
import { LOCALE_LABELS } from "@/lib/locales";
import { cn } from "@/lib/utils";
import { type InboundMessage, senderOf, relativeTime, absoluteDate } from "./inbound-types";

/**
 * One inbound message, as a card.
 *
 * Replaces a six-column table. A table implies you scan down a column to compare values, but the
 * only column anyone actually reads here is the message body — and that was the one truncated to a
 * single line inside a 240px cell. Below `lg` the table also just became a horizontal scroll box,
 * so on a phone the body column was the part you had to drag sideways to reach.
 *
 * The whole card is the button rather than a trailing «عرض» link: the entire surface is the target,
 * which matters most on touch, and it keeps a single focus stop per message instead of one row plus
 * one nested control.
 */
export function InboundMessageCard({
  message,
  locale,
  onOpen,
}: {
  message: InboundMessage;
  locale: string;
  onOpen: () => void;
}) {
  const sender = senderOf(message);
  const localeLabel = LOCALE_LABELS[message.locale as keyof typeof LOCALE_LABELS] ?? message.locale;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-start",
        "transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
      )}
      aria-label={`عرض رسالة من ${sender.displayName}`}
    >
      <div className="flex items-start gap-2.5 border-b border-slate-100 p-3">
        <Avatar className="h-9 w-9 shrink-0 rounded-full ring-1 ring-slate-200">
          <AvatarImage src={sender.image ?? undefined} alt="" />
          <AvatarFallback
            className={cn(
              "rounded-full text-xs font-bold text-white",
              sender.isRegistered
                ? "bg-gradient-to-br from-brand-400 to-brand-700"
                : "bg-gradient-to-br from-slate-400 to-slate-600",
            )}
          >
            {sender.initial}
          </AvatarFallback>
        </Avatar>

        {/* min-w-0 is what lets the long email truncate instead of stretching the card. */}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-[13px] font-semibold text-slate-900">
            {sender.isRegistered ? (
              <UserCheck className="h-3.5 w-3.5 shrink-0 text-brand" aria-label="مستخدم مسجل" />
            ) : (
              <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="زائر" />
            )}
            <span className="truncate">{sender.displayName}</span>
          </p>
          <p className="truncate text-[11px] text-slate-500" title={sender.email ?? undefined}>
            {sender.email ?? "بلا بريد"}
          </p>
        </div>

        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600"
          title={`لغة الرسالة: ${localeLabel}`}
        >
          <Globe className="h-3 w-3" />
          {localeLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <span className="inline-flex w-fit max-w-full items-center truncate rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
          {subjectLabel(message.subject, locale)}
        </span>
        {/* line-clamp-4 instead of a one-line truncate: four lines is enough to tell a real
            enquiry from spam without opening it. */}
        <p className="line-clamp-4 whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-700">
          {message.body}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-3 py-2">
        <span className="truncate text-[11px] text-slate-500" title={absoluteDate(message.createdAt, "long")}>
          {relativeTime(message.createdAt)}
        </span>
        <span className="shrink-0 text-[11px] font-medium text-slate-400 transition-colors group-hover:text-brand">
          عرض الرسالة
        </span>
      </div>
    </button>
  );
}
