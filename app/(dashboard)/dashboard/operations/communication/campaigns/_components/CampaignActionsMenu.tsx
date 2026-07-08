"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Copy, Trash2, Archive, CalendarX, Undo2, FolderOpen, Loader2 } from "lucide-react";

const API = "/api/dashboard/operations/communication/campaigns";
const DETAIL = "/dashboard/operations/communication/campaigns";

type ActionKey = "open" | "edit" | "duplicate" | "delete" | "archive" | "cancel-schedule" | "return-to-draft";

const EDITABLE = ["DRAFT", "REVIEW", "APPROVED", "SCHEDULED"];
const ARCHIVABLE = ["SENT", "SENT_WITH_ISSUES", "FAILED", "BLOCKED", "CANCELLED"];
const RETURNABLE = ["REVIEW", "APPROVED", "SCHEDULED"];

function actionsForStatus(status: string): ActionKey[] {
  const out: ActionKey[] = ["open"];
  if (EDITABLE.includes(status)) out.push("edit");
  out.push("duplicate"); // non-destructive, always allowed
  if (status === "SCHEDULED") out.push("cancel-schedule");
  if (RETURNABLE.includes(status)) out.push("return-to-draft");
  if (status === "DRAFT") out.push("delete");
  if (ARCHIVABLE.includes(status)) out.push("archive");
  return out;
}

const META: Record<ActionKey, { label: string; icon: typeof Copy; danger?: boolean; confirm?: string }> = {
  open: { label: "فتح", icon: FolderOpen },
  edit: { label: "تعديل", icon: Pencil },
  duplicate: { label: "تكرار الحملة", icon: Copy },
  delete: { label: "حذف المسودة", icon: Trash2, danger: true, confirm: "حذف هذه المسودة نهائيًا؟ (إن وُجدت سجلات إرسال ستُؤرشف بدل الحذف)" },
  archive: { label: "أرشفة الحملة", icon: Archive, confirm: "أرشفة هذه الحملة؟ ستختفي من القائمة الافتراضية وتبقى سجلاتها محفوظة." },
  "cancel-schedule": { label: "إلغاء الجدولة", icon: CalendarX, confirm: "إلغاء جدولة هذه الحملة؟ ستعود إلى «معتمدة»." },
  "return-to-draft": { label: "إرجاع لمسودة", icon: Undo2, confirm: "إرجاع الحملة إلى مسودة؟ سيُلغى الاعتماد والجدولة." },
};

export function CampaignActionsMenu({ id, status, variant = "menu" }: { id: string; status: string; variant?: "menu" | "buttons" }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<ActionKey | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const actions = actionsForStatus(status);

  async function run(key: ActionKey) {
    const meta = META[key];
    if (key === "open" || key === "edit") { router.push(`${DETAIL}/${id}`); return; }
    if (meta.confirm && !window.confirm(meta.confirm)) return;
    setBusy(key);
    setError(null);
    try {
      let res: Response;
      if (key === "duplicate") res = await fetch(`${API}/${id}/duplicate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      else if (key === "delete") res = await fetch(`${API}/${id}`, { method: "DELETE" });
      else if (key === "archive") res = await fetch(`${API}/${id}/archive`, { method: "POST" });
      else if (key === "cancel-schedule") res = await fetch(`${API}/${id}/cancel-schedule`, { method: "POST" });
      else res = await fetch(`${API}/${id}/return-to-draft`, { method: "POST" });

      const json = await res.json().catch(() => null);
      if (!res.ok) { setError(json?.error || "تعذّر تنفيذ العملية"); return; }
      if (key === "duplicate" && json?.campaign?.id) { router.push(`${DETAIL}/${json.campaign.id}`); return; }
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (variant === "buttons") {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-wrap gap-2">
          {actions.filter((a) => a !== "open" && a !== "edit").map((a) => {
            const m = META[a];
            const Icon = m.icon;
            return (
              <button key={a} type="button" disabled={busy !== null} onClick={() => run(a)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-bold transition disabled:opacity-60 ${m.danger ? "border-rose-200 bg-white text-rose-700 hover:bg-rose-50" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                {busy === a ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />} {m.label}
              </button>
            );
          })}
        </div>
        {error ? <span className="text-[11px] font-semibold text-rose-600">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }} aria-label="إجراءات" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <button type="button" aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }} />
          <div className="absolute end-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg" dir="rtl">
            {actions.map((a) => {
              const m = META[a];
              const Icon = m.icon;
              return (
                <button key={a} type="button" disabled={busy !== null} onClick={(e) => { e.preventDefault(); e.stopPropagation(); run(a); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-right text-xs font-semibold hover:bg-slate-50 disabled:opacity-60 ${m.danger ? "text-rose-600" : "text-slate-700"}`}>
                  {busy === a ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />} {m.label}
                </button>
              );
            })}
            {error ? <p className="px-3 py-1 text-[11px] font-semibold text-rose-600">{error}</p> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
