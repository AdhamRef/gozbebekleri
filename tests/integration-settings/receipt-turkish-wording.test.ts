import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const tr = fs.readFileSync("i18n/messages/tr.json", "utf8");
// Gözbebekleri keeps its receipt wording in the certificate editor (database), not in tr.json;
// what the messages file does carry must not use foundation (vakıf) wording for this association.
test("the Turkish messages never describe the association as a foundation on the receipt", () => {
  assert.doesNotMatch(tr, /Vakıf Müdürü|vakfın onaylı/);
});
test("the receipt's Latin subtitle is stored in capitals, so Turkish casing never turns i into İ", () => {
  assert.match(fs.readFileSync("lib/certificates/copy-defaults.ts", "utf8"), /docTitleLatin: "BAĞIŞ MAKBUZU \/ DONATION RECEIPT"/);
});
