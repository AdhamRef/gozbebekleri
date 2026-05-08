"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { EmailDocument } from "./types";
import { getBlock, setBlock, deleteBlock, getRoot } from "./types";
import { VARIABLE_CATALOG } from "@/lib/templates/variables";

interface Props {
  doc: EmailDocument;
  selectedId: string | null;
  onChange: (next: EmailDocument) => void;
  onSelect: (id: string | null) => void;
}

export function BlockInspector({ doc, selectedId, onChange, onSelect }: Props) {
  if (!selectedId || selectedId === "root") {
    return <RootInspector doc={doc} onChange={onChange} />;
  }
  const block = getBlock(doc, selectedId);
  if (!block) {
    return <div className="text-sm text-muted-foreground p-4">القالب غير موجود</div>;
  }

  const update = (patch: {
    props?: Record<string, unknown>;
    style?: Record<string, unknown>;
  }) => {
    const next = setBlock(doc, selectedId, {
      ...block,
      data: {
        ...block.data,
        props: { ...(block.data.props ?? {}), ...(patch.props ?? {}) },
        style: { ...(block.data.style ?? {}), ...(patch.style ?? {}) },
      },
    });
    onChange(next);
  };

  const handleDelete = () => {
    onChange(deleteBlock(doc, selectedId));
    onSelect(null);
  };

  const props = (block.data.props ?? {}) as Record<string, unknown>;
  const style = (block.data.style ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-xs font-semibold text-muted-foreground">{block.type}</span>
        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600 h-7">
          <Trash2 className="w-3.5 h-3.5 me-1" /> حذف
        </Button>
      </div>

      {block.type === "Heading" && (
        <>
          <Field label="النص">
            <TextareaWithVariables
              value={String(props.text ?? "")}
              onChange={(v) => update({ props: { text: v } })}
            />
          </Field>
          <Field label="المستوى">
            <Select
              value={String(props.level ?? "h2")}
              onValueChange={(v) => update({ props: { level: v } })}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="h1">H1</SelectItem>
                <SelectItem value="h2">H2</SelectItem>
                <SelectItem value="h3">H3</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <AlignField value={String(style.textAlign ?? "right")} onChange={(v) => update({ style: { textAlign: v } })} />
        </>
      )}

      {block.type === "Text" && (
        <>
          <Field label="النص">
            <TextareaWithVariables
              value={String(props.text ?? "")}
              onChange={(v) => update({ props: { text: v } })}
              rows={6}
            />
          </Field>
          <AlignField value={String(style.textAlign ?? "right")} onChange={(v) => update({ style: { textAlign: v } })} />
          <Field label="السمك">
            <Select
              value={String(style.fontWeight ?? "normal")}
              onValueChange={(v) => update({ style: { fontWeight: v } })}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">عادي</SelectItem>
                <SelectItem value="bold">ثقيل</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      )}

      {block.type === "Button" && (
        <>
          <Field label="نص الزر">
            <Input
              value={String(props.text ?? "")}
              onChange={(e) => update({ props: { text: e.target.value } })}
            />
          </Field>
          <Field label="الرابط">
            <Input
              value={String(props.url ?? "")}
              onChange={(e) => update({ props: { url: e.target.value } })}
              placeholder="https://"
            />
          </Field>
          <Field label="الشكل">
            <Select
              value={String(props.buttonStyle ?? "rectangle")}
              onValueChange={(v) => update({ props: { buttonStyle: v } })}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rectangle">مستطيل</SelectItem>
                <SelectItem value="rounded">دائري الزوايا</SelectItem>
                <SelectItem value="pill">حبة دواء</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <ColorField label="لون الخلفية" value={String(style.backgroundColor ?? "#FA5D17")} onChange={(v) => update({ style: { backgroundColor: v } })} />
          <ColorField label="لون النص" value={String(style.color ?? "#FFFFFF")} onChange={(v) => update({ style: { color: v } })} />
        </>
      )}

      {block.type === "Image" && (
        <>
          <Field label="رابط الصورة">
            <Input
              value={String(props.url ?? "")}
              onChange={(e) => update({ props: { url: e.target.value } })}
              placeholder="https://"
            />
          </Field>
          <Field label="الوصف البديل">
            <Input
              value={String(props.alt ?? "")}
              onChange={(e) => update({ props: { alt: e.target.value } })}
            />
          </Field>
          <Field label="رابط نقر (اختياري)">
            <Input
              value={String(props.linkHref ?? "")}
              onChange={(e) => update({ props: { linkHref: e.target.value } })}
              placeholder="https://"
            />
          </Field>
        </>
      )}

      {block.type === "Divider" && (
        <>
          <ColorField
            label="لون الخط"
            value={String(props.lineColor ?? "#E5E7EB")}
            onChange={(v) => update({ props: { lineColor: v } })}
          />
          <NumberField
            label="السمك"
            value={Number(props.lineHeight ?? 1)}
            min={1}
            max={10}
            onChange={(v) => update({ props: { lineHeight: v } })}
          />
        </>
      )}

      {block.type === "Spacer" && (
        <NumberField
          label="الارتفاع (px)"
          value={Number(props.height ?? 24)}
          min={4}
          max={200}
          onChange={(v) => update({ props: { height: v } })}
        />
      )}

      <PaddingField
        value={(style.padding as Record<string, number>) ?? { top: 16, bottom: 16, right: 24, left: 24 }}
        onChange={(v) => update({ style: { padding: v } })}
      />
    </div>
  );
}

function RootInspector({
  doc,
  onChange,
}: {
  doc: EmailDocument;
  onChange: (d: EmailDocument) => void;
}) {
  const root = getRoot(doc);
  const data = root.data as Record<string, unknown>;

  const update = (patch: Record<string, unknown>) => {
    const next = {
      ...(doc as Record<string, unknown>),
      root: {
        ...(doc.root as object),
        data: { ...data, ...patch },
      },
    } as unknown as EmailDocument;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground border-b border-border pb-2">إعدادات البريد العامة</p>
      <ColorField label="لون الخلفية" value={String(data.backdropColor ?? "#F8F8F8")} onChange={(v) => update({ backdropColor: v })} />
      <ColorField label="لون البطاقة" value={String(data.canvasColor ?? "#FFFFFF")} onChange={(v) => update({ canvasColor: v })} />
      <ColorField label="لون النص" value={String(data.textColor ?? "#242424")} onChange={(v) => update({ textColor: v })} />
      <Field label="الخط">
        <Select
          value={String(data.fontFamily ?? "MODERN_SANS")}
          onValueChange={(v) => update({ fontFamily: v })}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="MODERN_SANS">MODERN_SANS</SelectItem>
            <SelectItem value="BOOK_SANS">BOOK_SANS</SelectItem>
            <SelectItem value="ORGANIC_SANS">ORGANIC_SANS</SelectItem>
            <SelectItem value="GEOMETRIC_SANS">GEOMETRIC_SANS</SelectItem>
            <SelectItem value="HEAVY_SANS">HEAVY_SANS</SelectItem>
            <SelectItem value="ROUNDED_SANS">ROUNDED_SANS</SelectItem>
            <SelectItem value="MODERN_SERIF">MODERN_SERIF</SelectItem>
            <SelectItem value="BOOK_SERIF">BOOK_SERIF</SelectItem>
            <SelectItem value="MONOSPACE">MONOSPACE</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded border border-border cursor-pointer"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1" dir="ltr" />
      </div>
    </Field>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        dir="ltr"
      />
    </Field>
  );
}

function PaddingField({
  value,
  onChange,
}: {
  value: { top?: number; right?: number; bottom?: number; left?: number };
  onChange: (v: { top: number; right: number; bottom: number; left: number }) => void;
}) {
  const cur = {
    top: value.top ?? 0,
    right: value.right ?? 0,
    bottom: value.bottom ?? 0,
    left: value.left ?? 0,
  };
  const update = (k: "top" | "right" | "bottom" | "left", v: number) =>
    onChange({ ...cur, [k]: v });
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1.5 block">المسافات الداخلية (px)</label>
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" value={cur.top} onChange={(e) => update("top", Number(e.target.value) || 0)} placeholder="أعلى" dir="ltr" />
        <Input type="number" value={cur.bottom} onChange={(e) => update("bottom", Number(e.target.value) || 0)} placeholder="أسفل" dir="ltr" />
        <Input type="number" value={cur.right} onChange={(e) => update("right", Number(e.target.value) || 0)} placeholder="يمين" dir="ltr" />
        <Input type="number" value={cur.left} onChange={(e) => update("left", Number(e.target.value) || 0)} placeholder="يسار" dir="ltr" />
      </div>
    </div>
  );
}

function AlignField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="المحاذاة">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="right">يمين</SelectItem>
          <SelectItem value="center">وسط</SelectItem>
          <SelectItem value="left">يسار</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}

function TextareaWithVariables({
  value,
  onChange,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const insert = (token: string) => {
    const el = ref.current;
    if (!el) {
      onChange(value + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };
  return (
    <div className="space-y-1.5">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="font-mono text-xs"
      />
      <details className="group">
        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">إدراج متغيّر</summary>
        <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-border bg-slate-50/60 p-2 space-y-2">
          {VARIABLE_CATALOG.map((g) => (
            <div key={g.group}>
              <div className="text-[10px] font-semibold text-slate-500 mb-1">{g.group}</div>
              <div className="flex flex-wrap gap-1">
                {g.entries.map((e) => (
                  <button
                    key={e.token}
                    type="button"
                    onClick={() => insert(e.token)}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-border hover:bg-blue-50"
                    title={e.label}
                  >
                    {e.token}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
