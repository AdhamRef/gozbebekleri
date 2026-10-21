import { test } from "node:test";
import assert from "node:assert/strict";
import { translateItem, translateToLocales } from "../../lib/content-localization/translate";

test("translation calls the real adapter and preserves protected numbers and URLs", async () => {
  const original = globalThis.fetch,
    key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only-not-a-real-key";
  let called = 0;
  try {
    globalThis.fetch = async (url, options) => {
      called++;
      assert.equal(String(url), "https://api.openai.com/v1/chat/completions");
      const body = JSON.parse(String(options?.body));
      assert.equal(body.response_format.type, "json_object");
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  fields: {
                    title: "Water for 15 families https://example.org/donate",
                    description: "Support 20 families",
                  },
                  richTexts: {},
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    };
    const result = await translateItem(
      {
        fields: {
          title: "ماء لـ 15 عائلة https://example.org/donate",
          description: "دعم 20 عائلة",
        },
      },
      "en",
    );
    assert.equal(called, 1);
    assert.equal(
      result.fields.title,
      "Water for 15 families https://example.org/donate",
    );
    assert.equal(result.fields.description, "Support 20 families");
  } finally {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
  }
});
test("changed amounts are rejected by the adapter before a draft can apply them", async () => {
  const original = globalThis.fetch,
    key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only-not-a-real-key";
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  fields: { title: "Help 99 families" },
                  richTexts: {},
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    const result = await translateItem(
      { fields: { title: "ساعد 15 عائلة" } },
      "en",
    );
    assert.equal(result.fields.title, undefined);
    assert.equal(result.warnings.length, 1);
  } finally {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
  }
});
test("oversized plain fields fail instead of silently translating only the beginning", async () => {
  await assert.rejects(
    translateItem({ fields: { title: "a".repeat(12001) } }, "en"),
    /أطول/,
  );
});
test("protected religious policy never calls the provider", async () => {
  const original = globalThis.fetch;
  let called = false;
  try {
    globalThis.fetch = async () => {
      called = true;
      throw new Error("must not call");
    };
    await assert.rejects(
      translateItem(
        { fields: { title: "آية" }, policy: "RELIGIOUS_LOCKED" },
        "en",
      ),
    );
    assert.equal(called, false);
  } finally {
    globalThis.fetch = original;
  }
});

test("Quran text in ornamental brackets remains immutable", async () => {
 const { missingProtectedTokens } = await import("../../lib/content-localization/protected-tokens");
 assert.equal(missingProtectedTokens("النص ﴿ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾", "Text ﴿ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾").length, 0);
 assert.ok(missingProtectedTokens("النص ﴿ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾", "Text indeed with hardship comes ease").length);
});

test("rich translation retains headings, marks, links and exact structure while localizing numeric formats", async () => {
  const original=globalThis.fetch, key=process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY="test-only-not-a-real-key";
  const source={type:"doc",content:[{type:"heading",attrs:{level:2},content:[{type:"text",text:"ساعد ١٬٠٠٠٫٥٠ EUR"}]},{type:"paragraph",content:[{type:"text",text:"تبرع الآن",marks:[{type:"link",attrs:{href:"https://example.org/donate",target:"_blank"}}]}]}]};
  try {
    globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({fields:{},richTexts:{description:["Ajude 1.000,50 EUR","Doe agora"]}})}}]}),{status:200});
    const result=await translateItem({fields:{},richFields:{description:JSON.stringify(source)}},"pt");
    const actual=JSON.parse(result.richFields.description),expected=structuredClone(source);
    expected.content[0].content[0].text="Ajude 1.000,50 EUR";expected.content[1].content[0].text="Doe agora";
    assert.deepEqual(actual,expected);
    assert.deepEqual(result.warnings,[]);
  } finally {globalThis.fetch=original;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test("unsafe numeric, currency and percentage translations never become accepted suggestions", async () => {
  const original=globalThis.fetch, key=process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY="test-only-not-a-real-key";
  try {
    for(const [source,target] of [["دعم 100.0 USD","Support 1,000 USD"],["تبرع 50%","Donate 50"],["تبرع 100 $","Donate 100 €"]]) {
      globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({fields:{title:target},richTexts:{}})}}]}),{status:200});
      const result=await translateItem({fields:{title:source}},"en");
      assert.equal(result.fields.title,undefined);assert.equal(result.warnings.length,1);
    }
  } finally {globalThis.fetch=original;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test("one failed locale leaves other translations available for review", async () => {
  const original=globalThis.fetch, key=process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY="test-only-not-a-real-key";
  try {
    globalThis.fetch=async(_url,options)=>{
      const request=JSON.parse(String(options?.body));
      if(request.messages[1].content.includes("to French (fr)"))return new Response("temporarily unavailable",{status:503});
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({fields:{title:"Water project"},richTexts:{}})}}]}),{status:200});
    };
    const result=await translateToLocales({fields:{title:"مشروع المياه"}},["en","fr"],2);
    assert.equal(result.translations.en.fields.title,"Water project");
    assert.equal(result.translations.fr,undefined);assert.ok(result.errors.fr);
  } finally {globalThis.fetch=original;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
