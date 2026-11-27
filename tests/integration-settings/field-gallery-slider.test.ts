import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const s = fs.readFileSync("components/minbar/shell/FieldGallery.tsx", "utf8");
test("field gallery: home and project pages only, one sliding row of square photos, viewer kept", () => {
  // Gozbebekleri: home is the locale root (its route map has no "home" entry); project pages are "projectDetail".
  assert.match(s, /!isHome && route !== "projectDetail"/);
  assert.match(s, /const isHome = route === "home" \|\| \/\^\\\/\[a-z\]\{2\}\\\/\?\$\/\.test\(pathname/);
  assert.match(s, /galleryHiddenOn\(pathname\) \|\|/, "the dashboard's hide setting still applies");
  assert.match(s, /overflowX: "auto", scrollSnapType: "x mandatory"/);
  assert.match(s, /aspectRatio: "1 \/ 1", scrollSnapAlign: "start"/);
  assert.doesNotMatch(s, /gridTemplateColumns/);
  assert.match(s, /role="dialog" aria-modal="true"/);
});
