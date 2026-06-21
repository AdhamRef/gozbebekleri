import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Archive, Bot, CheckCircle2, Database, FileText, FolderOpen, Image, Link2, ShieldCheck } from "lucide-react";
import type { ArchiveAsset, ArchiveDriveLink, ArchiveProject, ArchiveSnapshot, ArchiveTabKey } from "@/lib/archive/archive-types";

type Props = {
  activeTab: ArchiveTabKey;
  snapshot: ArchiveSnapshot;
};

export function ArchiveConsole({ activeTab, snapshot }: Props) {
  return (
    <main className="min-h-screen bg-[#FFFDF8] p-4 text-slate-950 sm:p-6" dir="rtl">
      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#025EB8]">Smart Archive</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">الأرشيف الذكي</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              مركز واحد لتوثيق المشاريع، ربط Google Drive، مراجعة الصور والفيديوهات، واختيار المواد الآمنة للتسويق بدون إرسال أو تحليل تلقائي.
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4 text-sm leading-6 text-slate-700 lg:max-w-sm">
            <p className="font-black text-slate-950">Foundation mode</p>
            <p>{snapshot.persistence.note}</p>
          </div>
        </div>
        <nav className="mt-5 flex gap-2 overflow-x-auto border-t pt-4" aria-label="Archive tabs">
          {snapshot.tabs.map((tab) => (
            <Link key={tab.key} href={tab.href} className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${activeTab === tab.key ? "bg-[#10212B] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
              {tab.title}
            </Link>
          ))}
        </nav>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<FolderOpen />} label="Collections" value={snapshot.summary.collections} />
        <Metric icon={<Archive />} label="Projects" value={snapshot.summary.projects} />
        <Metric icon={<Image />} label="Assets" value={snapshot.summary.assets} />
        <Metric icon={<ShieldCheck />} label="Human review" value={snapshot.summary.pendingHumanReview} />
      </section>

      <section className="mt-5 grid gap-3 lg:grid-cols-3">
        {snapshot.warnings.map((warning) => (
          <div key={warning} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-[#D39A27]" />
              <p className="text-sm font-semibold leading-6 text-slate-700">{warning}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-5">{renderTab(activeTab, snapshot)}</section>
    </main>
  );
}

function renderTab(activeTab: ArchiveTabKey, snapshot: ArchiveSnapshot) {
  if (activeTab === "collections") return <Collections snapshot={snapshot} />;
  if (activeTab === "projects") return <Projects projects={snapshot.projects} />;
  if (activeTab === "drive-links") return <DriveLinks links={snapshot.driveLinks} projects={snapshot.projects} />;
  if (activeTab === "assets") return <Assets assets={snapshot.assets} />;
  if (activeTab === "marketing-picks") return <Assets assets={snapshot.marketingPicks} marketingOnly />;
  if (activeTab === "reports") return <Reports snapshot={snapshot} />;
  if (activeTab === "ai") return <ArchiveAi snapshot={snapshot} />;
  return <Overview snapshot={snapshot} />;
}

function Overview({ snapshot }: { snapshot: ArchiveSnapshot }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <Panel title="Archive flow" description="المسار العملي من Drive إلى المحتوى والتسويق.">
        <div className="grid gap-3">
          {snapshot.flows.map((flow) => <InfoLine key={flow} title={flow} text="Contract ready / foundation mode" />)}
        </div>
      </Panel>
      <Panel title="What do I do now?" description="خطوات تشغيل واضحة للفريق.">
        <InfoLine title="Attach Drive folder" text="أضف رابط Drive للمشروع ثم اختبر استخراج Folder/File ID بدون sync خارجي." />
        <InfoLine title="Review sensitive assets" text="أي صورة فيها حساسية أو تحتاج blur لا تدخل Marketing Picks قبل approval." />
        <InfoLine title="Create ContentItem" text="حوّل الأصل المناسب إلى ContentItem proposal ثم Operations يكمل الإنتاج." />
        <InfoLine title="Assign OperationTask" text="المهام تذهب لعقد OperationTask، وليس نظام مهام منفصل داخل Archive." />
      </Panel>
      <Panel title="Safety gates" description="المنظومة لا تعمل تلقائيًا في الخلفية.">
        <div className="grid gap-3 md:grid-cols-2">
          <StateLine title="No auto analysis" text={String(snapshot.safety.noAutoAnalysis)} />
          <StateLine title="No external Drive call" text={String(snapshot.safety.noExternalDriveCall)} />
          <StateLine title="Human approval required" text={String(snapshot.safety.humanApprovalRequired)} />
          <StateLine title="Shared AI Core" text={String(snapshot.safety.usesSharedAiCore)} />
        </div>
      </Panel>
    </div>
  );
}

function Collections({ snapshot }: { snapshot: ArchiveSnapshot }) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {snapshot.collections.map((collection) => (
        <Panel key={collection.id} title={collection.name} description={collection.type} compact>
          <p className="text-sm leading-6 text-slate-600">{collection.description}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Badge>{collection.slug}</Badge><Badge>{collection.isActive ? "Active" : "Paused"}</Badge></div>
        </Panel>
      ))}
    </div>
  );
}

function Projects({ projects }: { projects: ArchiveProject[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {projects.map((project) => (
        <Panel key={project.id} title={project.title} description={`${project.country} / ${project.city} / ${project.year}`} compact>
          <p className="text-sm leading-6 text-slate-600">{project.description}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Badge>{project.status}</Badge><Badge>{project.documentationStatus}</Badge><Badge>{project.marketingStatus}</Badge><Badge>{project.projectType}</Badge></div>
          <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">{project.notes}</p>
        </Panel>
      ))}
    </div>
  );
}

function DriveLinks({ links, projects }: { links: ArchiveDriveLink[]; projects: ArchiveProject[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {links.map((link) => {
        const project = projects.find((item) => item.id === link.projectId);
        return (
          <Panel key={link.id} title={link.title} description={project?.title ?? link.projectId} compact>
            <div className="space-y-3 text-sm leading-6 text-slate-600">
              <p dir="ltr" className="rounded-md bg-slate-50 p-3 font-mono text-xs">{link.driveUrl}</p>
              <div className="flex flex-wrap gap-2"><Badge>{link.linkType}</Badge><Badge>{link.syncStatus}</Badge><Badge>{link.totalImages} images</Badge><Badge>{link.totalVideos} videos</Badge></div>
              {link.lastError && <p className="rounded-md bg-amber-50 p-3 text-amber-900">{link.lastError}</p>}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function Assets({ assets, marketingOnly = false }: { assets: ArchiveAsset[]; marketingOnly?: boolean }) {
  if (assets.length === 0) return <EmptyState title="No assets here yet" text={marketingOnly ? "Marketing Picks waits for approved, non-sensitive assets." : "Drive metadata sync will populate ArchiveAssets later."} />;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {assets.map((asset) => (
        <Panel key={asset.id} title={asset.fileName} description={`${asset.fileType} / ${asset.recommendedUse}`} compact>
          <div className="grid gap-4 md:grid-cols-[128px_1fr]">
            <div className="flex h-32 items-center justify-center rounded-lg border bg-slate-50 text-center text-xs font-bold text-slate-500">Preview to be synced</div>
            <div className="space-y-3 text-sm leading-6 text-slate-600">
              <p>{asset.aiSummary || "Not analyzed yet."}</p>
              {asset.aiWarnings && <p className="rounded-md bg-amber-50 p-3 text-amber-900">{asset.aiWarnings}</p>}
              <div className="flex flex-wrap gap-2">
                <Badge>{asset.aiStatus}</Badge><Badge>{asset.humanReviewStatus}</Badge><Badge>Marketing {asset.marketingScore}</Badge><Badge>Quality {asset.qualityScore}</Badge>
                {asset.isSensitive && <Badge>Sensitive</Badge>}{asset.needsBlur && <Badge>Needs blur</Badge>}
              </div>
              <div className="flex flex-wrap gap-2">{asset.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function Reports({ snapshot }: { snapshot: ArchiveSnapshot }) {
  const reports = snapshot.assets.filter((asset) => asset.fileType === "DOCUMENT" || asset.recommendedUse === "REPORT");
  return (
    <Panel title="Reports Archive" description="تقارير وملفات توثيق لفريق المشاريع.">
      <div className="grid gap-3">
        {reports.map((report) => <InfoLine key={report.id} title={report.fileName} text={report.documentationApproved ? "Documentation approved" : "Documentation review pending"} />)}
      </div>
    </Panel>
  );
}

function ArchiveAi({ snapshot }: { snapshot: ArchiveSnapshot }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel title="Archive AI readiness" description="Draft analysis only. Human review is always required.">
        <InfoLine title="Image analysis" text="Draft tags, recommended use, sensitivity warnings, and captions." />
        <InfoLine title="Video analysis" text="Video frames only later; full videos are not sent to AI." />
        <InfoLine title="Reports summary" text="Summaries support project teams but do not approve assets." />
      </Panel>
      <Panel title="Contracts ready" description="الموديلات المقترحة للتحويل القادم.">
        <div className="flex flex-wrap gap-2">{snapshot.persistence.nextModels.map((model) => <Badge key={model}>{model}</Badge>)}</div>
      </Panel>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="rounded-lg border bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}</p></div><span className="text-[#025EB8] [&>svg]:h-5 [&>svg]:w-5">{icon}</span></div></div>;
}

function Panel({ title, description, children, compact = false }: { title: string; description?: string; children: ReactNode; compact?: boolean }) {
  return <section className="rounded-lg border bg-white shadow-sm"><div className={`border-b ${compact ? "p-4" : "p-5"}`}><h2 className="text-lg font-black text-slate-950">{title}</h2>{description && <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>}</div><div className={compact ? "p-4" : "p-5"}>{children}</div></section>;
}

function InfoLine({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg border bg-slate-50 p-4"><p className="font-black text-slate-950">{title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div>;
}

function StateLine({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg border bg-emerald-50 p-3"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><p className="font-black text-emerald-950">{title}</p></div><p className="mt-1 text-sm leading-6 text-emerald-800">{text}</p></div>;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{children}</span>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg border border-dashed bg-white p-8 text-center"><Database className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-black text-slate-950">{title}</p><p className="mt-2 text-sm text-slate-600">{text}</p></div>;
}
