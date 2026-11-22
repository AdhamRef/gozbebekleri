import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const src = fs.readFileSync("lib/communication/providers/email/client.ts", "utf8");
const start = src.indexOf("const INSTITUTION_SENDER_NAMES"), end = src.indexOf("export type EmailSendResult");
const js = ts.transpileModule(src.slice(start, end).replace("export function", "function") + "\nmodule.exports = { institutionSenderName };", { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod: { exports: { institutionSenderName: (l: string | null | undefined) => string | null } } = { exports: {} as never };
vm.runInNewContext(js, { module: mod });
const name = mod.exports.institutionSenderName;

// Gözbebekleri: the names come from its own About page (AboutUs.associationName) in all eight site languages.
test("the sender is the institution's name in the message's language", () => {
  for (const lang of ["ar", "tr", "en", "fr", "de", "es", "id", "pt"]) {
    const about = JSON.parse(fs.readFileSync(`i18n/messages/${lang}.json`, "utf8")).AboutUs.associationName;
    assert.equal(name(lang), about, lang);
  }
  assert.equal(name("tr-TR"), "Gözbebekleri Yardım ve Dayanışma Derneği");
  assert.equal(name("ru"), "Qurrat Al-Ayun Relief and Solidarity Association", "other languages: English form");
  assert.doesNotMatch(src, /Minber|Minbar|منبر/);
});

test("no language keeps the configured sender; an explicit sender name always wins", () => {
  assert.equal(name(null), null);
  assert.equal(name(""), null);
  assert.match(src, /senderName: input\.senderName\?\.trim\(\) \|\| \(input\.purpose === "MARKETING" \? null : institutionSenderName\(input\.locale\)\),/, "marketing keeps the configured sender");
});
