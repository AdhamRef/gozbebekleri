import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { formatCheckoutAmount } from "../lib/checkout-display";
import { emailMetrics } from "../lib/communication/email-metrics";
import { DEFAULT_IMPACT_CONFIG, DEFAULT_IMPACT_TITLE, DEFAULT_IMPACT_INTRO, pickText } from "../lib/impact/config";
import { SUPPORTED_LOCALES } from "../lib/locales";
import { buildBreadcrumbs } from "../lib/dashboard/breadcrumbs";
import { NOT_FOUND_COPY } from "../lib/not-found-copy";
import privacy from "../lib/privacy-translations.json";
import { defaultEditorContent } from "../app/[locale]/blog/_components/wysiwyg/default-content";
import { dt, setDashLocale } from "../lib/dashboard/i18n";

const require = createRequire(import.meta.url);
function load(path: string, dependencies: Record<string, unknown>): any {
  const module = { exports: {} };
  const js = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(js, { module, exports: module.exports, console, process, require: (name: string) => {
    if (name in dependencies) return dependencies[name];
    if (!name.startsWith("@/") && !name.startsWith(".")) return require(name);
    throw new Error(`Unexpected import ${name} in ${path}`);
  } });
  return module.exports;
}

test("BUG-02: checkout preserves fractional amounts, including three-decimal currency values", () => {
  for (const [amount, expected] of [[3.57,"3.57"],[0.125,"0.125"],[1234.5,"1,234.5"],[4,"4"],[0,"0"]] as const) {
    assert.equal(formatCheckoutAmount(amount), expected);
    assert.equal(Number(formatCheckoutAmount(amount).replaceAll(",", "")), amount);
  }
});

test("BUG-01: template type guidance and rejection messages are localized in every dashboard language", () => {
  const guidance = "النوع يحدد استخدام القالب؛ تغيير اللغة يغيّر المحتوى فقط ولا ينشئ قالبًا جديدًا.";
  const rejection = "هذا قالب تلقائي أو خدمي؛ اختر قالبًا تسويقيًا لهذا الإرسال.";
  const expected = {
    ar: [guidance, rejection],
    en: [
      "Template type determines how it can be used. Changing language changes the content only and does not create another template.",
      "This is an automated or service template. Choose a marketing template for this send.",
    ],
    tr: [
      "Şablon türü kullanımını belirler. Dili değiştirmek yalnızca içeriği değiştirir; yeni bir şablon oluşturmaz.",
      "Bu otomatik veya hizmet şablonudur. Bu gönderim için bir pazarlama şablonu seçin.",
    ],
  } as const;
  try {
    for (const locale of ["ar", "en", "tr"] as const) {
      setDashLocale(locale);
      assert.deepEqual([dt(guidance), dt(rejection)], expected[locale]);
    }
  } finally {
    setDashLocale("ar");
  }
});

test("BUG-05: built-in impact content is complete in eight languages, stored defaults localize without changing prices or custom copy", () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const text of [DEFAULT_IMPACT_TITLE, DEFAULT_IMPACT_INTRO, ...DEFAULT_IMPACT_CONFIG.regions.map(r => r.name), ...DEFAULT_IMPACT_CONFIG.needs.map(n => n.name)]) assert.ok(text[locale]?.trim(), locale);
  }
  assert.equal(pickText({ ar: "ماء نظيف", en: "Clean water" }, "fr"), "Eau potable");
  assert.equal(pickText({ ar: "ماء نظيف", en: "Clean water", fr: "Texte personnalisé" }, "fr"), "Texte personnalisé");
  assert.equal(pickText({ en: "Custom title" }, "fr"), "Custom title");
  assert.equal(DEFAULT_IMPACT_CONFIG.needs.find(n => n.key === "water")?.priceUSD, 4);
});

test("BUG-07: edit breadcrumbs are structural labels, never invalid record links", () => {
  const crumbs = buildBreadcrumbs("/dashboard/impact/edit/111111111111111111111111");
  assert.equal(crumbs.find(c => c.label === "تعديل")?.href, undefined);
  assert.ok(crumbs.some(c => c.href === "/dashboard/impact"));
  assert.ok(buildBreadcrumbs("/dashboard/campaigns/111111111111111111111111/updates").some(c => c.href === "/dashboard/campaigns/111111111111111111111111"));
});

test("BUG-08: attempts, acceptance and tracking are independent; skipped sends never inflate rates", () => {
  const metrics = emailMetrics([{status:"OPENED"},{status:"CLICKED"},{status:"FAILED"},{status:"SKIPPED"}], 0, 1, 1);
  assert.equal(metrics.accepted, 2); assert.equal(metrics.attempted, 3);
  assert.equal(metrics.deliveredRate, null); assert.equal(metrics.deliveryTrackingAvailable, false);
  assert.equal(metrics.openRate, 50); assert.equal(metrics.failedRate, 33.3);
  const bounced = emailMetrics([{ status: "BOUNCED", sentAt: new Date() }, { status: "FAILED", sentAt: new Date() }], 1, 0, 0);
  assert.equal(bounced.accepted, 2); assert.equal(bounced.attempted, 2); assert.equal(bounced.failedRate, 100);
});

test("BUG-09/11/12: complete localized privacy and recovery copy; no sample article content", () => {
  for (const locale of SUPPORTED_LOCALES) assert.ok(NOT_FOUND_COPY[locale].title && NOT_FOUND_COPY[locale].home && NOT_FOUND_COPY[locale].projects);
  for (const locale of ["fr","tr","de","es","pt","id"] as const) {
    assert.equal(privacy[locale].sections.length, 6);
    assert.deepEqual(privacy[locale].sections.map(s => s.body.length), [3,4,2,2,1,1]);
    assert.ok(privacy[locale].lastUpdated.endsWith("2026-04-20"));
  }
  assert.deepEqual(defaultEditorContent, { type: "doc", content: [{ type: "paragraph" }] });
});

test("BUG-01/SRC-01: actual email/SMS routes classify legacy bindings and refuse deletion or reclassification of referenced templates", async () => {
  for (const channel of ["EMAIL", "SMS"] as const) {
    let updates = 0, deletes = 0, triggerCount = 1, campaignCount = 0;
    const row = { id: "111111111111111111111111", kind: "CAMPAIGN", purpose: "MARKETING", name: "Legacy receipt", status: "READY" };
    const delegate = { findUnique: async () => row, update: async ({data}: any) => { updates++; return {...row,...data}; }, delete: async () => { deletes++; return row; } };
    const prisma = { emailTemplate: delegate, smsTemplate: delegate, messageTrigger: { count: async () => triggerCount, findMany: async ({where}: any) => { assert.equal(where.channel, channel); return triggerCount ? [{templateId:row.id}] : []; } }, communicationCampaign: {count:async()=>campaignCount}, communicationDelivery:{count:async()=>0} };
    const classification = load("lib/communication/template-kind.ts", {});
    const common = { "@/lib/prisma": {prisma}, "./template-kind": classification };
    const usage = load("lib/communication/template-usage.ts", common);
    const classify = load("lib/communication/template-event-classification.ts", common);
    const route = load(`app/api/templates/${channel.toLowerCase()}/[id]/route.ts`, {
      "@/lib/communication/template-event-classification": classify,
      "@/lib/communication/template-usage": usage,
      "@/lib/communication/template-kind": classification,
      "@/lib/prisma": {prisma},
      "next-auth": {getServerSession:async()=>({user:{role:"ADMIN"}})},
      "@/app/api/auth/[...nextauth]/options":{authOptions:{}},
      "@/lib/dashboard/api-auth":{requireAdminOrDashboardPermission:()=>null},
      "@/lib/audit-log":{auditActorFromDashboardSession:()=>({}),writeAuditLog:async()=>{}},
    });
    const ctx = {params:Promise.resolve({id:row.id})};
    const detail = await (await route.GET({},ctx)).json();
    assert.equal(detail.template.kind, "SYSTEM"); assert.equal(detail.template.linkedToEvent,true);
    assert.equal((await route.DELETE({},ctx)).status,409); assert.equal(deletes,0);
    assert.equal((await route.PATCH({json:async()=>({kind:"CAMPAIGN",purpose:"MARKETING"})},ctx)).status,409); assert.equal(updates,0);
    // Adding a language does not touch the persisted kind or purpose.
    const saved = await (await route.PATCH({json:async()=>({translations:{fr:channel==="EMAIL"?{subject:"Reçu"}:{body:"Reçu"}}})},ctx)).json();
    assert.equal(saved.template.kind,"SYSTEM"); assert.equal(saved.template.purpose,"MARKETING"); assert.equal(updates,1);
    assert.equal((await route.GET({},ctx)).status,200); // detail remains classified by binding
    triggerCount=0; campaignCount=1;
    assert.equal((await route.PATCH({json:async()=>({kind:"SYSTEM",purpose:"TRANSACTIONAL"})},ctx)).status,409);
    assert.equal((await route.DELETE({},ctx)).status,409);
    campaignCount=0; assert.equal((await route.DELETE({},ctx)).status,200); assert.equal(deletes,1);
  }
});

test("BUG-06: title fallback has explicit locale metadata and never pretends an untranslated record is localized", async () => {
  const { localizedCampaignTitle, TRANSLATION_UNAVAILABLE } = await import("../lib/campaign/localized-title");
  const translations = [{locale:"en",title:"Support Gaza's orphans"},{locale:"de",title:"Waisenkinder in Gaza unterstützen"}];
  const fr = localizedCampaignTitle("دعم أيتام غزة", translations, "fr");
  assert.equal(fr.title, "Support Gaza's orphans"); assert.equal(fr.titleLocale,"en"); assert.equal(fr.translationMissing,true);
  const de = localizedCampaignTitle("دعم أيتام غزة", translations, "de");
  assert.equal(de.translationMissing,false); assert.equal(de.titleLocale,"de");
  assert.equal(localizedCampaignTitle("عنوان",[{locale:"fr",title:" "}],"fr").titleLocale,"ar");
  assert.equal(localizedCampaignTitle("عنوان",translations,"ar").title,"عنوان");
  for (const locale of SUPPORTED_LOCALES) assert.ok(TRANSLATION_UNAVAILABLE[locale]);
});

test("BUG-01: campaign renderer rechecks classification at send/preview time; ordinary transactional rendering stays available", async () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "mongodb://127.0.0.1:1/isolated-test";
  try {
    let kind="SYSTEM", renders=0;
    const templates = load("lib/communication/template-compat.ts", {
      "@/lib/prisma":{prisma:{smsTemplate:{findUnique:async()=>({name:"Service",body:"Hello",translations:{}})}}},
      "@/lib/locales":{DEFAULT_LOCALE:"ar",isValidLocale:(l:string)=>SUPPORTED_LOCALES.includes(l as any)},
      "@/lib/templates/locale-resolver":{resolveWhatsappBody:()=>({body:"Hello",resolvedLocale:"fr"})},
      "@/lib/templates/render":{}, "@/lib/templates/variables":{mergeText:()=>"Hello"},
      "@/lib/templates/sample-context":{SAMPLE_TEMPLATE_CONTEXT:{}},
      "./template-renderer":{renderTemplatePreview:()=>{renders++;return{rendered:"Hello",variables:[]}}},
      "./template-usage":{findClassifiedTemplate:async()=>({kind,status:"READY"})},
      "./template-kind":load("lib/communication/template-kind.ts",{}),
    });
    assert.equal(await templates.renderChannelTemplate("SMS","id","fr",undefined,"ar","CAMPAIGN"),null); assert.equal(renders,0);
    assert.ok(await templates.renderChannelTemplate("SMS","id","fr")); assert.equal(renders,1);
    kind="CAMPAIGN"; assert.ok(await templates.renderChannelTemplate("SMS","id","fr",undefined,"ar","CAMPAIGN"));
  } finally { if(previous === undefined) Reflect.deleteProperty(process.env, "DATABASE_URL"); else process.env.DATABASE_URL=previous; }
});

test("BUG-01: adding a WhatsApp locale does not change an existing classification or Meta category", async () => {
  const row={id:"111111111111111111111111",kind:"SYSTEM",purpose:"MARKETING",category:"MARKETING",name:"Existing",body:"Hello",translations:{ar:{body:"Hello"}}};
  let written:any;
  const prisma={whatsappTemplate:{findUnique:async()=>row,update:async({data}:any)=>{written=data;return{...row,...data}}},messageTrigger:{findMany:async()=>[]}};
  const classify=load("lib/communication/template-event-classification.ts",{"@/lib/prisma":{prisma},"./template-kind":load("lib/communication/template-kind.ts",{})});
  const route=load("app/api/templates/whatsapp/[id]/route.ts",{
    "@/lib/prisma":{prisma},"@/lib/communication/template-event-classification":classify,
    "@/lib/communication/template-usage":{templateInUse:async()=>true},
    "@/lib/communication/whatsapp-template-schema":require("../lib/communication/whatsapp-template-schema.ts"),
    "@/lib/communication/template-locale-media":{unsubmittedTemplateLocales:()=>[]},
    "@/lib/communication/whatsapp-template-guard":{submittedMetaLocales:async()=>new Set(["ar","fr"]),rejectDisallowedTemplateEdit:async()=>null},
    "@/lib/communication/meta-template-publisher":{publishWhatsappTemplateToMeta:()=>{throw new Error("Unexpected provider call");}},
    "next-auth":{getServerSession:async()=>({user:{role:"ADMIN"}})},
    "@/app/api/auth/[...nextauth]/options":{authOptions:{}},
    "@/lib/dashboard/api-auth":{requireAdminOrDashboardPermission:()=>null},
    "@/lib/audit-log":{auditActorFromDashboardSession:()=>({}),writeAuditLog:async()=>{}},
  });
  const response=await route.PATCH({json:async()=>({metaCategory:"MARKETING",translations:{fr:{body:"Bonjour"}}})},{params:Promise.resolve({id:row.id})});
  assert.equal(response.status,200);assert.equal(written.kind,undefined);assert.equal(written.category,undefined);
  assert.equal((await response.json()).template.kind,"SYSTEM");
});

test("BUG-01: creating or editing a campaign cannot bypass template classification with a typed ID", async()=>{
  const previous=process.env.DATABASE_URL;process.env.DATABASE_URL="mongodb://127.0.0.1:1/qa";
  try{
    let writes=0,kind="SYSTEM";
    const campaign={id:"campaign",status:"DRAFT",metadata:{},channel:"EMAIL"};
    const service=load("lib/communication/campaign-service.ts",{
      "./template-usage":{findClassifiedTemplate:async()=>({kind,status:"READY"})},
      "@/lib/prisma":{prisma:{communicationCampaign:{findUnique:async()=>campaign,create:async()=>{writes++;return campaign},update:async()=>{writes++;return campaign}}}},
      "@/lib/audit-log":{writeAuditLog:async()=>{}},
      "./communication-runtime-types":{isCommunicationChannel:(c:string)=>["EMAIL","SMS","WHATSAPP"].includes(c)},
      "@/lib/dashboard/safe-count":{safeCountValue:()=>0},
    });
    assert.equal((await service.createCampaign({name:"Campaign",channel:"EMAIL",templateGroupId:"template"})).status,409);
    assert.equal((await service.updateCampaign("campaign",{templateGroupId:"template"})).status,409);assert.equal(writes,0);
    kind="CAMPAIGN";assert.equal((await service.createCampaign({name:"Campaign",channel:"EMAIL",templateGroupId:"template"})).ok,true);assert.equal(writes,1);
  }finally{if(previous===undefined)Reflect.deleteProperty(process.env,"DATABASE_URL");else process.env.DATABASE_URL=previous;}
});

test("BUG-10/NEW-01: actual contact component links all controls and localizes subjects in eight languages", async()=>{
  const {renderToStaticMarkup}=await import("react-dom/server");
  const subjects = await import("../lib/messages/subjects");
  for (const locale of SUPPORTED_LOCALES) {
  const component=load("app/[locale]/contact-us/page.tsx",{
    "next-intl":{useLocale:()=>locale,useTranslations:()=>((key:string)=>key)},
    "@/lib/messages/subjects":subjects,
    "@/lib/social-links":{getSocialLinks:()=>({})},"@vercel/analytics":{track:()=>{}},
  });
  const React=await import("react");
  const html=renderToStaticMarkup(React.createElement(component.default));
  for(const field of ["name","phone","email","messageType","message"]){
    assert.ok(html.includes(`for="contact-${field}"`),field);assert.ok(html.includes(`id="contact-${field}"`),field);
  }
  assert.ok(html.includes(subjects.subjectLabel("DONATION_ISSUE", locale)));
  assert.ok(!html.includes('value="COMPLAINT"'));
  }
});

test("BUG-11: actual server not-found component renders localized recovery links in every public locale",async()=>{
  const {renderToStaticMarkup}=await import("react-dom/server");
  for(const locale of SUPPORTED_LOCALES){
    const component=load("app/[locale]/not-found.tsx",{
      "next-intl/server":{getLocale:async()=>locale},
      "@/lib/locales":{isValidLocale:(l:string)=>SUPPORTED_LOCALES.includes(l as any)},
      "@/lib/not-found-copy":{NOT_FOUND_COPY},
    });
    const html=renderToStaticMarkup(await component.default());
    assert.ok(html.includes(`href="/${locale}/campaigns"`));assert.ok(html.includes(NOT_FOUND_COPY[locale].title));
    assert.ok(html.includes(`dir="${locale==="ar"?"rtl":"ltr"}"`));
  }
});

test("BUG-01: removing a disabled legacy event retains its template's automatic identity", async()=>{
  for(const channel of ["EMAIL","SMS","WHATSAPP"]){
    const row={kind:"CAMPAIGN",purpose:"MARKETING"};let removed=false;
    const delegate={updateMany:async({data}:any)=>{assert.equal(removed,false);Object.assign(row,data);return{count:1}}};
    const prisma={emailTemplate:delegate,smsTemplate:delegate,whatsappTemplate:delegate,messageTrigger:{findUnique:async()=>({channel,templateId:"template"}),delete:async()=>{removed=true;return{channel,event:"DONATION_PAID",id:"event"}}}};
    const usage=load("lib/communication/template-usage.ts",{"@/lib/prisma":{prisma},"./template-kind":load("lib/communication/template-kind.ts",{})});
    const route=load("app/api/templates/triggers/[id]/route.ts",{
      "@/lib/communication/template-usage":usage,"@/lib/prisma":{prisma},
      "next-auth":{getServerSession:async()=>({user:{role:"ADMIN"}})},
      "@/app/api/auth/[...nextauth]/options":{authOptions:{}},"@/lib/dashboard/api-auth":{requireAdminOrDashboardPermission:()=>null},
      "@/lib/audit-log":{auditActorFromDashboardSession:()=>({}),writeAuditLog:async()=>{}},
      "@/lib/events/catalog":{MAX_COOLDOWN_DAYS:365,MAX_LAPSE_DAYS:365,MIN_COOLDOWN_DAYS:1,MIN_LAPSE_DAYS:1},
      "@/lib/communication/trigger-preflight":{preflightTrigger:async()=>({ok:true})},
    });
    assert.equal((await route.DELETE({},{params:Promise.resolve({id:"event"})})).status,200);
    assert.equal(row.kind,"SYSTEM");assert.equal(row.purpose,"MARKETING");assert.equal(removed,true);
  }
});


test("NEW-01: German contact subjects are localized without changing their stored identity", async () => {
  const { MESSAGE_SUBJECTS, subjectLabel, encodeMessageBodyWithSubject, decodeMessageBodySubject } = await import("../lib/messages/subjects");
  const expected = ["Beschwerde", "Problem mit einer Spende", "Unterstützung einer Kampagne", "Partnerschaft", "Freiwilligenarbeit", "Allgemeine Anfrage"];
  for (const [index, subject] of MESSAGE_SUBJECTS.entries()) {
    assert.equal(subjectLabel(subject, "de"), expected[index]);
    assert.equal(subjectLabel(subject, "de-DE"), expected[index]);
    assert.deepEqual(decodeMessageBodySubject(encodeMessageBodyWithSubject("Test", subject)), { subject, body: "Test" });
    for (const locale of SUPPORTED_LOCALES) assert.ok(subjectLabel(subject, locale));
  }
});

test("NEW-02: article and listing dates support all eight public locales", async () => {
  const { publicDateLocale } = await import("../lib/public-date-locale");
  const { formatDistance } = await import("date-fns");
  const codes = { ar: "ar", en: "en-US", fr: "fr", tr: "tr", de: "de", es: "es", pt: "pt", id: "id" };
  for (const locale of SUPPORTED_LOCALES) {
    assert.equal(publicDateLocale(locale).code, codes[locale]);
    const label = formatDistance(new Date("2026-01-01T00:00:00Z"), new Date("2026-10-01T00:00:00Z"), { addSuffix: true, locale: publicDateLocale(locale) });
    if (locale === "en") assert.equal(label, "9 months ago");
    else assert.ok(!label.includes("months ago"), `${locale}: ${label}`);
  }
  assert.equal(publicDateLocale("fr-FR").code, "fr");
  assert.equal(publicDateLocale("unknown").code, "en-US");
});


test("BUG-11 release regression: Next 16 resolves the same request config in both bundlers", () => {
  const config = load("next.config.ts", { "next-intl/plugin": { default: require("next-intl/plugin") } });
  assert.equal(config.turbopack.resolveAlias["next-intl/config"], "./i18n/request.ts");
  const webpackConfig = config.webpack({context:process.cwd(),resolve:{alias:{existing:"preserved"}}}, {});
  assert.equal(webpackConfig.resolve.alias["next-intl/config"], `${process.cwd()}/i18n/request.ts`);
  assert.equal(webpackConfig.resolve.alias.existing, "preserved");
});


test("Release font regression: bundled fonts contain the expected families, weights and multilingual glyphs", () => {
  const { create } = require("fontkit");
  for (const [name, weight] of [["Regular",400],["Medium",500],["SemiBold",600],["Bold",700]]) {
    const font = create(readFileSync(`app/fonts/Poppins-${name}.woff2`));
    assert.match(font.familyName, /^Poppins(?: |$)/);
    assert.equal(font["OS/2"].usWeightClass, weight);
    for (const char of "éèçĞİşßñãõáöü") assert.ok(font.hasGlyphForCodePoint(char.codePointAt(0)), char);
  }
  const arabic = create(readFileSync("app/fonts/NotoKufiArabic-Variable.woff2"));
  assert.equal(arabic.familyName, "Noto Kufi Arabic");
  assert.ok(arabic.variationAxes.wght.min <= 400 && arabic.variationAxes.wght.max >= 700);
  for (const char of "قرةالعيونشكراً") assert.ok(arabic.hasGlyphForCodePoint(char.codePointAt(0)), char);
});
