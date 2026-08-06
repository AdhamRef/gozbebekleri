"use client";

import * as React from "react";
import axios from "axios";
import { useLocale } from "next-intl";
import { toast } from "react-hot-toast";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Inbox, RefreshCw, X, ArrowDownWideNarrow } from "lucide-react";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { LOCALE_LABELS } from "@/lib/locales";
import { MESSAGE_SUBJECTS, subjectLabel, type MessageSubject } from "@/lib/messages/subjects";
import { cn } from "@/lib/utils";
import { InboundMessageCard } from "./InboundMessageCard";
import { InboundMessageDialog } from "./InboundMessageDialog";
import type { InboundMessage } from "./inbound-types";

const PAGE_SIZE = 12;

type SortBy = "createdAt" | "body";
type SortOrder = "asc" | "desc";

const DEFAULTS = {
  localeFilter: "all",
  subjectFilter: "all",
  hasUserFilter: "all",
  sortBy: "createdAt" as SortBy,
  sortOrder: "desc" as SortOrder,
};

/** Compact select — the six filters previously used a 7-column grid that collapsed to one on phones. */
function FilterSelect({
  value,
  onValueChange,
  label,
  children,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-9 min-w-0 flex-1 rounded-lg border-slate-200 bg-slate-50 px-3 text-xs sm:flex-none sm:basis-[9.5rem]",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

export function InboundMessagesView() {
  const locale = useLocale();
  const [messages, setMessages] = React.useState<InboundMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [localeFilter, setLocaleFilter] = React.useState(DEFAULTS.localeFilter);
  const [subjectFilter, setSubjectFilter] = React.useState(DEFAULTS.subjectFilter);
  const [hasUserFilter, setHasUserFilter] = React.useState(DEFAULTS.hasUserFilter);
  const [sortBy, setSortBy] = React.useState<SortBy>(DEFAULTS.sortBy);
  const [sortOrder, setSortOrder] = React.useState<SortOrder>(DEFAULTS.sortOrder);
  const [selected, setSelected] = React.useState<InboundMessage | null>(null);

  const fetchMessages = React.useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(PAGE_SIZE),
          sortBy,
          sortOrder,
        });
        if (search) params.set("search", search);
        if (localeFilter !== "all") params.set("locale", localeFilter);
        if (subjectFilter !== "all") params.set("subject", subjectFilter);
        if (hasUserFilter === "yes") params.set("hasUser", "true");
        if (hasUserFilter === "no") params.set("hasUser", "false");

        const res = await axios.get(`/api/admin/messages?${params}`);
        const list: InboundMessage[] = res.data?.messages ?? [];
        setMessages((prev) => (append ? [...prev, ...list] : list));
        setTotal(res.data?.pagination?.total ?? 0);
      } catch (err) {
        console.error("Error fetching messages:", err);
        toast.error("فشل في تحميل الرسائل");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, localeFilter, subjectFilter, hasUserFilter, sortBy, sortOrder],
  );

  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => {
    setPage(1);
    fetchMessages(1, false);
  }, [fetchMessages]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchMessages(next, true);
  };

  const hasMore = messages.length < total;

  /**
   * Which filters are actually narrowing the list, as removable chips.
   *
   * The old bar gave no indication that a filter was set beyond the select's own value, so an
   * empty result read as "there are no messages" rather than "you filtered them all out".
   */
  const activeFilters = [
    search && { key: "search", label: `بحث: ${search}`, clear: () => setSearchInput("") },
    localeFilter !== "all" && {
      key: "locale",
      label: `اللغة: ${LOCALE_LABELS[localeFilter as keyof typeof LOCALE_LABELS] ?? localeFilter}`,
      clear: () => setLocaleFilter("all"),
    },
    hasUserFilter !== "all" && {
      key: "hasUser",
      label: hasUserFilter === "yes" ? "مستخدم مسجل" : "زائر",
      clear: () => setHasUserFilter("all"),
    },
    subjectFilter !== "all" && {
      key: "subject",
      label: `النوع: ${subjectLabel(subjectFilter as MessageSubject, locale)}`,
      clear: () => setSubjectFilter("all"),
    },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const resetAll = () => {
    setSearchInput("");
    setLocaleFilter(DEFAULTS.localeFilter);
    setSubjectFilter(DEFAULTS.subjectFilter);
    setHasUserFilter(DEFAULTS.hasUserFilter);
    setSortBy(DEFAULTS.sortBy);
    setSortOrder(DEFAULTS.sortOrder);
  };

  return (
    <div dir="rtl">
      <FilterBar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="ابحث في نص الرسائل…"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => fetchMessages(1, false)}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
        }
      >
        {/* `flex-1 basis-[9.5rem]` per select: they share a row on desktop and reflow to two
            per row on a phone, instead of the old seven-column grid that stacked to a
            full-width column each. */}
        <FilterSelect value={localeFilter} onValueChange={setLocaleFilter} label="تصفية باللغة">
          <SelectItem value="all" className="text-xs">كل اللغات</SelectItem>
          {Object.entries(LOCALE_LABELS).map(([code, label]) => (
            <SelectItem key={code} value={code} className="text-xs">{label}</SelectItem>
          ))}
        </FilterSelect>

        <FilterSelect value={hasUserFilter} onValueChange={setHasUserFilter} label="تصفية بنوع المرسل">
          <SelectItem value="all" className="text-xs">كل المرسلين</SelectItem>
          <SelectItem value="yes" className="text-xs">مستخدم مسجل</SelectItem>
          <SelectItem value="no" className="text-xs">زائر</SelectItem>
        </FilterSelect>

        <FilterSelect value={subjectFilter} onValueChange={setSubjectFilter} label="تصفية بالنوع">
          <SelectItem value="all" className="text-xs">كل الأنواع</SelectItem>
          {MESSAGE_SUBJECTS.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">{subjectLabel(s, locale)}</SelectItem>
          ))}
        </FilterSelect>

        {/* Sort field and direction were two separate selects for four total combinations;
            one select spends less room and removes the "ترتيب حسب النص تصاعدي؟" puzzle. */}
        <FilterSelect
          value={`${sortBy}:${sortOrder}`}
          onValueChange={(v) => {
            const [by, order] = v.split(":") as [SortBy, SortOrder];
            setSortBy(by);
            setSortOrder(order);
          }}
          label="الترتيب"
          className="sm:basis-[11rem]"
        >
          <SelectItem value="createdAt:desc" className="text-xs">الأحدث أولًا</SelectItem>
          <SelectItem value="createdAt:asc" className="text-xs">الأقدم أولًا</SelectItem>
          <SelectItem value="body:asc" className="text-xs">النص (أ→ي)</SelectItem>
          <SelectItem value="body:desc" className="text-xs">النص (ي→أ)</SelectItem>
        </FilterSelect>
      </FilterBar>

      {activeFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500">التصفية النشطة:</span>
          {activeFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={f.clear}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] text-brand-700 transition-colors hover:bg-brand-100"
            >
              <span className="truncate">{f.label}</span>
              <X className="h-3 w-3 shrink-0" />
            </button>
          ))}
          <button
            type="button"
            onClick={resetAll}
            className="text-[11px] text-slate-500 underline underline-offset-2 hover:text-slate-800"
          >
            مسح الكل
          </button>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <ArrowDownWideNarrow className="h-3.5 w-3.5" />
          {loading ? "جاري التحميل…" : `${total} رسالة`}
        </h2>
        {!loading && messages.length > 0 && (
          <span className="text-[11px] text-slate-400">
            معروض {messages.length} من {total}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={activeFilters.length > 0 ? "لا توجد رسائل مطابقة" : "لا توجد رسائل واردة بعد"}
          description={
            activeFilters.length > 0
              ? "جرّب توسيع التصفية أو مسحها لعرض كل الرسائل."
              : "ستظهر هنا رسائل الزوار والمستخدمين المُرسلة من نموذج «أرسل لنا رسالة» في تذييل الموقع."
          }
          action={
            activeFilters.length > 0 ? (
              <Button variant="outline" size="sm" onClick={resetAll}>
                مسح التصفية
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {messages.map((m) => (
              <InboundMessageCard key={m.id} message={m} locale={locale} onOpen={() => setSelected(m)} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-5 text-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="gap-2">
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
                تحميل المزيد
              </Button>
            </div>
          )}
        </>
      )}

      <InboundMessageDialog message={selected} locale={locale} onClose={() => setSelected(null)} />
    </div>
  );
}
