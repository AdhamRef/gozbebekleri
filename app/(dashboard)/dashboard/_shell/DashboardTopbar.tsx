'use client';

import { dt } from "@/lib/dashboard/i18n";
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ExternalLink, Menu, Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Crumb } from '@/lib/dashboard/breadcrumbs';
import CurrencySelector from '@/components/CurrencySelector';

type Props = {
  crumbs: Crumb[];
  onOpenSidebar: () => void;
  onOpenSearch: () => void;
  dir: 'rtl' | 'ltr';
  showWhatsappInbox?: boolean;
  whatsappInboxCount?: number;
};

function WhatsappMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="h-[22px] w-[22px] fill-current">
      <path d="M16.02 3.2A12.74 12.74 0 0 0 5.11 22.52L3.4 28.8l6.45-1.69A12.78 12.78 0 1 0 16.02 3.2Zm0 23.34c-1.94 0-3.84-.52-5.5-1.51l-.39-.23-3.83 1 1.02-3.73-.25-.39a10.54 10.54 0 1 1 8.95 4.86Zm5.79-7.9c-.32-.16-1.9-.94-2.2-1.04-.3-.11-.51-.16-.72.16-.21.31-.83 1.04-1.02 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.31-.02-.48.14-.64.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.72-.98-2.36-.26-.62-.52-.54-.72-.55h-.62c-.21 0-.56.08-.83.4-.29.32-1.1 1.08-1.1 2.62 0 1.55 1.13 3.04 1.29 3.25.16.21 2.22 3.37 5.38 4.73.75.32 1.34.52 1.8.67.76.24 1.45.21 1.99.13.61-.09 1.9-.78 2.17-1.53.27-.75.27-1.39.19-1.53-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}


export function DashboardTopbar({ crumbs, onOpenSidebar, onOpenSearch, dir, showWhatsappInbox = false, whatsappInboxCount = 0 }: Props) {
  // Chevrons are directional: in RTL the trail reads right-to-left, so the separator must
  // point left. The old shell used ChevronLeft unconditionally.
  const Separator = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <header
      className={cn(
        'sticky top-0 z-20 h-16 flex items-center justify-between gap-3 px-3 sm:px-4 lg:px-6',
        'bg-white/85 backdrop-blur-md border-b border-slate-200',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="فتح القائمة"
          aria-controls="dashboard-sidebar"
          className="lg:hidden w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="مسار التنقل" className="min-w-0">
          <ol className="flex items-center gap-1 text-[13px] min-w-0">
            {crumbs.map((crumb, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <Separator className="w-3.5 h-3.5 text-slate-300 shrink-0" aria-hidden />}
                  {crumb.href && !last ? (
                    <Link
                      href={crumb.href}
                      className="text-slate-500 hover:text-brand transition-colors truncate max-w-[9rem] sm:max-w-none"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={last ? 'page' : undefined}
                      className={cn(
                        'truncate max-w-[9rem] sm:max-w-none',
                        last ? 'font-semibold text-slate-900' : 'text-slate-400',
                      )}
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="بحث"
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <Search className="w-4 h-4" />
        </button>
        {showWhatsappInbox && (
          <Link
            href="/dashboard/communication/inbox"
            className={cn(
              "relative inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-all",
              whatsappInboxCount > 0
                ? "border-amber-300 bg-amber-50 text-amber-900 shadow-sm hover:bg-amber-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
            )}
            aria-label={whatsappInboxCount > 0 ? dt("واتساب، {0} محادثة غير مقروءة", [whatsappInboxCount]) : dt("محادثات واتساب")}
            title={whatsappInboxCount > 0 ? dt("{0} محادثة واتساب غير مقروءة", [whatsappInboxCount]) : dt("محادثات واتساب")}
          >
            {whatsappInboxCount > 0 && (
              <span className="absolute -start-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
                <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-rose-500" />
              </span>
            )}
            <WhatsappMark />
            <span className="hidden sm:inline">{whatsappInboxCount > 0 ? dt("غير مقروءة") : dt("واتساب")}</span>
            {whatsappInboxCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold tabular-nums text-white">
                {whatsappInboxCount > 99 ? "99+" : whatsappInboxCount}
              </span>
            )}
          </Link>
        )}
        <CurrencySelector showDefaultCurrencyOption onDark={false} />
        <Link
          href="/"
          target="_blank"
          className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-brand hover:border-brand-200 transition-colors whitespace-nowrap"
        >
          عرض الموقع
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
}
