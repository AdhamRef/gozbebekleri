"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Copy, Link2, ChevronDown, ExternalLink, RotateCcw, Check, Megaphone, ShieldCheck, WandSparkles } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

type PageKind = "home" | "campaigns" | "campaign" | "category" | "blog" | "blog_post" | "blog_post_category" | "about_us" | "contact_us" | "profile" | "success" | "success_donation" | "auth_signin";
type LinkMode = "standard" | "marketing";
type MarketingPlatform = "meta" | "google_ads" | "tiktok" | "x" | "twilio_whatsapp" | "twilio_sms" | "twilio_email" | "email" | "whatsapp" | "sms" | "organic";

interface EntityRow { id: string; slug?: string | null; title?: string; name?: string; published?: boolean; supportedLocales: string[]; slugByLocale?: Record<string, string | null>; }
interface Bundle { locales: string[]; currencies: string[]; campaigns: EntityRow[]; categories: EntityRow[]; posts: EntityRow[]; postCategories: EntityRow[]; }
interface ReferralRow { id: string; code: string; name: string | null; }
interface MarketingForm {
  platform: MarketingPlatform;
  autoPlatformData: boolean;
  campaignName: string;
  campaignId: string;
  adsetId: string;
  adId: string;
  placement: string;
  audienceSegment: string;
  messageVariant: string;
  targetCountry: string;
  device: string;
  objective: string;
  customContent: string;
  twilioCampaignId: string;
  twilioTemplateId: string;
  buttonId: string;
  buttonLabel: string;
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

const PLATFORM_OPTIONS: { id: MarketingPlatform; label: string; source: string; medium: string; channel: string; hint: string }[] = [
  { id: "meta", label: "Meta / Facebook / Instagram", source: "facebook", medium: "paid_social", channel: "meta_ads", hint: "استخدمه لإعلانات فيسبوك وإنستغرام" },
  { id: "google_ads", label: "Google Ads", source: "google", medium: "paid_search", channel: "google_ads", hint: "بحث، Display، YouTube أو Performance Max" },
  { id: "tiktok", label: "TikTok Ads", source: "tiktok", medium: "paid_social", channel: "tiktok_ads", hint: "حملات تيك توك المدفوعة" },
  { id: "x", label: "X Ads", source: "x", medium: "paid_social", channel: "x_ads", hint: "إعلانات منصة X" },
  { id: "twilio_whatsapp", label: "Twilio WhatsApp", source: "twilio", medium: "whatsapp", channel: "twilio_whatsapp", hint: "روابط قوالب ورسائل واتساب عبر Twilio" },
  { id: "twilio_sms", label: "Twilio SMS", source: "twilio", medium: "sms", channel: "twilio_sms", hint: "حملات SMS عبر Twilio" },
  { id: "twilio_email", label: "Twilio Email", source: "twilio", medium: "email", channel: "twilio_email", hint: "رسائل بريدية عبر Twilio/SendGrid إن وجدت" },
  { id: "email", label: "Email", source: "email", medium: "email", channel: "email", hint: "حملات بريدية عامة" },
  { id: "whatsapp", label: "WhatsApp عادي", source: "whatsapp", medium: "messaging", channel: "whatsapp", hint: "مشاركة واتساب بدون Twilio" },
  { id: "sms", label: "SMS عادي", source: "sms", medium: "messaging", channel: "sms", hint: "رسائل قصيرة خارج Twilio" },
  { id: "organic", label: "Organic / مشاركة طبيعية", source: "organic", medium: "organic", channel: "organic", hint: "روابط غير مدفوعة أو مشاركة عضوية" },
];

const fadeDown = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const } };
const initialMarketingForm: MarketingForm = { platform: "meta", autoPlatformData: false, campaignName: "", campaignId: "", adsetId: "", adId: "", placement: "", audienceSegment: "", messageVariant: "", targetCountry: "", device: "", objective: "donations", customContent: "", twilioCampaignId: "", twilioTemplateId: "", buttonId: "", buttonLabel: "" };

function needsResourcePick(kind: PageKind) { return kind === "campaign" || kind === "category" || kind === "blog_post" || kind === "blog_post_category"; }
function buildPath(kind: PageKind, opts: { resourceId: string; profileTab: string; donationId: string }): string {
  switch (kind) {
    case "home": return "/";
    case "campaigns": return "/campaigns";
    case "campaign": return `/campaign/${opts.resourceId}`;
    case "category": return `/category/${opts.resourceId}`;
    case "blog": return "/blog";
    case "blog_post": return `/blog/${opts.resourceId}`;
    case "blog_post_category": return `/blog/category/${opts.resourceId}`;
    case "about_us": return "/about-us";
    case "contact_us": return "/contact-us";
    case "profile": return "/profile";
    case "success": return "/success";
    case "success_donation": return `/success/${opts.donationId.trim()}`;
    case "auth_signin": return "/auth/signin";
    default: return "/";
  }
}
function localeHasContent(row: EntityRow | undefined, loc: string): boolean { if (!row) return false; return row.supportedLocales.includes(loc); }
function entityLabel(row: EntityRow) { const t = (row.title || row.name || row.id).slice(0, 96); return row.published === false ? `${t} (مسودة)` : t; }
function slugifyCampaignName(value: string) { return value.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9\-\u0600-\u06FF]/gi, "").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 90); }
function hasUnresolvedMacro(value: string) { return /\{\{.+?\}\}|__.+?__|\{campaignid\}|\{adgroupid\}|\{creative\}|\{placement\}|\{device\}/i.test(value); }
function platformPreset(platform: MarketingPlatform) { return PLATFORM_OPTIONS.find((item) => item.id === platform) || PLATFORM_OPTIONS[0]; }

function automaticPlatformValues(platform: MarketingPlatform) {
  if (platform === "meta") {
    return { campaignName: "{{campaign.name}}", campaignId: "{{campaign.id}}", adsetId: "{{adset.id}}", adId: "{{ad.id}}", placement: "{{placement}}", customContent: "{{ad.name}}" };
  }
  if (platform === "google_ads") {
    return { campaignName: "google-campaign-{campaignid}", campaignId: "{campaignid}", adsetId: "{adgroupid}", adId: "{creative}", placement: "{placement}", device: "{device}", customContent: "ad-{creative}" };
  }
  if (platform === "tiktok") {
    return { campaignName: "__CAMPAIGN_NAME__", campaignId: "__CAMPAIGN_ID__", adsetId: "__AID__", adId: "__CID__", placement: "__PLACEMENT__", customContent: "__CID__" };
  }
  if (platform === "x") {
    return { campaignName: "x-campaign", campaignId: "__CAMPAIGN_ID__", adsetId: "__LINE_ITEM_ID__", adId: "__PROMOTED_TWEET_ID__", placement: "x", customContent: "__PROMOTED_TWEET_ID__" };
  }
  return {};
}

function withAutomaticPlatformValues(form: MarketingForm): MarketingForm {
  if (!form.autoPlatformData) return form;
  return { ...form, ...automaticPlatformValues(form.platform) };
}

function makeMarketingParams(form: MarketingForm, loc: string) {
  const effective = withAutomaticPlatformValues(form);
  const preset = platformPreset(effective.platform);
  const campaignSlug = effective.autoPlatformData
    ? (effective.campaignName.trim() || effective.campaignId.trim() || `${preset.channel}-campaign`)
    : (slugifyCampaignName(effective.campaignName) || effective.campaignId.trim() || `${preset.channel}-campaign`);
  const content = effective.customContent.trim() || effective.messageVariant.trim() || effective.adId.trim() || effective.buttonLabel.trim();
  const params: Record<string, string> = { utm_source: preset.source, utm_medium: preset.medium, utm_campaign: campaignSlug, channel: preset.channel, language: loc };
  if (effective.campaignId.trim()) params.utm_id = effective.campaignId.trim();
  if (content) params.utm_content = content;
  if (effective.audienceSegment.trim()) params.utm_term = effective.audienceSegment.trim();
  if (effective.campaignId.trim()) params.campaign_id = effective.campaignId.trim();
  if (effective.adsetId.trim()) params.adset_id = effective.adsetId.trim();
  if (effective.adId.trim()) params.ad_id = effective.adId.trim();
  if (effective.placement.trim()) params.placement = effective.placement.trim();
  if (effective.device.trim()) params.device = effective.device.trim();
  if (effective.targetCountry.trim()) params.target_country = effective.targetCountry.trim().toUpperCase();
  if (effective.objective.trim()) params.objective = effective.objective.trim();
  if (effective.messageVariant.trim()) params.message_variant = effective.messageVariant.trim();
  if (effective.audienceSegment.trim()) params.audience_segment = effective.audienceSegment.trim();
  if (effective.twilioCampaignId.trim()) params.twilio_campaign_id = effective.twilioCampaignId.trim();
  if (effective.twilioTemplateId.trim()) params.twilio_template_id = effective.twilioTemplateId.trim();
  if (effective.buttonId.trim()) params.button_id = effective.buttonId.trim();
  if (effective.buttonLabel.trim()) params.button_label = effective.buttonLabel.trim();
  if (effective.buttonLabel.trim() || effective.buttonId.trim()) params.link_position = "button";
  return params;
}

function marketingValidation(form: MarketingForm, loc: string) {
  const params = makeMarketingParams(form, loc);
  const values = Object.values(params).join(" ");
  const issues: { level: "ok" | "warn"; text: string }[] = [];
  const auto = form.autoPlatformData;
  if (auto && ["meta", "google_ads", "tiktok", "x"].includes(form.platform)) issues.push({ level: "ok", text: "تم تفعيل أخذ بيانات الحملة والمجموعة والإعلان تلقائيًا من المنصة عند الضغط على الإعلان." });
  if (!auto && !form.campaignName.trim() && !form.campaignId.trim()) issues.push({ level: "warn", text: "أضف اسم الحملة أو Campaign ID حتى يسهل ربط التبرعات بالحملة." });
  if (!auto && ["meta", "google_ads", "tiktok", "x"].includes(form.platform) && !form.campaignId.trim()) issues.push({ level: "warn", text: "الحملة المدفوعة تحتاج Campaign ID عند الإمكان للمطابقة مع المنصة." });
  if (!auto && form.platform === "meta" && !form.adsetId.trim()) issues.push({ level: "warn", text: "Meta يستفيد من Ad Set ID أو اسم المجموعة عند تحليل الأداء لاحقًا." });
  if (!auto && form.platform === "google_ads" && !form.adsetId.trim()) issues.push({ level: "warn", text: "Google Ads يستفيد من Ad Group ID عند مزامنة البيانات لاحقًا." });
  if (form.platform.startsWith("twilio") && !form.twilioCampaignId.trim()) issues.push({ level: "warn", text: "أضف Twilio Campaign ID حتى نربط الرسائل بالتبرعات لاحقًا." });
  if (!form.targetCountry.trim()) issues.push({ level: "warn", text: "Target country اختياري، لكنه مهم لتحليل الدول والميزانيات." });
  if (!auto && !/^[a-z]{2}(-[A-Z]{2})?$/.test(loc)) issues.push({ level: "warn", text: "لغة الرابط يجب أن تكون كودًا واضحًا مثل ar أو en." });
  if (!auto && hasUnresolvedMacro(values)) issues.push({ level: "warn", text: "يوجد Macro غير مستبدل مثل {{...}} أو __...__؛ لا تستخدمه إلا إذا كانت المنصة ستستبدله فعلًا." });
  if (values.includes("fbclid") || values.includes("gclid")) issues.push({ level: "warn", text: "لا تضف fbclid أو gclid يدويًا؛ المنصات تضيفها تلقائيًا عند الضغط على الإعلان." });
  if (!issues.length) issues.push({ level: "ok", text: "الرابط جاهز للتتبع الآمن ولا يغير رابط الصفحة الأصلي." });
  return issues;
}

function trackingHealthScore(form: MarketingForm, loc: string) {
  let score = form.autoPlatformData ? 72 : 35;
  if (form.campaignName.trim() || form.campaignId.trim() || form.autoPlatformData) score += 20;
  if (form.campaignId.trim() || form.autoPlatformData) score += 15;
  if (form.adsetId.trim() || form.autoPlatformData) score += 8;
  if (form.adId.trim() || form.autoPlatformData) score += 7;
  if (form.targetCountry.trim()) score += 6;
  if (form.audienceSegment.trim() || form.messageVariant.trim()) score += 5;
  if (/^[a-z]{2}(-[A-Z]{2})?$/.test(loc)) score += 4;
  if (form.platform.startsWith("twilio") && form.twilioCampaignId.trim()) score += 8;
  return Math.max(0, Math.min(100, score));
}

function SearchableCombobox<T extends string>({ items, value, onValueChange, placeholder, emptyText = "لا توجد نتائج", disabled, triggerClassName }: { items: { value: T; label: string; searchText: string }[]; value: T | "" | undefined; onValueChange: (v: T) => void; placeholder: string; emptyText?: string; disabled?: boolean; triggerClassName?: string; }) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.value === value);
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className={cn("w-full justify-between font-normal h-11 px-3", !value && "text-muted-foreground", triggerClassName)}><span className="truncate text-right">{selected ? selected.label : placeholder}</span><ChevronDown className="ms-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="p-0 w-[min(calc(100vw-2rem),28rem)]" align="start" dir="rtl"><Command filter={(itemValue, search) => { if (!search.trim()) return 1; const q = search.trim().toLowerCase(); return itemValue.toLowerCase().includes(q) ? 1 : 0; }}><CommandInput placeholder="ابحث بالاسم أو المعرف…" className="h-10" /><CommandList><CommandEmpty>{emptyText}</CommandEmpty><CommandGroup>{items.map((item) => <CommandItem key={String(item.value)} value={item.searchText} onSelect={() => { onValueChange(item.value); setOpen(false); }} className="text-right cursor-pointer"><Check className={cn("me-2 h-4 w-4 shrink-0", value === item.value ? "opacity-100" : "opacity-0")} /><span className="truncate">{item.label}</span></CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover>;
}

export default function LinkGeneratorPage() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkMode, setLinkMode] = useState<LinkMode>("standard");
  const [pageKind, setPageKind] = useState<PageKind | "">("");
  const [resourceId, setResourceId] = useState("");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [profileTab, setProfileTab] = useState<"account" | "donations" | "support">("account");
  const [donationId, setDonationId] = useState("");
  const [locale, setLocale] = useState("ar");
  const [autoLocale, setAutoLocale] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [autoCurrency, setAutoCurrency] = useState(false);
  const [refCode, setRefCode] = useState<string>("__none__");
  const [openCartPayment, setOpenCartPayment] = useState(false);
  const [marketingForm, setMarketingForm] = useState<MarketingForm>(initialMarketingForm);
  const updateMarketing = (patch: Partial<MarketingForm>) => setMarketingForm((prev) => ({ ...prev, ...patch }));

  const load = useCallback(async () => { setLoading(true); try { const [dataRes, refRes] = await Promise.all([fetch("/api/admin/link-generator/data"), fetch("/api/referrals")]); if (!dataRes.ok) throw new Error("data"); const data = (await dataRes.json()) as Bundle; setBundle(data); if (refRes.ok) { const r = await refRes.json(); setReferrals(Array.isArray(r) ? r : []); } } catch { toast.error("تعذر تحميل بيانات الروابط"); setBundle(null); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setLinkMode("standard"); setPageKind(""); setResourceId(""); setCampaignSearch(""); setProfileTab("account"); setDonationId(""); setLocale("ar"); setAutoLocale(false); setCurrency("USD"); setAutoCurrency(false); setRefCode("__none__"); setOpenCartPayment(false); setMarketingForm(initialMarketingForm); };
  const resourceList = useMemo(() => { if (!bundle || !pageKind) return []; if (pageKind === "campaign") return bundle.campaigns; if (pageKind === "category") return bundle.categories; if (pageKind === "blog_post") return bundle.posts; if (pageKind === "blog_post_category") return bundle.postCategories; return []; }, [bundle, pageKind]);
  const resourceItems = useMemo(() => resourceList.map((row) => ({ value: row.id as string, label: entityLabel(row), searchText: `${entityLabel(row)} ${row.id}`.toLowerCase() })), [resourceList]);
  const pageKindItems = useMemo(() => PAGE_OPTIONS.map((p) => ({ value: p.id, label: p.hint ? `${p.label} — ${p.hint}` : p.label, searchText: `${p.label} ${p.hint || ""} ${p.id}`.toLowerCase() })), []);
  const referralItems = useMemo(() => [{ value: "__none__" as const, label: "بدون إحالة", searchText: "none بدون" }, ...referrals.map((r) => ({ value: r.code as string, label: r.name ? `${r.code} — ${r.name}` : r.code, searchText: `${r.code} ${r.name || ""} ${r.id}`.toLowerCase() }))], [referrals]);
  const selectedResource = useMemo(() => resourceId ? resourceList.find((r) => r.id === resourceId) : undefined, [resourceList, resourceId]);
  const detailsOk = useMemo(() => { if (!pageKind) return false; if (needsResourcePick(pageKind)) return !!resourceId; if (pageKind === "success_donation") return /^[a-f\d]{24}$/i.test(donationId.trim()); return true; }, [pageKind, resourceId, donationId]);
  const translationWarning = useMemo(() => { if (!pageKind || !locale || autoLocale) return null; if (needsResourcePick(pageKind)) { if (!selectedResource) return null; if (!localeHasContent(selectedResource, locale)) return "هذا المحتوى قد لا يكون مترجمًا بالكامل للغة المختارة — راجع الترجمات في لوحة التحكم قبل مشاركة الرابط."; } return null; }, [pageKind, locale, selectedResource, autoLocale]);
  const path = useMemo(() => { if (!pageKind) return ""; const localeSlug = selectedResource?.slugByLocale?.[locale] ?? null; const resourceKey = localeSlug || selectedResource?.slug || resourceId; return buildPath(pageKind, { resourceId: resourceKey, profileTab, donationId }); }, [pageKind, resourceId, selectedResource, profileTab, donationId, locale]);
  const fullUrl = useMemo(() => { if (!path || !locale || !pageKind) return ""; const origin = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") || ""; const pathPart = path === "/" ? "" : path; const base = autoLocale ? `${origin}${pathPart}` : `${origin}/${locale}${pathPart}`; const q = new URLSearchParams(); if (!autoCurrency) q.set("currency", currency); if (refCode && refCode !== "__none__") q.set("ref", refCode.toLowerCase()); if (pageKind === "profile" && profileTab !== "account") q.set("tab", profileTab); if (pageKind === "campaigns" && campaignSearch.trim()) q.set("search", campaignSearch.trim()); if (openCartPayment) q.set("openCartPayment", "1"); if (linkMode === "marketing") { const marketingParams = makeMarketingParams(marketingForm, autoLocale ? "auto" : locale); Object.entries(marketingParams).forEach(([key, value]) => q.set(key, value)); } const qs = q.toString(); const builtUrl = qs ? `${base}?${qs}` : base; return autoLocale && !pathPart ? `${builtUrl.replace(/^([^?#]+?)(\?|#|$)/, "$1/$2")}` : builtUrl; }, [path, locale, currency, refCode, profileTab, pageKind, campaignSearch, openCartPayment, autoLocale, autoCurrency, linkMode, marketingForm]);
  const showDetailsBlock = !!pageKind && (needsResourcePick(pageKind) || pageKind === "campaigns" || pageKind === "profile" || pageKind === "success_donation");
  const selectedPlatform = platformPreset(marketingForm.platform);
  const effectiveMarketingForm = useMemo(() => withAutomaticPlatformValues(marketingForm), [marketingForm]);
  const marketingIssues = useMemo(() => marketingValidation(marketingForm, autoLocale ? "auto" : locale), [marketingForm, locale, autoLocale]);
  const healthScore = useMemo(() => trackingHealthScore(marketingForm, autoLocale ? "auto" : locale), [marketingForm, locale, autoLocale]);
  const copyUrl = async () => { if (!fullUrl) return; try { await navigator.clipboard.writeText(fullUrl); toast.success("تم نسخ الرابط"); } catch { toast.error("تعذر النسخ"); } };
  if (loading || !bundle) return <div className="flex justify-center items-center min-h-[40vh]"><Loader2 className="w-10 h-10 animate-spin text-[#025EB8]" /></div>;

  return <div className="space-y-6 max-w-3xl mx-auto pb-12" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Link href="/dashboard/referrals" className="hover:text-[#025EB8]">روابط التتبع</Link><span className="opacity-40">/</span><span className="text-foreground font-medium">منشئ روابط الموقع والحملات</span></div><Button type="button" variant="ghost" size="sm" onClick={resetForm} className="gap-1.5 text-muted-foreground"><RotateCcw className="w-4 h-4" />مسح الكل</Button></div>
    <Card className="border-[#025EB8]/15 shadow-md overflow-hidden"><CardHeader className="bg-gradient-to-l from-[#025EB8]/8 to-transparent pb-4"><CardTitle className="flex items-center gap-2 text-xl"><Link2 className="w-6 h-6 text-[#025EB8]" />منشئ روابط الموقع والحملات</CardTitle><CardDescription className="leading-relaxed">أنشئ رابط موقع عادي أو رابط حملة تسويقية مع UTM احترافي دون تغيير الرابط الأصلي أو كسر الإعلانات الحالية.</CardDescription></CardHeader><CardContent className="space-y-0 pt-2">
      <section className="py-4 border-b border-border/60"><Label className="text-base font-semibold text-foreground mb-2 block">٠ — نوع الرابط</Label><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><button type="button" onClick={() => setLinkMode("standard")} className={cn("rounded-xl border p-4 text-right transition", linkMode === "standard" ? "border-[#025EB8] bg-blue-50 text-[#025EB8]" : "border-border bg-white hover:bg-muted/40")}><Link2 className="w-5 h-5 mb-2" /><div className="font-bold">رابط موقع عادي</div><p className="mt-1 text-xs text-muted-foreground">نفس النظام القديم: صفحة، لغة، عملة، إحالة.</p></button><button type="button" onClick={() => setLinkMode("marketing")} className={cn("rounded-xl border p-4 text-right transition", linkMode === "marketing" ? "border-[#FA5D17] bg-orange-50 text-[#c7470d]" : "border-border bg-white hover:bg-muted/40")}><Megaphone className="w-5 h-5 mb-2" /><div className="font-bold">حملة تسويقية</div><p className="mt-1 text-xs text-muted-foreground">يضيف UTM وبيانات منصة للحملات المدفوعة والرسائل.</p></button></div></section>
      <section className="py-4 border-b border-border/60"><Label className="text-base font-semibold text-foreground mb-2 block">١ — نوع الصفحة</Label><SearchableCombobox<PageKind> items={pageKindItems} value={pageKind || undefined} onValueChange={(v) => { setPageKind(v); setResourceId(""); setCampaignSearch(""); setDonationId(""); }} placeholder="ابحث واختر نوع الصفحة…" /></section>
      <AnimatePresence initial={false}>{showDetailsBlock && <motion.section key="details" {...fadeDown} className="py-4 border-b border-border/60 space-y-4"><Label className="text-base font-semibold text-foreground block">٢ — تفاصيل الصفحة</Label>{needsResourcePick(pageKind as PageKind) && <div className="space-y-2"><span className="text-sm text-muted-foreground">{pageKind === "campaign" && "اختر المشروع"}{pageKind === "category" && "اختر الحملة"}{pageKind === "blog_post" && "اختر المقال"}{pageKind === "blog_post_category" && "اختر تصنيف المدونة"}</span><SearchableCombobox items={resourceItems} value={resourceId} onValueChange={setResourceId} placeholder={`بحث بين ${resourceItems.length} سجل…`} disabled={resourceItems.length === 0} /></div>}{pageKind === "campaigns" && <Field label="بحث في قائمة المشاريع (اختياري)" value={campaignSearch} onChange={setCampaignSearch} placeholder="يُضاف كمعامل ?search=" />}{pageKind === "profile" && <div className="space-y-2"><Label className="text-sm text-muted-foreground">تبويب الملف</Label><Select value={profileTab} onValueChange={(v) => setProfileTab(v as typeof profileTab)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="account">معلوماتي</SelectItem><SelectItem value="donations">التبرعات</SelectItem><SelectItem value="support">الدعم</SelectItem></SelectContent></Select></div>}{pageKind === "success_donation" && <Field label="معرف التبرع (24 حرفًا سداسيًا)" value={donationId} onChange={setDonationId} placeholder="507f1f77bcf86cd799439011" dir="ltr" />}</motion.section>}</AnimatePresence>
      <AnimatePresence initial={false}>{pageKind && detailsOk && <motion.section key="link-options" {...fadeDown} className="py-4 border-b border-border/60 space-y-5"><Label className="text-base font-semibold text-foreground block">٣ — لغة الرابط، العملة، والإحالة</Label><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-2"><span className="text-xs text-muted-foreground">لغة الرابط</span><Select value={locale} onValueChange={setLocale} disabled={autoLocale}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{bundle.locales.map((loc) => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent></Select><CheckRow checked={autoLocale} onChange={setAutoLocale} title="اكتشاف اللغة تلقائيًا حسب موقع الزائر" hint="يُنشئ الرابط بدون بادئة لغة، ويختار الموقع لغة الزائر تلقائيًا حسب الدولة." /></div><div className="space-y-2"><span className="text-xs text-muted-foreground">?currency=</span><Select value={currency} onValueChange={setCurrency} disabled={autoCurrency}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{bundle.currencies.filter((c) => c !== "DEFAULT").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><CheckRow checked={autoCurrency} onChange={setAutoCurrency} title="اكتشاف العملة تلقائيًا حسب موقع الزائر" hint="يُنشئ الرابط بدون ?currency=، ويختار الموقع عملة الزائر تلقائيًا حسب الدولة." /></div></div><div className="space-y-2"><span className="text-sm text-muted-foreground">رمز الإحالة (?ref=)</span><SearchableCombobox<string> items={referralItems} value={refCode} onValueChange={setRefCode} placeholder="ابحث واختر إحالة أو «بدون»…" /></div><label className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 hover:bg-muted/50 transition-colors"><Checkbox checked={openCartPayment} onCheckedChange={(c) => setOpenCartPayment(c === true)} /><span className="text-sm leading-snug">إضافة ?openCartPayment=1 لفتح حوار دفع السلة</span></label></motion.section>}</AnimatePresence>
      <AnimatePresence initial={false}>{pageKind && detailsOk && linkMode === "marketing" && <motion.section key="marketing-builder" {...fadeDown} className="py-4 border-b border-border/60 space-y-5"><div className="flex items-start justify-between gap-3"><div><Label className="text-base font-semibold text-foreground block">٤ — إعدادات الحملة التسويقية</Label><p className="mt-1 text-sm text-muted-foreground">هذه البيانات تُضاف كـ UTM ولا تغيّر رابط الصفحة الأساسي.</p></div><div className={cn("rounded-full border px-3 py-1 text-sm font-bold", healthScore >= 85 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : healthScore >= 65 ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700")}>{healthScore}% جاهزية</div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-2 sm:col-span-2"><span className="text-xs text-muted-foreground">المنصة / القناة</span><Select value={marketingForm.platform} onValueChange={(v) => updateMarketing({ platform: v as MarketingPlatform })}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{PLATFORM_OPTIONS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">{selectedPlatform.hint}</p></div><div className="sm:col-span-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3"><CheckRow checked={marketingForm.autoPlatformData} onChange={(checked) => updateMarketing({ autoPlatformData: checked })} title="أخذ بيانات الحملة والمجموعة والإعلان تلقائيًا من المنصة" hint="يستخدم متغيرات المنصة الرسمية/الديناميكية حيثما أمكن؛ مثل Meta campaign/adset/ad وGoogle ValueTrack. لا يضيف fbclid أو gclid يدويًا." />{marketingForm.autoPlatformData && <div className="mt-3 rounded-lg bg-white p-3 text-xs leading-6 text-slate-600"><div className="mb-1 flex items-center gap-1 font-bold text-[#025EB8]"><WandSparkles className="h-3.5 w-3.5" />المعاينة التلقائية</div><div dir="ltr" className="font-mono break-all">campaign_id={effectiveMarketingForm.campaignId || "—"} · adset_id={effectiveMarketingForm.adsetId || "—"} · ad_id={effectiveMarketingForm.adId || "—"}</div></div>}</div><Field label="اسم الحملة" value={marketingForm.campaignName} onChange={(v) => updateMarketing({ campaignName: v })} placeholder="ramadan-gaza-donations" /><Field label="Campaign ID" value={marketingForm.campaignId} onChange={(v) => updateMarketing({ campaignId: v })} placeholder="اختياري لكن مهم للمطابقة" dir="ltr" /><Field label="Ad Set / Ad Group ID" value={marketingForm.adsetId} onChange={(v) => updateMarketing({ adsetId: v })} placeholder="adset أو ad group" dir="ltr" /><Field label="Ad ID" value={marketingForm.adId} onChange={(v) => updateMarketing({ adId: v })} placeholder="معرف الإعلان" dir="ltr" /><Field label="Placement" value={marketingForm.placement} onChange={(v) => updateMarketing({ placement: v })} placeholder="facebook_feed / instagram_reels" /><Field label="Target Country" value={marketingForm.targetCountry} onChange={(v) => updateMarketing({ targetCountry: v })} placeholder="TR / DE / US" dir="ltr" /><Field label="Audience Segment" value={marketingForm.audienceSegment} onChange={(v) => updateMarketing({ audienceSegment: v })} placeholder="donors_30d / lookalike" /><Field label="Message Variant" value={marketingForm.messageVariant} onChange={(v) => updateMarketing({ messageVariant: v })} placeholder="v1_image / v2_video" />{marketingForm.platform.startsWith("twilio") && <><Field label="Twilio Campaign ID" value={marketingForm.twilioCampaignId} onChange={(v) => updateMarketing({ twilioCampaignId: v })} dir="ltr" /><Field label="Twilio Template ID" value={marketingForm.twilioTemplateId} onChange={(v) => updateMarketing({ twilioTemplateId: v })} dir="ltr" /><Field label="Button ID" value={marketingForm.buttonId} onChange={(v) => updateMarketing({ buttonId: v })} /><Field label="Button Label" value={marketingForm.buttonLabel} onChange={(v) => updateMarketing({ buttonLabel: v })} /></>}</div><div className="rounded-xl border bg-slate-50 p-3 space-y-2"><div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="w-4 h-4 text-[#025EB8]" />فحص الرابط قبل النسخ</div>{marketingIssues.map((item, index) => <div key={`${item.text}-${index}`} className={cn("text-sm leading-6", item.level === "ok" ? "text-emerald-700" : "text-amber-700")}>• {item.text}</div>)}</div></motion.section>}</AnimatePresence>
      <AnimatePresence initial={false}>{pageKind && detailsOk && <motion.div key="output" {...fadeDown} className="pt-5 pb-1 space-y-3"><Label className="text-base font-semibold text-foreground block">{linkMode === "marketing" ? "٥" : "٤"} — الرابط الجاهز</Label>{translationWarning && <Alert className="border-amber-500/50 bg-amber-50/90 text-amber-950"><AlertTitle className="text-sm">تنبيه ترجمة</AlertTitle><AlertDescription className="text-sm">{translationWarning}</AlertDescription></Alert>}<div className="rounded-xl bg-slate-700 text-slate-100 p-4 shadow-inner ring-1 ring-white/10"><div className="flex items-center justify-between gap-2 mb-1.5 min-h-8"><p className="text-[10px] uppercase tracking-wider text-slate-400 m-0">كامل مع النطاق</p><div className="flex items-center gap-0.5 shrink-0" dir="ltr"><Button type="button" size="icon" variant="ghost" onClick={copyUrl} disabled={!fullUrl} title="نسخ الرابط" aria-label="نسخ الرابط" className="h-8 w-8 text-slate-200 hover:bg-[#FA5D17] hover:text-white disabled:pointer-events-none disabled:opacity-35"><Copy className="w-3.5 h-3.5" /></Button>{fullUrl ? <Button type="button" size="icon" variant="ghost" asChild title="معاينة في تبويب جديد" aria-label="معاينة في تبويب جديد" className="h-8 w-8 text-slate-200 hover:bg-white/15 hover:text-white"><a href={fullUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a></Button> : null}</div></div><code className="block text-xs sm:text-sm font-medium leading-relaxed break-all" dir="ltr">{fullUrl}</code></div></motion.div>}</AnimatePresence>
    </CardContent></Card>
  </div>;
}

function Field({ label, value, onChange, placeholder, dir }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; dir?: "rtl" | "ltr" }) { return <div className="space-y-2"><Label className="text-sm text-muted-foreground">{label}</Label><Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn("h-10", dir === "ltr" && "font-mono text-sm text-left")} dir={dir || "rtl"} /></div>; }
function CheckRow({ checked, onChange, title, hint }: { checked: boolean; onChange: (checked: boolean) => void; title: string; hint: string }) { return <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 hover:bg-muted/50 transition-colors"><Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} className="mt-0.5" /><span className="text-sm leading-snug">{title}<span className="block text-xs text-muted-foreground mt-0.5">{hint}</span></span></label>; }
