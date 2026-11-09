import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {donationChartStatusWhere,donationChartTypeWhere} from "../../lib/dashboard/donation-chart-filter-scope";
const start=new Date("2026-11-01T00:00:00Z"),end=new Date("2026-11-30T23:59:59Z");
test("PAID chart and report use paidAt; FAILED and pending are not revenue",()=>{
 assert.deepEqual(donationChartStatusWhere("PAID",start,end),{status:"PAID",paidAt:{gte:start,lte:end}});
 assert.deepEqual(donationChartStatusWhere("FAILED",start,end),{status:"FAILED",createdAt:{gte:start,lte:end}});
 const pending=donationChartStatusWhere("PENDING",start,end);
 assert.deepEqual(pending.OR,[{paidAt:null},{paidAt:{isSet:false}}]);
});
test("one-time and recurring chart filters recognize unset MongoDB subscription IDs",()=>{
 assert.deepEqual(donationChartTypeWhere("ONE_TIME"),{OR:[{subscriptionId:null},{subscriptionId:{isSet:false}}]});
 assert.deepEqual(donationChartTypeWhere("MONTHLY"),{subscriptionId:{not:null}});
 assert.equal(donationChartTypeWhere("all"),null);
});
test("dashboard chart forwards the same status and type chosen by donation table",()=>{
 const page=readFileSync("app/(dashboard)/dashboard/page.tsx","utf8");
 const chart=page.slice(page.indexOf("const fetchChartData"),page.indexOf("const fetchStats"));
 assert.match(chart,/params\.set\("status", donationsStatusFilter\)/);
 assert.match(chart,/params\.set\("donationType", donationsTypeFilter\)/);
 const api=readFileSync("app/api/admin/donations/chart/route.ts","utf8");
 assert.match(api,/donationChartStatusWhere\(/);
 assert.match(api,/donationChartTypeWhere\(/);
});
