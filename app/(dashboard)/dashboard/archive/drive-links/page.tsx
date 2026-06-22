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
    { label: "ارتباط المشاريع", ok: orphanLinks.length === 0, value: orphanLinks.length === 0 ? "سليم" : `${orphanLinks.length} يحتاج مراجعة` },
    { label: "قراءة الروابط", ok: readyLinks.length > 0 || snapshot.driveLinks.length === 0, value: `${readyLinks.length} جاهز` },
    { label: "المراجعة", ok: snapshot.safety.humanApprovalRequired, value: "مطلوبة" },
  ];
  const nextActions = [
    "إضافة رابط للمشاريع التي لا تملك ملفًا مرتبطًا.",
    "مراجعة الروابط التي لم يتم التعرف عليها.",
    "التأكد من وضوح اسم الرابط قبل حفظه.",
  ];

  return (
    <>
      <section className="bg-[#FFFDF8] px-4 pt-4 text-slate-950 sm:px-6" dir="rtl">
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="border-b p-5 xl:border-b-0 xl:border-l">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#025EB8]">File Links</p>
              <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-2xl font-black">إدارة روابط الملفات</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    متابعة روابط ملفات المشاريع والتأكد من جاهزيتها للاستخدام داخل الأرشيف.
                  </p>
                </div>
                <div className="rounded-2xl border bg-[#FFFDF8] px-5 py-4 text-center shadow-inner lg:min-w-40">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">جاهزية</p>
                  <p className="mt-1 text-4xl font-black text-slate-950">{readinessPercent}%</p>
                  <p className="text-xs font-bold text-slate-500">{readyLinks.length} من {snapshot.driveLinks.length} روابط</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="الروابط" value={snapshot.driveLinks.length} hint="إجمالي محفوظ" />
                <Metric label="جاهزة" value={readyLinks.length} hint="مرتبطة ومقروءة" />
                <Metric label="المشاريع" value={linkedProjectIds.size} hint={`${snapshot.projects.length} مشروع`} />
                <Metric label="تحتاج مراجعة" value={orphanLinks.length + unparsedLinks.length} hint="روابط غير مكتملة" tone={orphanLinks.length + unparsedLinks.length > 0 ? "warning" : "safe"} />
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="font-black text-slate-950">ملخص الروابط</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <CompactFact label="مجلدات" value={folderLinks.length} />
                  <CompactFact label="ملفات" value={fileLinks.length} />
                  <CompactFact label="غير مقروءة" value={unparsedLinks.length} tone={unparsedLinks.length ? "warning" : "safe"} />
                  <CompactFact label="بلا مشروع" value={orphanLinks.length} tone={orphanLinks.length ? "warning" : "safe"} />
                </div>
              </div>

              <div className="mt-3 rounded-xl border bg-white p-4">
                <p className="font-black text-slate-950">الإجراءات المقترحة</p>
                <ul className="mt-2 space-y-1 text-sm font-semibold leading-6 text-slate-600">
                  {nextActions.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t bg-slate-50/70 p-4">
            <div className="grid gap-2 lg:grid-cols-3">
              {healthGates.map((gate) => <HealthGate key={gate.label} {...gate} />)}
            </div>
          </div>

          <div className="grid gap-3 border-t p-4 xl:grid-cols-3">
            <IssueList title="روابط تحتاج مراجعة" emptyText="لا توجد روابط تحتاج مراجعة." items={unparsedLinks.slice(0, 4).map((link) => link.title)} tone="warning" />
            <IssueList title="روابط جاهزة" emptyText="لا توجد روابط جاهزة بعد." items={readyLinks.slice(0, 4).map((link) => link.title)} tone="safe" />
            <IssueList title="مشاريع بلا رابط" emptyText="كل المشاريع لديها رابط ملف." items={projectsWithoutDriveLinks.slice(0, 5).map((project) => project.title)} tone="warning" />
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
