import type { Store } from "./service";
import type { ContentRecord } from "./contracts";
import { rows } from "./contracts";
import { setCampaignDisplayTotal } from "../campaign/current-amount";
import { validateCampaignUpdates, validateFinancialAdjustment, validateReligiousAdjustment, validateSlugAdjustment } from "./advanced-settings";
export async function saveCampaignAdvanced(db: Store, id: string, row: ContentRecord, settings: ContentRecord) {
  if ("campaignUpdates" in settings) {
    const old = rows(row.updates), updates = validateCampaignUpdates(settings.campaignUpdates, old);
    const kept = updates.flatMap(u => typeof u.id === "string" ? [u.id] : []);
    const removed = old.filter(u => !kept.includes(String(u.id)));
    if (removed.length) {
      await db.model("updateTranslation").deleteMany!({ where: { updateId: { in: removed.map(u => u.id) } } });
      await db.model("update").deleteMany!({ where: { campaignId: id, id: { in: removed.map(u => u.id) } } });
    }
    for (const update of updates) {
      const { id: updateId, translations, ...data } = update;
      const saved = updateId
        ? await db.model("update").update({ where: { id: updateId, campaignId: id }, data })
        : await db.model("update").create({ data: { ...data, campaignId: id } });
      for (const translation of rows(translations)) {
        const { locale, ...text } = translation;
        await db.model("updateTranslation").upsert({
          where: { updateId_locale: { updateId: saved.id, locale } },
          create: { updateId: saved.id, locale, ...text }, update: text,
        });
      }
    }
  }
  if ("financialAdjustment" in settings) {
    const desired = validateFinancialAdjustment(settings.financialAdjustment);
    await setCampaignDisplayTotal({ campaign: db.model("campaign"), donationItem: db.model("donationItem") } as unknown as Parameters<typeof setCampaignDisplayTotal>[0], id, desired);
  }
}
export async function saveReligiousAdjustment(db: Store, id: string, settings: ContentRecord) {
  if ("religiousTextAdjustment" in settings) await db.model("superCategory").update({ where: { id }, data: { verseArabic: validateReligiousAdjustment(settings.religiousTextAdjustment) } });
}
export async function saveSlugAdjustment(db: Store, model: string, id: string, settings: ContentRecord) {
  if (!("slugAdjustment" in settings)) return;
  const slug = validateSlugAdjustment(settings.slugAdjustment);
  const existing = await db.model(model).findFirst({ where: { slug, NOT: { id } }, select: { id: true } });
  if (existing) throw new Error("هذا الرابط مستخدم بالفعل");
  await db.model(model).update({ where: { id }, data: { slug } });
}
