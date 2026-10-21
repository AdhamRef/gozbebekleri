"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { EditorModal } from "./EditorModal";
import { ProgrammeWorkspace } from "./ProgrammeWorkspace";
import { WorkspacePreview } from "./WorkspacePreview";
import { WorkspaceSettings, useEditorCatalog } from "./WorkspaceSettings";
import { SeoWorkspace } from "./SeoWorkspace";
import { CampaignAdvancedSettings } from "./CampaignAdvancedSettings";
import { CampaignAchievements } from "./CampaignAchievements";
import { ProtectedSettings } from "./ProtectedSettings";
import { EditorialWorkflow } from "./EditorialWorkflow";
import { EDITORIAL_LABELS, type EditorialAction } from "@/lib/content-localization/editorial-policy";
import { ImageUploadField } from "@/app/(dashboard)/dashboard/_components/ImageUploadField";
import { EDITOR_SECTIONS, settingsFor } from "@/lib/content-editor/workspace";
import type { ContentRecord } from "@/lib/content-editor/contracts";
import {
  FileText,
  Wallet,
  Image as ImageIcon,
  Search,
  History,
  Grid2X2,
  Link2,
  CheckCircle2,
  Heart,
  Settings,
  Eye,
  Save,
  ArrowRight,
  Globe2,
  Undo2,
  MoreHorizontal,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LOCALES, SUPPORTED_LOCALES } from "@/lib/locales";
import {
  CONFIG,
  hasText,
  localeStatus,
  type ContentField,
  type ContentKind,
  type TextValues,
} from "@/lib/content-editor/contracts";
import type { documentFor } from "@/lib/content-editor/service";
const CategoryOrderDialog = dynamic(
  () =>
    import("@/app/(dashboard)/dashboard/categories/_components/CategoryCampaignPriorityDialog").then(
      (m) => m.CategoryCampaignPriorityDialog,
    ),
  { ssr: false },
);
const RichEditor = dynamic(
  () => import("@/app/[locale]/blog/_components/wysiwyg/wysiwyg-editor"),
  { ssr: false, loading: () => <p>تحميل المحرر…</p> },
);
type Document = ReturnType<typeof documentFor>;
type Proposal = {
  id: string;
  kind: ContentKind;
  revision: string;
  action: string;
  proposals: Record<string, { values: TextValues; warnings: string[] }>;
  errors: Record<string, string>;
};
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "تعذر إكمال الطلب");
  return body;
}
function previewText(value: string): string {
  try {
    const parsed = JSON.parse(value);
    if (parsed.type === "doc") {
      const read = (node: { text?: string; content?: unknown[] }): string =>
        typeof node.text === "string"
          ? node.text
          : (node.content || [])
            .map((child) =>
              read(child as { text?: string; content?: unknown[] }),
            )
            .join(" ");
      return read(parsed);
    }
  } catch {
    /* normal text */
  }
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
}
function parseRich(value: string) {
  try {
    const doc = JSON.parse(value);
    if (doc.type === "doc") return doc;
  } catch {
    /* plain or HTML */
  }
  return value || { type: "doc", content: [{ type: "paragraph" }] };
}
const button =
  "rounded-lg border px-4 py-2 text-sm disabled:opacity-50 hover:bg-slate-50";
export function ContentEditor({ kind, id }: { kind: ContentKind; id: string }) {
  const url = `/api/admin/content-editor/${kind}/${id}`;
  const [document, setDocument] = useState<Document | null>(null);
  const [values, setValues] = useState<Record<string, TextValues>>({});
  const [locale, setLocale] = useState("ar");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [draftAction, setDraftAction] = useState("");
  const [history, setHistory] = useState<{ id: string; createdAt: string; revision: string }[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [slug, setSlug] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [slugOpen, setSlugOpen] = useState(false);
  const [section, setSection] = useState("content");
  const [settingsDraft, setSettingsDraft] = useState<ContentRecord>({});
  const [languageReview, setLanguageReview] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [selectFields, setSelectFields] = useState(false);
  const [uploads, setUploads] = useState(0);
  const onUploadingChange = useCallback(
    (uploading: boolean) =>
      setUploads((count) => Math.max(0, count + (uploading ? 1 : -1))),
    [],
  );
  const [categoryOrderOpen, setCategoryOrderOpen] = useState(false);
  const { catalog, error: catalogError } = useEditorCatalog(kind);
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const requestRef = useRef(0);
  const initialLoad = useCallback(async () => {
    const number = ++requestRef.current;
    try {
      const data = await api<Document>(url);
      if (number !== requestRef.current) return;
      setDocument(data);
      setValues(data.values);
      setDraftAction("");
      setSettingsDraft(settingsFor(kind, data.settings));
      setSelected(data.fields.filter((f) => !f.locked).map((f) => f.key));
      setMessage("");
    } catch (error) {
      if (number === requestRef.current)
        setMessage(error instanceof Error ? error.message : "تعذر التحميل");
    }
  }, [url, kind]);
  const invalidateRequests = useCallback(() => {
    requestRef.current++;
  }, []);
  useEffect(() => {
    void initialLoad();
    return invalidateRequests;
  }, [initialLoad, invalidateRequests]);
  const dirty = document
    ? JSON.stringify(values) !== JSON.stringify(document.values) ||
    JSON.stringify(settingsDraft) !==
    JSON.stringify(settingsFor(kind, document.settings)) ||
    uploads > 0
    : false;
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const navigation = (e: MouseEvent) => {
      const link = (e.target as Element).closest?.("a[href]");
      if (link && !window.confirm("توجد تعديلات غير محفوظة. مغادرة المحرر؟")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    window.document.addEventListener("click", navigation, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.document.removeEventListener("click", navigation, true);
    };
  }, [dirty]);
  const edit = (key: string, value: string) => {
    if (valuesRef.current[locale]?.[key] === value) return;
    if (busy === "save" || busy === "slug" || busy === "approve" || busy === "history") return;
    setDraftAction("");
    setValues((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [key]: value },
    }));
    setProposal(null);
    setReviewed(false);
  };
  const save = async () => {
    if (!document) return;
    if (uploads) {
      setMessage("انتظر اكتمال رفع الصور قبل الحفظ");
      return;
    }
    // Settings and achievement translations are independent of page translations.
    // Saving those alone must not create a blank translation for the selected tab.
    const localeChanges = Object.fromEntries(Object.entries(values).flatMap(([code, value]) => {
      const changes = Object.fromEntries(Object.entries(value).filter(([key, text]) =>
        !(code === "ar" && ["campaigns", "blog"].includes(kind) && key === "image") &&
        text !== document.values[code]?.[key],
      ));
      return Object.keys(changes).length ? [[code, changes]] : [];
    }));
    const target = reviewed || localeChanges[locale] ? locale : "ar",
      captured = localeChanges[target] || {};
    setBusy("save");
    setMessage("");
    try {
      const saved = await api<Document>(url, {
        method: "PUT",
        body: JSON.stringify({
          revision: document.revision,
          locale: target,
          changes: captured,
          reviewed,
          editorialAction: draftAction || undefined,
          localeChanges,
          settings: Object.fromEntries(
            Object.entries(settingsDraft).filter(
              ([key, v]) =>
                JSON.stringify(v) !==
                JSON.stringify(settingsFor(kind, document.settings)[key]),
            ),
          ),
        }),
      });
      const read = await api<Document>(url);
      if (read.revision !== saved.revision)
        throw new Error(
          "تغيرت النسخة بعد الحفظ. احتفظ بتعديلاتك ثم أعد تحميلها للمراجعة.",
        );
      setDocument(read);
      setValues(read.values);
      setSettingsDraft(settingsFor(kind, read.settings));
      setProposal(null);
      setDraftAction("");
      setReviewed(false);
      setMessage("تم الحفظ والتحقق من النسخة المحفوظة");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "تعذر تأكيد الحفظ. احتفظ بتعديلاتك وأعد المحاولة.",
      );
    } finally {
      setBusy("");
    }
  };
  const suggest = async (action: "seo" | "translate" | EditorialAction, all = false) => {
    if (!document || dirty) {
      setMessage("احفظ التعديلات أولًا لطلب اقتراح مرتبط بالنسخة الحالية");
      return;
    }
    const snapshot = JSON.stringify(valuesRef.current),
      revision = document.revision;
    setBusy(action);
    setMessage("");
    setProposal(null);
    try {
      const targets = all
        ? SUPPORTED_LOCALES.filter(
          (l) => l !== "ar" && (!document.statuses[l].complete || document.statuses[l].needsUpdate || !document.statuses[l].sourceKnown),
        )
        : [locale];
      if (action === "translate" && (targets.includes("ar") || !targets.length))
        throw new Error("اختر لغة أخرى أو لغة تحتاج ترجمة");
      const result = await api<Proposal>(url + "/suggest", {
        method: "POST",
        body: JSON.stringify({
          action,
          locale,
          locales: targets,
          keys: selected,
          revision,
        }),
      });
      if (snapshot !== JSON.stringify(valuesRef.current))
        throw new Error("تغير النص أثناء الطلب. اطلب اقتراحًا جديدًا.");
      if (
        result.id !== id ||
        result.kind !== kind ||
        result.revision !== revision
      )
        throw new Error("الاقتراح لا يطابق المحتوى الجاري تحريره");
      setProposal(result);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذر إعداد الاقتراح",
      );
    } finally {
      setBusy("");
    }
  };
  const apply = (target: string, key: string, value: string) => {
    if (
      busy === "save" ||
      busy === "slug" ||
      !document ||
      proposal?.revision !== document.revision
    )
      return;
    setValues((prev) => ({
      ...prev,
      [target]: { ...prev[target], [key]: value },
    }));
    setReviewed(false);
    setDraftAction(proposal?.action || "");
    setProposal((prev) => {
      if (!prev) return null;
      const pending = { ...prev.proposals[target].values };
      delete pending[key];
      return {
        ...prev,
        proposals: {
          ...prev.proposals,
          [target]: { ...prev.proposals[target], values: pending },
        },
      };
    });
    setMessage("أضيف الاقتراح إلى المسودة. احفظ اللغة بعد المراجعة.");
  };
  const changeSlug = async () => {
    if (!document || dirty) {
      setMessage("احفظ تعديلات المحتوى قبل تغيير الرابط");
      return;
    }
    setBusy("slug");
    try {
      const saved = await api<Document>(url, {
        method: "PUT",
        body: JSON.stringify({
          action: "slug",
          locale,
          revision: document.revision,
          slug,
          confirmation,
        }),
      });
      setDocument(saved);
      setValues(saved.values);
      setSlugOpen(false);
      setConfirmation("");
      setProposal(null);
      setMessage("تم تغيير الرابط وحفظ الرابط السابق في السجل");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تغيير الرابط");
    } finally {
      setBusy("");
    }
  };
  const approveSource = async () => {
    if (!document || dirty || busy) return;
    if (!window.confirm("أؤكد أنني راجعت العربية والحقائق والمصطلحات، وأعتمد هذه النسخة مصدرًا للترجمة؟")) return;
    setBusy("approve"); setMessage("");
    try { const saved = await api<Document>(url, { method: "PUT", body: JSON.stringify({ action: "approve-arabic", revision: document.revision }) }); setDocument(saved); setValues(saved.values); setProposal(null); setMessage("اعتمدت النسخة العربية. أي تغيير لاحق فيها يتطلب اعتمادًا جديدًا ويظهر الترجمات المرتبطة التي تحتاج تحديثًا."); } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر اعتماد المصدر"); } finally { setBusy(""); }
  };
  const loadHistory = async () => {
    if (dirty || busy) return; setBusy("history");
    try { const data = await api<{ items: NonNullable<typeof history> }>(url + "/history"); setHistory(data.items); } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر تحميل النسخ"); } finally { setBusy(""); }
  };
  const previewHistory = async (revisionId: string) => {
    if (!document || dirty || busy) return; setBusy("history");
    try { const previous = await api<{ values: Record<string, TextValues> }>(url + "/history?revisionId=" + revisionId); setProposal({ id, kind, revision: document.revision, action: "restore", proposals: Object.fromEntries(Object.entries(previous.values).map(([code, fields]) => [code, { values: Object.fromEntries(Object.entries(fields).filter(([key, value]) => value !== document.values[code]?.[key])), warnings: ["معاينة نصوص نسخة سابقة فقط. الإعدادات المالية والروابط التقنية والنصوص المقفلة لا تُسترجع من هنا."] }])), errors: {} }); setHistory(null); } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر معاينة النسخة"); } finally { setBusy(""); }
  };
  if (!document)
    return (
      <div dir="rtl" className="rounded-xl border p-6" role="status">
        {message || "تحميل المحتوى…"}
        <button type="button" className={button} onClick={initialLoad}>
          إعادة المحاولة
        </button>
      </div>
    );
  const current = values[locale] || {},
    source = values.ar || {},
    status = localeStatus(document.fields, source, current, locale);
  const done = SUPPORTED_LOCALES.filter(
    (l) => l !== "ar" && document.statuses[l].complete,
  ).length;
  const isBanner = kind === "urgent-banners";
  const liveSettings = {
    ...document.settings,
    ...settingsDraft,
    blocks: Array.isArray(settingsDraft.blocks)
      ? settingsDraft.blocks.map((item: ContentRecord) => {
        const key = `blocks.${item.id}.`;
        return {
          ...item,
          title:
            current[key + "title"] || source[key + "title"] || item.title,
          body: current[key + "body"] || source[key + "body"],
        };
      })
      : document.settings.blocks,
  };
  const sectionIcons = {
    file: FileText,
    wallet: Wallet,
    image: ImageIcon,
    search: Search,
    history: History,
    grid: Grid2X2,
    link: Link2,
    check: CheckCircle2,
    heart: Heart,
    settings: Settings,
  };
  const setSetting = (key: string, value: unknown) => {
    if (busy === "save" || busy === "slug" || busy === "approve" || busy === "history") return;
    setDraftAction("");
    setSettingsDraft((prev) => ({ ...prev, [key]: value }));
    setProposal(null);
  };
  const resetDraft = () => {
    if (busy) return;
    if (!dirty || window.confirm("التراجع عن كل التعديلات غير المحفوظة؟")) {
      setValues(document.values);
      setSettingsDraft(settingsFor(kind, document.settings));
      setProposal(null);
      setDraftAction("");
      setReviewed(false);
    }
  };
  const languageButtons = (
    <nav
      aria-label="لغات المحتوى"
      className="flex gap-1 overflow-x-auto py-3"
    >
      {SUPPORTED_LOCALES.map((code) => (
        <button
          type="button"
          key={code}
          aria-label={LOCALES[code].nativeLabel}
          title={`${LOCALES[code].nativeLabel}${document.statuses[code].needsUpdate ? " — تحتاج تحديثًا من المصدر العربي" : ""}`}
          disabled={Boolean(busy) || uploads > 0}
          onClick={() => {
            setLocale(code);
            setReviewed(false);
          }}
          aria-pressed={locale === code}
          className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${locale === code ? "bg-brand font-semibold text-white" : "text-slate-500 hover:bg-slate-100"}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${document.statuses[code].needsUpdate ? "bg-orange-600" : document.statuses[code].reviewed ? "bg-emerald-600" : document.statuses[code].complete ? "bg-amber-500" : "bg-slate-300"}`}
          />
          {LOCALES[code].nativeLabel}
        </button>
      ))}
    </nav>
  );
  const renderField = (field: ContentField) => {
    const Control = /(?:^|\.)(?:name|title|subtitle|preTitle|imageAlt|cta\w*|seoTitle|metaTitle|seoKeyword)$/.test(field.key) ? "input" : "textarea";
    return (
    <section
      key={field.key}
      className="space-y-2 rounded-xl border bg-white p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={`content-${locale}-${field.key}`}
          className="font-semibold text-sm"
        >
          {field.label}
        </label>
        {!field.locked && selectFields ? (
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={selected.includes(field.key)}
              onChange={(e) =>
                setSelected((prev) =>
                  e.target.checked
                    ? [...prev, field.key]
                    : prev.filter((k) => k !== field.key),
                )
              }
            />
            تضمين في الاقتراح
          </label>
        ) : field.locked ? (
          <span className="text-xs text-slate-500">مراجعة يدوية</span>
        ) : null}
      </div>
      {field.key === "image" ? (
        <ImageUploadField label={field.label} value={current.image || ""} onChange={(url) => edit("image", url)} onUploadingChange={onUploadingChange} />
      ) : field.rich ? (
        <div
          id={`content-${locale}-${field.key}`}
          aria-label={field.label}
          dir={LOCALES[locale as keyof typeof LOCALES]?.direction || "ltr"}
        >
          <RichEditor
            key={`${locale}-${field.key}`}
            isEditable={busy !== "save" && busy !== "slug"}
            defaultValue={parseRich(current[field.key] || "")}
            className="min-h-48 rounded-lg border bg-white p-3"
            onUpdate={(editor) => {
              if (editor) edit(field.key, JSON.stringify(editor.getJSON()));
            }}
          />
        </div>
      ) : (
        <Control
          id={`content-${locale}-${field.key}`}
          className={`${Control === "input" ? "h-12" : "min-h-28"} w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10`}
          dir={LOCALES[locale as keyof typeof LOCALES]?.direction || "ltr"}
          disabled={busy === "save" || busy === "slug"}
          value={current[field.key] || ""}
          onChange={(e) => edit(field.key, e.target.value)}
          maxLength={
            /(?:meta|seo)Title$/.test(field.key)
              ? 70
              : /(?:meta|seo)Description$/.test(field.key)
                ? 170
                : field.key === "imageAlt"
                  ? 200
                  : 200000
          }
        />
      )}
      {locale !== "ar" && source[field.key] ? (
        <details className="text-xs text-slate-500">
          <summary>النص العربي</summary>
          <p className="whitespace-pre-wrap break-words pt-2">
            {previewText(source[field.key])}
          </p>
        </details>
      ) : null}
      {field.group === "seo" ? (
        <p dir="ltr" className="text-left text-xs text-slate-500">
          {(current[field.key] || "").length} /{" "}
          {/(?:meta|seo)Title$/.test(field.key)
            ? 70
            : /(?:meta|seo)Description$/.test(field.key)
              ? 170
              : 200}
        </p>
      ) : null}
      {status.missing.includes(field.key) ? (
        <p className="text-xs text-amber-700">
          أضف هذا الحقل لاستكمال محتوى اللغة
        </p>
      ) : null}
    </section>
  );
  };
  return (
    <div
      dir="rtl"
      className="mx-auto max-w-[1500px] space-y-6 pb-12 text-slate-800"
    >
      <div className="sticky top-0 z-20 -mx-1 rounded-2xl border border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6">
        <header className="flex flex-col gap-3 border-b border-slate-100 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 w-full flex-1">
            <Link className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand" href={`/dashboard/${kind}`}>
              <ArrowRight size={13} /> {CONFIG[kind].label}
            </Link>
            <h1 className="mt-1 truncate text-xl font-bold text-slate-900 sm:text-2xl">{document.title}</h1>
            <p aria-live="polite" className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span className={`h-1.5 w-1.5 rounded-full ${dirty ? "bg-amber-500" : "bg-emerald-500"}`} />
              {dirty ? "تعديلات غير محفوظة" : "جميع التغييرات محفوظة"}
              {reviewed ? " · مراجعة اللغة جاهزة للحفظ" : ""}
            </p>
          </div>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <button type="button" className={button + " flex items-center gap-2 border-slate-200 bg-white"} onClick={() => setPreviewOpen(true)}>
              <Eye size={16} /> <span className="hidden sm:inline">معاينة</span>
              <span className="sr-only sm:hidden">معاينة الصفحة</span>
            </button>
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild><button type="button" aria-label="المزيد من الإجراءات" className={button + " bg-white px-2.5"}><MoreHorizontal size={18} /></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuItem disabled={Boolean(busy) || dirty} onSelect={loadHistory}>النسخ السابقة والاسترجاع</DropdownMenuItem>
                <DropdownMenuItem disabled={!dirty || Boolean(busy) || uploads > 0} onSelect={resetDraft}>إلغاء التعديلات غير المحفوظة</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={Boolean(busy) || uploads > 0} onSelect={() => { if (!dirty || window.confirm("تحميل النسخة المحفوظة وإلغاء تعديلات المسودة؟")) void initialLoad(); }}>تحميل النسخة المحفوظة</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button type="button" className={button + " flex items-center gap-2 border-brand bg-brand text-white hover:bg-brand-dark"} disabled={Boolean(busy) || uploads > 0 || (!dirty && !reviewed)} onClick={save}>
              <Save size={16} />{uploads ? "جار رفع الصور…" : busy === "save" ? "جار الحفظ…" : "حفظ التغييرات"}
            </button>
          </div>
        </header>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">{languageButtons}</div>
          <button type="button" aria-label="إدارة الترجمات" title={`${done} من 7 ترجمات مكتملة`} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-brand hover:bg-brand/5" onClick={() => setLanguageReview(true)}>
            <Globe2 size={15} /> <span className="hidden md:inline">إدارة الترجمات</span> <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{done}/7</span>
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-sm text-slate-500">{locale === "ar" ? "أنت تعدّل المصدر العربي. احفظ النص وراجعه قبل ترجمته." : `أنت تعدّل النسخة ${LOCALES[locale as keyof typeof LOCALES]?.nativeLabel}. تُترجم من المصدر العربي المعتمد.`}</p>
        <div className="flex flex-wrap gap-2">
          {locale !== "ar" ? <button type="button" className={button + " inline-flex items-center gap-2 bg-white text-brand"} disabled={Boolean(busy) || dirty || !document.workflow.arabicApproved} onClick={() => suggest("translate")}><Globe2 size={15} /> ترجمة من العربية</button> : null}
          <button type="button" aria-expanded={toolsOpen} aria-controls="content-tools" className={button + " inline-flex items-center gap-2 bg-white"} onClick={() => setToolsOpen(!toolsOpen)}><Sparkles size={15} /> أدوات تحسين النص <ChevronDown size={14} className={toolsOpen ? "rotate-180" : ""} /></button>
        </div>
      </div>
      {locale !== "ar" && (dirty || !document.workflow.arabicApproved) ? <p className="px-1 text-xs text-amber-700">{dirty ? "احفظ التعديلات أولًا لتتمكن من طلب الترجمة." : "اعتمد المصدر العربي أولًا من أدوات تحسين النص أو من إدارة الترجمات."}</p> : null}
      {toolsOpen ? <div id="content-tools" data-content-editor="unified" className="rounded-2xl border border-slate-200 bg-white p-5">
        <EditorialWorkflow locale={locale} approved={document.workflow.arabicApproved} needsUpdate={document.statuses[locale].needsUpdate} sourceKnown={document.statuses[locale].sourceKnown} busy={Boolean(busy)} dirty={dirty} lastAction={document.workflow.lastActions[locale]} onAction={suggest} onApprove={approveSource} onArabic={() => { if (!dirty) { setLocale("ar"); setReviewed(false); } else setMessage("احفظ مسودتك أولًا قبل تغيير اللغة"); }} onHistory={loadHistory} />
        <label className="mt-4 flex items-center gap-2 border-t pt-4 text-xs text-slate-500"><input type="checkbox" checked={selectFields} onChange={e => { setSelectFields(e.target.checked); if (!e.target.checked) setSelected(document.fields.filter(f => !f.locked).map(f => f.key)); }} /> تحديد حقول معينة للاقتراحات بدل كل النص</label>
      </div> : null}
      {history ? <EditorModal title="النسخ السابقة والاسترجاع" onClose={() => setHistory(null)}><div className="space-y-3"><p className="text-sm">تُحفظ نسخة قبل تغيير النصوص. اختر نسخة لمقارنة النصوص قبل استرجاعها وحفظها.</p>{history.length ? history.map(entry => <button type="button" disabled={Boolean(busy)} key={entry.id} onClick={() => previewHistory(entry.id)} className="block w-full rounded border p-3 text-right">معاينة نسخة {new Date(entry.createdAt).toLocaleString("ar", { timeZone: "Europe/Istanbul" })}</button>) : <p>لا توجد نسخ سابقة بعد. يبدأ السجل مع أول حفظ للنص بعد هذا التحديث.</p>}</div></EditorModal> : null}
      {busy && busy !== "save" ? <p role="status" className="rounded-xl border border-brand/20 bg-brand/5 p-3 text-sm text-brand">جار إعداد {busy === "seo" ? "اقتراحات البحث" : busy === "approve" ? "اعتماد المصدر" : busy === "history" ? "النسخ السابقة" : EDITORIAL_LABELS[busy as EditorialAction] || "الترجمة"}…</p> : null}
      {message ? (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"
        >
          {message}
        </p>
      ) : null}
      {proposal ? (
        <section className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
          <div className="flex justify-between">
            <h2 className="font-bold">مراجعة الاقتراحات</h2>
            <button
              type="button"
              className={button}
              onClick={() => setProposal(null)}
            >
              إغلاق
            </button>
          </div>
          {Object.entries(proposal.errors).map(([code, error]) => (
            <p role="alert" key={code}>
              {code}: {error}
            </p>
          ))}
          {Object.entries(proposal.proposals).map(([code, item]) => (
            <div key={code} className="space-y-3">
              <h3 className="font-semibold">
                {LOCALES[code as keyof typeof LOCALES]?.nativeLabel || code}
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={button}
                  onClick={() => {
                    for (const [key, value] of Object.entries(item.values))
                      if (!hasText(values[code]?.[key]))
                        apply(code, key, value);
                  }}
                >
                  ملء الحقول الفارغة في المسودة
                </button>
                <button
                  type="button"
                  className={button}
                  onClick={() => {
                    if (
                      window.confirm(
                        "استبدال حقول هذه اللغة بالاقتراحات المعروضة في المسودة؟",
                      )
                    )
                      for (const [key, value] of Object.entries(item.values))
                        apply(code, key, value);
                  }}
                >
                  استخدام اقتراحات هذه اللغة
                </button>
              </div>
              {item.warnings.map((warning, i) => (
                <p key={i} className="text-amber-800 text-sm">
                  {warning}
                </p>
              ))}
              {Object.entries(item.values).map(([key, value]) => (
                <article key={key} className="rounded-lg border bg-white p-3">
                  <b className="text-sm">
                    {document.fields.find((f) => f.key === key)?.label || key}
                  </b>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    <div className="whitespace-pre-wrap break-words text-sm text-slate-500">
                      {previewText(values[code]?.[key] || "فارغ")}
                    </div>
                    <div
                      dir="auto"
                      className="whitespace-pre-wrap break-words text-sm"
                    >
                      {previewText(value)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={button + " mt-3"}
                    onClick={() => apply(code, key, value)}
                  >
                    استخدام في المسودة
                  </button>
                </article>
              ))}
            </div>
          ))}
        </section>
      ) : null}
      <div
        inert={busy === "save" || busy === "slug" || busy === "approve" || busy === "history"}
        className="grid items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)]"
      >
        <nav
          aria-label="أقسام المحرر"
          className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 lg:sticky lg:top-44 lg:flex-col lg:overflow-visible"
        >
          {EDITOR_SECTIONS[kind].map((item) => {
            const Icon = sectionIcons[item.icon as keyof typeof sectionIcons];
            return (
              <button
                key={item.id}
                type="button"
                aria-current={section === item.id ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-4 text-start text-sm ${section === item.id ? "bg-brand/5 font-bold text-brand" : "text-slate-500 hover:bg-slate-50"}`}
                onClick={() => setSection(item.id)}
              >
                <Icon size={17} />
                <span className="flex-1">{item.label}</span>
              </button>
            );
          })}

        </nav>
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-lg font-bold">{EDITOR_SECTIONS[kind].find(s => s.id === section)?.label}</h2><p className="mt-1 text-xs text-slate-500">{section === "content" ? "ابدأ بالعنوان والمحتوى، ثم أضف الصور واضبط الخيارات من الأقسام الجانبية." : section === "seo" ? "اضبط عنوان الصفحة ووصفها كما يظهران في نتائج البحث والمشاركة." : section === "media" ? "أضف الوسائط التي تدعم المحتوى، وراجع معاينتها قبل الحفظ." : "تُحفظ تعديلات هذا القسم مع بقية الأقسام من زر الحفظ في الأعلى."}</p></div>
            {section === "seo" || (isBanner && section === "media") ? <button type="button" className={button + " inline-flex items-center gap-2 bg-white text-brand"} disabled={Boolean(busy) || dirty || (locale !== "ar" && !document.workflow.arabicApproved)} onClick={() => suggest("seo")}><Sparkles size={15} /> {isBanner ? "اقتراح وصف الصورة" : "اقتراح SEO"}</button> : null}
          </div>
          {catalogError ? (
            <p role="alert" className="text-sm text-red-700">
              {catalogError}
            </p>
          ) : null}
          {(kind === "super-categories" || kind === "urgent-banners") && section === "content" ? (
            <ProtectedSettings kind={kind} slug={document.slug} settings={settingsDraft} saved={document.settings} onChange={setSetting} />
          ) : null}
          {["content", "page", "layout", "links", "media"].includes(section) ? (
            <>
              {document.fields
                .filter((f) => {
                  if (f.key === "image") return section === "media" && locale !== "ar";
                  if (section === "media")
                    return f.key === "imageAlt" || f.key === "videoUrl";
                  if (f.group !== "content" || f.key === "videoUrl")
                    return false;
                  if (section === "layout")
                    return (
                      f.key.startsWith("blocks.") &&
                      Array.isArray(settingsDraft.blocks) &&
                      settingsDraft.blocks.some((b: ContentRecord) =>
                        f.key.startsWith(`blocks.${b.id}.`),
                      )
                    );
                  if (section === "links")
                    return kind === "urgent-banners" && f.key.startsWith("cta");
                  if (section === "page")
                    return (
                      kind === "categories" &&
                      !["name", "description"].includes(f.key)
                    );
                  if (kind === "urgent-banners")
                    return !f.key.startsWith("cta") && f.key !== "amountLabels";
                  if (kind === "categories")
                    return ["name", "description"].includes(f.key);
                  return !f.key.startsWith("blocks.");
                })
                .map(renderField)}
              {kind === "urgent-banners" && section === "media"
                ? document.fields
                  .filter((f) => f.key === "amountLabels")
                  .map(renderField)
                : null}
            </>
          ) : null}
          <WorkspaceSettings
            onUploadingChange={onUploadingChange}
            kind={kind}
            section={section}
            settings={{ ...settingsDraft, id }}
            onChange={setSetting}
            catalog={catalog}
          />
          {kind === "super-categories" ? (
            <ProgrammeWorkspace
              section={section}
              settings={settingsDraft}
              onChange={setSetting}
              catalog={catalog}
              locale={locale}
            />
          ) : null}
          {kind === "categories" && section === "library" ? (
            <section className="space-y-4 rounded-xl border bg-white p-5">
              <h3 className="font-bold">المشاريع المرتبطة بهذا التصنيف</h3>
              <button
                type="button"
                className={button}
                disabled={dirty}
                onClick={() => setCategoryOrderOpen(true)}
              >
                ترتيب المشاريع داخل التصنيف
              </button>
              <p className="text-xs text-slate-500">
                ترتيب التصنيف مستقل عن الترتيب العام؛ يُحفظ من نافذة الترتيب
                نفسها.
              </p>
              <p className="text-sm text-slate-500">
                تعديل عضوية المشروع متاح من محرر المشروع، دون حذف بيانات
                التبرعات.
              </p>
              {catalog.campaigns
                .filter((c) => c.categoryIds?.includes(id))
                .sort((a, b) => (a.priority || 0) - (b.priority || 0))
                .map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/campaigns/edit/${c.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <span>{c.title}</span>
                    <span className="text-brand">تحرير المشروع ←</span>
                  </Link>
                ))}
            </section>
          ) : null}
          {section === "seo" ? (
            <SeoWorkspace
              onUploadingChange={onUploadingChange}
              values={current}
              fields={document.fields}
              renderField={renderField}
              onChange={edit}
              locale={locale}
            />
          ) : null}
          {kind === "campaigns" && section === "donation" ? <CampaignAdvancedSettings key={document.revision} settings={settingsDraft} saved={document.settings} onChange={setSetting} /> : null}
          {kind === "campaigns" && section === "history" ? <CampaignAchievements value={settingsDraft.campaignUpdates} locale={locale} onChange={(value) => setSetting("campaignUpdates", value)} onUploadingChange={onUploadingChange} uploading={uploads > 0} /> : null}
          {section === "review" ? (
            <section className="space-y-4 rounded-xl border bg-white p-5">
              <h3 className="font-bold">المراجعة قبل النشر</h3>
              {document.fields
                .filter((f) => f.required)
                .map((f) => (
                  <p key={f.key} className="flex justify-between border-b pb-3">
                    <span>{f.label}</span>
                    <span
                      className={
                        current[f.key] ? "text-emerald-700" : "text-amber-700"
                      }
                    >
                      {current[f.key] ? "موجود" : "ناقص"}
                    </span>
                  </p>
                ))}
              <button
                type="button"
                className={button}
                onClick={() => setLanguageReview(true)}
              >
                مراجعة جميع اللغات
              </button>
              <button
                type="button"
                className={button}
                onClick={() => setPreviewOpen(true)}
              >
                معاينة قبل الحفظ
              </button>
            </section>
          ) : null}
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs text-slate-500">{status.complete ? "نصوص اللغة مكتملة" : `متبقٍ ${status.missing.length} من الحقول المطلوبة`} · {status.seoComplete ? "إعدادات البحث مكتملة" : "إعدادات البحث تحتاج استكمالًا"}</p>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={reviewed} disabled={Boolean(busy)} onChange={e => setReviewed(e.target.checked)} /> راجعت نص هذه اللغة</label>
          </section>
          {kind === "categories" && section === "links" ? (
            <section className="space-y-3 rounded-xl border bg-white p-4">
              <h3 className="font-semibold">الرابط وسجل التغييرات</h3>
              <p dir="ltr" className="break-all text-sm">
                /{locale}/category/{document.slugs[locale]}
              </p>
              <button
                type="button"
                className={button}
                disabled={Boolean(busy) || dirty}
                onClick={() => {
                  setSlug(document.slugs[locale]);
                  setConfirmation("");
                  setSlugOpen(true);
                }}
              >
                تعديل الرابط
              </button>
              {document.previousSlugs
                .filter((entry) => (entry.locale || "ar") === locale)
                .map((entry, i) => (
                  <div className="rounded-lg border p-2 text-xs" key={i}>
                    <p dir="ltr">
                      {String(entry.from)} → {String(entry.to)}
                    </p>
                    <p>{String(entry.at)}</p>
                    <button
                      type="button"
                      className={button}
                      onClick={() => {
                        setSlug(String(entry.from));
                        setConfirmation("");
                        setSlugOpen(true);
                      }}
                    >
                      استعادة الرابط السابق
                    </button>
                  </div>
                ))}
            </section>
          ) : null}
        </div>

      </div>
      {languageReview ? (
        <EditorModal
          title="اللغات والمراجعة"
          onClose={() => setLanguageReview(false)}
        >
          <section className="max-h-[85vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="language-review-heading" className="text-xl font-bold">
                اللغات والمراجعة
              </h2>
              <button
                type="button"
                className={button}
                onClick={() => setLanguageReview(false)}
              >
                إغلاق
              </button>
            </div>
            <div className="mb-5 space-y-3 rounded-xl border bg-slate-50 p-4">
              <h3 className="font-semibold">ترجم من العربية إلى بقية اللغات</h3>
              <p className="text-sm text-slate-500">{dirty ? "احفظ تعديلاتك أولًا، ثم استكمل الترجمة." : !document.workflow.arabicApproved ? "المصدر العربي يحتاج اعتمادًا قبل الترجمة. راجعه في أدوات تحسين النص." : "المصدر العربي معتمد. يمكنك استكمال الترجمات الناقصة أو تعديل أي لغة من الجدول."}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={button + " border-brand bg-brand text-white hover:bg-brand-dark"} disabled={Boolean(busy) || dirty || !document.workflow.arabicApproved} onClick={() => { setLanguageReview(false); void suggest("translate", true); }}>استكمال الترجمات الناقصة</button>
                {!document.workflow.arabicApproved ? <button type="button" className={button + " bg-white"} disabled={Boolean(busy)} onClick={() => { setLocale("ar"); setReviewed(false); setToolsOpen(true); setLanguageReview(false); }}>مراجعة واعتماد العربية</button> : null}
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-start">
                  <th className="p-3 text-start">اللغة</th>
                  <th>المحتوى</th>
                  <th>البحث والمشاركة</th>
                  <th>المراجعة</th>
                  <th>التعديل</th>
                </tr>
              </thead>
              <tbody>
                {SUPPORTED_LOCALES.map((code) => {
                  const s = document.statuses[code];
                  return (
                    <tr key={code} className="border-b">
                      <td className="p-3">{LOCALES[code].nativeLabel}</td>
                      <td className="text-center">
                        {s.complete ? "مكتمل" : "ناقص"}
                      </td>
                      <td className="text-center">
                        {s.seoComplete ? "متاح" : "غير مكتمل"}
                      </td>
                      <td className="text-center">
                        {s.reviewed ? "مراجع" : "مسودة"}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="p-2 text-brand"
                          onClick={() => {
                            setLocale(code);
                            setReviewed(false);
                            setSection("content");
                            setLanguageReview(false);
                          }}
                        >
                          النص
                        </button>
                        {!isBanner ? (
                          <button
                            type="button"
                            className="p-2 text-brand"
                            onClick={() => {
                              setLocale(code);
                              setReviewed(false);
                              setSection("seo");
                              setLanguageReview(false);
                            }}
                          >
                            SEO
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </EditorModal>
      ) : null}
      {previewOpen ? (
        <EditorModal
          title="معاينة الصفحة"
          onClose={() => setPreviewOpen(false)}
        >
          <section className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-slate-50 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="content-preview-heading" className="text-xl font-bold">
                معاينة الصفحة
              </h2>
              <button
                type="button"
                className={button}
                onClick={() => setPreviewOpen(false)}
              >
                إغلاق
              </button>
            </div>
            <WorkspacePreview
              kind={kind}
              values={current}
              source={source}
              settings={liveSettings}
              locale={locale}
              expanded
            />
          </section>
        </EditorModal>
      ) : null}
      {categoryOrderOpen && kind === "categories" ? (
        <CategoryOrderDialog
          open
          onOpenChange={setCategoryOrderOpen}
          categoryId={id}
          categoryName={document.title}
        />
      ) : null}
      {slugOpen ? (
        <EditorModal
          title="مراجعة تغيير الرابط"
          onClose={() => setSlugOpen(false)}
        >
          <div className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6">
            <h2 id="slug-heading" className="text-xl font-bold">
              مراجعة تغيير الرابط
            </h2>
            <p className="text-sm">
              الرابط الحالي: <span dir="ltr">{document.slugs[locale]}</span>.
              ستبقى الروابط السابقة محوّلة مباشرة إلى الرابط المعتمد.
            </p>
            <label className="block space-y-2">
              <span>الرابط الجديد</span>
              <input
                autoFocus
                dir="ltr"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setConfirmation("");
                }}
                className="w-full rounded border p-2"
              />
            </label>
            <label className="block space-y-2">
              <span>اكتب الرابط الجديد مرة أخرى للتأكيد</span>
              <input
                dir="ltr"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="w-full rounded border p-2"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={button}
                disabled={Boolean(busy) || !slug || slug !== confirmation}
                onClick={changeSlug}
              >
                حفظ الرابط
              </button>
              <button
                type="button"
                className={button}
                onClick={() => setSlugOpen(false)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </EditorModal>
      ) : null}
    </div>
  );
}
