import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCampaignConfig, validateCampaignUpdates, validateFinancialAdjustment, validateReligiousAdjustment, validateSlugAdjustment, FINANCE_CONFIRMATION, RELIGIOUS_CONFIRMATION, SLUG_CONFIRMATION } from "../../lib/content-editor/advanced-settings";
import { saveCampaignAdvanced } from "../../lib/content-editor/advanced-relations";
import { settingsFor } from "../../lib/content-editor/workspace";
import { validateWorkspaceSettings } from "../../lib/content-editor/workspace-settings";
import { fieldsFor, validateChanges, type ContentRecord } from "../../lib/content-editor/contracts";
import type { Delegate, Store } from "../../lib/content-editor/service";

test("advanced donation, share and team settings round-trip all currency overrides", () => {
  const row = { goalType: "OPEN", suggestedDonations:{amounts:[10,20],byCurrency:{TRY:[300,600],EUR:[15,30]}}, suggestedShareCounts:{counts:[1,2,5],priceByCurrency:{TRY:120,EUR:4}}, suggestedTeamSupport:{amounts:[],byCurrency:{TRY:[25,50]}}, shareLabels:{ar:{singular:"وجبة",plural:"وجبات"},en:{singular:"meal",plural:"meals"}} };
  const draft = settingsFor("campaigns", row);
  const changed = Object.fromEntries(["suggestedDonations","suggestedShareCounts","suggestedTeamSupport","shareLabels"].map(key=>[key,draft[key]]));
  assert.deepEqual(validateWorkspaceSettings("campaigns",row,changed),changed);
  assert.deepEqual(validateCampaignConfig("suggestedTeamSupport",null),null);
  assert.deepEqual(validateCampaignConfig("shareLabels",{ar:{singular:"وجبة",plural:""}}),{ar:{singular:"وجبة",plural:"وجبة"}});
});
test("invalid currency configurations are rejected without silently dropping values", () => {
  for (const value of [{amounts:[-1]}, {amounts:[NaN]}, {amounts:[10],byCurrency:{XYZ:[20]}}, {amounts:[10],byCurrency:{USD:[0]}}, {amounts:Array(13).fill(1)}]) assert.throws(()=>validateCampaignConfig("suggestedDonations",value));
  assert.throws(()=>validateCampaignConfig("suggestedShareCounts",{counts:[1.5]}));
  assert.throws(()=>validateCampaignConfig("suggestedShareCounts",{counts:[1],priceByCurrency:{USD:0}}));
  assert.throws(()=>validateCampaignConfig("shareLabels",{xx:{singular:"x",plural:"y"}}));
});
test("sensitive advanced operations require their own explicit typed confirmation", () => {
  assert.throws(()=>validateFinancialAdjustment({desiredTotal:100}));
  assert.throws(()=>validateFinancialAdjustment({desiredTotal:-1,confirmation:FINANCE_CONFIRMATION}));
  assert.equal(validateFinancialAdjustment({desiredTotal:0,confirmation:FINANCE_CONFIRMATION}),0);
  assert.throws(()=>validateReligiousAdjustment({text:"test"}));
  assert.equal(validateReligiousAdjustment({text:"نص محفوظ",confirmation:RELIGIOUS_CONFIRMATION}),"نص محفوظ");
  assert.equal(validateSlugAdjustment({slug:"برنامج-المياه",confirmation:SLUG_CONFIRMATION}),"برنامج-المياه");
  for(const slug of ["../admin","/new","new slug",""])assert.throws(()=>validateSlugAdjustment({slug,confirmation:SLUG_CONFIRMATION}));
  assert.throws(()=>validateWorkspaceSettings("categories",{}, {religiousTextAdjustment:{text:"x",confirmation:RELIGIOUS_CONFIRMATION}}));
});
const achievement = (id?:string):ContentRecord => ({...(id?{id}:{}),title:"إنجاز عربي",description:"تفاصيل الإنجاز",image:"",videoUrl:"",translations:[{locale:"en",title:"Milestone",description:"Milestone details"}]});
test("campaign achievement validation enforces parent ownership, locale integrity and safe media", () => {
  const old=[achievement("owned")];
  assert.equal(validateCampaignUpdates([achievement("owned")],old).length,1);
  assert.throws(()=>validateCampaignUpdates([achievement("foreign")],old));
  assert.throws(()=>validateCampaignUpdates([achievement("owned"),achievement("owned")],old));
  assert.throws(()=>validateCampaignUpdates([{...achievement(),title:""}],old));
  assert.throws(()=>validateCampaignUpdates([{...achievement(),videoUrl:"javascript:alert(1)"}],old));
  assert.throws(()=>validateCampaignUpdates([{...achievement(),translations:[{locale:"en",title:"Only title",description:""}]}],old));
});
test("campaign achievements create, edit and delete only owned records and preserve locale drafts", async () => {
  const calls:{model:string;method:string;args:ContentRecord}[]=[];
  const db={model:(model:string)=>Object.fromEntries(["create","update","upsert","deleteMany"].map(method=>[method,async(args:ContentRecord)=>{calls.push({model,method,args});return{id:method==="create"?"created":"kept"};}])) as unknown as Delegate} as Store;
  const kept=achievement("kept"), removed=achievement("removed");
  await saveCampaignAdvanced(db,"campaign",{updates:[kept,removed]},{campaignUpdates:[{...kept,title:"عنوان جديد"},achievement()]});
  assert.deepEqual(calls.find(c=>c.model==="update"&&c.method==="deleteMany")?.args,{where:{campaignId:"campaign",id:{in:["removed"]}}});
  assert.deepEqual(calls.find(c=>c.model==="update"&&c.method==="update")?.args.where,{id:"kept",campaignId:"campaign"});
  assert.equal((calls.find(c=>c.model==="update"&&c.method==="create")?.args.data as ContentRecord).campaignId,"campaign");
  assert.equal(calls.filter(c=>c.model==="updateTranslation"&&c.method==="upsert").length,2);
});
test("manual totals use the native settled-donation calculation and preserve its floor", async () => {
  for(const [desired,expectedBaseline,expectedTotal] of [[500,350,500],[20,0,150]]){
    let saved:ContentRecord={};
    const db={model:(name:string)=>({findMany:async(args:ContentRecord)=>{assert.equal(name,"donationItem");assert.deepEqual(args.where,{campaignId:"campaign",donation:{status:"PAID",paidAt:{not:null}}});return[{amount:1000,amountUSD:100},{amount:50,amountUSD:null}];},update:async(args:{data:ContentRecord})=>{saved=args.data;return saved;}} as unknown as Delegate)} as Store;
    await saveCampaignAdvanced(db,"campaign",{},{financialAdjustment:{desiredTotal:desired,confirmation:FINANCE_CONFIRMATION}});
    assert.deepEqual(saved,{baselineAmount:expectedBaseline,currentAmount:expectedTotal});
  }
});
test("localized images are manual optional content fields and reject executable URLs", () => {
  for(const kind of ["campaigns","blog"] as const){
    const fields=fieldsFor(kind,{}), image=fields.find(f=>f.key==="image");
    assert.equal(image?.optional,true);assert.equal(image?.locked,true);
    assert.deepEqual(validateChanges(fields,{image:"/uploads/en.jpg"}),{image:"/uploads/en.jpg"});
    assert.throws(()=>validateChanges(fields,{image:"javascript:alert(1)"}));
  }
});
