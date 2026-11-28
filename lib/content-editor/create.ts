import { randomUUID } from "node:crypto";
import { CONFIG, fieldsFor, hasText, validateChanges, type ContentKind, type ContentRecord } from "./contracts";
import { ContentError, documentFor, fingerprint, readContent, saveWorkspace, type Store } from "./service";
import { validateWorkspaceSettings } from "./workspace-settings";
import { parseCampaignCreatePayload, CampaignCreateValidationError } from "../campaign/admin-create-core";
import { generateUniqueSlug } from "../slug";
import { SUPPORTED_LOCALES } from "../locales";

/*
 * Gozbebekleri keeps its own content editor (workflow, revisions); these helpers stand in for the newer
 * service functions Minber's create path uses. Excluded kinds (videos, playlists, courses, reports,
 * booklets) and FAQs (created with their own form) are not created here.
 */
const titleKeyFor = (kind: ContentKind): string => (kind === "categories" ? "name" : "title");
const slugNamespace = (kind: ContentKind) => (["campaigns", "super-categories"].includes(kind) ? "projects" : kind);
async function generateEditorialSlug(db: Store, kind: ContentKind, title: string, id: string): Promise<string> {
  return generateUniqueSlug({
    findFirst: async (args: { where: { slug: string } }) => {
      const found = await db.model(CONFIG[kind].model).findFirst({ where: { ...args.where, id: { not: id } }, select: { id: true } });
      if (found) return { id: String(found.id) };
      const reservation = await db.model("contentRouteReservation").findUnique({ where: { id: slugNamespace(kind) + ":" + args.where.slug } });
      return reservation && (reservation.kind !== kind || reservation.contentId !== id) ? { id: String(reservation.contentId) } : null;
    },
  }, title, { fallbackPrefix: "content" });
}
async function reserveEditorialSlug(db: Store, kind: ContentKind, slug: string, contentId: string) {
  const rid = slugNamespace(kind) + ":" + slug, model = db.model("contentRouteReservation");
  const current = await model.findUnique({ where: { id: rid } });
  if (current && (current.kind !== kind || current.contentId !== contentId)) throw new ContentError("هذا الرابط محفوظ لمحتوى آخر", 409);
  if (!current) await model.create({ data: { id: rid, kind, contentId } });
}


export function emptyWorkspace(kind: ContentKind): ContentRecord {
  const shared = { id: "new", translations: [], editorReviews: {}, isActive: false, order: 0 };
  const defaults: Record<ContentKind, ContentRecord> = {
    campaigns: { title: "", description: "", images: [], categoryIds: [], goalType: "OPEN", fundraisingMode: "AMOUNT", targetAmount: 0, currentAmount: 0, baselineAmount: 0, updates: [] },
    categories: { name: "", campaignIds: [], currentAmount: 0, baselineAmount: 0, navigationVisible: true, pageTemplate: null, suggestedByCurrency: {}, heroImage: "", heroVideoUrl: "", statDoneValue: 0, statGoalValue: 0, donateToCategory: false, donateCampaignId: null, suggestedAmounts: [], achievementVideoIds: [], values: [], infoCards: [] },
    blog: { title: "", content: "", description: "", campaignIds: [], published: false },
    "super-categories": { title: "", heroVideoLocales: [], blocks: [], items: [] },
    "urgent-banners": { title: "", tone: "red", textSide: "start", priority: 0, locales: [], placements: [], suggestedAmounts: [], amountLabels: [] },
  };
  return { ...shared, ...defaults[kind] };
}

export async function createWorkspace(db: Store, input: {
  kind: ContentKind; creationKey: string; locale: string; changes: unknown; localeChanges?: Record<string, unknown>; settings?: unknown;
}) {
  if (!/^[a-f0-9-]{36}$/i.test(input.creationKey)) throw new ContentError("أعد فتح نموذج الإنشاء");
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(input.locale) || Object.keys(input.localeChanges || {}).some((locale) => !(SUPPORTED_LOCALES as readonly string[]).includes(locale))) throw new ContentError("لغات غير صالحة");
  const requestFingerprint = fingerprint(input);
  return db.transaction(async (tx) => {
    const previous = await tx.model("contentCreationRequest").findUnique({ where: { id: input.creationKey } });
    if (previous) {
      if (previous.kind !== input.kind || previous.fingerprint !== requestFingerprint)
        throw new ContentError("تم إنشاء المحتوى سابقًا. افتحه قبل متابعة التعديل: /dashboard/content/" + previous.kind + "/" + previous.contentId, 409);
      return documentFor(input.kind, await readContent(tx, input.kind, String(previous.contentId)));
    }
    const kind = input.kind, cfg = CONFIG[kind], blank = emptyWorkspace(kind);
    const drafts = { ...input.localeChanges, [input.locale]: input.changes };
    const source = validateChanges(fieldsFor(kind, blank), drafts.ar || {});
    for (const field of cfg.fields.filter((field) => field.required))
      if (!hasText(source[field.key])) throw new ContentError("أكمل المحتوى العربي المطلوب: " + field.label);
    const settings = validateWorkspaceSettings(kind, blank, input.settings);
    // Arabic Campaign has a gallery; `image` is only a translated cover override.
    if (kind === "campaigns") {
      if (source.image) throw new ContentError("عدّل الغلاف الافتراضي من صور المشروع");
      delete source.image;
    }
    const data: ContentRecord = { ...blank, ...source, ...settings, editorVersion: randomUUID() };
    for (const key of ["id", "translations", "updates", "blocks", "items", "videos", "values", "infoCards"]) delete data[key];
    if (["blog", "reports", "booklets"].includes(kind)) delete data.isActive;
    if (["campaigns", "blog", "urgent-banners"].includes(kind)) delete data.order;
    if ("amountLabels" in data) data.amountLabels = String(data.amountLabels || "").split("\n").filter(Boolean);
    const titleKey = titleKeyFor(kind);
    const slug = ["campaigns", "categories", "blog", "super-categories"].includes(kind)
      ? await generateEditorialSlug(tx, kind, String(data[titleKey]), "000000000000000000000000")
      : await generateUniqueSlug({ findFirst: async (args) => { const found = await tx.model(cfg.model).findFirst(args); return found ? { id: String(found.id) } : null; } }, String(data[titleKey]));
    if (slug) data.slug = slug;
    if (kind === "campaigns") {
      const relation = settings.categories as { set: { id: string }[] } | undefined;
      const categoryIds = relation?.set.map((entry) => entry.id) || [];
      let parsed: ReturnType<typeof parseCampaignCreatePayload>;
      try { parsed = parseCampaignCreatePayload({ ...data, categoryIds, currentAmount: 0 }, {
        categoryPriorities: null, suggestedDonations: data.suggestedDonations || null,
        suggestedTeamSupport: null, suggestedShareCounts: data.suggestedShareCounts || null, shareLabels: null,
      }); } catch (error) {
        if (error instanceof CampaignCreateValidationError) {
          const labels: Record<string, string> = { images: "صور المشروع", categoryIds: "التصنيفات", targetAmount: "الهدف بالدولار", sharePriceUSD: "سعر السهم بالدولار", translations: "الترجمات", title: "العنوان", description: "المحتوى" };
          throw new ContentError("راجع بيانات المشروع المطلوبة: " + (labels[(error.field || "").split(".")[0]] || "المعلومات الأساسية"));
        }
        throw error;
      }
      const found = await tx.model("category").findMany({ where: { id: { in: parsed.categoryIds } } });
      if (found.length !== parsed.categoryIds.length || found.some((row) => row.isActive === false)) throw new ContentError("اختر تصنيفات نشطة موجودة");
      delete data.categoryIds;
      data.categories = { connect: parsed.categoryIds.map((id) => ({ id })) };
      data.currentAmount = 0; data.baselineAmount = 0;
    }
    if (["reports", "booklets"].includes(kind) && !hasText(data.fileUrl)) throw new ContentError("أضف ملف PDF أو رابطه قبل الإنشاء");
    if (kind === "urgent-banners" && (!Array.isArray(data.placements) || !data.placements.length)) throw new ContentError("اختر مكانًا واحدًا على الأقل يظهر فيه البانر");
    const created = await tx.model(cfg.model).create({ data });
    const id = String(created.id);
    if (slug && ["campaigns", "categories", "blog", "super-categories"].includes(kind)) await reserveEditorialSlug(tx, kind, slug, id);
    const row = await readContent(tx, kind, id);
    const saved = await saveWorkspace(tx, {
      kind, id, revision: fingerprint(row), locale: input.locale, changes: input.locale === "ar" ? source : input.changes,
      localeChanges: { ...input.localeChanges, ar: source },
      ...(["super-categories", "categories"].includes(kind) ? { settings: input.settings } : {}),
    });
    await tx.model("contentCreationRequest").create({ data: { id: input.creationKey, kind, contentId: id, fingerprint: requestFingerprint } });
    return saved;
  });
}

