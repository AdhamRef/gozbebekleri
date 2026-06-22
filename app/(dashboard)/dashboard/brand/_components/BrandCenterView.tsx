import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Download,
  FileText,
  Layers3,
  Palette,
  ShieldCheck,
  Sparkles,
  Type,
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
import { BrandCopyButton } from "./BrandCopyButton";

type Props = {
  activeTab: BrandCenterTabKey;
  snapshot: BrandCenterSnapshot;
};

export function BrandCenterView({ activeTab, snapshot }: Props) {
  return (
    <main className="min-h-screen bg-[#FFFDF8] p-4 text-slate-950 sm:p-6" dir="rtl">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#025EB8]">Brand Center</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">مركز الهوية</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              مصدر واحد للهوية الرسمية، الأصول، الألوان، قواعد الكتابة، ورسائل الحملات. كل مخرجات AI هنا Draft وتحتاج مراجعة بشرية.
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-700 lg:min-w-72">
            <p className="font-black text-slate-950">{snapshot.activeProfile.name}</p>
            <p className="mt-1 leading-6">{snapshot.activeProfile.contentVoice}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{snapshot.persistence.mode}</Badge>
              <Badge>{snapshot.activeProfile.primaryLocale.toUpperCase()}</Badge>
              <Badge>{snapshot.summary.toVerify} to verify</Badge>
            </div>
          </div>
        </div>

        <nav className="mt-5 flex gap-2 overflow-x-auto border-t pt-4" aria-label="Brand Center tabs">
          {snapshot.tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${
                activeTab === tab.key ? "bg-[#10212B] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.title}
            </Link>
          ))}
        </nav>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={<Layers3 />} label="Profiles" value={snapshot.summary.profiles} />
        <Metric icon={<FileText />} label="Assets" value={snapshot.summary.assets} />
        <Metric icon={<Palette />} label="Colors" value={snapshot.summary.colors} />
        <Metric icon={<ShieldCheck />} label="Rules" value={snapshot.summary.guidelines} />
        <Metric icon={<Sparkles />} label="Frameworks" value={snapshot.summary.frameworks} />
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
  if (activeTab === "colors") return <Colors colors={snapshot.colors} />;
  if (activeTab === "typography") return <Typography fonts={snapshot.fonts} />;
  if (activeTab === "voice") return <Guidelines guidelines={snapshot.guidelines} />;
  if (activeTab === "frameworks") return <Frameworks frameworks={snapshot.messageFrameworks} />;
  if (activeTab === "downloads") return <Downloads snapshot={snapshot} />;
  return <Overview snapshot={snapshot} />;
}

function Overview({ snapshot }: { snapshot: BrandCenterSnapshot }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel title="Brand operating brief" description="ما يحتاجه الكاتب والمصمم قبل أي رسالة أو تصميم.">
        <div className="grid gap-3 md:grid-cols-2">
          <InfoBlock title="Mission" text={snapshot.activeProfile.mission} />
          <InfoBlock title="Vision" text={snapshot.activeProfile.vision} />
          <InfoBlock title="Voice" text={snapshot.activeProfile.contentVoice} />
          <InfoBlock title="Message philosophy" text={snapshot.activeProfile.messagePhilosophy} />
        </div>
      </Panel>
      <Panel title="What do I do now?" description="قائمة قصيرة للفريق بدون ازدحام.">
        <ActionLine title="Verify production logo" text="ارفع ملف الشعار المعتمد قبل تفعيل downloads العامة." />
        <ActionLine title="Complete CTA colors" text="راجع لون CTA لكل هوية حتى لا تختلط حملات التبرع." />
        <ActionLine title="Add missing language examples" text="خصوصًا قواعد التركية والزكاة والوقف قبل استخدام AI للترجمة." />
        <ActionLine title="Use AI as draft guard" text="راجع copy أو message framework، ثم اعتمده يدويًا فقط." />
      </Panel>
      <Panel title="AI guardrails" description="Shared AI Core يقرأ قواعد الهوية ولا يرسل أو ينشر تلقائيًا.">
        <div className="grid gap-3 md:grid-cols-2">
          {snapshot.qa.aiOutputsAreDraftOnly && <StateLine title="Draft only" text="كل المخرجات مقترحات تحتاج human approval." />}
          {snapshot.qa.noAutoPublish && <StateLine title="No auto publish" text="لا نشر محتوى، لا إرسال رسائل، لا تعديل ميزانيات." />}
          {snapshot.qa.noFrontendSecrets && <StateLine title="No frontend secrets" text="لا مفاتيح أو tokens داخل واجهة Brand Center." />}
          {snapshot.qa.brandAssetSeparatedFromArchiveAsset && <StateLine title="BrandAsset separated" text="الشعار والقوالب غير مختلطة مع ArchiveAsset الميداني." />}
        </div>
      </Panel>
    </div>
  );
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
              {profile.id === activeProfileId && <Badge>Active</Badge>}
              <Badge>{profile.status}</Badge>
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
                  <Badge>{asset.status}</Badge>
                  <Badge>{asset.downloadable ? "Downloadable" : "Locked"}</Badge>
                </div>
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

function Colors({ colors }: { colors: BrandColor[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {colors.map((color) => (
        <div key={color.id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="h-24" style={{ backgroundColor: color.hex }} />
          <div className="space-y-2 p-4">
            <p className="font-black text-slate-950">{color.name}</p>
            <p className="font-mono text-sm text-slate-700" dir="ltr">{color.hex}</p>
            <p className="text-xs text-slate-500" dir="ltr">RGB {color.rgb}</p>
            <p className="text-sm leading-6 text-slate-600">{color.description}</p>
            <Badge>{color.usage}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function Typography({ fonts }: { fonts: BrandFont[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {fonts.map((font) => (
        <Panel key={font.id} title={font.name} description={font.usage} compact>
          <div className="space-y-3">
            <p className="text-2xl font-black text-slate-950">Minber-i Aksa / Gözbebekleri</p>
            <p className="text-sm leading-6 text-slate-600">Fallback: {font.fallback}</p>
            <p className="text-sm leading-6 text-slate-600">Source: {font.source}</p>
            <p className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">{font.notes}</p>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function Guidelines({ guidelines }: { guidelines: BrandGuideline[] }) {
  return (
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
  );
}

function Frameworks({ frameworks }: { frameworks: BrandMessageFramework[] }) {
  return (
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

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
        </div>
        <span className="text-[#025EB8] [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      </div>
    </div>
  );
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

function ActionLine({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg border bg-white p-3"><p className="font-black text-slate-950">{title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div>;
}

function StateLine({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg border bg-emerald-50 p-3"><p className="font-black text-emerald-950">{title}</p><p className="mt-1 text-sm leading-6 text-emerald-800">{text}</p></div>;
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
