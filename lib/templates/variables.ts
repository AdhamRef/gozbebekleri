import { prisma } from "@/lib/prisma";

/** ---------------- types ---------------- */

export interface TemplateUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  countryName: string;
  countryCode: string;
  city: string;
  region: string;
  preferredLang: string;
}

export interface TemplateDonation {
  id: string;
  amount: string;
  amountUSD: string;
  currency: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  campaignTitle: string;
}

export interface TemplateTotals {
  count: string;
  amountUSD: string;
  lastAt: string;
}

export interface TemplateContext {
  user: TemplateUser;
  donations: TemplateDonation[];
  totals: TemplateTotals;
}

/** ---------------- catalog (UI-facing) ---------------- */

export interface VariableEntry {
  token: string;
  label: string;
  exampleValue: string;
}

export interface VariableGroup {
  group: string;
  entries: VariableEntry[];
}

export const VARIABLE_CATALOG: VariableGroup[] = [
  {
    group: "المتبرع",
    entries: [
      { token: "{{user.name}}", label: "الاسم", exampleValue: "أحمد" },
      { token: "{{user.email}}", label: "البريد", exampleValue: "ahmed@example.com" },
      { token: "{{user.phone}}", label: "الهاتف", exampleValue: "+90 555 555 5555" },
      { token: "{{user.countryName}}", label: "الدولة", exampleValue: "تركيا" },
      { token: "{{user.countryCode}}", label: "رمز الدولة", exampleValue: "TR" },
      { token: "{{user.city}}", label: "المدينة", exampleValue: "إسطنبول" },
      { token: "{{user.preferredLang}}", label: "اللغة المفضلة", exampleValue: "ar" },
    ],
  },
  {
    group: "ملخص التبرعات",
    entries: [
      { token: "{{totals.count}}", label: "عدد التبرعات", exampleValue: "5" },
      { token: "{{totals.amountUSD}}", label: "الإجمالي (USD)", exampleValue: "250" },
      { token: "{{totals.lastAt}}", label: "تاريخ آخر تبرع", exampleValue: "2026-04-12" },
    ],
  },
  {
    group: "قائمة التبرعات (داخل {{#donations}}…{{/donations}})",
    entries: [
      { token: "{{amountUSD}}", label: "المبلغ (USD)", exampleValue: "50" },
      { token: "{{amount}}", label: "المبلغ", exampleValue: "50" },
      { token: "{{currency}}", label: "العملة", exampleValue: "USD" },
      { token: "{{createdAt}}", label: "التاريخ", exampleValue: "2026-04-12" },
      { token: "{{campaignTitle}}", label: "عنوان الحملة", exampleValue: "حملة العيون" },
    ],
  },
];

/** ---------------- formatting helpers ---------------- */

const formatDate = (d: Date | null | undefined): string =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

const formatNumber = (n: number | null | undefined, digits = 0): string =>
  typeof n === "number"
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "";

/** ---------------- loaders ---------------- */

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  countryName: true,
  country: true,
  countryCode: true,
  city: true,
  region: true,
  preferredLang: true,
} as const;

const donationSelect = {
  id: true,
  amount: true,
  amountUSD: true,
  currency: true,
  totalAmount: true,
  status: true,
  createdAt: true,
  items: {
    select: {
      campaign: { select: { title: true } },
    },
  },
} as const;

function donationsToContext(
  donations: { id: string; amount: number; amountUSD: number | null; currency: string; totalAmount: number; status: string; createdAt: Date; items: { campaign: { title: string } }[] }[]
): TemplateDonation[] {
  return donations.map((d) => ({
    id: d.id,
    amount: formatNumber(d.amount, 0),
    amountUSD: formatNumber(d.amountUSD ?? 0, 0),
    currency: d.currency,
    totalAmount: formatNumber(d.totalAmount, 0),
    status: d.status,
    createdAt: formatDate(d.createdAt),
    campaignTitle: d.items.map((it) => it.campaign?.title).filter(Boolean).join("، "),
  }));
}

function userToContext(
  u: { id: string; name: string | null; email: string | null; phone: string | null; countryName: string | null; country: string | null; countryCode: string | null; city: string | null; region: string | null; preferredLang: string | null }
): TemplateUser {
  return {
    id: u.id,
    name: u.name ?? "",
    email: u.email ?? "",
    phone: u.phone ?? "",
    countryName: u.countryName ?? u.country ?? "",
    countryCode: u.countryCode ?? "",
    city: u.city ?? "",
    region: u.region ?? "",
    preferredLang: u.preferredLang ?? "",
  };
}

export async function loadContext(userId: string): Promise<TemplateContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });
  if (!user) return null;

  const donations = await prisma.donation.findMany({
    where: { donorId: userId, status: "PAID" },
    select: donationSelect,
    orderBy: { createdAt: "desc" },
  });

  const totalUSD = donations.reduce((s, d) => s + (d.amountUSD ?? 0), 0);
  const lastAt = donations[0]?.createdAt ?? null;

  return {
    user: userToContext(user),
    donations: donationsToContext(donations),
    totals: {
      count: String(donations.length),
      amountUSD: formatNumber(totalUSD, 0),
      lastAt: formatDate(lastAt),
    },
  };
}

export async function loadContextsForUserIds(
  ids: string[]
): Promise<Map<string, TemplateContext>> {
  if (ids.length === 0) return new Map();
  const [users, donations] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: userSelect }),
    prisma.donation.findMany({
      where: { donorId: { in: ids }, status: "PAID" },
      select: { ...donationSelect, donorId: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const byDonor = new Map<string, typeof donations>();
  for (const d of donations) {
    const arr = byDonor.get(d.donorId) ?? [];
    arr.push(d);
    byDonor.set(d.donorId, arr);
  }

  const out = new Map<string, TemplateContext>();
  for (const u of users) {
    const ds = byDonor.get(u.id) ?? [];
    const totalUSD = ds.reduce((s, d) => s + (d.amountUSD ?? 0), 0);
    const lastAt = ds[0]?.createdAt ?? null;
    out.set(u.id, {
      user: userToContext(u),
      donations: donationsToContext(ds),
      totals: {
        count: String(ds.length),
        amountUSD: formatNumber(totalUSD, 0),
        lastAt: formatDate(lastAt),
      },
    });
  }
  return out;
}

/** ---------------- merge engine ---------------- */

const LOOP_RE = /\{\{#donations\}\}([\s\S]*?)\{\{\/donations\}\}/g;
const VAR_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function lookup(path: string, scope: Record<string, unknown>): string {
  const parts = path.split(".");
  let cur: unknown = scope;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return "";
    }
  }
  return cur == null ? "" : String(cur);
}

function renderInScope(template: string, scope: Record<string, unknown>): string {
  return template.replace(VAR_RE, (_, name) => lookup(name, scope));
}

export function mergeText(template: string, ctx: TemplateContext): string {
  if (!template) return template;
  const scope: Record<string, unknown> = {
    user: ctx.user,
    totals: ctx.totals,
  };
  const expanded = template.replace(LOOP_RE, (_, inner: string) => {
    return ctx.donations
      .map((d) => renderInScope(inner, { ...scope, ...d }))
      .join("");
  });
  return renderInScope(expanded, scope);
}

/** Walks a TReaderDocument JSON tree and merges every string leaf. */
export function mergeDocument<T>(doc: T, ctx: TemplateContext): T {
  if (doc == null) return doc;
  if (typeof doc === "string") return mergeText(doc, ctx) as unknown as T;
  if (Array.isArray(doc)) return doc.map((x) => mergeDocument(x, ctx)) as unknown as T;
  if (typeof doc === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(doc as Record<string, unknown>)) {
      out[k] = mergeDocument(v, ctx);
    }
    return out as unknown as T;
  }
  return doc;
}
