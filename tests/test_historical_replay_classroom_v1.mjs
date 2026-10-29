import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('assets/js/historical-replay-classroom-v1.js','utf8');
new vm.Script(source,{filename:'historical-replay-classroom-v1.js'});
const context={document:{readyState:'loading',addEventListener(){}},Date,Intl,console};
context.globalThis=context;
const instrumented=source.replace("if(document.readyState==='loading')","globalThis.__hrTest={parse,aggregate};\nif(document.readyState==='loading')");
assert.notEqual(instrumented,source,'pure aggregation test hook must be reachable');
vm.runInNewContext(instrumented,context);
const {parse,aggregate}=context.__hrTest;
const base=Date.parse('2024-05-07T13:30:00Z');
const prices=[
 [107.25,107.27,105.66,106.5499,1609887],
 [106.5454,107.18,106.41,107.055,901233],
 [107.0368,107.33,106.78,106.815,526711],
 [106.81,106.86,106.2601,106.605,550692],
 [106.57,107,106.43,106.975,396333]
];
const input=prices.map((p,i)=>parse({timestamp:new Date(base+60000*i).toISOString(),open:p[0],high:p[1],low:p[2],close:p[3],volume:p[4]}));
assert(input.every(Boolean),'actual DIS-style OHLCV must be accepted');
assert.equal(aggregate(input.slice(0,2),3).length,0,'incomplete 3m bars must remain hidden');
assert.equal(aggregate(input.slice(0,4),5).length,0,'incomplete 5m bars must remain hidden');
const three=aggregate(input,3);
assert.equal(three.length,1);
assert.equal(three[0].o,107.25);
assert.equal(three[0].h,107.33);
assert.equal(three[0].l,105.66);
assert.equal(three[0].c,106.815);
assert.equal(three[0].v,1609887+901233+526711);
assert.equal(aggregate(input,5).length,1);
const gap=[input[0],input[1],input[3],input[4]];
assert.equal(aggregate(gap,3).length,0,'missing minute must not be manufactured');
assert.equal(aggregate(input.slice(1),3).length,0,'incomplete and unaligned groups must not be presented');
assert.equal(parse({timestamp:'invalid',open:1,high:2,low:0,close:1,volume:10}),null);
assert.equal(parse({timestamp:new Date(base).toISOString(),open:107,high:106,low:105,close:105,volume:10}),null);
const html=fs.readFileSync('verified-replay.html','utf8');
const training=fs.readFileSync('assets/js/learning.js','utf8');
const api=fs.readFileSync('functions/api/learning-replay-v01492.js','utf8');
assert.match(html,/historical-replay-classroom-v1\.js/);
assert.match(html,/crownlight-chart-tiers-v1\.js/);
assert.match(training,/Open Website Classroom/);
assert.match(training,/Independent thinkorswim Instructions/);
assert.match(api,/replayAvailableToEntitlement/);
assert.match(api,/if\(!s\.decision_locked\)/);
assert.match(source,/groundup:replay-observation/);
assert.match(source,/groundup:replay-reset/);
assert.match(source,/clearMemberState/);
assert.match(source,/Pause for Talia/);
for(const sec of [120,90,60,45,30,20,15,10,5,2,1])assert.match(source,new RegExp('\\b'+sec+'\\b'));
console.log('PASS: classroom syntax, real OHLCV aggregation, incomplete bars, source provenance, server-only replay, optional thinkorswim and slow speeds.');
