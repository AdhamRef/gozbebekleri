import type { TReaderDocument } from "@usewaypoint/email-builder";
import { mergeDocument, mergeText, type TemplateContext } from "./variables";

/**
 * Lazy-loaded so `@usewaypoint/email-builder` (which runs React.createContext
 * at module init) only executes at request time. Importing it at module scope
 * breaks Next 16's "Collect page data" step under React 19.
 */
async function getRenderer() {
  const mod = await import("@usewaypoint/email-builder");
  return mod.renderToStaticMarkup;
}

export async function renderEmailHtml(
  document: TReaderDocument,
  ctx: TemplateContext
): Promise<string> {
  const renderToStaticMarkup = await getRenderer();
  const merged = mergeDocument(document, ctx);
  return renderToStaticMarkup(merged, { rootBlockId: "root" });
}

export function renderEmailSubject(subject: string, ctx: TemplateContext): string {
  return mergeText(subject, ctx);
}
