import Link from "next/link";
import type { ReactNode } from "react";
import { Archive, CheckCircle2, Database, FileText, FolderOpen, Image, ShieldCheck } from "lucide-react";
import type { ArchiveAsset, ArchiveCollection, ArchiveDriveLink, ArchiveProject, ArchiveSnapshot, ArchiveTabKey } from "@/lib/archive/archive-types";
import { ArchiveAssetBrandAssetAction } from "./ArchiveAssetBrandAssetAction";
import { ArchiveAssetContentItemAction } from "./ArchiveAssetContentItemAction";
import { ArchiveAssetReviewActions } from "./ArchiveAssetReviewActions";
import { ArchiveAssetTaskAction } from "./ArchiveAssetTaskAction";
import { ArchiveCollectionCreatePanel } from "./ArchiveCollectionCreatePanel";
import { ArchiveCollectionManageActions } from "./ArchiveCollectionManageActions";
import { ArchiveDriveLinkActions } from "./ArchiveDriveLinkActions";
import { ArchiveDriveLinkCreatePanel } from "./ArchiveDriveLinkCreatePanel";
import { ArchiveProjectCreatePanel } from "./ArchiveProjectCreatePanel";
import { ArchiveProjectManageActions } from "./ArchiveProjectManageActions";

type Props = {
  activeTab: ArchiveTabKey;
  snapshot: ArchiveSnapshot;
};

export function ArchiveConsole({ activeTab, snapshot }: Props) {
  const dashboardNotes = buildDashboardNotes(snapshot);

  return (
    <main className="min-h-screen bg-[#FFFDF8] p-4 text-slate-950 sm:p-6" dir="rtl">
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#025EB8]">Archive</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">الأرشيف</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              مساحة مركزية لتنظيم ملفات المشاريع، مراجعة المواد، وتجهيز المختارات المناسبة للفريق.
            </p>
          </div>
          <div className="rounded-xl border bg-slate-50 p-4 text-sm leading-6 text-slate-700 lg:max-w-sm">
            <p className="font-black text-slate-950">حالة الأرشيف</p>
            <p>{snapshot.summary.projects > 0 ? "جاهز للمراجعة والتحديث." : "بانتظار إضافة المشاريع والملفات."}</p>
          </div>
        </div>
        <nav className="mt-5 flex gap-2 overflow-x-auto border-t pt-4" aria-label="Archive tabs">
          {snapshot.tabs.map((tab) => (
            <Link key={tab.key} href={tab.href} className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${activeTab === tab.key ? "bg-[#10212B] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
              {tabLabel(tab.key)}
            </Link>
          ))}
        </nav>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<FolderOpen />} label="المجموعات" value={snapshot.summary.collections} />
        <Metric icon={<Archive />} label="المشاريع" value={snapshot.summary.projects} />
        <Metric icon={<Image />} label="المواد" value={snapshot.summary.assets} />
        <Metric icon={<ShieldCheck />} label="تحتاج مراجعة" value={snapshot.summary.pendingHumanReview} />
      </section>

      {dashboardNotes.length > 0 ? (
        <section className="mt-5 grid gap-3 lg:grid-cols-3">
          {dashboardNotes.map((note) => (
            <div key={note} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#025EB8]" />
                <p className="text-sm font-semibold leading-6 text-slate-700">{note}</p>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="mt-5">{renderTab(activeTab, snapshot)}</section>
    </main>
  );
}

function tabLabel(key: ArchiveTabKey) {
  const labels: Record<ArchiveTabKey, string> = {
    overview: "نظرة عامة",
    collections: "المجموعات",
    projects: "المشاريع",
    "drive-links": "روابط الملفات",
    assets: "مراجعة المواد",
    "marketing-picks": "مختارات التسويق",
    reports: "التقارير",
    ai: "المساعد",
  };
  return labels[key];
}

function buildDashboardNotes(snapshot: ArchiveSnapshot) {
  const notes: string[] = [];
  if (snapshot.driveLinks.length === 0) notes.push("أضف رابط ملف واحد على الأقل لكل مشروع نشط.");
  if (snapshot.summary.pendingHumanReview > 0) notes.push("هناك مواد تحتاج مراجعة قبل اعتمادها للفريق.");
  if (snapshot.summary.sensitiveAssets > 0) notes.push("بعض المواد تحتاج تعاملًا حساسًا قبل استخدامها.");
  if (snapshot.summary.marketingReady > 0) notes.push("توجد مواد جاهزة للاستخدام التسويقي.");
  return notes.slice(0, 3);
}

function renderTab(activeTab: ArchiveTabKey, snapshot: ArchiveSnapshot) {
  if (activeTab === "collections") return <Collections snapshot={snapshot} />;
  if (activeTab === "projects") return <Projects projects={snapshot.projects} collections={snapshot.collections} />;
  if (activeTab === "drive-links") return <DriveLinks links={snapshot.driveLinks} projects={snapshot.projects} />;
  if (activeTab === "assets") return <Assets assets={snapshot.assets} />;
  if (activeTab === "marketing-picks") return <Assets assets={snapshot.marketingPicks} marketingOnly />;
  if (activeTab === "reports") return <Reports snapshot={snapshot} />;
  if (activeTab === "ai") return <ArchiveAssistant snapshot={snapshot} />;
  return <Overview snapshot={snapshot} />;
}

function Overview({ snapshot }: { snapshot: ArchiveSnapshot }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <Panel title="مسار العمل" description="طريقة انتقال المواد من الملف إلى المراجعة ثم الاستخدام.">
        <div className="grid gap-3">
          <InfoLine title="ربط الملفات" text="أضف رابط الملفات للمشروع ثم تأكد من قراءته بشكل صحيح." />
          <InfoLine title="مراجعة المواد" text="راجع الصور والملفات قبل استخدامها في أي حملة." />
          <InfoLine title="اختيار المواد" text="انقل المواد المعتمدة إلى مختارات التسويق أو التوثيق." />
        </div>
      </Panel>
      <Panel title="المطلوب الآن" description="خطوات مختصرة تساعد الفريق على إكمال الأرشيف.">
        <InfoLine title="إكمال الروابط" text="اربط كل مشروع بملف أو مجلد واضح." />
        <InfoLine title="مراجعة المواد" text="راجع المواد الحساسة أو غير المكتملة أولًا." />
        <InfoLine title="تجهيز المحتوى" text="حوّل المواد المناسبة إلى أفكار محتوى قابلة للتنفيذ." />
      </Panel>
      <Panel title="مؤشرات المتابعة" description="ملخص سريع لحالة الأرشيف.">
        <div className="grid gap-3 md:grid-cols-2">
          <StateLine title="المراجعة البشرية" text={snapshot.safety.humanApprovalRequired ? "مطلوبة" : "غير مطلوبة"} />
          <StateLine title="المهام" text={snapshot.safety.usesOperationTaskContract ? "مرتبطة بفريق العمليات" : "غير مرتبطة"} />
          <StateLine title="المواد الجاهزة" text={String(snapshot.summary.marketingReady)} />
          <StateLine title="التقارير" text={String(snapshot.summary.reports)} />
        </div>
      </Panel>
    </div>
  );
}

function Collections({ snapshot }: { snapshot: ArchiveSnapshot }) {
  return (
    <div className="space-y-4">
      <ArchiveCollectionCreatePanel />
      {snapshot.collections.length === 0 ? (
        <EmptyState title="لا توجد مجموعات بعد" text="أنشئ أول مجموعة للأرشيف مثل غزة، القدس، رمضان، الوقف أو الزكاة." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-4">
          {snapshot.collections.map((collection) => (
            <Panel key={collection.id} title={collection.name} description={collection.type} compact>
              <p className="text-sm leading-6 text-slate-600">{collection.description}</p>
              <div className="mt-3 flex flex-wrap gap-2"><Badge>{collection.slug}</Badge><Badge>{collection.isActive ? "نشطة" : "متوقفة"}</Badge></div>
              <ArchiveCollectionManageActions collection={collection} />
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

function Projects({ projects, collections }: { projects: ArchiveProject[]; collections: ArchiveCollection[] }) {
  return (
    <div className="space-y-4">
      <ArchiveProjectCreatePanel collections={collections} />
      {projects.length === 0 ? (
        <EmptyState title="لا توجد مشاريع بعد" text="أنشئ مشروع أرشيف قبل إضافة روابط الملفات أو مراجعة المواد." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {projects.map((project) => {
            const collection = collections.find((item) => item.id === project.collectionId);
            return (
              <Panel key={project.id} title={project.title} description={`${project.country} / ${project.city} / ${project.year}`} compact>
                <p className="text-sm leading-6 text-slate-600">{project.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{collection?.name ?? "بدون مجموعة"}</Badge>
                  <Badge>{project.status}</Badge>
                  <Badge>{project.documentationStatus}</Badge>
                  <Badge>{project.marketingStatus}</Badge>
                  <Badge>{project.projectType}</Badge>
                </div>
                <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">{project.notes}</p>
                <ArchiveProjectManageActions project={project} collections={collections} />
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DriveLinks({ links, projects }: { links: ArchiveDriveLink[]; projects: ArchiveProject[] }) {
  return (
    <div className="space-y-4">
      <ArchiveDriveLinkCreatePanel projects={projects} />
      {links.length === 0 ? (
        <EmptyState title="لا توجد روابط بعد" text="أضف رابط ملف أو مجلد للمشروع." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {links.map((link) => {
            const project = projects.find((item) => item.id === link.projectId);
            return (
              <Panel key={link.id} title={link.title} description={project?.title ?? "مشروع غير محدد"} compact>
                <div className="space-y-3 text-sm leading-6 text-slate-600">
                  <p dir="ltr" className="rounded-md bg-slate-50 p-3 font-mono text-xs">{link.driveUrl}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <InfoLine title="المجلد" text={link.driveFolderId || "غير مقروء بعد"} />
                    <InfoLine title="الملف" text={link.driveFileId || "غير مقروء بعد"} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{link.linkType === "FOLDER" ? "مجلد" : link.linkType === "FILE" ? "ملف" : "غير محدد"}</Badge>
                    <Badge>{link.totalFiles} ملفات</Badge>
                    <Badge>{link.totalImages} صور</Badge>
                    <Badge>{link.totalVideos} فيديو</Badge>
                    <Badge>{link.totalOther} أخرى</Badge>
                  </div>
                  {link.lastError && <p className="rounded-md bg-slate-50 p-3 text-slate-700">تعذر قراءة الرابط بالكامل.</p>}
                  <ArchiveDriveLinkActions linkId={link.id} />
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Assets({ assets, marketingOnly = false }: { assets: ArchiveAsset[]; marketingOnly?: boolean }) {
  if (assets.length === 0) return <EmptyState title="لا توجد مواد بعد" text={marketingOnly ? "تظهر هنا المواد المعتمدة للاستخدام." : "أضف ملفات للمشاريع ثم راجع المواد هنا."} />;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {assets.map((asset) => {
        const contentItemBlockReason = getContentItemBlockReason(asset);
        const brandAssetBlockReason = getBrandAssetBlockReason(asset);
        return (
          <Panel key={asset.id} title={asset.fileName} description={`${asset.fileType} / ${asset.recommendedUse}`} compact>
            <div className="grid gap-4 md:grid-cols-[128px_1fr]">
              <div className="flex h-32 items-center justify-center rounded-lg border bg-slate-50 text-center text-xs font-bold text-slate-500">معاينة</div>
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <p>{asset.aiSummary || "بانتظار المراجعة."}</p>
                {asset.aiWarnings && <p className="rounded-md bg-slate-50 p-3 text-slate-700">تحتاج مراجعة إضافية.</p>}
                <div className="flex flex-wrap gap-2">
                  <Badge>{asset.humanReviewStatus}</Badge><Badge>تسويق {asset.marketingScore}</Badge><Badge>جودة {asset.qualityScore}</Badge>
                  {asset.isSensitive && <Badge>حساس</Badge>}{asset.needsBlur && <Badge>يحتاج معالجة</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">{asset.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
                <ArchiveAssetReviewActions
                  assetId={asset.id}
                  fileName={asset.fileName}
                  humanReviewStatus={asset.humanReviewStatus}
                  marketingApproved={asset.marketingApproved}
                  documentationApproved={asset.documentationApproved}
                  isSensitive={asset.isSensitive}
                  needsBlur={asset.needsBlur}
                />
                <ArchiveAssetContentItemAction assetId={asset.id} fileName={asset.fileName} disabled={Boolean(contentItemBlockReason)} disabledReason={contentItemBlockReason} />
                <ArchiveAssetTaskAction assetId={asset.id} fileName={asset.fileName} />
                <ArchiveAssetBrandAssetAction assetId={asset.id} disabled={Boolean(brandAssetBlockReason)} disabledReason={brandAssetBlockReason} />
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function getContentItemBlockReason(asset: ArchiveAsset) {
  if (asset.humanReviewStatus === "REJECTED" || asset.recommendedUse === "DO_NOT_USE") {
    return "لا يمكن إنشاء عنصر محتوى من أصل مرفوض أو موسوم بعدم الاستخدام.";
  }
  return null;
}

function getBrandAssetBlockReason(asset: ArchiveAsset) {
  if (asset.humanReviewStatus === "REJECTED" || asset.recommendedUse === "DO_NOT_USE") {
    return "لا يمكن نقل أصل مرفوض إلى مركز الهوية.";
  }
  if (asset.isSensitive || asset.needsBlur) {
    return "الأصول الحساسة أو التي تحتاج معالجة لا تدخل مركز الهوية.";
  }
  if (!asset.marketingApproved && !asset.documentationApproved) {
    return "اعتمد الأصل للتسويق أو التوثيق أولًا.";
  }
  return null;
}

function Reports({ snapshot }: { snapshot: ArchiveSnapshot }) {
  const reports = snapshot.assets.filter((asset) => asset.fileType === "DOCUMENT" || asset.recommendedUse === "REPORT");
  return (
    <Panel title="التقارير" description="تقارير وملفات توثيق لفريق المشاريع.">
      <div className="grid gap-3">
        {reports.map((report) => <InfoLine key={report.id} title={report.fileName} text={report.documentationApproved ? "معتمد" : "بانتظار المراجعة"} />)}
      </div>
    </Panel>
  );
}

function ArchiveAssistant({ snapshot }: { snapshot: ArchiveSnapshot }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel title="المساعد" description="اقتراحات تساعد الفريق على فرز المواد وتجهيزها.">
        <InfoLine title="الصور" text="اقتراح تصنيف واستخدام مناسب بعد مراجعة الفريق." />
        <InfoLine title="الفيديو" text="اختيار لقطات مناسبة عند توفر المواد." />
        <InfoLine title="التقارير" text="تلخيص يساعد فريق المشاريع على المتابعة." />
      </Panel>
      <Panel title="حالة الأقسام" description="ملخص للأقسام التي يتم تجهيزها داخل الأرشيف.">
        <div className="flex flex-wrap gap-2">
          {snapshot.persistence.nextModels.slice(0, 5).map((model) => <Badge key={model}>{sectionLabel(model)}</Badge>)}
        </div>
      </Panel>
    </div>
  );
}

function sectionLabel(model: string) {
  const labels: Record<string, string> = {
    ArchiveCollection: "المجموعات",
    ArchiveProject: "المشاريع",
    ArchiveDriveLink: "روابط الملفات",
    ArchiveAsset: "المواد",
    ArchiveVideoFrame: "لقطات الفيديو",
  };
  return labels[model] ?? model;
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
  return <div className="rounded-lg border bg-white p-3"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#025EB8]" /><p className="font-black text-slate-950">{title}</p></div><p className="mt-1 text-sm leading-6 text-slate-700">{text}</p></div>;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{children}</span>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg border border-dashed bg-white p-8 text-center"><Database className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-black text-slate-950">{title}</p><p className="mt-2 text-sm text-slate-600">{text}</p></div>;
}
