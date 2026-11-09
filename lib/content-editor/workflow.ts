import { createHash } from "node:crypto";
import { fieldsFor, valuesFor, type ContentKind, type ContentRecord } from "./contracts";
export type EditorialWorkflow = { approvedArabic?: string; sources: Record<string, Record<string, string>>; lastActions: Record<string, string> };
export function workflowFor(row: ContentRecord): EditorialWorkflow {
  const raw = row.editorWorkflow && typeof row.editorWorkflow === "object" && !Array.isArray(row.editorWorkflow) ? row.editorWorkflow as Record<string, unknown> : {};
  const strings = (value: unknown): Record<string, string> => value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v === "string")) : {};
  const sources = raw.sources && typeof raw.sources === "object" && !Array.isArray(raw.sources) ? Object.fromEntries(Object.entries(raw.sources).map(([locale, value]) => [locale, strings(value)])) : {};
  return { approvedArabic: typeof raw.approvedArabic === "string" ? raw.approvedArabic : undefined, sources, lastActions: strings(raw.lastActions) };
}
export function arabicSourceFingerprint(kind: ContentKind, row: ContentRecord): string {
  const values = valuesFor(kind, row, "ar");
  const fields = fieldsFor(kind, row).filter(f => !f.locked && !["image", "ogImage", "seoNoIndex", "videoUrl"].includes(f.key)).map(f => f.key).sort();
  return createHash("sha256").update(JSON.stringify([...fields.map(key => [key, values[key] || ""]), ["verseArabic", row.verseArabic || ""]])).digest("hex");
}
