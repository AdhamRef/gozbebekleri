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
function safeStaticValue(value: string) { return hasUnresolvedMacro(value) ? "" : value.trim(); }

function automaticPlatformValues(platform: MarketingPlatform) {
  if (platform === "meta") {
    return { campaignName: "{{campaign.name}}", campaignId: "{{campaign.id}}", adsetId: "{{adset.id}}", adId: "{{ad.id}}", placement: "{{placement}}", customContent: "{{ad.name}}", device: "" };
  }
  if (platform === "google_ads") {
    return { campaignName: "google-campaign-{campaignid}", campaignId: "{campaignid}", adsetId: "{adgroupid}", adId: "{creative}", placement: "{placement}", device: "", customContent: "ad-{creative}" };
  }
  if (platform === "tiktok") {
    return { campaignName: "__CAMPAIGN_NAME__", campaignId: "__CAMPAIGN_ID__", adsetId: "__AID__", adId: "__CID__", placement: "__PLACEMENT__", device: "", customContent: "__CID__" };
  }
  if (platform === "x") {
    return { campaignName: "x-campaign", campaignId: "__CAMPAIGN_ID__", adsetId: "__LINE_ITEM_ID__", adId: "__PROMOTED_TWEET_ID__", placement: "x", device: "", customContent: "__PROMOTED_TWEET_ID__" };
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
    : (slugifyCampaignName(effective.campaignName) || safeStaticValue(effective.campaignId) || `${preset.channel}-campaign`);
  const content = effective.customContent.trim() || effective.messageVariant.trim() || effective.adId.trim() || effective.buttonLabel.trim();
  const params: Record<string, string> = { utm_source: preset.source, utm_medium: preset.medium, utm_campaign: campaignSlug, channel: preset.channel, language: loc };
  if (effective.campaignId.trim()) params.utm_id = effective.campaignId.trim();
  if (content) params.utm_content = content;
  if (effective.audienceSegment.trim()) params.utm_term = effective.audienceSegment.trim();
  if (effective.campaignId.trim()) params.campaign_id = effective.campaignId.trim();
  if (effective.adsetId.trim()) params.adset_id = effective.adsetId.trim();
  if (effective.adId.trim()) params.ad_id = effective.adId.trim();
  if (effective.placement.trim()) params.placement = effective.placement.trim();
  // platform is always the normalized selected platform. Do not emit raw platform macros.
  params.platform = preset.source;
  const safeDevice = safeStaticValue(effective.device);
  if (safeDevice) params.device = safeDevice;
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
  if (hasUnresolvedMacro(form.device)) issues.push({ level: "warn", text: "تم تجاهل Macro الجهاز في الرابط حتى لا يظهر كتحذير unresolved_macro:device في التقارير." });
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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-black">منشئ روابط الموقع والحملات</h1><p className="text-muted-foreground mt-1">أنشئ رابط موقع عادي أو رابط حملة تسويقية مع UTM احترافي، دون تغيير الرابط الأصلي أو كسر إعدادات الحالية.</p></div><Button variant="ghost" onClick={resetForm} className="gap-2"><RotateCcw className="w-4 h-4" />مسح الكل</Button></div>
      <Card className="overflow-hidden"><CardContent className="p-6 space-y-6"><div className="grid md:grid-cols-2 gap-3"><button type="button" onClick={() => setLinkMode("standard")} className={cn("rounded-xl border p-4 text-start", linkMode === "standard" ? "border-[#025EB8] bg-[#025EB8]/5" : "hover:bg-slate-50")}><div className="font-bold flex gap-2 items-center"><Link2 className="w-4 h-4" />رابط موقع عادي</div><p className="text-xs text-muted-foreground mt-1">بدون نظام الحملات، مناسب للصفحة، تصنيف، حملة، إحالة.</p></button><button type="button" onClick={() => setLinkMode("marketing")} className={cn("rounded-xl border p-4 text-start", linkMode === "marketing" ? "border-[#025EB8] bg-[#025EB8]/5" : "hover:bg-slate-50")}><div className="font-bold flex gap-2 items-center"><Megaphone className="w-4 h-4" />حملة تسويقية</div><p className="text-xs text-muted-foreground mt-1">ينشئ UTM وبيانات منصة للحملات المدفوعة والرسائل.</p></button></div>
      <div className="grid lg:grid-cols-3 gap-4"><div><Label>نوع الصفحة</Label><SearchableCombobox items={pageKindItems} value={pageKind} onValueChange={setPageKind} placeholder="اختر نوع الصفحة…" /></div><div><Label>اللغة</Label><Input value={locale} onChange={(e) => setLocale(e.target.value)} disabled={autoLocale} /></div><div><Label>العملة</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={autoCurrency} /></div></div>
      {showDetailsBlock ? <div className="grid lg:grid-cols-2 gap-4">{needsResourcePick(pageKind as PageKind) ? <div><Label>اختر المحتوى</Label><SearchableCombobox items={resourceItems} value={resourceId} onValueChange={setResourceId} placeholder="ابحث بالاسم أو المعرف…" /></div> : null}{pageKind === "campaigns" ? <div><Label>بحث داخل قائمة المشاريع</Label><Input value={campaignSearch} onChange={(e) => setCampaignSearch(e.target.value)} /></div> : null}{pageKind === "success_donation" ? <div><Label>Donation ID</Label><Input value={donationId} onChange={(e) => setDonationId(e.target.value)} /></div> : null}</div> : null}
      {linkMode === "marketing" ? <div className="rounded-2xl border bg-slate-50/70 p-4 space-y-4"><div className="flex items-center gap-2 font-bold"><WandSparkles className="w-4 h-4" />إعدادات الحملة</div><div className="grid lg:grid-cols-3 gap-4"><div><Label>المنصة</Label><Select value={marketingForm.platform} onValueChange={(v) => updateMarketing({ platform: v as MarketingPlatform })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PLATFORM_OPTIONS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent></Select></div><label className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm"><Checkbox checked={marketingForm.autoPlatformData} onCheckedChange={(v) => updateMarketing({ autoPlatformData: Boolean(v) })} />استخدم بيانات المنصة تلقائيًا</label><div className="text-xs text-muted-foreground flex items-center">{selectedPlatform.hint}</div></div><div className="grid lg:grid-cols-4 gap-4"><Input placeholder="Campaign name" value={effectiveMarketingForm.campaignName} onChange={(e) => updateMarketing({ campaignName: e.target.value, autoPlatformData: false })} /><Input placeholder="Campaign ID" value={effectiveMarketingForm.campaignId} onChange={(e) => updateMarketing({ campaignId: e.target.value, autoPlatformData: false })} /><Input placeholder="Adset / Ad group ID" value={effectiveMarketingForm.adsetId} onChange={(e) => updateMarketing({ adsetId: e.target.value, autoPlatformData: false })} /><Input placeholder="Ad ID / Creative" value={effectiveMarketingForm.adId} onChange={(e) => updateMarketing({ adId: e.target.value, autoPlatformData: false })} /><Input placeholder="Placement" value={effectiveMarketingForm.placement} onChange={(e) => updateMarketing({ placement: e.target.value, autoPlatformData: false })} /><Input placeholder="Device (اختياري، لا تضع Macro)" value={effectiveMarketingForm.device} onChange={(e) => updateMarketing({ device: e.target.value, autoPlatformData: false })} /><Input placeholder="Target country" value={marketingForm.targetCountry} onChange={(e) => updateMarketing({ targetCountry: e.target.value })} /><Input placeholder="Audience / term" value={marketingForm.audienceSegment} onChange={(e) => updateMarketing({ audienceSegment: e.target.value })} /></div><div className="grid gap-2">{marketingIssues.map((issue, i) => <Alert key={i} className={issue.level === "ok" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}><ShieldCheck className="h-4 w-4" /><AlertTitle>{issue.level === "ok" ? "جيد" : "تنبيه"}</AlertTitle><AlertDescription>{issue.text}</AlertDescription></Alert>)}</div><div className="text-sm font-bold">سلامة التتبع: {healthScore}%</div></div> : null}
      {translationWarning ? <Alert className="border-amber-200 bg-amber-50"><AlertTitle>تنبيه ترجمة</AlertTitle><AlertDescription>{translationWarning}</AlertDescription></Alert> : null}
      <div className="rounded-xl border bg-white p-4"><Label>الرابط النهائي</Label><div className="mt-2 flex gap-2"><Input value={fullUrl} readOnly className="font-mono text-xs" /><Button disabled={!detailsOk || !fullUrl} onClick={copyUrl} className="gap-2"><Copy className="w-4 h-4" />نسخ</Button>{fullUrl ? <Button variant="outline" asChild><Link href={fullUrl} target="_blank"><ExternalLink className="w-4 h-4" /></Link></Button> : null}</div></div>
      </CardContent></Card>
    </div>
  );
}
