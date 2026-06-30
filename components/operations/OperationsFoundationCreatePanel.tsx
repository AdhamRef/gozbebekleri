"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FoundationCollection } from "@/lib/operations/foundation-override-repository";

type EditableValue = string | number | null | undefined;

type FieldConfig = {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  options?: readonly [value: string, label: string][];
  defaultValue?: EditableValue;
};

type Props = {
  collection: FoundationCollection;
  buttonLabel: string;
  fields: readonly FieldConfig[];
};

function initialState(fields: readonly FieldConfig[]) {
  return fields.reduce<Record<string, EditableValue>>((state, field) => {
    state[field.key] = field.defaultValue ?? (field.type === "number" ? 0 : "");
    return state;
  }, {});
}

function slugPart(value: unknown) {
  return String(value || "item").trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";
}

function normalizeFieldValue(value: EditableValue, field: FieldConfig) {
  if (field.type !== "number") return value ?? "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function OperationsFoundationCreatePanel({ collection, buttonLabel, fields }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(() => initialState(fields));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function saveItem() {
    setBusy(true);
    setError(null);
    setSuccess(null);

    const normalized = fields.reduce<Record<string, EditableValue>>((value, field) => {
      value[field.key] = normalizeFieldValue(form[field.key], field);
      return value;
    }, {});
    const label = normalized.title || normalized.theme || normalized.week || normalized.item || normalized.name;
    const item = { ...normalized, id: `${collection}-${slugPart(label)}-${Date.now()}` };

    const response = await fetch("/api/dashboard/operations/foundation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection, operation: "SAVE", item }),
    });
    const result = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok || !result?.ok) {
      setError(result?.message || "فشل حفظ العنصر");
      return;
    }

    setSuccess("تمت إضافة العنصر");
    setForm(initialState(fields));
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-dashed bg-white p-3">
      <Button type="button" size="sm" variant="outline" className="gap-2 font-bold" onClick={() => setOpen((value) => !value)}>
        {open ? <X className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
        {open ? "إغلاق" : buttonLabel}
      </Button>

      {open ? (
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
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
            <Button type="button" size="sm" disabled={busy} onClick={saveItem}>
              <Save className="h-3.5 w-3.5" /> حفظ
            </Button>
          </div>
          {success ? <p className="text-xs font-semibold text-emerald-600 sm:col-span-2">{success}</p> : null}
          {error ? <p className="text-xs font-semibold text-rose-600 sm:col-span-2">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
