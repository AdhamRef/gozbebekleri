import Link from "next/link";
import { Users, Mail, Phone, MessageCircle, Plus, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAudienceOverview, type AudienceOverview } from "@/lib/communication/audience-service";
import { listAudienceLists, type AudienceListSummary } from "@/lib/communication/audience-list-service";
import { AudienceListRowActions } from "./_components/AudienceListRowActions";
import { EmptyState } from "@/components/dashboard/EmptyState";

export const dynamic = "force-dynamic";

const BASE = "/dashboard/operations/communication/audiences";
const TABS = [
  { key: "auto", label: "الشرائح التلقائية" },
  { key: "custom", label: "القوائم المخصصة" },
  { key: "test", label: "قوائم الاختبار" },
  { key: "review", label: "تحتاج مراجعة" },
] as const;

const CHANNEL_AR: Record<string, string> = { WHATSAPP: "واتساب", EMAIL: "إيميل", SMS: "رسائل قصيرة" };
const num = (v: number) => v.toLocaleString();
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ar") : "—");

function Stat({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 text-xs text-slate-500">{icon}{title}</div>
      <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function AutomaticSegments({ overview }: { overview: AudienceOverview }) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="إجمالي المتبرعين" value={num(overview.totals.donors)} icon={<Users className="h-4 w-4" />} />
        <Stat title="مؤهّل للإيميل" value={num(overview.totals.emailEligible)} icon={<Mail className="h-4 w-4" />} />
        <Stat title="مؤهّل للرسائل" value={num(overview.totals.smsEligible)} icon={<Phone className="h-4 w-4" />} />
        <Stat title="واتساب — يحتاج مراجعة" value={num(overview.totals.whatsappNeedsReview)} icon={<MessageCircle className="h-4 w-4" />} />
      </section>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b p-4"><h2 className="text-base font-black text-slate-900">الشرائح حسب اللغة</h2><p className="mt-1 text-xs text-slate-500">لكل لغة: العدد الكلي والقنوات المتاحة. اللغة تُشتق من تفضيل المتبرع.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-500"><tr>
              <th className="p-3 text-right font-semibold">اللغة</th><th className="p-3 text-center font-semibold">المتبرعون</th><th className="p-3 text-center font-semibold">لديهم إيميل</th><th className="p-3 text-center font-semibold">لديهم هاتف</th><th className="p-3 text-center font-semibold">إيميل مؤهّل</th><th className="p-3 text-center font-semibold">رسائل مؤهّلة</th><th className="p-3 text-center font-semibold">واتساب مؤهّل</th><th className="p-3 text-center font-semibold">واتساب (مراجعة)</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {overview.languages.map((lang) => (
                <tr key={lang.id} className="border-b last:border-0">
                  <td className="p-3"><div className="font-bold text-slate-900">{lang.nativeLabel}</div><div className="text-xs text-slate-400">{lang.label}</div></td>
                  <td className="p-3 text-center font-black text-slate-900">{num(lang.total)}</td>
                  <td className="p-3 text-center text-slate-600">{num(lang.withEmail)}</td>
                  <td className="p-3 text-center text-slate-600">{num(lang.withPhone)}</td>
                  <td className="p-3 text-center"><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{num(lang.emailEligible)}</Badge></td>
                  <td className="p-3 text-center"><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{num(lang.smsEligible)}</Badge></td>
                  <td className="p-3 text-center"><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{num(lang.whatsappEligible)}</Badge></td>
                  <td className="p-3 text-center"><Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">{num(lang.whatsappNeedsReview)}</Badge></td>
                  <td className="p-3 text-center"><Link href={`${BASE.replace("/audiences", "/campaigns")}?locale=${lang.locale}`} className="text-xs font-bold text-brand">إنشاء حملة ←</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{overview.consentNote}</div>
    </div>
  );
}

function CustomListsTable({ lists }: { lists: AudienceListSummary[] }) {
  if (lists.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="لا توجد قوائم مخصصة بعد"
        description="القوائم المخصصة تتيح استهداف شريحة محددة من المتبرعين برسائل موجّهة."
        action={
          <Link href={`${BASE}/new`} className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-4 text-xs font-bold text-white hover:bg-brand-dark"><Plus className="h-4 w-4" /> إنشاء قائمة</Link>
        }
      />
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="border-b bg-slate-50 text-xs text-slate-500"><tr>
            <th className="p-3 text-right font-semibold">الاسم</th><th className="p-3 text-right font-semibold">النوع</th><th className="p-3 text-right font-semibold">القنوات</th><th className="p-3 text-center font-semibold">الأعضاء</th><th className="p-3 text-right font-semibold">آخر تحديث</th><th className="p-3 text-right font-semibold">المالك</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {lists.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="p-3"><Link href={`${BASE}/${l.id}`} className="font-bold text-slate-900 hover:text-brand">{l.name}</Link>{l.description ? <div className="text-xs text-slate-400">{l.description}</div> : null}</td>
                <td className="p-3"><Badge variant="outline" className={l.type === "TEST" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600"}>{l.type === "TEST" ? "اختبار" : "مخصصة"}</Badge></td>
                <td className="p-3 text-xs text-slate-600">{l.channels.length ? l.channels.map((c) => CHANNEL_AR[c] ?? c).join("، ") : "—"}</td>
                <td className="p-3 text-center font-black text-slate-900">{num(l.membersCount)}</td>
                <td className="p-3 text-xs text-slate-500">{fmtDate(l.updatedAt)}</td>
                <td className="p-3 text-xs text-slate-500">{l.owner ?? "—"}</td>
                <td className="p-3"><AudienceListRowActions id={l.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TestListsTable({ lists }: { lists: AudienceListSummary[] }) {
  if (lists.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white text-center">
        <FlaskConical className="h-8 w-8 text-slate-300" />
        <p className="text-sm text-slate-500">لا توجد قوائم اختبار بعد. جهّز قائمة اختبار لتجربة الحملات والقوالب قبل الإرسال الحقيقي.</p>
        <Link href={`${BASE}/new?type=test`} className="inline-flex h-9 items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 text-xs font-bold text-amber-800 hover:bg-amber-100"><FlaskConical className="h-4 w-4" /> إنشاء قائمة اختبار</Link>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b bg-slate-50 text-xs text-slate-500"><tr>
            <th className="p-3 text-right font-semibold">الاسم</th><th className="p-3 text-right font-semibold">القنوات</th><th className="p-3 text-center font-semibold">الأعضاء</th><th className="p-3 text-right font-semibold">آخر اختبار</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {lists.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="p-3"><Link href={`${BASE}/${l.id}`} className="font-bold text-slate-900 hover:text-brand">{l.name}</Link></td>
                <td className="p-3 text-xs text-slate-600">{l.channels.length ? l.channels.map((c) => CHANNEL_AR[c] ?? c).join("، ") : "—"}</td>
                <td className="p-3 text-center font-black text-slate-900">{num(l.membersCount)}</td>
                <td className="p-3 text-xs text-slate-500">{fmtDate(l.lastTestAt)}</td>
                <td className="p-3"><AudienceListRowActions id={l.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function CommunicationAudiencesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as string) : "auto";

  let overview: AudienceOverview | null = null;
  try { overview = await getAudienceOverview(); } catch { overview = null; }
  const lists = await listAudienceLists();
  const active = lists.filter((l) => l.status !== "ARCHIVED");
  const customLists = active.filter((l) => l.type === "CUSTOM");
  const testLists = active.filter((l) => l.type === "TEST");
  const needsReview = active.filter((l) => l.membersCount === 0);

  return (
    <main className="space-y-5" dir="rtl">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold text-brand">مركز التواصل / الجمهور</p>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">الجمهور</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">أنشئ شرائح تلقائية أو قوائم مخصصة لاختبار الحملات والقوالب قبل الإرسال.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`${BASE}/new`} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-700"><Plus className="h-4 w-4" /> إنشاء قائمة</Link>
            <Link href={`${BASE}/new?type=test`} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-brand/50 hover:text-brand"><FlaskConical className="h-4 w-4" /> إنشاء قائمة اختبار</Link>
          </div>
        </div>
      </section>

      <nav className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const active2 = t.key === tab;
          const count = t.key === "custom" ? customLists.length : t.key === "test" ? testLists.length : t.key === "review" ? needsReview.length : null;
          return (
            <Link key={t.key} href={t.key === "auto" ? BASE : `${BASE}?tab=${t.key}`} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${active2 ? "bg-brand text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-brand/40"}`}>{t.label}{count !== null && count > 0 ? ` (${count})` : ""}</Link>
          );
        })}
      </nav>

      {tab === "auto" ? (
        overview && overview.totals.donors > 0 ? <AutomaticSegments overview={overview} /> : (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">لا يوجد متبرعون بعد لبناء شرائح لغوية. ستظهر الشرائح تلقائيًا بعد أول تبرع.</div>
        )
      ) : null}
      {tab === "custom" ? <CustomListsTable lists={customLists} /> : null}
      {tab === "test" ? <TestListsTable lists={testLists} /> : null}
      {tab === "review" ? (
        needsReview.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-emerald-700">لا توجد قوائم تحتاج مراجعة.</div>
        ) : <CustomListsTable lists={needsReview} />
      ) : null}

      <p className="text-[11px] leading-6 text-slate-400">أهلية «الرسائل القصيرة» معروضة للتخطيط فقط — الإرسال غير مفعّل بعد. جهات الاختبار لا تُحسب كمتبرعين ولا تظهر في تقارير التبرعات.</p>
    </main>
  );
}
