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
  const readinessPercent = Math.round((readyLinks.length / Math.max(snapshot.driveLinks.length, 1)) * 100);
  const healthGates = [
    { label: "All links have projects", ok: orphanLinks.length === 0, value: orphanLinks.length === 0 ? "Pass" : `${orphanLinks.length} orphan` },
    { label: "At least one Drive id parsed", ok: readyLinks.length > 0 || snapshot.driveLinks.length === 0, value: `${readyLinks.length} ready` },
    { label: "External sync disabled", ok: snapshot.safety.noExternalDriveCall, value: "No external calls" },
    { label: "Human review required", ok: snapshot.safety.humanApprovalRequired, value: "Required" },
  ];

  return (
    <>
      <section className="bg-[#FFFDF8] px-4 pt-4 text-slate-950 sm:px-6" dir="rtl">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#025EB8]">Drive Links Readiness</p>
              <h1 className="mt-2 text-2xl font-black">جاهزية روابط Google Drive</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                هذه لوحة تشغيلية قبل runtime schema: تحفظ الروابط، تتحقق من المشروع، وتوضح الجاهزية بدون أي Google Drive sync أو تنزيل أو تحليل AI.
              </p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4 text-sm leading-6 text-slate-700 lg:max-w-sm">
              <p className="font-black text-slate-950">Current persistence</p>
              <p>{snapshot.persistence.note}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ReadinessCard label="Drive links" value={snapshot.driveLinks.length} hint="Saved links" />
            <ReadinessCard label="Ready for provider test" value={readyLinks.length} hint="Has project + Drive id" />
            <ReadinessCard label="Readiness" value={readinessPercent} suffix="%" hint="Provider-test readiness" tone={readinessPercent === 100 ? "safe" : "neutral"} />
            <ReadinessCard label="Linked projects" value={linkedProjectIds.size} hint={`${snapshot.projects.length} archive projects`} />
            <ReadinessCard label="Orphan links" value={orphanLinks.length} hint="Must stay zero" tone={orphanLinks.length > 0 ? "warning" : "safe"} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="font-black text-slate-950">Link parsing</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">Folders: {folderLinks.length} / Files: {fileLinks.length} / Unparsed: {unparsedLinks.length}</p>
            </div>
            <div className="rounded-lg border bg-emerald-50 p-4 text-emerald-900">
              <p className="font-black">Safety boundary</p>
              <p className="mt-1 text-sm leading-6">No Drive API call, no download, no AI analysis, no auto-publish.</p>
            </div>
            <div className="rounded-lg border bg-amber-50 p-4 text-amber-900">
              <p className="font-black">Next package</p>
              <p className="mt-1 text-sm leading-6">Append ArchiveDriveLink runtime model only, then Prisma generate and build.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border bg-white p-4">
              <p className="font-black text-slate-950">Data health gates</p>
              <div className="mt-3 grid gap-2">
                {healthGates.map((gate) => (
                  <div key={gate.label} className={`rounded-md border px-3 py-2 text-sm font-bold ${gate.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span>{gate.label}</span>
                      <span>{gate.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <IssueList title="Unparsed links" emptyText="كل الروابط لديها Folder/File ID أو لا توجد روابط بعد." items={unparsedLinks.slice(0, 4).map((link) => `${link.title} / ${link.linkType}`)} tone="warning" />
              <IssueList title="Ready links" emptyText="لا توجد روابط جاهزة بعد لاختبار provider لاحقًا." items={readyLinks.slice(0, 4).map((link) => link.title)} tone="safe" />
              <IssueList title="Orphan links" emptyText="لا توجد روابط يتيمة." items={orphanLinks.slice(0, 4).map((link) => link.title)} tone="warning" />
              <IssueList title="Runtime cutover" emptyText="ArchiveDriveLink runtime model is still pending." items={["Keep AuditLog overlay readable", "No Drive sync in this package", "Run Prisma generate + build"]} tone="neutral" />
            </div>
          </div>
        </div>
      </section>
      <ArchiveConsole activeTab="drive-links" snapshot={snapshot} />
    </>
  );
}

function ReadinessCard({ label, value, hint, suffix = "", tone = "neutral" }: { label: string; value: number; hint: string; suffix?: string; tone?: "neutral" | "safe" | "warning" }) {
  const toneClass = tone === "safe"
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-slate-200 bg-slate-50 text-slate-900";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.12em] opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}{suffix}</p>
      <p className="mt-1 text-xs font-bold opacity-75">{hint}</p>
    </div>
  );
}

function IssueList({ title, emptyText, items, tone }: { title: string; emptyText: string; items: string[]; tone: "neutral" | "safe" | "warning" }) {
  const toneClass = tone === "safe"
    ? "border-emerald-100 bg-emerald-50 text-emerald-900"
    : tone === "warning"
      ? "border-amber-100 bg-amber-50 text-amber-900"
      : "border-slate-100 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="font-black">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm font-semibold leading-6 opacity-75">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm font-semibold leading-6">
          {items.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      )}
    </div>
  );
}
