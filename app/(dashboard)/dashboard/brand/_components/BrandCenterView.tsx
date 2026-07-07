import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Layers3,
  Palette,
  PenLine,
  Building2,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
} from "lucide-react";
import type {
  BrandAsset,
  BrandCenterSnapshot,
  BrandCenterTabKey,
  BrandColor,
  BrandFont,
  BrandGuideline,
  BrandMessageFramework,
  BrandProfile,
} from "@/lib/brand/brand-types";
import { BrandAssetCreatePanel } from "./BrandAssetCreatePanel";
import { BrandAssetStatusActions } from "./BrandAssetStatusActions";
import { BrandColorCreatePanel } from "./BrandColorCreatePanel";
import { BrandCopyButton } from "./BrandCopyButton";
import { BrandFontCreatePanel } from "./BrandFontCreatePanel";
import { BrandGuidelineCreatePanel } from "./BrandGuidelineCreatePanel";
import { BrandMessageFrameworkCreatePanel } from "./BrandMessageFrameworkCreatePanel";

type Props = {
  activeTab: BrandCenterTabKey;
  snapshot: BrandCenterSnapshot;
};

const STATUS_LABELS_AR: Record<string, string> = {
  ACTIVE: "نشط",
  TO_VERIFY: "بحاجة تأكيد",
  FOUNDATION: "قيد الإعداد",
};
const statusAr = (s: string) => STATUS_LABELS_AR[s] ?? s;

const TAB_LABELS_AR: Record<BrandCenterTabKey, string> = {
  overview: "نظرة عامة",
  organizations: "المؤسسات",
  assets: "الشعارات والأصول",
  colors: "الألوان",
  typography: "الخطوط",
  voice: "قواعد الكتابة",
  frameworks: "قوالب الرسائل",
  downloads: "التنزيلات",
};

export function BrandCenterView({ activeTab, snapshot }: Props) {
  return (
    <main className="min-h-screen bg-[#FFFDF8] p-4 text-slate-950 sm:p-6" dir="rtl">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#025EB8]">مركز الهوية</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">دليل الهوية للفريق</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              مرجع واحد لكتّاب المحتوى والمصممين: نبرة الخطاب، قواعد كتابة المنشورات، الألوان، الشعارات، وقوالب الرسائل الجاهزة.
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-700 lg:min-w-72">
            <p className="text-xs font-bold text-slate-500">الهوية النشطة</p>
            <p className="mt-1 font-black text-slate-950">{snapshot.activeProfile.name}</p>
            <p className="mt-1 leading-6">{snapshot.activeProfile.contentVoice}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>اللغة الأساسية: {snapshot.activeProfile.primaryLocale.toUpperCase()}</Badge>
              {snapshot.summary.toVerify > 0 ? <Badge>{snapshot.summary.toVerify} بحاجة تأكيد</Badge> : null}
            </div>
          </div>
        </div>

        <nav className="mt-5 flex gap-2 overflow-x-auto border-t pt-4" aria-label="أقسام مركز الهوية">
          {snapshot.tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${
                activeTab === tab.key ? "bg-[#10212B] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {TAB_LABELS_AR[tab.key] ?? tab.title}
            </Link>
          ))}
        </nav>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Building2 />} label="المؤسسات" value={snapshot.summary.profiles} href="/dashboard/brand/organizations" />
        <Metric icon={<FileText />} label="الشعارات والأصول" value={snapshot.summary.assets} href="/dashboard/brand/assets" />
        <Metric icon={<Palette />} label="الألوان" value={snapshot.summary.colors} href="/dashboard/brand/colors" />
        <Metric icon={<Layers3 />} label="قوالب الرسائل" value={snapshot.summary.frameworks} href="/dashboard/brand/frameworks" />
      </section>

      <section className="mt-5 grid gap-3 lg:grid-cols-3">
        {snapshot.alerts.map((alert) => (
          <div key={alert.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              {alert.severity === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-[#D39A27]" />}
              <div>
                <p className="font-black text-slate-950">{alert.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{alert.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-5">{renderTab(activeTab, snapshot)}</section>
    </main>
  );
}

function renderTab(activeTab: BrandCenterTabKey, snapshot: BrandCenterSnapshot) {
  if (activeTab === "organizations") return <Organizations profiles={snapshot.profiles} activeProfileId={snapshot.activeProfile.id} />;
  if (activeTab === "assets") return <Assets assets={snapshot.assets} activeProfileId={snapshot.activeProfile.id} />;
  if (activeTab === "colors") return <Colors colors={snapshot.colors} activeProfileId={snapshot.activeProfile.id} />;
  if (activeTab === "typography") return <Typography fonts={snapshot.fonts} activeProfileId={snapshot.activeProfile.id} />;
  if (activeTab === "voice") return <Guidelines guidelines={snapshot.guidelines} activeProfileId={snapshot.activeProfile.id} />;
  if (activeTab === "frameworks") return <Frameworks frameworks={snapshot.messageFrameworks} activeProfileId={snapshot.activeProfile.id} />;
  if (activeTab === "downloads") return <Downloads snapshot={snapshot} />;
  return <Overview snapshot={snapshot} />;
}

function Overview({ snapshot }: { snapshot: BrandCenterSnapshot }) {
  const profile = snapshot.activeProfile;
  const writingRules = snapshot.guidelines
    .filter((g) => g.section === "voice" || g.section === "copy" || g.section === "cta")
    .sort((a, b) => a.order - b.order);
  const preferred = uniqueList(snapshot.messageFrameworks.flatMap((f) => f.doList));
  const forbidden = uniqueList(snapshot.messageFrameworks.flatMap((f) => f.dontList));

  return (
    <div className="space-y-5">
      {/* Workflow links */}
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/operations/content" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#025EB8] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#024a92]">
          استخدام الهوية في المحتوى <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link href="/dashboard/brand/frameworks" className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:border-[#025EB8] hover:text-[#025EB8]">
          مراجعة القوالب
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Tone of voice */}
        <Panel title="نبرة الخطاب" description="كيف نتحدث مع المتبرعين في كل منشور ورسالة.">
          <div className="space-y-3">
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm leading-7 text-slate-700">{profile.contentVoice}</p>
            </div>
            {profile.messagePhilosophy ? <InfoBlock title="فلسفة الرسالة" text={profile.messagePhilosophy} /> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <InfoBlock title="الرسالة" text={profile.mission} />
              <InfoBlock title="الرؤية" text={profile.vision} />
            </div>
          </div>
        </Panel>

        {/* Preferred / forbidden words */}
        <div className="space-y-5">
          <Panel title="كلمات مفضلة" description="عبارات موصى بها في كتابة المحتوى." compact>
            {preferred.length === 0 ? (
              <EmptyState title="لا توجد كلمات مفضلة بعد" text="ستظهر هنا من قوالب الرسائل المعتمدة." />
            ) : (
              <ul className="space-y-2">
                {preferred.map((w) => (
                  <li key={w} className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {w}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="كلمات ممنوعة" description="عبارات يجب تجنّبها حفاظًا على كرامة المتبرع والمصداقية." compact>
            {forbidden.length === 0 ? (
              <EmptyState title="لا توجد كلمات ممنوعة بعد" text="ستظهر هنا من قوالب الرسائل المعتمدة." />
            ) : (
              <ul className="space-y-2">
                {forbidden.map((w) => (
                  <li key={w} className="flex items-start gap-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-900">
                    <ThumbsDown className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /> {w}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {/* Writing rules for posts */}
      <Panel title="قواعد كتابة المنشورات" description="راجعها قبل كتابة أي منشور أو رسالة حملة.">
        {writingRules.length === 0 ? (
          <EmptyState title="لا توجد قواعد كتابة بعد" text="أضف قواعد النبرة والنص من قسم قواعد الكتابة." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {writingRules.map((rule) => (
              <div key={rule.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-[#025EB8]" />
                  <p className="font-black text-slate-950">{rule.title}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{rule.body}</p>
                {rule.examples[0] ? <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs leading-6 text-slate-700">مثال: {rule.examples[0]}</p> : null}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Link href="/dashboard/brand/voice" className="text-sm font-bold text-[#025EB8] hover:underline">كل قواعد الكتابة ←</Link>
        </div>
      </Panel>
    </div>
  );
}

function uniqueList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function Organizations({ profiles, activeProfileId }: { profiles: BrandProfile[]; activeProfileId: string }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {profiles.map((profile) => (
        <Panel key={profile.id} title={profile.name} description={profile.website} compact>
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p>{profile.description}</p>
            <p>{profile.mission}</p>
            <div className="flex flex-wrap gap-2">
              {profile.supportedLocales.map((locale) => <Badge key={locale}>{locale.toUpperCase()}</Badge>)}
              {profile.id === activeProfileId && <Badge>الهوية النشطة</Badge>}
              <Badge>{statusAr(profile.status)}</Badge>
            </div>
            <p className="rounded-md bg-amber-50 p-3 text-amber-900">{profile.verificationNote}</p>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function Assets({ assets, activeProfileId }: { assets: BrandAsset[]; activeProfileId: string }) {
  return (
    <div className="space-y-4">
      <BrandAssetCreatePanel profileId={activeProfileId} />
      {assets.length === 0 ? <EmptyState title="No brand assets yet" text="Add logos, templates, certificates, watermarks, and brand guide files here." /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {assets.map((asset) => (
          <Panel key={asset.id} title={asset.title} description={`${asset.type} / ${asset.format}`} compact>
            <div className="grid gap-4 md:grid-cols-[120px_1fr]">
              <div className="flex h-28 items-center justify-center rounded-lg border bg-slate-50 text-center text-xs font-bold text-slate-500">
                {asset.previewUrl ? "Preview" : "Preview to be verified"}
              </div>
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <p>{asset.usage}</p>
                <p className="rounded-md bg-slate-50 p-3">{asset.notes}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>{asset.locale.toUpperCase()}</Badge>
                  <Badge>{statusAr(asset.status)}</Badge>
                  <Badge>{asset.downloadable ? "متاح للتحميل" : "مقفل"}</Badge>
                </div>
                <BrandAssetStatusActions assetId={asset.id} status={asset.status} downloadable={asset.downloadable} hasFileUrl={Boolean(asset.fileUrl)} />
                <div className="flex flex-wrap gap-2">
                  <BrandCopyButton value={asset.fileUrl} />
                  <a className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold ${asset.fileUrl ? "text-slate-700 hover:bg-slate-50" : "pointer-events-none text-slate-400 opacity-60"}`} href={asset.fileUrl ?? "#"}>
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function Colors({ colors, activeProfileId }: { colors: BrandColor[]; activeProfileId: string }) {
  return (
    <div className="space-y-4">
      <BrandColorCreatePanel profileId={activeProfileId} />
      {colors.length === 0 ? <EmptyState title="No brand colors yet" text="Add primary, CTA, text, background, accent, and status colors here." /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {colors.map((color) => (
          <div key={color.id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="h-24" style={{ backgroundColor: color.hex }} />
            <div className="space-y-2 p-4">
              <p className="font-black text-slate-950">{color.name}</p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm text-slate-700" dir="ltr">{color.hex}</p>
                <BrandCopyButton value={color.hex} />
              </div>
              <p className="text-xs text-slate-500" dir="ltr">RGB {color.rgb}</p>
              <p className="text-sm leading-6 text-slate-600">{color.description}</p>
              <Badge>{color.usage}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Typography({ fonts, activeProfileId }: { fonts: BrandFont[]; activeProfileId: string }) {
  return (
    <div className="space-y-4">
      <BrandFontCreatePanel profileId={activeProfileId} />
      {fonts.length === 0 ? <EmptyState title="No brand fonts yet" text="Add heading, body, Arabic UI, and campaign typography rules here." /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {fonts.map((font) => (
          <Panel key={font.id} title={font.name} description={font.usage} compact>
            <div className="space-y-3">
              <p className="text-2xl font-black text-slate-950">Minber-i Aksa / Gözbebekleri</p>
              <p className="text-sm leading-6 text-slate-600">الخط البديل: {font.fallback}</p>
              <p className="text-sm leading-6 text-slate-600">المصدر: {font.source}</p>
              <p className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">{font.notes}</p>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function Guidelines({ guidelines, activeProfileId }: { guidelines: BrandGuideline[]; activeProfileId: string }) {
  return (
    <div className="space-y-4">
      <BrandGuidelineCreatePanel profileId={activeProfileId} />
      {guidelines.length === 0 ? <EmptyState title="No brand rules yet" text="Add voice, copy, proof, donor dignity, CTA, and localization rules here." /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {guidelines.map((guideline) => (
          <Panel key={guideline.id} title={guideline.title} description={guideline.section} compact>
            <p className="text-sm leading-6 text-slate-600">{guideline.body}</p>
            <div className="mt-4 grid gap-2">
              {guideline.examples.map((example) => (
                <p key={example} className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">{example}</p>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function Frameworks({ frameworks, activeProfileId }: { frameworks: BrandMessageFramework[]; activeProfileId: string }) {
  return (
    <div className="space-y-4">
      <BrandMessageFrameworkCreatePanel profileId={activeProfileId} />
      {frameworks.length === 0 ? <EmptyState title="No message frameworks yet" text="Add Friday, thank-you, zakat, waqf, emergency, donor reactivation, Ramadan, and general message frameworks here." /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {frameworks.map((framework) => (
          <Panel key={framework.id} title={framework.name} description={`${framework.type} / ${framework.locale.toUpperCase()}`} compact>
            <div className="space-y-4 text-sm leading-6 text-slate-600">
              <div className="flex flex-wrap gap-2">{framework.structure.map((step) => <Badge key={step}>{step}</Badge>)}</div>
              <p className="rounded-md border bg-white p-3 text-slate-800">{framework.sampleText}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <List title="Do" items={framework.doList} />
                <List title="Do not" items={framework.dontList} />
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function Downloads({ snapshot }: { snapshot: BrandCenterSnapshot }) {
  return (
    <Panel title="Downloads" description="التحميل يتفعل فقط بعد ربط الملفات الرسمية.">
      <div className="grid gap-3">
        {snapshot.downloads.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 rounded-lg border bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-black text-slate-950">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.note}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <BrandCopyButton value={item.url} />
              <a className={`inline-flex min-h-9 items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-xs font-bold ${item.ready ? "text-slate-700 hover:bg-slate-100" : "pointer-events-none text-slate-400 opacity-60"}`} href={item.url ?? "#"}>
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Metric({ icon, label, value, href }: { icon: ReactNode; label: string; value: number; href?: string }) {
  const inner = (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      </div>
      <span className="text-[#025EB8] [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
    </div>
  );
  if (href) {
    return <Link href={href} className="block rounded-lg border bg-white p-4 shadow-sm transition hover:border-[#025EB8]/50">{inner}</Link>;
  }
  return <div className="rounded-lg border bg-white p-4 shadow-sm">{inner}</div>;
}

function Panel({ title, description, children, compact = false }: { title: string; description?: string; children: ReactNode; compact?: boolean }) {
  return (
    <section className="rounded-lg border bg-white shadow-sm">
      <div className={`border-b ${compact ? "p-4" : "p-5"}`}>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        {description && <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>}
      </div>
      <div className={compact ? "p-4" : "p-5"}>{children}</div>
    </section>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg border bg-slate-50 p-4"><p className="font-black text-slate-950">{title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>;
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div><p className="font-black text-slate-950">{title}</p><div className="mt-2 space-y-2">{items.map((item) => <p key={item} className="rounded-md bg-slate-50 p-2 text-slate-700">{item}</p>)}</div></div>;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{children}</span>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg border border-dashed bg-white p-8 text-center"><p className="font-black text-slate-950">{title}</p><p className="mt-2 text-sm text-slate-600">{text}</p></div>;
}
