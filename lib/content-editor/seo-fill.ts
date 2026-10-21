import { fieldsFor, hasText, valuesFor, type ContentKind, type ContentRecord, type TextValues } from "./contracts";
import { SUPPORTED_LOCALES } from "../locales";

/** Extract existing editorial copy; never invent facts or use another locale's fallback. */
export function seoPlainText(raw: string): string {
  let value = raw;
  try {
    const doc = JSON.parse(raw);
    if (doc?.type === "doc") {
      const walk = (node: unknown): string => {
        if (!node || typeof node !== "object") return "";
        const n = node as {text?: string; content?: unknown[]};
        return typeof n.text === "string" ? n.text : (Array.isArray(n.content) ? n.content.map(walk).join(" ") : "");
      };
      value = walk(doc);
    }
  } catch { /* Plain text or HTML. */ }
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/[\s\u200b]+/g, " ").trim();
}
function excerpt(value: string, max: number) {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return cut.slice(0, space > max * 0.6 ? space : cut.length).trimEnd() + "…";
}
export function missingSeoChanges(kind: ContentKind, row: ContentRecord): Record<string, TextValues> {
  const fields = fieldsFor(kind, row), allowed = new Set(fields.filter(f => f.group === "seo").map(f => f.key));
  const result: Record<string, TextValues> = {};
  const source = valuesFor(kind, row, "ar");
  for (const locale of SUPPORTED_LOCALES) {
    const values = valuesFor(kind, row, locale);
    const title = seoPlainText(values[kind === "categories" ? "name" : "title"] || "");
    if (!title || (locale !== "ar" && /[\u0600-\u06ff]/.test(title) && title === seoPlainText(source[kind === "categories" ? "name" : "title"] || ""))) continue;
    const body = ["description", "heroLead", "intro", "subtitle", "content"].map(key => seoPlainText(values[key] || "")).find(Boolean) || title;
    const candidates: TextValues = {
      [kind === "campaigns" ? "seoTitle" : "metaTitle"]: excerpt(title, 70),
      [kind === "campaigns" ? "seoDescription" : "metaDescription"]: excerpt(body, 170),
      ogTitle: excerpt(title, 70), ogDescription: excerpt(body, 170), imageAlt: excerpt(title, 200),
    };
    const changes = Object.fromEntries(Object.entries(candidates).filter(([key]) => allowed.has(key) && !hasText(values[key])));
    if (Object.keys(changes).length) result[locale] = changes;
  }
  return result;
}
