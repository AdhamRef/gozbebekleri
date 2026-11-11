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
const { isSensitiveClarityPath, mayInitializeClarity } = privacyModule.default ?? privacyModule;

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
