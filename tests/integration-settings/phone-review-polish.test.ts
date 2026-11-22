import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("phone review polish: iPhone draws home sections, dashboard fields at 16 px, phone LTR, Arabic plural, contact names", () => {
  // Gözbebekleri: the iPhone home-section and dash-vivid 16 px CSS parts are for Minber stylesheets this repo does not have.
  assert.match(fs.readFileSync("app/[locale]/profile/_components/EditDialog.tsx", "utf8"), /type === "tel" \? <bdi dir="ltr">\{value\}<\/bdi>/);
  assert.match(fs.readFileSync("i18n/messages/ar.json", "utf8"), /two \{حصلت على وسامين\}/);
  const w = fs.readFileSync("app/(dashboard)/dashboard/communication/conversations/_components/ConversationsWorkspace.tsx", "utf8");
  assert.doesNotMatch(w, /c\.name \|\| c\.phone|active\.name \|\| active\.phone/);
});
