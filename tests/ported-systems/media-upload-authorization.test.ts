import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {userHasDashboardPermission} from "../../lib/dashboard/permissions";
const areas=["campaigns","categories","blog","slides","siteContent"] as const;
const canUpload=(user:{role?:string;dashboardPermissions?:string[]})=>
  areas.some(key=>userHasDashboardPermission(user,key));

test("donor/unknown staff cannot upload media even when authenticated",()=>{
 assert.equal(canUpload({role:"DONOR",dashboardPermissions:[]}),false);
 assert.equal(canUpload({role:"STAFF",dashboardPermissions:["messages"]}),false);
 assert.equal(canUpload({role:"STAFF",dashboardPermissions:["revenue"]}),false);
});
test("authorized content editor and admin retain uploads",()=>{
 assert.equal(canUpload({role:"STAFF",dashboardPermissions:["blog"]}),true);
 assert.equal(canUpload({role:"STAFF",dashboardPermissions:["categories"]}),true);
 assert.equal(canUpload({role:"STAFF",dashboardPermissions:["slides"]}),true);
 assert.equal(canUpload({role:"ADMIN",dashboardPermissions:[]}),true);
});
test("upload permission checked before request body and storage writes",()=>{
 const source=readFileSync("app/api/upload/route.ts","utf8");
 const permission=source.indexOf("const canUpload =");
 const body=source.indexOf("request.formData()");
 const storage=source.indexOf("await uploadBuffer(buffer");
 assert.ok(permission>=0 && permission<body && body<storage);
 assert.match(source,/if \(!canUpload\)/);
});
