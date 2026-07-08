"use client";

import * as React from "react";
import { Braces, Copy, Check, ChevronDown } from "lucide-react";
import { communicationTemplateVariables } from "@/lib/communication/template-variables";

const CATEGORY_LABEL: Record<string, string> = { donor: "المتبرع", donation: "التبرع", campaign: "الحملة", system: "النظام" };

/**
 * Variable library — grouped by category, each with a copy button. No sample/fake values are shown.
 * `onInsert` (optional) lets a builder insert the token at the cursor.
 */
export function VariableLibrary({ onInsert }: { onInsert?: (token: string) => void }) {
  const [open, setOpen] = React.useState(!onInsert);
  const [copied, setCopied] = React.useState<string | null>(null);
  const categories = ["donor", "donation", "campaign", "system"] as const;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 p-3">
        <span className="flex items-center gap-2 text-sm font-black text-slate-800"><Braces className="h-4 w-4 text-[#025EB8]" /> مكتبة المتغيرات</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="space-y-3 border-t p-3">
          {categories.map((cat) => {
            const items = communicationTemplateVariables.filter((v) => v.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <p className="mb-1.5 text-[11px] font-bold text-slate-400">{CATEGORY_LABEL[cat]}</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((v) => {
                    const token = `{{${v.key}}}`;
                    return (
                      <span key={v.key} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 py-1 pe-1 ps-2 text-xs">
                        <span className="font-semibold text-slate-700">{v.label}</span>
                        <code dir="ltr" className="text-[10px] text-slate-400">{token}</code>
                        {onInsert ? (
                          <button type="button" onClick={() => onInsert(token)} className="rounded bg-[#025EB8]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#025EB8] hover:bg-[#025EB8]/20">إدراج</button>
                        ) : null}
                        <button type="button" onClick={() => { navigator.clipboard?.writeText(token); setCopied(v.key); setTimeout(() => setCopied(null), 1200); }} className="text-slate-400 hover:text-slate-600">
                          {copied === v.key ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
