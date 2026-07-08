import Link from "next/link";
import { Plus, LayoutTemplate, MessageCircle, Mail, MessageSquare, Cpu } from "lucide-react";
import { getTemplateCenter, LOCALE_LABEL, type TemplateGroup } from "@/lib/communication/template-center-service";
import { VariableLibrary } from "./_components/VariableLibrary";
import { TemplateRowActions } from "./_components/TemplateRowActions";

export const metadata = { title: "القوالب | مركز التواصل" };
export const dynamic = "force-dynamic";

const BASE = "/dashboard/operations/communication/templates";

const TABS = [
  { key: "all", label: "الكل" },
  { key: "system", label: "تلقائية" },
  { key: "campaign", label: "حملات" },
  { key: "email", label: "إيميل" },
  { key: "whatsapp", label: "واتساب" },
  { key: "sms", label: "رسائل قصيرة" },
  { key: "review", label: "تحتاج مراجعة" },
] as const;

const CHANNEL_META: Record<string, { label: string; icon: typeof Mail; cls: string }> = {
  WHATSAPP: { label: "واتساب", icon: MessageCircle, cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  EMAIL: { label: "إيميل", icon: Mail, cls: "border-blue-200 bg-blue-50 text-blue-700" },
  SMS: { label: "رسائل قصيرة", icon: MessageSquare, cls: "border-amber-200 bg-amber-50 text-amber-700" },
};

const STATUS_LABEL: Record<string, string> = { DRAFT: "مسودة", READY: "جاهز", NEEDS_REVIEW: "تحتاج مراجعة", ARCHIVED: "مؤرشف", APPROVED: "معتمد" };
const STATUS_CLASS: Record<string, string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-600",
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NEEDS_REVIEW: "border-amber-200 bg-amber-50 text-amber-700",
  ARCHIVED: "border-slate-200 bg-slate-100 text-slate-400",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function filterGroups(groups: TemplateGroup[], tab: string): TemplateGroup[] {
  const active = groups.filter((g) => g.status !== "ARCHIVED");
  switch (tab) {
    case "system": return active.filter((g) => g.kind === "SYSTEM");
    case "campaign": return active.filter((g) => g.kind === "CAMPAIGN");
    case "email": return active.filter((g) => g.channel === "EMAIL");
    case "whatsapp": return active.filter((g) => g.channel === "WHATSAPP");
    case "sms": return active.filter((g) => g.channel === "SMS");
    case "review": return active.filter((g) => g.status === "NEEDS_REVIEW");
    default: return active;
  }
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-black ${tone === "warn" && value > 0 ? "text-amber-700" : "text-slate-900"}`}>{value.toLocaleString("ar")}</div>
    </div>
  );
}

function GroupCard({ g }: { g: TemplateGroup }) {
  const ch = CHANNEL_META[g.channel];
  const Icon = ch.icon;
  const autoActive = g.usage.some((u) => u.enabled);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-black text-slate-900">{g.name}</span>
            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${ch.cls}`}><Icon className="h-3 w-3" /> {ch.label}</span>
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600">{g.kind === "SYSTEM" ? <><Cpu className="h-3 w-3" /> تلقائي</> : "حملة"}</span>
            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${STATUS_CLASS[g.status]}`}>{STATUS_LABEL[g.status] ?? g.status}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {g.locales.map((l) => <span key={l} className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{LOCALE_LABEL(l)}</span>)}
            {g.missingLocales.slice(0, 6).map((l) => <span key={l} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">{LOCALE_LABEL(l)}</span>)}
          </div>
        </div>
        <TemplateRowActions id={g.id} isSystem={g.kind === "SYSTEM"} missingLocales={g.missingLocales.map((l) => ({ code: l, label: LOCALE_LABEL(l) }))} />
      </div>

      {g.kind === "SYSTEM" ? (
        <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs">
          {g.usage.length > 0 ? (
            <p className="text-slate-600">يُستخدم في: <b className="text-slate-800">{g.usage.map((u) => u.label).join("، ")}</b>{" "}
              {autoActive ? <span className="text-emerald-700">— الإرسال التلقائي مفعّل.</span> : <span className="text-amber-700">— الإرسال التلقائي لهذا الحدث غير مفعّل بعد.</span>}
            </p>
          ) : (
            <p className="text-amber-700">الإرسال التلقائي لهذا الحدث غير مفعّل بعد.</p>
          )}
        </div>
      ) : null}

      {g.channel === "WHATSAPP" ? (
        <p className="mt-2 text-[11px] leading-5 text-slate-500">هذا القالب محفوظ داخليًا. اعتماد واتساب يتم من Meta حتى تفعيل المزامنة.{g.approvalStatus ? ` (حالة الاعتماد: ${g.approvalStatus})` : ""}</p>
      ) : null}
      {g.channel === "SMS" ? (
        <p className="mt-2 text-[11px] leading-5 text-slate-500">الرسائل القصيرة غير مفعّلة للإرسال بعد، لكن يمكنك تجهيز القوالب.</p>
      ) : null}
    </div>
  );
}

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as string) : "all";
  const { summary, groups } = await getTemplateCenter();
  const filtered = filterGroups(groups, tab);

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <section className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs text-white/70">مركز التواصل / القوالب</p>
            <h1 className="mt-1.5 text-2xl font-black">القوالب</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">أنشئ وأدر قوالب واتساب، إيميل، ورسائل قصيرة حسب اللغة والاستخدام.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`${BASE}/new`} className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-[#025EB8] shadow-sm hover:bg-white/90"><Plus className="h-4 w-4" /> إنشاء قالب</Link>
            <Link href={`${BASE}/layouts`} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/30 bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/20"><LayoutTemplate className="h-4 w-4" /> إنشاء تصميم إيميل ثابت</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="قوالب تلقائية" value={summary.systemCount} />
        <SummaryCard label="قوالب حملات" value={summary.campaignCount} />
        <SummaryCard label="لغات ناقصة" value={summary.missingLanguageGroups} tone="warn" />
        <SummaryCard label="تحتاج مراجعة" value={summary.needsReviewCount} tone="warn" />
      </section>

      <nav className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link key={t.key} href={t.key === "all" ? BASE : `${BASE}?tab=${t.key}`} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${active ? "bg-[#025EB8] text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-[#025EB8]/40"}`}>{t.label}</Link>
          );
        })}
      </nav>

      <VariableLibrary />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <LayoutTemplate className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">لا توجد قوالب في هذا القسم بعد.</p>
          <Link href={`${BASE}/new`} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#025EB8] px-4 text-xs font-bold text-white hover:bg-[#024a92]"><Plus className="h-4 w-4" /> إنشاء قالب</Link>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((g) => <GroupCard key={g.id} g={g} />)}
        </div>
      )}

      <p className="text-[11px] leading-6 text-slate-400">
        القوالب التلقائية مخصّصة لأحداث النظام ولا تظهر في منشئ الحملات. المعاينة داخلية فقط دون إرسال أو اتصال بأي مزود، وبدون أي بيانات وهمية.
      </p>
    </main>
  );
}
