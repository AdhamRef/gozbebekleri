import { test } from "node:test";
import assert from "node:assert/strict";
import { formatRichContent, suggestEditorial, reviewTranslationNotes } from "../../lib/content-localization/editorial-assistant";
import { translateItem, translateToLocales } from "../../lib/content-localization/translate";
import { editorialLanguagePolicy } from "../../lib/content-localization/editorial-policy";
const rich = (texts: string[]) => JSON.stringify({ type: "doc", content: texts.map(text => ({ type: "paragraph", content: [{ type: "text", text, marks: [{ type: "bold" }] }] })) });
async function provider(run: (input: Record<string, unknown>) => unknown, check: () => Promise<void>) { const before = globalThis.fetch, key = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = "fixture-only"; globalThis.fetch = async (_url, options) => { const request = JSON.parse(String(options?.body)); const input = JSON.parse(request.messages[1].content); return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(run(input)) } }] })); }; try { await check(); } finally { globalThis.fetch = before; if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key; } }
test("all translation entry points reject non-Arabic sources and translation back into Arabic before a provider call", async () => {
  await assert.rejects(translateItem({ fields: { title: "Hello" }, sourceLocale: "en" }, "tr"), /العربية/);
  await assert.rejects(translateToLocales({ fields: { title: "Hello" }, sourceLocale: "en" }, ["en"]), /العربية/);
  await assert.rejects(translateItem({ fields: { title: "نص" } }, "ar"), /العربية/);
  assert.match(editorialLanguagePolicy("tr"), /Kudüs/); assert.match(editorialLanguagePolicy("fr"), /Jérusalem/);
});
test("formatting changes block structure while preserving exact words, links, protected numbers, marks and media", async () => {
  const source = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "عنوان", marks: [{ type: "bold" }] }] }, { type: "paragraph", content: [{ type: "text", text: "دعم 15 عائلة", marks: [{ type: "link", attrs: { href: "https://example.org/15" } }] }] }, { type: "image", attrs: { src: "/original.jpg", alt: "صورة" } }] };
  await provider(() => ({ layouts: [{ index: 0, type: "heading", level: 2 }, { index: 1, type: "bullet" }] }), async () => {
    const result = JSON.parse(await formatRichContent(JSON.stringify(source), "ar"));
    assert.equal(result.content[0].type, "heading"); assert.deepEqual(result.content[0].content, source.content[0].content);
    assert.deepEqual(result.content[1].content[0].content[0].content, source.content[1].content);
    assert.deepEqual(result.content[2], source.content[2]);
  });
  await provider(() => ({ layouts: [{ index: 1, type: "heading", level: 2 }, { index: 0, type: "paragraph" }] }), async () => { await assert.rejects(formatRichContent(JSON.stringify(source), "ar"), /خطة التنسيق/); });
});
test("Arabic proofreading rejects a changed amount and preserves the existing draft", async () => {
  await provider(() => ({ texts: ["دعم 99 عائلة"] }), async () => { const result = await suggestEditorial({ action: "proofread", locale: "ar", fields: [{ key: "title", label: "العنوان", group: "content" }], values: { title: "دعم 15 عائلة" }, arabic: { title: "دعم 15 عائلة" } }); assert.deepEqual(result.values, {}); assert.match(result.warnings[0], /محمي|أرقام/); });
});
test("editorial improvement rejects invented protected values", async () => {
  await provider(() => ({ texts: ["دعم الأسر بمبلغ 100 دولار"] }), async () => { const result = await suggestEditorial({ action: "improve", locale: "ar", fields: [{ key: "title", label: "العنوان", group: "content" }], values: { title: "دعم الأسر" }, arabic: { title: "دعم الأسر" } }); assert.deepEqual(result.values, {}); assert.match(result.warnings[0], /أُضيفت/); });
});
test("improvement processes all long-document batches and keeps rich structure without truncation", async () => {
  const texts = ["فقرة البداية ".repeat(320), "وسط المحتوى ".repeat(320), "نهاية النص ".repeat(320)], raw = rich(texts);
  let calls = 0;
  await provider(input => { calls++; return { texts: input.currentTexts }; }, async () => {
    const result = await suggestEditorial({ action: "content-seo", locale: "ar", fields: [{ key: "description", label: "الوصف", group: "content", rich: true }], values: { description: raw }, arabic: { description: raw } });
    assert.deepEqual(JSON.parse(result.values.description), JSON.parse(raw)); assert.ok(calls >= 2); assert.deepEqual(result.warnings, []);
  });
});
test("translation review sends both Arabic and existing target text for semantic comparison", async () => {
  await provider(input => { const entries = input.fields as { arabic: string; current: string }[]; assert.equal(entries[0].arabic, "دعم 15 عائلة"); assert.equal(entries[0].current, "Help 99 families"); return { issues: ["المبلغ أو عدد المستفيدين لا يطابق العربية"] }; }, async () => { const result = await reviewTranslationNotes({ locale: "en", fields: [{ key: "title", label: "العنوان", group: "content" }], arabic: { title: "دعم 15 عائلة" }, current: { title: "Help 99 families" } }); assert.equal(result.length, 1); });
});
test("proofreading other languages is rejected and a provider failure is never presented as generated fallback copy", async () => {
  await assert.rejects(suggestEditorial({ action: "proofread", locale: "tr", fields: [], values: {}, arabic: {} }), /العربية/);
  const fetch = globalThis.fetch, key = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = "fixture";
  globalThis.fetch = async () => new Response("failure", { status: 503 });
  try { const result = await suggestEditorial({ action: "improve", locale: "ar", fields: [{ key: "title", label: "العنوان", group: "content" }], values: { title: "مشروع" }, arabic: { title: "مشروع" } }); assert.deepEqual(result.values, {}); assert.match(result.warnings[0], /503/); } finally { globalThis.fetch = fetch; if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key; }
});
