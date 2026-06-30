"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FoundationCollection } from "@/lib/operations/foundation-override-repository";

type EditableValue = string | number | null | undefined;

type EditableItem = {
  id?: string;
  title?: string;
};

type EditableRecord = Record<string, EditableValue>;

type FieldConfig = {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  options?: readonly [value: string, label: string][];
};

type Props = {
  collection: FoundationCollection;
  item: EditableItem;
  fields: readonly FieldConfig[];
  compact?: boolean;
};

function asEditableRecord(item: EditableItem) {
  return item as EditableRecord;
}

function editableState(item: EditableItem, fields: readonly FieldConfig[]) {
  const record = asEditableRecord(item);
  return fields.reduce<Record<string, EditableValue>>((state, field) => {
    state[field.key] = record[field.key] ?? "";
    return state;
  }, {});
}

function normalizeFieldValue(value: EditableValue, field: FieldConfig) {
  if (field.type !== "number") return value ?? "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function OperationsFoundationItemActions({ collection, item, fields, compact = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState(() => editableState(item, fields));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!item.id) return null;

  async function sendPatch(payloadItem: EditableRecord, operation: "SAVE" | "REMOVE") {
    setBusy(operation);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/dashboard/operations/foundation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection, operation, item: payloadItem }),
    });
    const result = await response.json().catch(() => null);
    setBusy(null);

    if (!response.ok || !result?.ok) {
      setError(result?.message || "فشل حفظ التعديل");
      return false;
    }

    setSuccess(operation === "REMOVE" ? "تم حذف العنصر" : "تم حفظ التعديل");
    router.refresh();
    return true;
  }

  async function saveEdits() {
    const nextItem = fields.reduce<EditableRecord>((value, field) => {
      value[field.key] = normalizeFieldValue(form[field.key], field);
      return value;
    }, { ...asEditableRecord(item), id: item.id });
    const saved = await sendPatch(nextItem, "SAVE");
    if (saved) setEditing(false);
  }

  async function removeItem() {
    if (!window.confirm("هل تريد حذف هذا العنصر من النظام؟")) return;
    await sendPatch({ ...asEditableRecord(item), id: item.id }, "REMOVE");
  }

  return (
    <div className={compact ? "mt-3" : "mt-4 border-t border-slate-200 pt-3"}>
      <Button type="button" size="sm" variant="ghost" disabled={busy !== null} onClick={() => setOpen((value) => !value)} className="h-8 gap-1.5 px-2 text-xs font-bold text-slate-500 hover:text-slate-900">
        {open ? <X className="h-3.5 w-3.5" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
        {open ? "إغلاق الإدارة" : "إدارة"}
      </Button>

      {open ? (
        <div className="mt-2 space-y-2 rounded-xl border bg-white p-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => setEditing((value) => !value)}>
              {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              {editing ? "إلغاء" : "تعديل"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={removeItem} className="text-rose-600 hover:text-rose-700">
              <Trash2 className="h-3.5 w-3.5" /> حذف
            </Button>
          </div>

          {editing ? (
            <div className="grid gap-2 rounded-xl border bg-slate-50 p-3 text-xs sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.key} className={field.key === "title" || field.key === "description" || field.key === "focus" || field.key === "theme" ? "space-y-1 font-semibold text-slate-600 sm:col-span-2" : "space-y-1 font-semibold text-slate-600"}>
                  {field.label}
                  {field.type === "select" ? (
                    <select
                      value={String(form[field.key] ?? "")}
                      onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]"
                    >
                      {(field.options ?? []).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={String(form[field.key] ?? "")}
                      onChange={(event) => setForm((value) => ({ ...value, [field.key]: field.type === "number" ? event.target.valueAsNumber : event.target.value }))}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]"
                    />
                  )}
                </label>
              ))}
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="button" size="sm" disabled={busy !== null} onClick={saveEdits}>
                  <Save className="h-3.5 w-3.5" /> حفظ التعديل
                </Button>
                <Button type="button" size="sm" variant="secondary" disabled={busy !== null} onClick={() => { setForm(editableState(item, fields)); setEditing(false); }}>
                  إلغاء
                </Button>
              </div>
            </div>
          ) : null}

          {busy ? <p className="text-xs font-semibold text-slate-500">جاري الحفظ...</p> : null}
          {success ? <p className="text-xs font-semibold text-emerald-600">{success}</p> : null}
          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
