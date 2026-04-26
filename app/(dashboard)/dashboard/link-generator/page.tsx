"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, Copy, Link2, ChevronDown, ExternalLink, RotateCcw, Check } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

type PageKind =
  | "home"
  | "campaigns"
  | "campaign"
  | "category"
  | "blog"
  | "blog_post"
  | "blog_post_category"
  | "about_us"
  | "contact_us"
  | "profile"
  | "success"
  | "success_donation"
  | "auth_signin";

interface EntityRow {
  id: string;
  slug?: string | null;
  title?: string;
  name?: string;
  published?: boolean;
  supportedLocales: string[];
}

interface Bundle {
  locales: string[];
  currencies: string[];
  campaigns: EntityRow[];
  categories: EntityRow[];
  posts: EntityRow[];
  postCategories: EntityRow[];
}

interface ReferralRow {
  id: string;
  code: string;
  name: string | null;
}

const PAGE_OPTIONS: { id: PageKind; label: string; hint?: string }[] = [
  { id: "home", label: "الصفحة الرئيسية" },
  { id: "campaigns", label: "قائمة المشاريع", hint: "بحث اختياري" },
  { id: "campaign", label: "صفحة مشروع محددة" },
  { id: "category", label: "صفحة حملة (تصنيف مشاريع)" },
  { id: "blog", label: "المدونة — قائمة المقالات" },
  { id: "blog_post", label: "مقال مدونة محدد" },
  { id: "blog_post_category", label: "تصنيف مقالات المدونة" },
  { id: "about_us", label: "من نحن" },
  { id: "contact_us", label: "اتصل بنا" },
  { id: "profile", label: "ملف المستخدم (حسابي)" },
  { id: "success", label: "صفحة شكر عامة" },
  { id: "success_donation", label: "صفحة شكر لتبرع محدد", hint: "معرف التبرع" },
  { id: "auth_signin", label: "تسجيل الدخول" },
];

const fadeDown = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

function needsResourcePick(kind: PageKind) {
  return (
    kind === "campaign" ||
    kind === "category" ||
    kind === "blog_post" ||
    kind === "blog_post_category"
  );
}

function buildPath(
  kind: PageKind,
  opts: { resourceId: string; profileTab: string; donationId: string }
): string {
  switch (kind) {
    case "home":
      return "/";
    case "campaigns":
      return "/campaigns";
    case "campaign":
      return `/campaign/${opts.resourceId}`;
    case "category":
      return `/category/${opts.resourceId}`;
    case "blog":
      return "/blog";
    case "blog_post":
      return `/blog/${opts.resourceId}`;
    case "blog_post_category":
      return `/blog/category/${opts.resourceId}`;
    case "about_us":
      return "/about-us";
    case "contact_us":
      return "/contact-us";
    case "profile":
      return "/profile";
    case "success":
      return "/success";
    case "success_donation":
      return `/success/${opts.donationId.trim()}`;
    case "auth_signin":
      return "/auth/signin";
    default:
      return "/";
  }
}

function localeHasContent(row: EntityRow | undefined, loc: string): boolean {
  if (!row) return false;
  return row.supportedLocales.includes(loc);
}

function entityLabel(row: EntityRow) {
  const t = (row.title || row.name || row.id).slice(0, 96);
  return row.published === false ? `${t} (مسودة)` : t;
}

/** Searchable list: `value` drives cmdk filter; label is shown. */
function SearchableCombobox<T extends string>({
  items,
  value,
  onValueChange,
  placeholder,
  emptyText = "لا توجد نتائج",
  disabled,
  triggerClassName,
}: {
  items: { value: T; label: string; searchText: string }[];
  value: T | "" | undefined;
  onValueChange: (v: T) => void;
  placeholder: string;
  emptyText?: string;
  disabled?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-11 px-3",
            !value && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate text-right">{selected ? selected.label : placeholder}</span>
          <ChevronDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[min(calc(100vw-2rem),28rem)]" align="start" dir="rtl">
        <Command
          filter={(itemValue, search) => {
            if (!search.trim()) return 1;
            const q = search.trim().toLowerCase();
            return itemValue.toLowerCase().includes(q) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="ابحث بالاسم أو المعرف…" className="h-10" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={String(item.value)}
                  value={item.searchText}
                  onSelect={() => {
                    onValueChange(item.value);
                    setOpen(false);
                  }}
                  className="text-right cursor-pointer"
                >
                  <Check
                    className={cn(
                      "me-2 h-4 w-4 shrink-0",
                      value === item.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function LinkGeneratorPage() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [pageKind, setPageKind] = useState<PageKind | "">("");
  const [resourceId, setResourceId] = useState("");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [profileTab, setProfileTab] = useState<"account" | "donations" | "support">("account");
  const [donationId, setDonationId] = useState("");
  const [locale, setLocale] = useState("ar");
  const [currency, setCurrency] = useState("USD");
  const [refCode, setRefCode] = useState<string>("__none__");
  const [openCartPayment, setOpenCartPayment] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dataRes, refRes] = await Promise.all([
        fetch("/api/admin/link-generator/data"),
        fetch("/api/referrals"),
      ]);
      if (!dataRes.ok) throw new Error("data");
      const data = (await dataRes.json()) as Bundle;
      setBundle(data);
      if (refRes.ok) {
        const r = await refRes.json();
        setReferrals(Array.isArray(r) ? r : []);
      }
    } catch {
      toast.error("تعذر تحميل بيانات الروابط");
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setPageKind("");
    setResourceId("");
    setCampaignSearch("");
    setProfileTab("account");
    setDonationId("");
    setLocale("ar");
    setCurrency("USD");
    setRefCode("__none__");
    setOpenCartPayment(false);
  };

  const resourceList = useMemo(() => {
    if (!bundle || !pageKind) return [];
    if (pageKind === "campaign") return bundle.campaigns;
    if (pageKind === "category") return bundle.categories;
    if (pageKind === "blog_post") return bundle.posts;
    if (pageKind === "blog_post_category") return bundle.postCategories;
    return [];
  }, [bundle, pageKind]);

  const resourceItems = useMemo(
    () =>
      resourceList.map((row) => ({
        value: row.id as string,
        label: entityLabel(row),
        searchText: `${entityLabel(row)} ${row.id}`.toLowerCase(),
      })),
    [resourceList]
  );

  const pageKindItems = useMemo(
    () =>
      PAGE_OPTIONS.map((p) => ({
        value: p.id,
        label: p.hint ? `${p.label} — ${p.hint}` : p.label,
        searchText: `${p.label} ${p.hint || ""} ${p.id}`.toLowerCase(),
      })),
    []
  );

  const referralItems = useMemo(
    () => [
      { value: "__none__" as const, label: "بدون إحالة", searchText: "none بدون" },
      ...referrals.map((r) => ({
        value: r.code as string,
        label: r.name ? `${r.code} — ${r.name}` : r.code,
        searchText: `${r.code} ${r.name || ""} ${r.id}`.toLowerCase(),
      })),
    ],
    [referrals]
  );

  const selectedResource = useMemo(() => {
    if (!resourceId) return undefined;
    return resourceList.find((r) => r.id === resourceId);
  }, [resourceList, resourceId]);

  const detailsOk = useMemo(() => {
    if (!pageKind) return false;
    if (needsResourcePick(pageKind)) return !!resourceId;
    if (pageKind === "success_donation") return /^[a-f\d]{24}$/i.test(donationId.trim());
    return true;
  }, [pageKind, resourceId, donationId]);

  const translationWarning = useMemo(() => {
    if (!pageKind || !locale) return null;
    if (needsResourcePick(pageKind)) {
      if (!selectedResource) return null;
      if (!localeHasContent(selectedResource, locale)) {
        return "هذا المحتوى قد لا يكون مترجمًا بالكامل للغة المختارة — راجع الترجمات في لوحة التحكم قبل مشاركة الرابط.";
      }
    }
    return null;
  }, [pageKind, locale, selectedResource]);

  const path = useMemo(() => {
    if (!pageKind) return "";
    // Prefer slug for slugged entities so the URL is human-readable and indexable
    const resourceKey = selectedResource?.slug || resourceId;
    return buildPath(pageKind, { resourceId: resourceKey, profileTab, donationId });
  }, [pageKind, resourceId, selectedResource, profileTab, donationId]);

  const fullUrl = useMemo(() => {
    if (!path || !locale || !pageKind) return "";
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") || "";
    const base = `${origin}/${locale}${path === "/" ? "" : path}`;
    const q = new URLSearchParams();
    q.set("currency", currency);
    if (refCode && refCode !== "__none__") q.set("ref", refCode.toLowerCase());
    if (pageKind === "profile" && profileTab !== "account") q.set("tab", profileTab);
    if (pageKind === "campaigns" && campaignSearch.trim()) q.set("search", campaignSearch.trim());
    if (openCartPayment) q.set("openCartPayment", "1");
    const qs = q.toString();
    return qs ? `${base}?${qs}` : base;
  }, [path, locale, currency, refCode, profileTab, pageKind, campaignSearch, openCartPayment]);

  const showDetailsBlock =
    !!pageKind &&
    (needsResourcePick(pageKind) ||
      pageKind === "campaigns" ||
      pageKind === "profile" ||
      pageKind === "success_donation");

  const copyUrl = async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("تم نسخ الرابط");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  if (loading || !bundle) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#025EB8]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/referrals" className="hover:text-[#025EB8]">
            روابط التتبع
          </Link>
          <span className="opacity-40">/</span>
          <span className="text-foreground font-medium">منشئ روابط الموقع</span>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={resetForm} className="gap-1.5 text-muted-foreground">
          <RotateCcw className="w-4 h-4" />
          مسح الكل
        </Button>
      </div>

      <Card className="border-[#025EB8]/15 shadow-md overflow-hidden">
        <CardHeader className="bg-gradient-to-l from-[#025EB8]/8 to-transparent pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Link2 className="w-6 h-6 text-[#025EB8]" />
            منشئ روابط الموقع
          </CardTitle>
          <CardDescription className="leading-relaxed">
            اختر الصفحة ثم أكمل الحقول الظاهرة تلقائيًا. استخدم البحث داخل القوائم للوصول السريع إلى المشاريع والحملات والمقالات.
            يُحدَّث الرابط في الأسفل مباشرة.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-0 pt-2">
          {/* 1 — نوع الصفحة (بحث) */}
          <section className="py-4 border-b border-border/60">
            <Label className="text-base font-semibold text-foreground mb-2 block">١ — نوع الصفحة</Label>
            <SearchableCombobox<PageKind>
              items={pageKindItems}
              value={pageKind || undefined}
              onValueChange={(v) => {
                setPageKind(v);
                setResourceId("");
                setCampaignSearch("");
                setDonationId("");
              }}
              placeholder="ابحث واختر نوع الصفحة…"
            />
          </section>

          {/* 2 — تفاصيل حسب النوع */}
          <AnimatePresence initial={false}>
            {showDetailsBlock && (
              <motion.section
                key="details"
                {...fadeDown}
                className="py-4 border-b border-border/60 space-y-4"
              >
                <Label className="text-base font-semibold text-foreground block">٢ — تفاصيل الصفحة</Label>

                {needsResourcePick(pageKind as PageKind) && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">
                      {pageKind === "campaign" && "اختر المشروع"}
                      {pageKind === "category" && "اختر الحملة"}
                      {pageKind === "blog_post" && "اختر المقال"}
                      {pageKind === "blog_post_category" && "اختر تصنيف المدونة"}
                    </span>
                    <SearchableCombobox
                      items={resourceItems}
                      value={resourceId}
                      onValueChange={setResourceId}
                      placeholder={`بحث بين ${resourceItems.length} سجل…`}
                      disabled={resourceItems.length === 0}
                    />
                  </div>
                )}

                {pageKind === "campaigns" && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">بحث في قائمة المشاريع (اختياري)</Label>
                    <Input
                      value={campaignSearch}
                      onChange={(e) => setCampaignSearch(e.target.value)}
                      placeholder="يُضاف كمعامل ?search="
                      className="h-10"
                    />
                  </div>
                )}

                {pageKind === "profile" && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">تبويب الملف</Label>
                    <Select value={profileTab} onValueChange={(v) => setProfileTab(v as typeof profileTab)}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="account">معلوماتي</SelectItem>
                        <SelectItem value="donations">التبرعات</SelectItem>
                        <SelectItem value="support">الدعم</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {pageKind === "success_donation" && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">معرف التبرع (24 حرفًا سداسيًا)</Label>
                    <Input
                      value={donationId}
                      onChange={(e) => setDonationId(e.target.value)}
                      placeholder="507f1f77bcf86cd799439011"
                      className="h-10 font-mono text-sm dir-ltr text-left"
                    />
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* 3 — لغة + عملة + إحالة + خيارات (كتلة واحدة للسرعة) */}
          <AnimatePresence initial={false}>
            {pageKind && detailsOk && (
              <motion.section
                key="link-options"
                {...fadeDown}
                className="py-4 border-b border-border/60 space-y-5"
              >
                <Label className="text-base font-semibold text-foreground block">٣ — لغة الرابط، العملة، والإحالة</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">لغة الرابط</span>
                    <Select value={locale} onValueChange={setLocale}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {bundle.locales.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {loc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">?currency=</span>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {bundle.currencies.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c === "DEFAULT" ? "DEFAULT (افتراضي العرض)" : c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">رمز الإحالة (?ref=)</span>
                  <SearchableCombobox<string>
                    items={referralItems}
                    value={refCode}
                    onValueChange={setRefCode}
                    placeholder="ابحث واختر إحالة أو «بدون»…"
                  />
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={openCartPayment}
                    onCheckedChange={(c) => setOpenCartPayment(c === true)}
                  />
                  <span className="text-sm leading-snug">إضافة ?openCartPayment=1 لفتح حوار دفع السلة</span>
                </label>
              </motion.section>
            )}
          </AnimatePresence>

          {/* 5 — نتيجة حية */}
          <AnimatePresence initial={false}>
            {pageKind && detailsOk && (
              <motion.div
                key="output"
                {...fadeDown}
                className="pt-5 pb-1 space-y-3"
              >
                <Label className="text-base font-semibold text-foreground block">٤ — الرابط الجاهز</Label>
                {translationWarning && (
                  <Alert className="border-amber-500/50 bg-amber-50/90 text-amber-950">
                    <AlertTitle className="text-sm">تنبيه ترجمة</AlertTitle>
                    <AlertDescription className="text-sm">{translationWarning}</AlertDescription>
                  </Alert>
                )}
                <div className="rounded-xl bg-slate-700 text-slate-100 p-4 shadow-inner ring-1 ring-white/10">
                  <div className="flex items-center justify-between gap-2 mb-1.5 min-h-8">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 m-0">
                      كامل مع النطاق
                    </p>
                    <div className="flex items-center gap-0.5 shrink-0" dir="ltr">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={copyUrl}
                        disabled={!fullUrl}
                        title="نسخ الرابط"
                        aria-label="نسخ الرابط"
                        className="h-8 w-8 text-slate-200 hover:bg-[#FA5D17] hover:text-white disabled:pointer-events-none disabled:opacity-35"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      {fullUrl ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          asChild
                          title="معاينة في تبويب جديد"
                          aria-label="معاينة في تبويب جديد"
                          className="h-8 w-8 text-slate-200 hover:bg-white/15 hover:text-white"
                        >
                          <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <code className="block text-xs sm:text-sm font-medium leading-relaxed break-all" dir="ltr">
                    {fullUrl}
                  </code>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
