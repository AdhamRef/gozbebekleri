"use client";

import { useEffect, useState } from "react";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readArchiveProjectOptions, saveArchiveProjectOptions, type ArchiveProjectOptions } from "./archiveProjectOptions";

type OptionKey = keyof ArchiveProjectOptions;

type OptionGroup = {
  key: OptionKey;
  title: string;
  placeholder: string;
};

const GROUPS: OptionGroup[] = [
  { key: "years", title: "السنوات", placeholder: "مثال: 2027" },
  { key: "countries", title: "البلدان", placeholder: "مثال: مصر" },
  { key: "cities", title: "المدن", placeholder: "مثال: خان يونس" },
  { key: "themes", title: "التصنيفات", placeholder: "مثال: غذاء" },
  { key: "projectTypes", title: "أنواع المشاريع", placeholder: "مثال: مشروع رمضاني" },
];

export function ArchiveProjectOptionsPanel() {
  const [options, setOptions] = useState<ArchiveProjectOptions>(() => readArchiveProjectOptions());
  const [drafts, setDrafts] = useState<Record<OptionKey, string>>({ years: "", countries: "", cities: "", themes: "", projectTypes: "" });

  useEffect(() => {
    setOptions(readArchiveProjectOptions());
  }, []);

  function addOption(key: OptionKey) {
    const value = drafts[key].trim();
    if (!value) return;

    const next = {
      ...options,
      [key]: normalizeOptionList([value, ...options[key]]),
    };
    setOptions(next);
    setDrafts((current) => ({ ...current, [key]: "" }));
    saveArchiveProjectOptions(next);
  }

  function removeOption(key: OptionKey, value: string) {
    const next = {
      ...options,
      [key]: options[key].filter((item) => item !== value),
    };
    setOptions(next);
    saveArchiveProjectOptions(next);
  }

  return (
    <section className="rounded-xl border bg-white shadow-sm">
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-[#025EB8]" />
          <h2 className="text-base font-black text-slate-950">إعدادات خيارات المشاريع</h2>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-600">أضف القيم التي تريد ظهورها في نماذج إضافة وتعديل المشاريع.</p>
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-5">
        {GROUPS.map((group) => (
          <div key={group.key} className="rounded-lg border bg-slate-50 p-3">
            <p className="text-sm font-black text-slate-950">{group.title}</p>
            <div className="mt-3 flex gap-2">
              <input
                value={drafts[group.key]}
                onChange={(event) => setDrafts((current) => ({ ...current, [group.key]: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addOption(group.key);
                  }
                }}
                placeholder={group.placeholder}
                className="h-8 min-w-0 flex-1 rounded-md border bg-white px-2 text-xs text-slate-900 outline-none focus:border-[#025EB8]"
              />
              <Button type="button" size="sm" onClick={() => addOption(group.key)} className="h-8 px-2">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="mt-3 flex max-h-28 flex-wrap gap-1 overflow-auto">
              {options[group.key].map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => removeOption(group.key, option)}
                  className="inline-flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-[11px] font-bold text-slate-700 transition hover:border-rose-200 hover:text-rose-700"
                  title="حذف الخيار"
                >
                  {option}
                  <Trash2 className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function normalizeOptionList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
