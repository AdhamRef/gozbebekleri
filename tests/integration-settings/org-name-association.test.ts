import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (l: string) => fs.readFileSync(`i18n/messages/${l}.json`, "utf8");
// Gözbebekleri (Gözbebekleri Yardım ve Dayanışma Derneği) is an association: checked in its own eight languages.
test("the organization is an association in every language, not a foundation", () => {
  const banned: Record<string, RegExp> = { en: /\b[Ff]oundation(?!s|al)\b/, fr: /\b[Ff]ondation\b/, es: /\b[Ff]undaci[oó]n\b/, pt: /\b[Ff]unda[cç][aã]o\b/, de: /Stiftung/, id: /\b[Yy]ayasan\b/ };
  for (const [lang, re] of Object.entries(banned)) assert.doesNotMatch(read(lang), re, lang);
  assert.doesNotMatch(read("tr"), /Vakfı|vakfın|vakfımız/, "tr");
  assert.match(read("tr"), /Derneği/);
});
