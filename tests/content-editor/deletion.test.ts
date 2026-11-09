import test from "node:test";
import assert from "node:assert/strict";
import { deleteContentSafely } from "../../lib/content-editor/deletion";
import { fingerprint, type Store } from "../../lib/content-editor/service";
import { CONFIG, type ContentKind, type ContentRecord } from "../../lib/content-editor/contracts";

function fixture(kind:ContentKind,fields:ContentRecord={},references:Record<string,boolean>={},fail=false){
  let state={row:{id:"item",title:"محتوى",name:"محتوى",translations:[],updates:[],...fields} as ContentRecord,writes:[] as string[],history:[] as unknown[]};
  const adapter=(data:typeof state):Store=>({transaction:async fn=>{const draft=structuredClone(data);const result=await fn(adapter(draft));state=draft;return result;},model:name=>({
    findUnique:async()=>name===CONFIG[kind].model?data.row:null,
    findFirst:async()=>references[name]?{id:"reference"}:null,
    findMany:async()=>[],
    create:async args=>{data.history.push(args);return{id:"snapshot"};},
    update:async(args:any)=>{data.writes.push(name);Object.assign(data.row,args.data);return data.row;},
    upsert:async()=>({}),
    deleteMany:async()=>{if(fail)throw new Error("WRITE_FAILED");data.writes.push(name);return{count:1};},
  })});
  return{db:adapter(state),read:()=>state,input:{kind,id:"item",confirmation:"محتوى",revision:fingerprint(state.row)}};
}

for(const [label,fields,refs] of [
  ["collected money",{currentAmount:1},{}],
  ["offline money",{baselineAmount:1},{}],
  ["donation history",{}, {donationItem:true}],
  ["subscription reference",{}, {subscriptionItem:true}],
  ["impact backing",{}, {impactCampaign:true}],
] as Array<[string,ContentRecord,Record<string,boolean>]>) {
  test(`campaign deletion rejects ${label} without mutations`,async()=>{
    const f=fixture("campaigns",fields,refs);await assert.rejects(deleteContentSafely(f.db,f.input),{status:409});
    assert.deepEqual(f.read().writes,[]);assert.deepEqual(f.read().history,[]);
  });
}
test("deletion requires exact name and the current revision",async()=>{
  const f=fixture("campaigns");
  await assert.rejects(deleteContentSafely(f.db,{...f.input,confirmation:""}),{status:400});
  await assert.rejects(deleteContentSafely(f.db,{...f.input,revision:"stale"}),{status:409});
  assert.deepEqual(f.read().writes,[]);
});
test("unfunded campaign deletion preserves its record and snapshots while removing cart/programme references",async()=>{
  const f=fixture("campaigns");await deleteContentSafely(f.db,f.input);
  assert.equal(f.read().row.isDeleted,true);assert.equal(f.read().history.length,1);
  assert.deepEqual(f.read().writes,["campaign","cartItem","superCategoryItem"]);
});
for(const ref of ["campaign","donationCategoryItem","subscriptionCategoryItem"]){
  test(`category deletion protects ${ref} references`,async()=>{
    const f=fixture("categories",{}, {[ref]:true});await assert.rejects(deleteContentSafely(f.db,f.input),{status:409});assert.deepEqual(f.read().writes,[]);
  });
}
test("blog deletion snapshots texts and removes translations and programme links atomically",async()=>{
  const f=fixture("blog");await deleteContentSafely(f.db,f.input);assert.deepEqual(f.read().writes,["postTranslation","post","superCategoryItem"]);assert.equal(f.read().history.length,1);
});
test("failed deletion rolls back the snapshot and parent mutation",async()=>{
  const f=fixture("campaigns",{}, {},true);await assert.rejects(deleteContentSafely(f.db,f.input),/WRITE_FAILED/);assert.deepEqual(f.read().writes,[]);assert.deepEqual(f.read().history,[]);assert.equal(f.read().row.isDeleted,undefined);
});

test("untitled content requires the stable item identifier as confirmation",async()=>{
  const f=fixture("blog",{title:"",name:""});
  await assert.rejects(deleteContentSafely(f.db,f.input),{status:400});
  await deleteContentSafely(f.db,{...f.input,confirmation:"item"});
  assert.equal(f.read().history.length,1);
});
