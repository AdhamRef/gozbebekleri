import type { ReactNode } from "react";
import { Archive, CalendarDays, Database, FileText, FolderOpen, Image, Link2, Video } from "lucide-react";
import type { ArchiveAsset, ArchiveCollection, ArchiveDriveLink, ArchiveProject, ArchiveSnapshot, ArchiveTabKey } from "@/lib/archive/archive-types";
import { ArchiveCollectionCreatePanel } from "./ArchiveCollectionCreatePanel";
import { ArchiveCollectionManageActions } from "./ArchiveCollectionManageActions";
import { ArchiveDriveLinkActions } from "./ArchiveDriveLinkActions";
import { ArchiveDriveLinkCreatePanel } from "./ArchiveDriveLinkCreatePanel";
import { ArchiveDriveLinkManageActions } from "./ArchiveDriveLinkManageActions";
import { ArchiveProjectCreatePanel } from "./ArchiveProjectCreatePanel";
import { ArchiveProjectManageActions } from "./ArchiveProjectManageActions";

type Props = {
  activeTab?: ArchiveTabKey;
  snapshot: ArchiveSnapshot;
};

type ProjectBundle = {
  project: ArchiveProject;
  links: ArchiveDriveLink[];
  assets: ArchiveAsset[];
};

type YearBundle = {
  year: number;
  projects: ProjectBundle[];
};

type CollectionBundle = {
  collection: ArchiveCollection;
  years: YearBundle[];
};

export function ArchiveConsole({ snapshot }: Props) {
  const explorer = buildExplorer(snapshot);

  return (
    <main className="min-h-screen bg-[#FFFDF8] p-4 text-slate-950 sm:p-6" dir="rtl">
      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#025EB8]">Archive Explorer</p>
            <h1 className="mt-2 text-2xl font-black sm:text-4xl">الأرشيف</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              تصفح بسيط حسب المجموعة، السنة، المشروع، ثم المواد. رابط Google Drive يضاف داخل المشروع فقط، ومنه يتم بناء مستكشف المواد لاحقًا.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4 lg:min-w-[560px]">
            <Metric icon={<FolderOpen />} label="المجموعات" value={snapshot.summary.collections} />
            <Metric icon={<CalendarDays />} label="السنوات" value={countYears(explorer)} />
            <Metric icon={<Archive />} label="المشاريع" value={snapshot.summary.projects} />
            <Metric icon={<Link2 />} label="الروابط" value={snapshot.summary.driveLinks} />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="إضافة وتنظيم" description="ابدأ بالمجموعة، ثم المشروع، ثم أضف رابط التوثيق داخل المشروع.">
          <div className="space-y-4">
            <ArchiveCollectionCreatePanel />
            <ArchiveProjectCreatePanel collections={snapshot.collections} />
            <ArchiveDriveLinkCreatePanel projects={snapshot.projects} />
          </div>
        </Panel>
        <Panel title="المواد" description="ملخص سريع للمواد المفهرسة داخل المشاريع.">
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard icon={<Image />} title="صور" value={countAssets(snapshot.assets, "IMAGE")} />
            <SummaryCard icon={<Video />} title="فيديوهات" value={countAssets(snapshot.assets, "VIDEO")} />
            <SummaryCard icon={<FileText />} title="تقارير ومستندات" value={countAssets(snapshot.assets, "DOCUMENT")} />
            <SummaryCard icon={<Database />} title="مواد أخرى" value={countOtherAssets(snapshot.assets)} />
          </div>
        </Panel>
      </section>

      <section className="mt-5 space-y-5">
        {explorer.length === 0 ? (
          <EmptyState title="لا توجد مجموعات بعد" text="أضف أول مجموعة مثل غزة، القدس، السودان، الوقف أو الزكاة." />
        ) : (
          explorer.map((item) => <CollectionExplorer key={item.collection.id} item={item} collections={snapshot.collections} projects={snapshot.projects} />)
        )}
      </section>
    </main>
  );
}

function CollectionExplorer({ item, collections, projects }: { item: CollectionBundle; collections: ArchiveCollection[]; projects: ArchiveProject[] }) {
  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">مجموعة</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{item.collection.name}</h2>
            {item.collection.description ? <p className="mt-2 text-sm leading-7 text-slate-600">{item.collection.description}</p> : null}
          </div>
          <ArchiveCollectionManageActions collection={item.collection} />
        </div>
      </div>

      <div className="space-y-4 p-5">
        {item.years.length === 0 ? (
          <EmptyState title="لا توجد سنوات بعد" text="أضف مشروعًا لهذه المجموعة وحدد السنة ليظهر هنا." compact />
        ) : (
          item.years.map((year) => <YearExplorer key={`${item.collection.id}-${year.year}`} year={year} collections={collections} projects={projects} />)
        )}
      </div>
    </section>
  );
}

function YearExplorer({ year, collections, projects }: { year: YearBundle; collections: ArchiveCollection[]; projects: ArchiveProject[] }) {
  return (
    <section className="rounded-xl border bg-slate-50/60">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500">السنة</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">{year.year}</h3>
        </div>
        <span className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm">{year.projects.length} مشروع</span>
      </div>
      <div className="grid gap-4 p-4 xl:grid-cols-2">
        {year.projects.map((bundle) => <ProjectExplorer key={bundle.project.id} bundle={bundle} collections={collections} projects={projects} />)}
      </div>
    </section>
  );
}

function ProjectExplorer({ bundle, collections, projects }: { bundle: ProjectBundle; collections: ArchiveCollection[]; projects: ArchiveProject[] }) {
  const { project, links, assets } = bundle;

  return (
    <article className="rounded-xl border bg-white shadow-sm">
      <div className="border-b p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">مشروع</p>
            <h4 className="mt-1 text-lg font-black text-slate-950">{project.title}</h4>
            <p className="mt-1 text-sm leading-6 text-slate-600">{[project.country, project.city, project.projectType].filter(Boolean).join(" / ")}</p>
          </div>
          <ArchiveProjectManageActions project={project} collections={collections} />
        </div>
        {project.description ? <p className="mt-3 text-sm leading-7 text-slate-600">{project.description}</p> : null}
      </div>

      <div className="space-y-4 p-4">
        <div>
          <SectionTitle title="روابط التوثيق" count={links.length} />
          {links.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-slate-50 p-4 text-sm text-slate-600">لم تتم إضافة رابط لهذا المشروع بعد.</p>
          ) : (
            <div className="space-y-3">
              {links.map((link) => <DriveLinkCard key={link.id} link={link} projects={projects} />)}
            </div>
          )}
        </div>

        <div>
          <SectionTitle title="مستكشف المواد" count={assets.length} />
          <MaterialSummary assets={assets} />
          <MaterialTable assets={assets} />
        </div>
      </div>
    </article>
  );
}

function DriveLinkCard({ link, projects }: { link: ArchiveDriveLink; projects: ArchiveProject[] }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="font-black text-slate-950">{link.title}</p>
          <p dir="ltr" className="mt-1 truncate text-xs text-slate-500">{link.driveUrl}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{driveLinkTypeLabel(link.linkType)}</Badge>
            <Badge>{link.totalFiles} ملف</Badge>
            <Badge>{link.totalImages} صورة</Badge>
            <Badge>{link.totalVideos} فيديو</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ArchiveDriveLinkActions linkId={link.id} />
          <ArchiveDriveLinkManageActions link={link} projects={projects} />
        </div>
      </div>
    </div>
  );
}

function MaterialSummary({ assets }: { assets: ArchiveAsset[] }) {
  return (
    <div className="mb-3 grid gap-2 sm:grid-cols-4">
      <SmallCounter label="صور" value={countAssets(assets, "IMAGE")} />
      <SmallCounter label="فيديو" value={countAssets(assets, "VIDEO")} />
      <SmallCounter label="تقارير" value={countAssets(assets, "DOCUMENT")} />
      <SmallCounter label="أخرى" value={countOtherAssets(assets)} />
    </div>
  );
}

function MaterialTable({ assets }: { assets: ArchiveAsset[] }) {
  if (assets.length === 0) {
    return <p className="rounded-lg border border-dashed bg-white p-4 text-sm text-slate-600">ستظهر المواد هنا بعد مزامنة رابط التوثيق.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="p-3 text-right">النوع</th>
            <th className="p-3 text-right">الاسم</th>
            <th className="p-3 text-right">الرابط</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {assets.slice(0, 8).map((asset) => (
            <tr key={asset.id}>
              <td className="p-3 font-bold text-slate-700">{fileTypeLabel(asset.fileType)}</td>
              <td className="p-3 text-slate-700">{asset.fileName}</td>
              <td className="p-3">
                {asset.webViewLink ? (
                  <a className="font-bold text-[#025EB8] hover:underline" href={asset.webViewLink} target="_blank" rel="noreferrer">عرض</a>
                ) : (
                  <span className="text-slate-400">غير متاح</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {assets.length > 8 ? <p className="border-t bg-slate-50 p-3 text-xs text-slate-500">يعرض أول 8 مواد فقط.</p> : null}
    </div>
  );
}

function buildExplorer(snapshot: ArchiveSnapshot): CollectionBundle[] {
  const linksByProject = new Map<string, ArchiveDriveLink[]>();
  snapshot.driveLinks.forEach((link) => {
    const list = linksByProject.get(link.projectId) ?? [];
    list.push(link);
    linksByProject.set(link.projectId, list);
  });

  const assetsByProject = new Map<string, ArchiveAsset[]>();
  snapshot.assets.forEach((asset) => {
    const list = assetsByProject.get(asset.projectId) ?? [];
    list.push(asset);
    assetsByProject.set(asset.projectId, list);
  });

  return snapshot.collections
    .slice()
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "ar"))
    .map((collection) => {
      const projects = snapshot.projects
        .filter((project) => project.collectionId === collection.id)
        .slice()
        .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title, "ar"));

      const years = Array.from(new Set(projects.map((project) => project.year)))
        .sort((a, b) => b - a)
        .map((year) => ({
          year,
          projects: projects
            .filter((project) => project.year === year)
            .map((project) => ({
              project,
              links: linksByProject.get(project.id) ?? [],
              assets: assetsByProject.get(project.id) ?? [],
            })),
        }));

      return { collection, years };
    });
}

function countYears(explorer: CollectionBundle[]) {
  return new Set(explorer.flatMap((item) => item.years.map((year) => `${item.collection.id}-${year.year}`))).size;
}

function countAssets(assets: ArchiveAsset[], type: ArchiveAsset["fileType"]) {
  return assets.filter((asset) => asset.fileType === type).length;
}

function countOtherAssets(assets: ArchiveAsset[]) {
  return assets.filter((asset) => !["IMAGE", "VIDEO", "DOCUMENT"].includes(asset.fileType)).length;
}

function fileTypeLabel(value: ArchiveAsset["fileType"]) {
  const labels: Record<ArchiveAsset["fileType"], string> = {
    IMAGE: "صورة",
    VIDEO: "فيديو",
    DOCUMENT: "تقرير",
    FOLDER: "مجلد",
    OTHER: "ملف",
  };
  return labels[value] ?? value;
}

function driveLinkTypeLabel(value: ArchiveDriveLink["linkType"]) {
  if (value === "FOLDER") return "مجلد";
  if (value === "FILE") return "ملف";
  return "رابط";
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return <div className="mb-3 flex items-center justify-between gap-3"><p className="font-black text-slate-950">{title}</p><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{count}</span></div>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="rounded-xl border bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div><span className="text-[#025EB8] [&>svg]:h-5 [&>svg]:w-5">{icon}</span></div></div>;
}

function SummaryCard({ icon, title, value }: { icon: ReactNode; title: string; value: number }) {
  return <div className="rounded-xl border bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-slate-950">{title}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div><span className="text-[#025EB8] [&>svg]:h-5 [&>svg]:w-5">{icon}</span></div></div>;
}

function SmallCounter({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border bg-white px-3 py-2"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 font-black text-slate-950">{value}</p></div>;
}

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="rounded-2xl border bg-white shadow-sm"><div className="border-b p-5"><h2 className="text-lg font-black text-slate-950">{title}</h2>{description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}</div><div className="p-5">{children}</div></section>;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-md bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">{children}</span>;
}

function EmptyState({ title, text, compact = false }: { title: string; text: string; compact?: boolean }) {
  return <div className={`rounded-xl border border-dashed bg-white text-center ${compact ? "p-4" : "p-8"}`}><Database className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-3 font-black text-slate-950">{title}</p><p className="mt-2 text-sm text-slate-600">{text}</p></div>;
}
