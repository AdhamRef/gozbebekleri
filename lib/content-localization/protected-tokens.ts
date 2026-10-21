import { SUPPORTED_CURRENCY_CODES } from "../supported-currencies";

/**
 * The QA gate on machine translation: a translation is only accepted when every value that must
 * survive verbatim  URLs, email addresses, `{{placeholders}}` / `{icu}` variables, HTML tags,
 * currency codes and numbers  is still there.
 *
 * It compares *values*, not spellings. The earlier check compared the raw matches and rejected
 * correct translations wholesale:
 *  - Arabic-Indic digits (١٠٠) are not `\d`, so the source had no number and the translation's
 *    `100` looked invented;
 *  - locales format the same number differently  `1,000` / `1.000` / `1 000`, `50%` / `%50`,
 *    `$100` / `100 $`;
 *  - a URL followed by a full stop picked the stop up on one side only.
 * A protected value that is missing or altered still fails; a translation may add a number the
 * source spelled out in words.
 */

/** Every non-ASCII digit system the source or a target locale may use, mapped to ASCII. */
const DIGIT_BLOCKS = [0x0660, 0x06f0, 0x0966, 0x09e6, 0xff10];

export function normalizeDigits(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    const block = DIGIT_BLOCKS.find((start) => code >= start && code <= start + 9);
    if (block !== undefined) out += String(code - block);
    else if (code === 0x066b) out += "."; // Arabic decimal separator
    else if (code === 0x066c) out += ","; // Arabic thousands separator
    else if (code === 0x066a || code === 0xff05) out += "%";
    else out += ch;
  }
  return out;
}

const URL_RE = /https?:\/\/[^\s<>"')]+/giu;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu;
const MUSTACHE_RE = /\{\{\s*([^{}]+?)\s*\}\}/gu;
const ICU_VARIABLE_RE = /(?<!\{)\{([A-Za-z0-9_.-]+)(?=[,}])/gu;
const HTML_TAG_RE = /<(\/?)([A-Za-z][A-Za-z0-9]*)\b[^>]*>/gu;
const CURRENCY_RE = new RegExp(`\\b(?:${SUPPORTED_CURRENCY_CODES.join("|")})\\b`, "giu");
const SYMBOL_RE = /[$€£₺﷼¥₹₩₽₫฿₴₦₱₪₿%‰]/gu;
/* A number with optional grouping (`,` `.` `'` thin/normal space between 3-digit groups) and an
   optional decimal part. Canonicalization below distinguishes decimals from grouping. */
const RELIGIOUS_TEXT_RE = /﴿[^﴿﴾]+﴾/gu;
const NUMBER_RE = /\d+(?:[.,'’   ]\d{3})*(?:[.,]\d+)?/gu;

type Token = { key: string; numericText?: string };
type LocalePair = { sourceLocale?: string; targetLocale?: string };
const separators = new Map<string, { decimal: string; group: string }>();
function numberKey(raw: string, locale: string): string {
  let format = separators.get(locale);
  if (!format) {
    const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
    format = { decimal: normalizeDigits(parts.find(p => p.type === "decimal")?.value || "."), group: normalizeDigits(parts.find(p => p.type === "group")?.value || ",") };
    separators.set(locale, format);
  }
  const [integer, fraction, extra] = raw.split(format.decimal);
  const groups = integer.split(/[.,'’\u00a0\u202f ]/u);
  const punctuation = [...integer].filter(ch => !/\d/u.test(ch));
  if (extra !== undefined || (fraction !== undefined && !/^\d+$/u.test(fraction)) ||
    punctuation.some(ch => ch !== format.group && !/['’\u00a0\u202f ]/u.test(ch)) ||
    (groups.length > 1 && (!/^\d{1,3}$/u.test(groups[0]) || groups.slice(1).some(group => !/^\d{3}$/u.test(group))))) return `invalid-number:${raw}`;
  const decimal = (fraction || "").replace(/0+$/u, "");
  return `num:${groups.join("")}${decimal ? "." + decimal : ""}`;
}

function tokensFor(value: string, locale: string): Token[] {
  let text = normalizeDigits(value);
  const tokens: Token[] = [];
  const take = (re: RegExp, canonical: (m: RegExpMatchArray) => string) => {
    text = text.replace(re, (...args) => {
      const match = args.slice(0, -2) as unknown as RegExpMatchArray;
      tokens.push({ key: canonical(match) });
      return " ";
    });
  };
  /* URLs and emails first, so the digits inside them are not counted again as numbers. */
  take(RELIGIOUS_TEXT_RE, (m) => `religious:${m[0]}`);
  take(URL_RE, (m) => `url:${m[0].replace(/[.,;:!?]+$/u, "")}`);
  take(EMAIL_RE, (m) => `email:${m[0].toLowerCase()}`);
  take(MUSTACHE_RE, (m) => `var:{{${m[1]}}}`);
  take(ICU_VARIABLE_RE, (m) => `var:{${m[1]}}`);
  take(HTML_TAG_RE, (m) => `tag:<${m[1]}${m[2].toLowerCase()}>`);
  take(CURRENCY_RE, (m) => `cur:${m[0].toUpperCase()}`);
  take(SYMBOL_RE, (m) => `symbol:${m[0]}`);
  text.replace(NUMBER_RE, raw => {
    tokens.push({ key: numberKey(raw, locale), numericText: raw });
    return raw;
  });
  return tokens;
}

/** Canonical numbers retain decimal value; grouping follows the supplied locale. */
export function protectedTokens(value: string, locale = "en"): string[] {
  return tokensFor(value, locale).map(token => token.key).sort();
}

/** True when every protected value of `source` appears in `translated` at least as often. */
export function protectedTokensPreserved(source: string, translated: string, locales: LocalePair = {}): boolean {
  return missingProtectedTokens(source, translated, locales).length === 0;
}

/** The protected values of `source` the translation lost, so the warning can say which. */
export function missingProtectedTokens(source: string, translated: string, locales: LocalePair = {}): string[] {
  const original = tokensFor(source, locales.sourceLocale || "ar");
  const translatedTokens = tokensFor(translated, locales.targetLocale || "en");
  const available = new Map<string, number[]>(), literals = new Map<string, number[]>();
  const used = new Set<number>(), matched = new Set<number>();
  translatedTokens.forEach((token, index) => {
    const bucket = available.get(token.key) || [];
    bucket.push(index);
    available.set(token.key, bucket);
    if (token.numericText) {
      const numericBucket = literals.get(token.numericText) || [];
      numericBucket.push(index);
      literals.set(token.numericText, numericBucket);
    }
  });
  const consume = (indexes: number[] | undefined): boolean => {
    while (indexes?.length) {
      const index = indexes.pop()!;
      if (!used.has(index)) { used.add(index); return true; }
    }
    return false;
  };
  // Preserve unchanged numeric spellings too: the provider may intentionally
  // keep Arabic-master formatting instead of using the target locale's format.
  original.forEach((token, index) => {
    if (token.numericText && consume(literals.get(token.numericText))) matched.add(index);
  });
  const missing: string[] = [];
  original.forEach((token, index) => {
    if (!matched.has(index) && !consume(available.get(token.key))) missing.push(token.key.slice(token.key.indexOf(":") + 1));
  });
  return missing;
}
