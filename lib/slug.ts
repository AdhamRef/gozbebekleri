// Slug utilities — generates URL-safe slugs (preserves Arabic letters),
// detects MongoDB ObjectIds, and ensures uniqueness across a model.
import type { PrismaClient } from "@prisma/client";

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export function isObjectId(value: string): boolean {
  return OBJECT_ID_RE.test(value);
}

/**
 * Convert any string into a URL-friendly slug.
 *  - lowercases ASCII
 *  - keeps unicode letters/numbers (so Arabic stays readable)
 *  - replaces whitespace with `-`
 *  - strips punctuation that's noisy in URLs
 *  - collapses repeated dashes, trims leading/trailing dashes
 *  - truncates at MAX_LEN
 */
export function slugify(input: string, maxLen = 80): string {
  if (!input) return "";
  let s = String(input).normalize("NFKD").trim().toLowerCase();
  // strip combining marks (Latin diacritics + Arabic harakat); keeps base letters intact
  s = s.replace(/\p{M}+/gu, "");
  // replace whitespace and underscores with single dash
  s = s.replace(/[\s_]+/g, "-");
  // drop characters that aren't unicode letters/numbers/dashes
  s = s.replace(/[^\p{L}\p{N}-]+/gu, "");
  // collapse repeated dashes
  s = s.replace(/-+/g, "-");
  // trim leading/trailing dashes
  s = s.replace(/^-+|-+$/g, "");
  if (s.length > maxLen) s = s.slice(0, maxLen).replace(/-+$/g, "");
  return s;
}

type Delegate = {
  findFirst: (args: any) => Promise<{ id: string } | null>;
};

/**
 * Generate a unique slug for `delegate` based on `base`.
 *  - normalises the base via slugify()
 *  - if the result is empty (e.g. only punctuation), uses the fallback prefix
 *  - if it collides, appends `-2`, `-3`, ... until free
 *  - records currentId so updating an existing row doesn't see itself as a clash
 */
export async function generateUniqueSlug(
  delegate: Delegate,
  base: string,
  options: { fallbackPrefix?: string; currentId?: string } = {}
): Promise<string> {
  const { fallbackPrefix = "item", currentId } = options;
  let slug = slugify(base);
  if (!slug) slug = `${fallbackPrefix}-${Date.now().toString(36)}`;

  const candidate = slug;
  let suffix = 1;
  // Try the bare slug first, then append -2, -3, ...
  // (suffix=1 means "no suffix" iteration)
  while (true) {
    const value = suffix === 1 ? candidate : `${candidate}-${suffix}`;
    const where: any = { slug: value };
    if (currentId) where.id = { not: currentId };
    const existing = await delegate.findFirst({ where, select: { id: true } });
    if (!existing) return value;
    suffix += 1;
    if (suffix > 1000) {
      // Pathological collision — fall back to a unique-by-time suffix
      return `${candidate}-${Date.now().toString(36)}`;
    }
  }
}

/** Build a Prisma `where` that matches by ObjectId or slug. */
export function whereByIdOrSlug(key: string): { id: string } | { slug: string } {
  return isObjectId(key) ? { id: key } : { slug: key };
}

/**
 * Resolve user-provided slug input.
 *  - returns null if input is empty/blank → caller should auto-generate
 *  - returns slugified value otherwise (so admins can't accidentally save spaces/uppercase)
 */
export function normalizeUserSlug(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const cleaned = slugify(s);
  return cleaned || null;
}

// Convenience helpers for the four slugged models
export const slugDelegates = (prisma: PrismaClient) => ({
  campaign: prisma.campaign,
  category: prisma.category,
  post: prisma.post,
  postCategory: prisma.postCategory,
});
