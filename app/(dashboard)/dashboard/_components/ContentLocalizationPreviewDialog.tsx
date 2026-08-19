"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { AlertTriangle, Loader2, Save, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";

const LOCALE_LABELS: Record<string, string> = {
  ar: "العربية",
  en: "الإنجليزية",
  fr: "الفرنسية",
  tr: "التركية",
  id: "الإندونيسية",
  pt: "البرتغالية",
  es: "الإسبانية",
  de: "الألمانية",
};

const FIELD_LABELS: Record<string, string> = {
  title: "العنوان",
  name: "الاسم",
  description: "الوصف",
  content: "المحتوى",
  buttonText: "نص الزر",
};

type Section = "campaigns" | "categories" | "blog" | "slides";

type PreviewRow = {
  id: string;
  type: "campaign" | "category" | "post" | "postCategory" | "slide";
  label: string;
  typeLabel: string;
  locale: string;
  sourceArabic: Record<string, string | null>;
  currentTranslation: Record<string, string | null>;
  suggestedTranslation: Record<string, string>;
  missingFields: string[];
  emptyFields: string[];
  identicalToArabicFields: string[];
  qualityNotes?: string[];
};

function plainText(value: string | null | undefined): string {
  const raw = value?.trim() || "";
  if (!raw) return "";
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      const walk = (node: unknown): string => {
        if (!node) return "";
        if (typeof node === "string") return node;
        if (Array.isArray(node)) return node.map(walk).filter(Boolean).join(" ");
        if (typeof node !== "object") return "";
        const item = node as { text?: unknown; content?: unknown };
        return [typeof item.text === "string" ? item.text : "", walk(item.content)]
          .filter(Boolean)
          .join(" ");
      };
      return walk(parsed).replace(/\s+/g, " ").trim();
    } catch {
      // Continue with HTML/plain text cleanup.
    }
  }
  return raw.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function rowKey(row: PreviewRow) {
  return `${row.type}-${row.id}`;
}

/** Rich-text fields are edited as raw markup so saving cannot flatten their formatting. */
function isRichText(value: string | null | undefined) {
  const raw = value?.trim() || "";
  return raw.startsWith("{") || /<[^>]+>/.test(raw);
}

export function ContentLocalizationPreviewDialog({
  section,
  open,
  onOpenChange,
  defaultLocale = "de",
  onSaved,
}: {
  section: Section;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLocale?: string;
  onSaved?: () => void;
}) {
  const [locale, setLocale] = useState(defaultLocale);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  function applyRows(nextRows: PreviewRow[]) {
    setRows(nextRows);
    setDrafts(
      Object.fromEntries(nextRows.map((row) => [rowKey(row), { ...row.suggestedTranslation }])),
    );
  }

  async function loadRows() {
    setLoading(true);
    try {
      const response = await axios.get("/api/admin/content-localization/preview", {
        params: { section, locale, limit: 10 },
      });
      applyRows(response.data?.rows || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "تعذر تجهيز المعاينة");
    } finally {
      setLoading(false);
    }
  }

  async function generatePreview() {
    setGenerating(true);
    try {
      const response = await axios.post("/api/admin/content-localization/preview", {
        action: "generate",
        section,
        locale,
        limit: 8,
      });
      applyRows(response.data?.rows || []);
      toast.success("تم تجهيز الاقتراحات. راجعها ثم اضغط حفظ.");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "تعذر توليد المعاينة");
    } finally {
      setGenerating(false);
    }
  }

  async function saveRows(target: PreviewRow[], key: string) {
    if (target.length === 0) return;
    setSavingKey(key);
    try {
      const response = await axios.post("/api/admin/content-localization/preview", {
        action: "apply",
        section,
        locale,
        items: target.map((row) => ({
          id: row.id,
          type: row.type,
          fields: drafts[rowKey(row)] || row.suggestedTranslation,
        })),
      });

      const savedCount = Number(response.data?.savedCount || 0);
      const failed: { error?: string }[] = response.data?.failed || [];
      if (savedCount > 0) toast.success(`تم حفظ ${savedCount} عنصر`);
      if (failed.length > 0) {
        toast.error(failed[0]?.error || `تعذر حفظ ${failed.length} عنصر`);
      }
      if (savedCount > 0) {
        onSaved?.();
        await loadRows();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "تعذر حفظ التغييرات");
    } finally {
      setSavingKey(null);
    }
  }

  function saveAll() {
    const message = locale === "ar"
      ? "سيتم استبدال النص العربي الأصلي لكل العناصر المعروضة. هل تريد المتابعة؟"
      : `سيتم حفظ ترجمة ${LOCALE_LABELS[locale]} لكل العناصر المعروضة. هل تريد المتابعة؟`;
    if (!window.confirm(message)) return;
    void saveRows(rows, "all");
  }

  useEffect(() => {
    if (open) void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, locale, section]);

  const busy = loading || generating;
  const saving = savingKey !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            معاينة النصوص والترجمات
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">
                {locale === "ar"
                  ? "تحرير النص العربي الأصلي"
                  : `تحرير ترجمة ${LOCALE_LABELS[locale]}`}
              </p>
              <p className="mt-1 leading-6">
                {locale === "ar"
                  ? "الحفظ هنا يستبدل النص العربي الأصلي للعنصر مباشرة."
                  : "الحفظ هنا يكتب الترجمة في قاعدة البيانات مباشرة. النص العربي الأصلي لا يتغير."}
                {" "}
                الحقول الغنية (الوصف والمحتوى) تُحرَّر بصيغتها الأصلية HTML حفاظًا على التنسيق.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Select value={locale} onValueChange={setLocale} disabled={saving}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LOCALE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadRows} disabled={busy || saving}>
              {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
              تحديث المعاينة
            </Button>
            <Button
              variant="outline"
              onClick={generatePreview}
              disabled={busy || saving}
              className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              توليد ترجمة احترافية
            </Button>
            <Button onClick={saveAll} disabled={busy || saving || rows.length === 0} className="gap-2">
              {savingKey === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ الكل
            </Button>
          </div>
        </div>

        {busy ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="ml-2 h-5 w-5 animate-spin" />
            جاري تجهيز المعاينة…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border bg-emerald-50 p-6 text-center text-emerald-700">
            لا توجد عناصر ناقصة في هذه الدفعة.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const key = rowKey(row);
              const draft = drafts[key] || row.suggestedTranslation;
              return (
                <article key={key} className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold">{row.label}</h3>
                      <p className="text-xs text-muted-foreground">{row.typeLabel} · {LOCALE_LABELS[locale]}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(row.missingFields.length > 0 || row.emptyFields.length > 0 || row.identicalToArabicFields.length > 0) && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" /> يحتاج مراجعة
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        disabled={saving}
                        onClick={() => saveRows([row], key)}
                      >
                        {savingKey === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        حفظ
                      </Button>
                    </div>
                  </div>

                  {row.qualityNotes?.length ? (
                    <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
                      {row.qualityNotes.slice(0, 4).map((note) => <p key={note}>• {note}</p>)}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {Object.keys(row.sourceArabic).map((field) => (
                      <div key={field} className="grid gap-2 lg:grid-cols-2">
                        <div className="rounded-lg border bg-slate-50 p-3">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">العربي الأصلي · {FIELD_LABELS[field] || field}</p>
                          <p className="whitespace-pre-wrap text-sm leading-7">{plainText(row.sourceArabic[field]) || "—"}</p>
                        </div>
                        <div className="rounded-lg border bg-white p-3">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            النص المحفوظ · {FIELD_LABELS[field] || field}
                            {isRichText(row.sourceArabic[field]) ? " · HTML" : ""}
                          </p>
                          <Textarea
                            value={draft[field] ?? ""}
                            dir={locale === "ar" ? "rtl" : "ltr"}
                            rows={field === "content" ? 8 : 3}
                            disabled={saving}
                            className="text-sm leading-7"
                            onChange={(event) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [key]: { ...(prev[key] || row.suggestedTranslation), [field]: event.target.value },
                              }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
