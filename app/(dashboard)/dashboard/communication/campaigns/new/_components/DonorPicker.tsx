"use client";

import * as React from "react";
import { toast } from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Users, Check, Loader2, TriangleAlert, ShieldQuestion } from "lucide-react";
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/lib/locales";
import { cn } from "@/lib/utils";

export type Eligibility = "ELIGIBLE" | "NEEDS_REVIEW" | "UNAVAILABLE";

export interface DonorCandidate {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  locale: string;
  countryCode: string | null;
  countryName: string | null;
  eligibility: Eligibility;
}

const PAGE_SIZE = 25;

const ELIGIBILITY_META: Record<Eligibility, { label: string; tone: string; icon: typeof Check }> = {
  ELIGIBLE: { label: "يمكن مراسلته", tone: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: Check },
  NEEDS_REVIEW: { label: "يحتاج موافقة", tone: "border-amber-200 bg-amber-50 text-amber-700", icon: ShieldQuestion },
  UNAVAILABLE: { label: "غير متاح", tone: "border-slate-200 bg-slate-100 text-slate-500", icon: TriangleAlert },
};

/**
 * Pick the donors a campaign goes to.
 *
 * Modelled on المتبرعين — same search-and-filter rhythm — but every row also carries its
 * eligibility for *this campaign's channel*, which the donors page has no concept of. That is the
 * difference that matters: a donor with no phone number is a fine donor and a dead SMS recipient,
 * and a picker that hides the distinction produces a campaign whose real reach is discovered only
 * after it sends.
 *
 * Ineligible donors are shown rather than filtered away, and are selectable but visibly marked.
 * They are never silently dropped here: the send pipeline re-checks consent at send time and
 * records each one as a SKIPPED delivery with a reason, so the audit trail explains the shortfall
 * instead of the count quietly shrinking between selection and send.
 */
export function DonorPicker({
  channel,
  selected,
  onChange,
}: {
  channel: string;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [donors, setDonors] = React.useState<DonorCandidate[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [selectingAll, setSelectingAll] = React.useState(false);

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [locale, setLocale] = React.useState("all");
  const [eligibility, setEligibility] = React.useState("all");

  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => {
    setPage(1);
  }, [search, locale, eligibility]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ channel, page: String(page), limit: String(PAGE_SIZE), eligibility });
    if (search) params.set("search", search);
    if (locale !== "all") params.set("locale", locale);

    fetch(`/api/communication/audience-candidates?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j.ok) throw new Error(j.error || "تعذّر تحميل المتبرعين");
        setDonors(j.donors ?? []);
        setTotal(j.pagination?.total ?? 0);
      })
      .catch((e) => !cancelled && toast.error((e as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [channel, page, search, locale, eligibility]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const togglePage = () => {
    const ids = donors.map((d) => d.id);
    const allOn = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    for (const id of ids) {
      if (allOn) next.delete(id);
      else next.add(id);
    }
    onChange(next);
  };

  /** Selects everything the current filter matches, not merely the visible page. */
  const selectAllMatching = async () => {
    setSelectingAll(true);
    try {
      const res = await fetch("/api/communication/audience-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, search, locale, eligibility }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "تعذّر التحديد");
      onChange(new Set([...selected, ...json.ids]));
      if (json.truncated) toast("اكتفينا بأول ٥٠٠٠ متبرع مطابق.", { icon: "ℹ️" });
      else toast.success(`تم تحديد ${json.ids.length} متبرعًا`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSelectingAll(false);
    }
  };

  const pageIds = donors.map((d) => d.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <FilterBar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="ابحث بالاسم أو البريد أو الهاتف…"
        actions={
          <Button variant="outline" size="sm" onClick={selectAllMatching} disabled={selectingAll || loading} className="gap-1.5">
            {selectingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
            تحديد كل النتائج
          </Button>
        }
      >
        <Select value={locale} onValueChange={setLocale}>
          <SelectTrigger aria-label="تصفية باللغة" className="h-9 min-w-0 flex-1 rounded-lg border-slate-200 bg-slate-50 px-3 text-xs sm:flex-none sm:basis-[9rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">كل اللغات</SelectItem>
            {SUPPORTED_LOCALES.map((l) => (
              <SelectItem key={l} value={l} className="text-xs">{LOCALE_LABELS[l]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={eligibility} onValueChange={setEligibility}>
          <SelectTrigger aria-label="تصفية بالأهلية" className="h-9 min-w-0 flex-1 rounded-lg border-slate-200 bg-slate-50 px-3 text-xs sm:flex-none sm:basis-[10rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">الكل</SelectItem>
            <SelectItem value="eligible" className="text-xs">يمكن مراسلته فقط</SelectItem>
            <SelectItem value="ineligible" className="text-xs">غير المتاحين فقط</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={togglePage}
          disabled={pageIds.length === 0}
          className="text-[11px] font-medium text-brand underline underline-offset-2 disabled:opacity-40"
        >
          {allPageSelected ? "إلغاء تحديد هذه الصفحة" : "تحديد هذه الصفحة"}
        </button>
        <span className="text-[11px] text-slate-500">
          {total.toLocaleString("en-US")} متبرع مطابق · محدَّد {selected.size.toLocaleString("en-US")}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : donors.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد متبرع مطابق" description="جرّب توسيع التصفية أو مسح البحث." />
      ) : (
        <ul className="space-y-1.5">
          {donors.map((d) => {
            const on = selected.has(d.id);
            const meta = ELIGIBILITY_META[d.eligibility];
            const EIcon = meta.icon;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => toggle(d.id)}
                  aria-pressed={on}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-start transition-colors",
                    on ? "border-brand bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-4 w-4 shrink-0 place-items-center rounded border",
                      on ? "border-brand bg-brand text-white" : "border-slate-300 bg-white",
                    )}
                  >
                    {on && <Check className="h-3 w-3" />}
                  </span>

                  <Avatar className="h-8 w-8 shrink-0 rounded-full ring-1 ring-slate-200">
                    <AvatarImage src={d.image ?? undefined} alt="" />
                    <AvatarFallback className="rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-[10px] font-bold text-white">
                      {(d.name ?? d.email ?? "؟").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-slate-900">{d.name ?? "بلا اسم"}</p>
                    {/* Shows the contact the CHANNEL will use, not whichever exists — an email
                        under an SMS campaign would misrepresent where the message goes. */}
                    <p className="truncate text-[11px] text-slate-500">
                      {channel === "EMAIL" ? d.email ?? "بلا بريد" : d.phone ?? "بلا رقم"}
                    </p>
                  </div>

                  <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600">
                    {LOCALE_LABELS[d.locale as keyof typeof LOCALE_LABELS] ?? d.locale}
                  </span>
                  <span className={cn("hidden shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] sm:inline-flex", meta.tone)}>
                    <EIcon className="h-3 w-3" />
                    {meta.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            السابق
          </Button>
          <span className="text-[11px] tabular-nums text-slate-500">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}
