import assert from "node:assert/strict";
import {registerHooks} from "node:module";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {resolve} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";
const dir=mkdtempSync(resolve(tmpdir(),"goz-guest-scope-"));
const guest="bbbbbbbbbbbbbbbbbbbbbbbb",target="cccccccccccccccccccccccc",otherTarget="dddddddddddddddddddddddd";
const first="aaaaaaaaaaaaaaaaaaaaaaaa",unrelated="eeeeeeeeeeeeeeeeeeeeeeee",subId="ffffffffffffffffffffffff";
const state={
 donations:[
  {id:first,donorId:guest,subscriptionId:null},
  {id:unrelated,donorId:guest,subscriptionId:null},
 ],
 subscriptions:[],writes:0,
};
const prisma={
 user:{findUnique:async({where})=>{
  if(where.id===guest)return{id:guest,password:null,accounts:[]};
  return {id:where.id};
 }},
 donation:{findUnique:async({where})=>state.donations.find(d=>d.id===where.id)||null},
 $transaction:async fn=>fn({
   donation:{updateMany:async({where,data})=>{
     let count=0;
     for(const row of state.donations){
       if(row.donorId!==where.donorId)continue;
       if(where.id && row.id!==where.id)continue;
       if(where.subscriptionId && row.subscriptionId!==where.subscriptionId)continue;
       row.donorId=data.donorId;count++;state.writes++;
     }
     return{count};
   }},
   subscription:{updateMany:async({where,data})=>{
     let count=0;
     for(const row of state.subscriptions){
       if(row.id===where.id&&row.donorId===where.donorId){
         row.donorId=data.donorId;count++;
       }
     }
     return{count};
   }},
 }),
};
globalThis.guestScopePrisma=prisma;
writeFileSync(resolve(dir,"db.cjs"),"exports.prisma=globalThis.guestScopePrisma;");
registerHooks({resolve(spec,ctx,next){
 return spec==="@/lib/prisma"
  ?{url:pathToFileURL(resolve(dir,"db.cjs")).href,shortCircuit:true}
  :next(spec,ctx);
}});
const module=await import("../lib/users/link-one-guest-donation.ts");
const {linkOneGuestDonationToTarget}=module.default??module;
let checks=0;
try{
  let result=await linkOneGuestDonationToTarget(first,guest,target);
  assert.equal(result.ok,true);
  assert.equal(result.movedDonations,1);
  assert.equal(state.donations[0].donorId,target);
  assert.equal(state.donations[1].donorId,guest);
  checks++;
  result=await linkOneGuestDonationToTarget(first,guest,otherTarget);
  assert.equal(result.ok,false);
  assert.equal(state.donations[0].donorId,target);
  assert.equal(state.donations[1].donorId,guest);
  checks++;
  // A single subscription can have recurring installments, but an unrelated
  // subscription and other one-time donations must remain under original guest.
  state.donations=[
    {id:first,donorId:guest,subscriptionId:subId},
    {id:"111111111111111111111111",donorId:guest,subscriptionId:subId},
    {id:unrelated,donorId:guest,subscriptionId:null},
    {id:"222222222222222222222222",donorId:guest,subscriptionId:"333333333333333333333333"},
  ];
  state.subscriptions=[{id:subId,donorId:guest}];
  result=await linkOneGuestDonationToTarget(first,guest,target);
  assert.equal(result.ok,true);
  assert.equal(result.movedDonations,2);
  assert.equal(state.donations[0].donorId,target);
  assert.equal(state.donations[1].donorId,target);
  assert.equal(state.donations[2].donorId,guest);
  assert.equal(state.donations[3].donorId,guest);
  assert.equal(state.subscriptions[0].donorId,target);
  checks++;
  console.log(JSON.stringify({summary:"GUEST_CLAIM_SCOPE_PASS",checks,realMongoCalls:0,unrelatedMoved:0}));
}finally{rmSync(dir,{recursive:true,force:true})}
