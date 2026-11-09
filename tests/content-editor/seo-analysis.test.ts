import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSeo } from "../../lib/content-editor/seo-analysis";
const status=(values:Record<string,string>,id:string,locale="ar")=>analyzeSeo(values,locale).findings.find(f=>f.id===id)?.status;

test("SEO analysis checks actual rich headings, links, image alt and paragraph structure",()=>{
  const content=JSON.stringify({type:"doc",content:[{type:"heading",attrs:{level:1},content:[{type:"text",text:"عنوان مكرر"}]},{type:"paragraph",content:[{type:"text",text:"نص ".repeat(100),marks:[{type:"link",attrs:{href:"javascript:alert(1)"}}]}]},{type:"image",attrs:{src:"/image.jpg"}}]});
  const result=analyzeSeo({content},"ar");
  assert.equal(result.words,102);assert.equal(result.headingCount,1);assert.equal(result.imageCount,1);
  assert.equal(result.findings.find(f=>f.id==="heading-hierarchy")?.status,"warning");
  assert.equal(result.findings.find(f=>f.id==="link-safety")?.status,"error");
  assert.equal(result.findings.find(f=>f.id==="inline-image-alt")?.status,"warning");
  assert.equal(result.findings.find(f=>f.id==="paragraphs")?.status,"warning");
});
test("Arabic keyword comparison ignores tashkeel while noindex remains an explicit review finding",()=>{
  assert.equal(status({metaTitle:"دعم أَسَر القدس",seoKeyword:"أسر القدس"},"keyword-title"),"pass");
  assert.equal(status({seoNoIndex:"true"},"indexing"),"warning");
  assert.equal(status({metaTitle:"عنوان",metaDescription:"عنوان"},"unique-copy"),"warning");
});
test("HTML images, local links and heading jumps are inspected without network calls",()=>{
  const a=analyzeSeo({content:'<h2>القسم</h2><h4>قفزة</h4><p><a href="/ar/projects">تفاصيل</a></p><img src="/a.jpg" alt="صورة المشروع">'},"ar");
  assert.equal(a.internalLinks,1);assert.equal(a.imageCount,1);assert.equal(a.findings.find(f=>f.id==="inline-image-alt")?.status,"pass");assert.equal(a.findings.find(f=>f.id==="heading-hierarchy")?.status,"warning");
});
test("FAQ diagnostics distinguish empty optional data from malformed, incomplete and duplicate rows",()=>{
  assert.equal(status({},"faq"),"pass");
  for(const faqContent of ["{",JSON.stringify([{q:"سؤال",a:""}]),JSON.stringify([{q:"سؤال",a:"جواب"},{q:"سؤال",a:"جواب آخر"}])])assert.equal(status({faqContent},"faq"),"warning");
});
test("analysis reports translated-language residue and never mutates draft values",()=>{
  const values={description:"هذا النص ما زال بالعربية ".repeat(15),imageAlt:"صورة",ogImage:"/share.jpg"};const before=JSON.stringify(values);
  assert.equal(status(values,"translation-language","fr"),"warning");
  assert.equal(JSON.stringify(values),before);
});
