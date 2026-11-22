/**
 * Dashboard category / campaign filters that take several values ("a,b" means any of them), ported from
 * Minber #282. One value gives exactly the condition the charity's APIs built before; "all" or empty is no filter.
 */
export function filterIdList(raw: string | null | undefined): string[] {
  return [...new Set(String(raw ?? "").split(",").map((v) => v.trim()).filter((v) => v && v !== "all"))];
}

/** `campaignId` value for a where clause: the id itself for one value, `{ in }` for several, null for none. */
export function campaignIdCondition(raw: string | null | undefined): string | { in: string[] } | null {
  const ids = filterIdList(raw);
  return ids.length === 0 ? null : ids.length === 1 ? ids[0] : { in: ids };
}

/** Donation where: has an item for one of the campaigns. */
export function donationCampaignWhere(raw: string | null | undefined): { items: { some: { campaignId: string | { in: string[] } } } } | null {
  const c = campaignIdCondition(raw);
  return c === null ? null : { items: { some: { campaignId: c } } };
}

/** Campaign where (on a campaign relation): belongs to one of the categories. */
export function campaignInCategoriesWhere(raw: string | null | undefined): { categoryIds: { has: string } | { hasSome: string[] } } | null {
  const ids = filterIdList(raw);
  return ids.length === 0 ? null : { categoryIds: ids.length === 1 ? { has: ids[0] } : { hasSome: ids } };
}

/** Donation where OR-list: a campaign item in one of the categories, or a category item for one of them. */
export function donationCategoryOr(raw: string | null | undefined): Array<Record<string, unknown>> | null {
  const ids = filterIdList(raw);
  const campaign = campaignInCategoriesWhere(raw);
  if (!campaign) return null;
  return [
    { items: { some: { campaign } } },
    { categoryItems: { some: { categoryId: ids.length === 1 ? ids[0] : { in: ids } } } },
  ];
}

function anyOf(values: string[], one: (v: string) => Record<string, unknown>): Record<string, unknown> | null {
  const parts = values.map(one);
  return parts.length === 0 ? null : parts.length === 1 ? parts[0] : { OR: parts };
}

/** Donation site-language filter: "ar", "__unset" (no language recorded) or several of them. */
export function donationLocaleFilterWhere(raw: string | null | undefined): Record<string, unknown> | null {
  return anyOf(filterIdList(raw), (v) => (v === "__unset" ? { OR: [{ locale: null }, { locale: "" }] } : { locale: v }));
}

/** Donor country filter: "TR", "__unset" (no country recorded) or several of them. */
export function donationCountryFilterWhere(raw: string | null | undefined): Record<string, unknown> | null {
  const values = [...new Set(filterIdList(raw).map((v) => (v === "__unset" ? v : v.toUpperCase())))];
  return anyOf(values, (v) => (v === "__unset" ? { OR: [{ donorCountryCode: null }, { donorCountryCode: "" }] } : { donorCountryCode: v }));
}
