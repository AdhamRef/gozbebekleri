import { getMetaConfig, graphFetch } from "./client";
import { META_REASONS } from "./errors";

/**
 * Read approved message templates from the WABA. Read-only; used to reconcile which templates
 * (and languages) Meta has approved. Returns a safe reason when not configured.
 */

export type MetaTemplateSummary = {
  name: string;
  language: string;
  status: string;
  category: string | null;
};

export type ListTemplatesResult =
  | { ok: true; templates: MetaTemplateSummary[] }
  | { ok: false; reason: string; detail?: string };

export async function listApprovedTemplates(businessAccountId?: string | null): Promise<ListTemplatesResult> {
  const config = getMetaConfig();
  if (!config) return { ok: false, reason: META_REASONS.NOT_CONFIGURED };
  const waba = businessAccountId || config.businessAccountId;
  if (!waba) return { ok: false, reason: META_REASONS.NOT_CONFIGURED, detail: "missing business account id" };

  const result = await graphFetch(config, `${waba}/message_templates?fields=name,language,status,category&limit=200`, { method: "GET" });
  if (!result.ok) return { ok: false, reason: result.reason, detail: result.detail };

  const rows = ((result.data as { data?: unknown[] })?.data ?? []) as Record<string, unknown>[];
  const templates: MetaTemplateSummary[] = rows.map((r) => ({
    name: String(r.name ?? ""),
    language: String(r.language ?? ""),
    status: String(r.status ?? ""),
    category: typeof r.category === "string" ? r.category : null,
  }));
  return { ok: true, templates };
}
