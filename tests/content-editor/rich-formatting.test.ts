import { test } from "node:test";
import assert from "node:assert/strict";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "../../app/[locale]/blog/_components/wysiwyg/extensions/underline";
import UpdatedImage from "../../app/[locale]/blog/_components/wysiwyg/extensions/updated-image";

test("rich schema preserves underlined Arabic copy and resized images through a JSON round trip", () => {
  const schema = getSchema([StarterKit, Underline, UpdatedImage]);
  const input = { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "نص عربي مُسطّر", marks: [{ type: "underline" }] }] },
    { type: "image", attrs: { src: "/original.jpg", alt: "صورة المشروع", width: 320, height: 200 } },
  ] };
  const roundTrip = schema.nodeFromJSON(schema.nodeFromJSON(input).toJSON()).toJSON();
  assert.deepEqual(roundTrip.content[0], input.content[0]);
  assert.equal(roundTrip.content[1].attrs.width, 320);
  assert.equal(roundTrip.content[1].attrs.height, 200);
  assert.equal(roundTrip.content[1].attrs.src, "/original.jpg");
});
