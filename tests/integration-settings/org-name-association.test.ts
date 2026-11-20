import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (l: string) => fs.readFileSync(`i18n/messages/${l}.json`, "utf8");
// Ported from Minber #278, adapted to Gozbebekleri: the charity is an association (جمعية / Dernek /
// Verein), never a foundation, in each of its enabled site languages. Minber's own sentences are not
// asserted here: Gozbebekleri keeps its own texts.
test("the organization is an association in every enabled language, not a foundation", () => {
  const banned: Record<string, RegExp> = { en: /\b[Ff]oundation(?!s|al)\b/, fr: /\b[Ff]ondation\b/, es: /\b[Ff]undaci[oó]n\b/, pt: /\b[Ff]unda[cç][aã]o\b/, de: /Stiftung/, id: /\b[Yy]ayasan\b/ };
  for (const [lang, re] of Object.entries(banned)) assert.doesNotMatch(read(lang), re, lang);
});
