import { ArchiveConsole } from "../_components/ArchiveConsole";
import { getArchiveSnapshotDbBacked } from "@/lib/archive/archive-service";

export const metadata = { title: "Archive Drive Links | لوحة التحكم" };
export const dynamic = "force-dynamic";

export default async function ArchiveDriveLinksPage() {
  const snapshot = await getArchiveSnapshotDbBacked();
  const projectIds = new Set(snapshot.projects.map((project) => project.id));
  const linkedProjectIds = new Set(snapshot.driveLinks.map((link) => link.projectId).filter(Boolean));
  const orphanLinks = snapshot.driveLinks.filter((link) => !projectIds.has(link.projectId));
  const readyLinks = snapshot.driveLinks.filter((link) => projectIds.has(link.projectId) && Boolean(link.driveFolderId || link.driveFileId));
  const folderLinks = snapshot.driveLinks.filter((link) => link.linkType === "FOLDER");
  const fileLinks = snapshot.driveLinks.filter((link) => link.linkType === "FILE");
  const unparsedLinks = snapshot.driveLinks.filter((link) => !link.driveFolderId && !link.driveFileId);
  const projectsWithoutDriveLinks = snapshot.projects.filter((project) => !linkedProjectIds.has(project.id));
  const readinessPercent = Math.round((readyLinks.length / Math.max(snapshot.driveLinks.length, 1)) * 100);
  const healthGates = [
    { label: "Project links", ok: orphanLinks.length === 0, value: orphanLinks.length === 0 ? "Clean" : `${orphanLinks.length} orphan` },
    { label: "Drive IDs", ok: readyLinks.length > 0 || snapshot.driveLinks.length === 0, value: `${readyLinks.length} ready` },
    { label: "External sync", ok: snapshot.safety.noExternalDriveCall, value: "Disabled" },
    { label: "Review", ok: snapshot.safety.humanApprovalRequired, value: "Human required" },
  ];
  const operatorActions = [
    "أنشئ مشروعًا قبل إضافة رابط Drive.",
    "اربط كل مشروع برابط واضح واحد على الأقل.",
    "راجع الروابط غير المقروءة وعدّلها قبل أي provider test.",
    "استخدم الأزرار الحالية كتشخيص جاهزية فقط.",
  ];
  const blockedActions = [
    "Google Drive sync غير مفعّل الآن.",
    "لا اعتماد تسويقي بدون مراجعة بشرية.",
    "لا ArchiveAsset runtime داخل هذه الحزمة.",
    "لا AI analysis أو download أو thumbnails.",
  ];
  const runtimeChecklist = [
    "Append ArchiveDriveLink model only.",
    "Run Prisma generate.",
    "Run production build.",
    "Keep AuditLog overlay readable.",
  ];

  return (
    <>
      <section className="bg-[#FFFDF8] px-4 pt-4 text-slate-950 sm:px-6" dir="rtl">
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="border-b p-5 xl:border-b-0 xl:border-l">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#025EB8]">Drive Links Readiness</p>
              <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-2xl font-black">جاهزية روابط Google Drive</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    ملخص تشغيلي سريع لحالة روابط الأرشيف قبل runtime schema، بدون مزامنة خارجية أو تنزيل أو تحليل AI.
                  </p>
                </div>
                <div className="rounded-2xl border bg-[#FFFDF8] px-5 py-4 text-center shadow-inner lg:min-w-40">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Readiness</p>
                  <p className="mt-1 text-4xl font-black text-slate-950">{readinessPercent}%</p>
                  <p className="text-xs font-bold text-slate-500">{readyLinks.length} من {snapshot.driveLinks.length} جاهز</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Drive links" value={snapshot.driveLinks.length} hint="Saved" />
                <Metric label="Provider-ready" value={readyLinks.length} hint="Project + Drive ID" />
                <Metric label="Linked projects" value={linkedProjectIds.size} hint={`${snapshot.projects.length} projects`} />
                <Metric label="Orphans" value={orphanLinks.length} hint="Must stay zero" tone={orphanLinks.length > 0 ? "warning" : "safe"} />
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-xl border bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <p className="font-black text-slate-950">Current persistence</p>
                <p className="mt-1">{snapshot.persistence.note}</p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <CompactFact label="Folders" value={folderLinks.length} />
                <CompactFact label="Files" value={fileLinks.length} />
                <CompactFact label="Unparsed" value={unparsedLinks.length} tone={unparsedLinks.length ? "warning" : "safe"} />
                <CompactFact label="No sync" value="On" tone="safe" />
              </div>
            </div>
          </div>

          <div className="border-t bg-slate-50/70 p-4">
            <div className="grid gap-2 lg:grid-cols-4">
              {healthGates.map((gate) => <HealthGate key={gate.label} {...gate} />)}
            </div>
          </div>

          <div className="grid gap-3 p-4 xl:grid-cols-[1fr_1fr_1fr]">
            <Panel title="الآن" items={operatorActions} tone="neutral" />
            <Panel title="ممنوع حتى runtime" items={blockedActions} tone="warning" />
            <Panel title="Runtime cutover" items={runtimeChecklist} tone="neutral" />
          </div>

          <div className="grid gap-3 border-t p-4 xl:grid-cols-3">
            <IssueList title="Unparsed links" emptyText="كل الروابط مقروءة أو لا توجد روابط بعد." items={unparsedLinks.slice(0, 4).map((link) => `${link.title} / ${link.linkType}`)} tone="warning" />
            <IssueList title="Ready links" emptyText="لا توجد روابط جاهزة بعد لاختبار provider لاحقًا." items={readyLinks.slice(0, 4).map((link) => link.title)} tone="safe" />
            <IssueList title="Projects missing Drive link" emptyText="كل المشاريع لديها رابط Drive أو لا توجد مشاريع بعد." items={projectsWithoutDriveLinks.slice(0, 5).map((project) => project.title)} tone="warning" />
          </div>
        </div>
      </section>
      <ArchiveConsole activeTab="drive-links" snapshot={snapshot} />
    </>
  );
}

function Metric({ label, value, hint, tone = "neutral" }: { label: string; value: number; hint: string; tone?: "neutral" | "safe" | "warning" }) {
  const toneClass = tone === "safe"
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-slate-200 bg-white text-slate-900";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.12em] opacity-60">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold opacity-70">{hint}</p>
    </div>
  );
}

function CompactFact({ label, value, tone = "neutral" }: { label: string; value: number | string; tone?: "neutral" | "safe" | "warning" }) {
  const toneClass = tone === "safe" ? "text-emerald-700" : tone === "warning" ? "text-amber-700" : "text-slate-700";
  return (
    <div className="rounded-lg border bg-white px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function HealthGate({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm font-bold ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
      <div className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span>{value}</span>
      </div>
    </div>
  );
}

function Panel({ title, items, tone }: { title: string; items: string[]; tone: "neutral" | "warning" }) {
  const toneClass = tone === "warning" ? "border-amber-100 bg-amber-50 text-amber-900" : "border-slate-100 bg-slate-50 text-slate-700";
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="font-black text-slate-950">{title}</p>
      <ul className="mt-2 space-y-1 text-sm font-semibold leading-6">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function IssueList({ title, emptyText, items, tone }: { title: string; emptyText: string; items: string[]; tone: "safe" | "warning" }) {
  const toneClass = tone === "safe" ? "border-emerald-100 bg-emerald-50 text-emerald-900" : "border-amber-100 bg-amber-50 text-amber-900";
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="font-black">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm font-semibold leading-6 opacity-75">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm font-semibold leading-6">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}
