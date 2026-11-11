import test from "node:test";
import assert from "node:assert/strict";
const providerModule = await import("../../lib/tracking/provider-runtime-policy.ts");
const loaderModule = await import("../../lib/tracking/google-script-policy.ts");
const {
  LEGACY_CLARITY_PROJECT_ID, LEGACY_GTM_CONTAINER_ID,
  validateClarityProjectId, validateGtmContainerId,
  runtimeProviderSettings, providerConfigurationStatus,
} = providerModule.default ?? providerModule;
const { loadConfiguredGoogleTagManager, initializeGoogleTracking } = loaderModule.default ?? loaderModule;

const privacyModule = await import("../../lib/tracking/clarity-privacy-policy.ts");
const { isSensitiveClarityPath, isSensitiveClarityQuery, mayInitializeClarity } = privacyModule.default ?? privacyModule;

test("Clarity fails closed without explicit consent, honors opt-out and excludes sensitive routes",()=>{
  const publicPages=["/ar","/en/campaigns","/tr/about-us","/ar/campaign/fixture"];
  const forbidden=["/dashboard/platform-connections/tracking","/ar/account",
    "/ar/checkout","/ar/success/fixture","/en/donation-failed","/ar/receipt/fixture",
    "/ar/certificate","/auth/signin","/api/tracking/config","/en/profile","/tr/subscriptions"];
  for(const path of publicPages){
    assert.equal(isSensitiveClarityPath(path),false,path);
    assert.equal(mayInitializeClarity(path,null),false,path);
    assert.equal(mayInitializeClarity(path,"denied"),false,path);
    assert.equal(mayInitializeClarity(path,"granted"),true,path);
  }
  for(const path of forbidden){
    assert.equal(isSensitiveClarityPath(path),true,path);
    assert.equal(mayInitializeClarity(path,"granted"),false,path);
  }
});


test("Clarity client route guard does not initialize on admin, account or consent-denied visits",async()=>{
  const {readFileSync}=await import("node:fs");
  const {runInNewContext}=await import("node:vm");
  const ts=(await import("typescript")).default;
  const source=readFileSync("components/MicrosoftClarity.tsx","utf8");
  const code=ts.transpileModule(source,{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
  }).outputText;
  const Clarity={initCalls:[],init(id){this.initCalls.push(id)}};
  const state={pathname:"/dashboard/platform-connections/tracking",consent:"granted",requests:0,stops:0,starts:0};
  const browser={
    __clarityInitialized:false,location:{pathname:"/ar"},
    addEventListener:()=>{},removeEventListener:()=>{},
    localStorage:{getItem:()=>state.consent},
    clarity:(event)=>{if(event==="stop")state.stops++;if(event==="start")state.starts++},
  };
  const doc={scripts:[]};
  const component={exports:{}};
  const mocks={
    react:{useEffect:(fn)=>fn(),useState:(initial)=>[initial,()=>{}]},
    "next/navigation":{usePathname:()=>state.pathname},
    "@microsoft/clarity":{__esModule:true,default:Clarity},
    "@/lib/tracking/provider-runtime-policy":{validateClarityProjectId},
    "@/lib/tracking/clarity-privacy-policy":{isSensitiveClarityPath,mayInitializeClarity}
  };
  runInNewContext(code,{module:component,exports:component.exports,
    window:browser,document:doc,AbortController,URL,
    fetch:async()=>{state.requests++;return {ok:true,json:async()=>({clarityProjectId:"u614k028k2",clarityEnabled:true})}},
    require:(id)=>{if(!(id in mocks))throw Error("unexpected dependency "+id);return mocks[id]}
  });
  const render=component.exports.default;
  async function settle(){for(let i=0;i<4;i++)await Promise.resolve()}
  render();await settle();
  assert.equal(state.requests,0);assert.equal(Clarity.initCalls.length,0);
  state.pathname="/ar/checkout";render();await settle();
  assert.equal(state.requests,0);assert.equal(Clarity.initCalls.length,0);
  state.pathname="/ar";state.consent="denied";render();await settle();
  assert.equal(state.requests,0);
  state.consent="granted";render();await settle();
  assert.equal(state.requests,1);assert.deepEqual(Clarity.initCalls,["u614k028k2"]);
  state.pathname="/ar/campaigns";render();await settle();
  assert.equal(state.requests,1);assert.equal(Clarity.initCalls.length,1);
  state.pathname="/ar/account";render();await settle();
  assert.equal(state.stops,1);
  assert.equal(state.requests,1);
  state.pathname="/ar/campaigns";render();await settle();
  assert.equal(state.starts,1);
  assert.equal(state.requests,1);
  state.consent="denied";render();await settle();
  assert.equal(state.stops,2);
  state.pathname="/ar/checkout";render();await settle();
  assert.equal(state.starts,1);
  state.pathname="/ar";state.consent="granted";render();await settle();
  assert.equal(state.starts,2);
  assert.equal(Clarity.initCalls.length,1);
});

test("Clarity rejects donor identifiers in URLs before any recorder is loaded",()=> {
  for (const search of [
    "?email=someone%40fixture.invalid", "?payment_token=example", "?donationId=abc",
    "?receipt=abc", "?client_secret=abc", "?session_id=abc", "?note=pi_abcdef",
  ]) {
    assert.equal(isSensitiveClarityQuery(search),true,search);
    assert.equal(mayInitializeClarity("/ar/campaigns","granted",search),false,search);
  }
  assert.equal(isSensitiveClarityQuery("?utm_source=google&utm_campaign=winter"),false);
  assert.equal(mayInitializeClarity("/ar/campaigns","granted","?utm_source=google"),true);
  assert.equal(isSensitiveClarityPath("/ar/donations/fixture"),true);
  assert.equal(isSensitiveClarityPath("/en/donation/fixture"),true);
});

test("Clarity and GTM reject injected script and accept normalized IDs",()=>{
  for(const value of ["<script>evil()</script>","https://clarity.ms/","id onload=alert(1)","",null,42]){
    assert.equal(validateClarityProjectId(value),null);
  }
  assert.equal(validateClarityProjectId("u614k028k2"),"u614k028k2");
  for(const value of ["<img src=x>","GTM-XY;alert(1)","GTM-","G-FAKE","https://tagmanager.google.com"]){
    assert.equal(validateGtmContainerId(value),null);
  }
  assert.equal(validateGtmContainerId("gtm-mmnbqqwb"),"GTM-MMNBQQWB");
});

test("saved Clarity settings take precedence over old NEXT_PUBLIC_CLARITY_ID",()=>{
  const old = process.env.NEXT_PUBLIC_CLARITY_ID;
  try {
    process.env.NEXT_PUBLIC_CLARITY_ID="env123456";
    assert.equal(runtimeProviderSettings(null).clarityProjectId,"env123456");
    assert.equal(runtimeProviderSettings({clarityEnabled:true,clarityProjectId:"db123456"}).clarityProjectId,"db123456");
    assert.equal(runtimeProviderSettings({clarityEnabled:false,clarityProjectId:"db123456"}).clarityEnabled,false);
    assert.equal(runtimeProviderSettings({clarityEnabled:true,clarityProjectId:null}).clarityEnabled,false);
  } finally {
    if (old===undefined) delete process.env.NEXT_PUBLIC_CLARITY_ID;
    else process.env.NEXT_PUBLIC_CLARITY_ID=old;
  }
});

test("known legacy scripts are preserved until operator explicitly disables them",()=>{
  const legacy=runtimeProviderSettings(null);
  assert.equal(legacy.clarityProjectId,LEGACY_CLARITY_PROJECT_ID);
  assert.equal(legacy.googleTagManagerId,LEGACY_GTM_CONTAINER_ID);
  assert.equal(legacy.clarityEnabled,true);
  assert.equal(legacy.googleTagManagerEnabled,true);
  const explicitlyDisabled=runtimeProviderSettings({
    clarityEnabled:false,googleTagManagerEnabled:false,
    clarityProjectId:"u614k028k2",googleTagManagerId:"GTM-MMNBQQWB"
  });
  assert.equal(explicitlyDisabled.clarityEnabled,false);
  assert.equal(explicitlyDisabled.googleTagManagerEnabled,false);
  const edited=runtimeProviderSettings({
    clarityEnabled:true,clarityProjectId:"qa123456",
    googleTagManagerEnabled:true,googleTagManagerId:"GTM-QA1234",
  });
  assert.equal(edited.clarityProjectId,"qa123456");
  assert.equal(edited.googleTagManagerId,"GTM-QA1234");
  assert.equal(providerConfigurationStatus(false,"qa123456"),"disabled");
  assert.equal(providerConfigurationStatus(true,null),"unconfigured");
});

test("GTM and gtag script loaders never duplicate across remounts",()=>{
  const scripts=[];
  const document={
    scripts,
    createElement:()=>({async:false,src:"",onerror:null}),
    head:{appendChild(node){scripts.push(node)}},
  };
  const window={dataLayer:[]};
  const input={googleTagManagerId:"GTM-QA1234",googleTagManagerEnabled:true};
  loadConfiguredGoogleTagManager(input,window,document);
  loadConfiguredGoogleTagManager(input,window,document);
  assert.equal(scripts.filter(x=>x.src.includes("/gtm.js")).length,1);
  assert.equal(window.dataLayer.filter(x=>x.event==="gtm.js").length,1);
  initializeGoogleTracking({gaMeasurementId:"G-QA123456",adsIds:["AW-123456"]},window,document);
  initializeGoogleTracking({gaMeasurementId:"G-QA123456",adsIds:["AW-123456"]},window,document);
  assert.equal(scripts.filter(x=>x.src.includes("/gtag/js")).length,1);
  const gtagConfigs=window.dataLayer.filter(x=>x[0]==="config");
  assert.equal(gtagConfigs.length,2);
  assert.equal(window.dataLayer.filter(x=>x[0]==="event" && x[1]==="purchase").length,0);
  assert.equal(window.dataLayer.filter(x=>x.event==="purchase").length,0);
  loadConfiguredGoogleTagManager({googleTagManagerId:"GTM-QA1234",googleTagManagerEnabled:false},window,document);
  assert.equal(scripts.length,2);
});
