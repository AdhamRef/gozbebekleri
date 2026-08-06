"use client";

import * as React from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Dialog, DialogOverlay, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2, Layers, TriangleAlert } from "lucide-react";
import { VARIABLE_CATALOG, mergeText } from "@/lib/templates/variables";
import { SAMPLE_TEMPLATE_CONTEXT } from "@/lib/templates/sample-context";
import { segmentSms } from "@/lib/communication/sms-segments";
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "@/lib/locales";
import { cn } from "@/lib/utils";

interface Props {
  id: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

type BodiesState = Partial<Record<SupportedLocale, string>>;

interface ApiTemplate {
  id: string;
  name: string;
  body: string;
  translations?: Partial<Record<string, { body?: string }>> | null;
}

/**
 * What this message will actually cost.
 *
 * Measured against the *merged* text, not the template source: `{{user.name}}` is thirteen
 * characters while writing and maybe four when it lands, so counting the raw body would report a
 * length no recipient ever receives. The caveat that real length varies per recipient is stated
 * rather than hidden, because a template sitting one character under a segment boundary will cross
 * it for the donor with the longer name.
 */
function SegmentMeter({ text }: { text: string }) {
  const seg = segmentSms(text);
  const perSegment = seg.encoding === "UCS2" ? (seg.segments > 1 ? 67 : 70) : seg.segments > 1 ? 153 : 160;
  const capacity = Math.max(perSegment * Math.max(seg.segments, 1), 1);
  const fill = Math.min(100, Math.round((seg.units / capacity) * 100));

  const tone =
    seg.segments <= 1
      ? { bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700" }
      : seg.segments === 2
        ? { bar: "bg-amber-500", chip: "border-amber-200 bg-amber-50 text-amber-700" }
        : { bar: "bg-rose-500", chip: "border-rose-200 bg-rose-50 text-rose-700" };

  return (
    <div className="rounded-md border border-border bg-white p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold",
            seg.encoding === "UCS2"
              ? "border-violet-200 bg-violet-50 text-violet-700"
              : "border-slate-200 bg-slate-50 text-slate-600",
          )}
          title={
            seg.encoding === "UCS2"
              ? "النص يحتوي حروفًا خارج أبجدية GSM (العربية مثلًا) — المقطع ٧٠ حرفًا"
              : "كل الحروف داخل أبجدية GSM — المقطع ١٦٠ حرفًا"
          }
        >
          {seg.encoding === "UCS2" ? "يونيكود (عربي)" : "لاتيني GSM"}
        </span>

        <span className="text-[11px] tabular-nums text-slate-500">
          <b className="text-slate-800">{seg.units}</b> / {capacity} حرفًا
        </span>

        <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold tabular-nums", tone.chip)}>
          <Layers className="h-3 w-3" />
          {seg.segments} مقطع
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full transition-all", tone.bar)} style={{ width: `${fill}%` }} />
      </div>

      {seg.segments > 1 && (
        <p className="mt-1.5 flex items-start gap-1 text-[10px] leading-4 text-amber-800">
          <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
          تُحتسب {seg.segments} مقاطع في الفاتورة — أي {seg.segments}× تكلفة الرسالة الواحدة.
          {seg.remaining > 0 && ` احذف ${seg.remaining + 1} حرفًا للنزول مقطعًا.`}
        </p>
      )}
      <p className="mt-1 text-[10px] leading-4 text-slate-400">
        محسوب على النص بعد دمج البيانات التجريبية — الطول الفعلي يتغيّر حسب بيانات كل مستلم.
      </p>
    </div>
  );
}

export function SmsTemplateEditorDialog({ id, open, onOpenChange, onSaved }: Props) {
  const [name, setName] = React.useState("");
  const [bodies, setBodies] = React.useState<BodiesState>({});
  const [activeLocale, setActiveLocale] = React.useState<SupportedLocale>(DEFAULT_LOCALE);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!open) return;
    if (!id) {
      setName("");
      setBodies({ [DEFAULT_LOCALE]: "شكرًا {{user.name}}! تم استلام تبرعك بمبلغ {{amount}} {{currency}}." });
      setActiveLocale(DEFAULT_LOCALE);
      return;
    }
    setLoading(true);
    axios
      .get(`/api/templates/sms/${id}`)
      .then((res) => {
        const t = res.data?.template as ApiTemplate;
        setName(t?.name ?? "");
        const next: BodiesState = { [DEFAULT_LOCALE]: t?.body ?? "" };
        if (t?.translations) {
          for (const [loc, v] of Object.entries(t.translations)) {
            if (!v?.body) continue;
            if (!SUPPORTED_LOCALES.includes(loc as SupportedLocale)) continue;
            if (loc === DEFAULT_LOCALE) continue;
            next[loc as SupportedLocale] = v.body;
          }
        }
        setBodies(next);
        setActiveLocale(DEFAULT_LOCALE);
      })
      .catch(() => toast.error("فشل تحميل القالب"))
      .finally(() => setLoading(false));
  }, [id, open]);

  const currentBody = bodies[activeLocale] ?? "";
  const updateCurrentBody = (v: string) => setBodies((prev) => ({ ...prev, [activeLocale]: v }));

  const enableLocale = (loc: SupportedLocale) => {
    setBodies((prev) => (prev[loc] != null ? prev : { ...prev, [loc]: prev[DEFAULT_LOCALE] ?? "" }));
    setActiveLocale(loc);
  };

  const removeLocale = (loc: SupportedLocale) => {
    if (loc === DEFAULT_LOCALE) return;
    setBodies((prev) => {
      const next = { ...prev };
      delete next[loc];
      return next;
    });
    setActiveLocale(DEFAULT_LOCALE);
  };

  const insertToken = (token: string) => {
    const el = bodyRef.current;
    if (!el) {
      updateCurrentBody(currentBody + token);
      return;
    }
    const start = el.selectionStart ?? currentBody.length;
    const end = el.selectionEnd ?? currentBody.length;
    updateCurrentBody(currentBody.slice(0, start) + token + currentBody.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const preview = React.useMemo(() => mergeText(currentBody, SAMPLE_TEMPLATE_CONTEXT), [currentBody]);

  const save = async () => {
    if (!name.trim()) {
      toast.error("اسم القالب مطلوب");
      return;
    }
    const arBody = bodies[DEFAULT_LOCALE]?.trim();
    if (!arBody) {
      toast.error("المحتوى بالعربية مطلوب");
      return;
    }
    setSaving(true);
    try {
      const translations: Record<string, { body: string }> = {};
      for (const loc of SUPPORTED_LOCALES) {
        if (loc === DEFAULT_LOCALE) continue;
        const b = bodies[loc]?.trim();
        if (b) translations[loc] = { body: b };
      }
      const payload = {
        name,
        body: arBody,
        translations: Object.keys(translations).length > 0 ? translations : null,
      };
      if (id) await axios.patch(`/api/templates/sms/${id}`, payload);
      else await axios.post("/api/templates/sms", payload);
      toast.success("تم الحفظ");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="fixed inset-0 bg-black/50" />
      <DialogContent
        className="fixed left-1/2 top-1/2 max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 transform overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl"
        dir="rtl"
      >
        <DialogTitle className="mb-4 text-lg font-bold">
          {id ? "تعديل قالب الرسالة النصية" : "قالب رسالة نصية جديد"}
        </DialogTitle>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="me-2 h-6 w-6 animate-spin" /> جاري التحميل…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">اسم القالب (داخلي)</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: تأكيد التبرع" />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto rounded-md border border-border bg-slate-50/60 px-3 py-2">
              <span className="me-2 shrink-0 text-[11px] font-semibold text-slate-500">اللغات:</span>
              {SUPPORTED_LOCALES.map((loc) => {
                const has = bodies[loc] != null;
                const active = activeLocale === loc;
                const isDefault = loc === DEFAULT_LOCALE;
                return (
                  <div key={loc} className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => (has ? setActiveLocale(loc) : enableLocale(loc))}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-brand bg-brand text-white"
                          : has
                            ? "border-border bg-white text-slate-700 hover:border-brand"
                            : "border-dashed border-slate-300 bg-transparent text-slate-400 hover:border-slate-500 hover:text-slate-600",
                      )}
                    >
                      {LOCALE_LABELS[loc]}
                      {!has && <span className="ms-1">+</span>}
                      {isDefault && <span className="ms-1 text-[9px] opacity-70">افتراضي</span>}
                    </button>
                    {has && !isDefault && (
                      <button
                        type="button"
                        onClick={() => removeLocale(loc)}
                        className="ms-0.5 p-1 text-slate-400 hover:text-red-600"
                        title={`حذف نسخة ${LOCALE_LABELS[loc]}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">
                  المحتوى ({LOCALE_LABELS[activeLocale]})
                </label>
                <Textarea
                  ref={bodyRef}
                  value={currentBody}
                  onChange={(e) => updateCurrentBody(e.target.value)}
                  rows={7}
                  className="font-mono text-xs"
                  dir={activeLocale === "ar" ? "rtl" : "ltr"}
                  placeholder="اكتب نص الرسالة القصيرة هنا"
                />

                {/* The whole reason SMS gets its own editor: cost is visible while writing. */}
                <SegmentMeter text={preview} />

                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border bg-slate-50/60 p-2">
                  <p className="text-[10px] font-semibold text-slate-500">المتغيّرات المتاحة (اضغط للإدراج)</p>
                  {VARIABLE_CATALOG.map((g) => (
                    <div key={g.group}>
                      <div className="mb-1 text-[10px] font-semibold text-slate-500">{g.group}</div>
                      <div className="flex flex-wrap gap-1">
                        {g.entries.map((e) => (
                          <button
                            key={e.token}
                            type="button"
                            onClick={() => insertToken(e.token)}
                            className="rounded border border-border bg-white px-2 py-0.5 font-mono text-[11px] hover:bg-blue-50"
                            title={e.label}
                          >
                            {e.token}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">
                  معاينة ({LOCALE_LABELS[activeLocale]} — ببيانات تجريبية)
                </label>
                {/* Rendered as a plain notification bubble, not a chat thread: SMS has no
                    delivery ticks, no avatars and no rich formatting to imply. */}
                <div className="min-h-[260px] rounded-lg border border-border bg-slate-100 p-4">
                  <div className="mx-auto max-w-[280px] rounded-2xl bg-white p-3 shadow-sm">
                    <div className="mb-1.5 flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-[10px] font-semibold text-slate-500">رسالة نصية</span>
                      <span className="text-[10px] text-slate-400">الآن</span>
                    </div>
                    <p
                      className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-900"
                      dir={activeLocale === "ar" ? "rtl" : "ltr"}
                    >
                      {preview || <span className="italic text-muted-foreground">المعاينة ستظهر هنا</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                إلغاء
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                حفظ
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
