import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// Ported from Minber #259, adapted: Gozbebekleri keeps its receipt texts in lib/ported-systems/messages.json
// (certificates namespace), and it is an association (Dernek), so the receipt names its General Manager.
const msgs = JSON.parse(fs.readFileSync("lib/ported-systems/messages.json", "utf8"));
test("the Turkish receipt names the association's General Manager, never a foundation director", () => {
  assert.equal(msgs.tr.certificates.directorLabel, "Genel Müdür");
  assert.doesNotMatch(JSON.stringify(msgs.tr), /Vakıf Müdürü|vakfın onaylı/);
});
test("the receipt's Latin subtitle is stored in capitals, so Turkish casing never turns i into İ", () => {
  assert.match(fs.readFileSync("lib/certificates/copy-defaults.ts", "utf8"), /docTitleLatin: "BAĞIŞ MAKBUZU \/ DONATION RECEIPT"/);
});
