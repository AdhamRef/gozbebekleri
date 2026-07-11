"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ROOT_ID = "dashboard-project-locale-slug-editor";
const TARGET_SECTION_ID = "dashboard-project-locale-links";

const LANGUAGE_LABELS: Record<string, string> = {
  ar: "العربية",
  en: "English",
  fr: "Français",
  tr: "Türkçe",
  id: "Indonesia",
  pt: "Português",
  es: "Español",
  de: "Deutsch",
};

type LocaleLink = {
  locale: string;
  slug?: string | null;
  url?: string | null;
};

type LocaleLinksResponse = {
  links?: LocaleLink[];
};

function getProjectIdFromPath(pathname: string) {
  const match = pathname.match(/\/dashboard\/campaigns\/edit\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function normalizeDraftSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{Letter}\p{Number}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function setStatus(root: HTMLElement, message: string, tone: "muted" | "ok" | "error" = "muted") {
  const status = root.querySelector("[data-slug-editor-status]") as HTMLElement | null;
  if (!status) return;
  const classes: Record<typeof tone, string> = {
    muted: "mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600",
    ok: "mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700",
    error: "mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700",
  };
  status.className = classes[tone];
  status.textContent = message;
}

function buildPayload(root: HTMLElement, links: LocaleLink[]) {
  const payload: { slug?: string; translations?: Record<string, { slug: string }> } = {};
  for (const link of links) {
    const input = root.querySelector(`[data-slug-input="${link.locale}"]`) as HTMLInputElement | null;
    if (!input) continue;
    const slug = normalizeDraftSlug(input.value);
    if (!slug) continue;
    if (link.locale === "ar") {
      payload.slug = slug;
    } else {
      payload.translations = payload.translations || {};
      payload.translations[link.locale] = { slug };
    }
  }
  return payload;
}

function renderSlugEditor(projectId: string, links: LocaleLink[], target: HTMLElement) {
  if (document.getElementById(ROOT_ID)) return;

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.dir = "rtl";
  root.className = "mt-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-4";

  const rows = links.map((link) => {
    const label = LANGUAGE_LABELS[link.locale] || link.locale;
    const slug = link.slug || "";
    return `
      <div class="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[120px_1fr_auto] md:items-end">
        <label class="text-sm font-semibold text-slate-800">${label}</label>
        <div>
          <div class="mb-1 text-xs text-slate-500">Slug</div>
          <input data-slug-input="${link.locale}" value="${slug}" dir="ltr" class="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-left text-sm text-slate-800" />
        </div>
        <button type="button" data-check-slug="${link.locale}" class="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100">فحص</button>
      </div>
    `;
  }).join("");

  root.innerHTML = `
    <div class="mb-4">
      <h3 class="text-base font-bold text-slate-900">تعديل الرابط النهائي</h3>
      <p class="mt-1 text-xs text-slate-600">غيّر slug لكل لغة، افحص التوفر، ثم احفظ الروابط فقط بدون تعديل باقي بيانات المشروع.</p>
    </div>
    <div class="grid gap-3">${rows}</div>
    <div class="mt-4 flex flex-wrap gap-2">
      <button type="button" data-save-slugs class="h-10 rounded-md bg-[#025EB8] px-4 text-sm font-semibold text-white hover:bg-[#014f9d]">حفظ الروابط</button>
      <button type="button" data-refresh-slugs class="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100">تحديث البيانات</button>
    </div>
    <div data-slug-editor-status class="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">جاهز للتعديل.</div>
  `;

  target.appendChild(root);

  root.querySelectorAll("[data-slug-input]").forEach((node) => {
    const input = node as HTMLInputElement;
    input.addEventListener("blur", () => {
      input.value = normalizeDraftSlug(input.value);
    });
  });

  root.querySelectorAll("[data-check-slug]").forEach((node) => {
    const button = node as HTMLButtonElement;
    button.addEventListener("click", async () => {
      const locale = button.getAttribute("data-check-slug") || "ar";
      const input = root.querySelector(`[data-slug-input="${locale}"]`) as HTMLInputElement | null;
      const slug = normalizeDraftSlug(input?.value || "");
      if (!slug) {
        setStatus(root, "اكتب slug أولًا.", "error");
        return;
      }
      button.disabled = true;
      button.textContent = "جار الفحص...";
      try {
        const response = await fetch(`/api/campaigns/slug/check?locale=${encodeURIComponent(locale)}&slug=${encodeURIComponent(slug)}&campaignId=${encodeURIComponent(projectId)}`, { cache: "no-store" });
        const data = await response.json();
        if (response.ok && data.available) {
          setStatus(root, `الرابط متاح للغة ${LANGUAGE_LABELS[locale] || locale}.`, "ok");
        } else {
          setStatus(root, `الرابط غير متاح للغة ${LANGUAGE_LABELS[locale] || locale}.`, "error");
        }
      } catch {
        setStatus(root, "فشل فحص الرابط. حاول مرة أخرى.", "error");
      } finally {
        button.disabled = false;
        button.textContent = "فحص";
      }
    });
  });

  const saveButton = root.querySelector("[data-save-slugs]") as HTMLButtonElement | null;
  saveButton?.addEventListener("click", async () => {
    const payload = buildPayload(root, links);
    if (!payload.slug && !payload.translations) {
      setStatus(root, "لا توجد روابط صالحة للحفظ.", "error");
      return;
    }
    saveButton.disabled = true;
    saveButton.textContent = "جار الحفظ...";
    try {
      const response = await fetch(`/api/campaigns/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Save failed");
      setStatus(root, "تم حفظ الروابط بنجاح. أعد فتح القسم أو اضغط تحديث البيانات لرؤية الروابط الجديدة.", "ok");
    } catch {
      setStatus(root, "فشل حفظ الروابط. راجع الصلاحيات أو حاول مرة أخرى.", "error");
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "حفظ الروابط";
    }
  });

  const refreshButton = root.querySelector("[data-refresh-slugs]") as HTMLButtonElement | null;
  refreshButton?.addEventListener("click", () => window.location.reload());
}

export function ProjectLocaleSlugEditor() {
  const pathname = usePathname();
  const isProjectEdit = pathname.includes("/dashboard/campaigns/edit/");
  const projectId = getProjectIdFromPath(pathname);

  useEffect(() => {
    if (!isProjectEdit || !projectId) return;

    let cancelled = false;
    let attempts = 0;

    const run = async () => {
      attempts += 1;
      const target = document.getElementById(TARGET_SECTION_ID);
      if (!target) {
        if (attempts < 10) window.setTimeout(run, 500);
        return;
      }

      try {
        const response = await fetch(`/api/campaigns/${projectId}/locale-links`, { cache: "no-store" });
        const data = (await response.json()) as LocaleLinksResponse;
        if (cancelled) return;
        const links = Array.isArray(data.links) ? data.links : [];
        if (links.length > 0) renderSlugEditor(projectId, links, target);
      } catch {
        // Keep the main editor unaffected when this helper cannot load.
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isProjectEdit, pathname, projectId]);

  return null;
}
