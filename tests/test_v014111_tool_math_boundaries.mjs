// Pure actual trading-math contract v0.14.0.111.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root={};root.globalThis=root;
const content=readFileSync(new URL('../assets/js/advanced-tool-math-v014111.js',import.meta.url),'utf8');
runInNewContext(content,root);
const M=root.GroundUpToolMath;assert(M&&Object.isFrozen(M));
const failures=[
 ()=>M.risk({account:5000,risk:0,entry:10,stop:9}),
 ()=>M.risk({account:5000,risk:-5,entry:10,stop:9}),
 ()=>M.risk({account:0,risk:10,entry:10,stop:9}),
 ()=>M.risk({account:5000,risk:5001,entry:10,stop:9}),
 ()=>M.risk({account:5000,risk:20,entry:10,stop:11,direction:'LONG'}),
 ()=>M.risk({account:5000,risk:20,entry:10,stop:9,direction:'SHORT'}),
 ()=>M.risk({account:5000,risk:20,entry:10,stop:0}),
 ()=>M.risk({account:5000,risk:20,entry:10,stop:9,target:8}),
 ()=>M.risk({account:5000,risk:20,entry:10,stop:9,spread:-.01}),
 ()=>M.risk({account:5000,risk:20,entry:10,stop:9,slippage:-.01}),
 ()=>M.risk({account:5000,risk:20,entry:10,stop:9,spread:NaN}),
 ()=>M.supply({floatShares:100,outstanding:99,volume:10,price:1}),
 ()=>M.supply({floatShares:-1,outstanding:200,volume:10,price:1}),
 ()=>M.supply({floatShares:100,outstanding:200,volume:-10,price:1}),
 ()=>M.liquidity({bid:10,ask:9.99,shares:100,stopDistance:null}),
 ()=>M.liquidity({bid:-10,ask:11,shares:100,stopDistance:null}),
 ()=>M.liquidity({bid:10,ask:11,shares:100.5,stopDistance:null}),
 ()=>M.liquidity({bid:10,ask:11,shares:100,stopDistance:0}),
 ()=>M.execution({decision:10,fill:10.1,shares:-3,direction:'LONG',bid:null,ask:null}),
 ()=>M.execution({decision:10,fill:10.1,shares:100,direction:'SHORT',bid:10.5,ask:10.3}),
 ()=>M.execution({decision:10,fill:10.1,shares:100,direction:'LONG',bid:10,ask:null})
];
for(let i=0;i<failures.length;i++)assert.equal(failures[i]().ok,false,'Invalid boundary #'+i+' must be rejected');
assert.equal(M.number(''),null,'Empty HTML number is NOT a valid entered zero');
assert.equal(M.number(' '),null);
assert.equal(M.number('not-a-number'),null);
assert.equal(M.number('0'),0);
let result=M.risk({account:5000,risk:20,entry:10,stop:9,spread:.1,slippage:.1});
assert.equal(result.ok,true);assert.equal(result.shares,16);assert.equal(result.plannedLoss,19.2);
assert.equal(result.bindingLimit,'risk');
result=M.risk({account:100,risk:500>100?50:10,entry:60,stop:59});
assert.equal(result.shares,1,'Cash-equivalent exposure limit must prevent unsupported leverage');
assert.equal(result.bindingLimit,'cash_exposure');
result=M.risk({account:5000,risk:100,entry:10,stop:11,direction:'SHORT',target:9});
assert.equal(result.ok,true);assert.equal(result.targetR,1);
result=M.supply({floatShares:100,outstanding:1000,volume:350,price:2});
assert.equal(result.turnover,3.5);assert.equal(result.floatPct,10);assert.equal(result.marketCap,2000);
result=M.liquidity({bid:10,ask:10.1,shares:100,stopDistance:.5});
assert.equal(result.oneSpreadCost,10);assert.equal(result.vsRiskPct,20);
result=M.execution({decision:10,fill:10.2,shares:100,direction:'LONG',bid:10,ask:10.1});
assert.equal(result.signedCost,20);
result=M.execution({decision:10,fill:10.2,shares:100,direction:'SHORT',bid:null,ask:null});
assert.equal(result.signedCost,-20);
const ui=readFileSync(new URL('../assets/js/advanced-tools.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../advanced-tool.html',import.meta.url),'utf8');
for(const fn of ['M.risk','M.supply','M.liquidity','M.execution'])assert(ui.includes(fn),'Calculator must consume tested math engine '+fn);
assert(html.indexOf('advanced-tool-math-v014111.js')<html.indexOf('advanced-tools.js'),'Math library must load before workbench');
assert(html.includes('investment advice'),'User must see platform disclaimer');
console.log('PASS v111: 21 invalid math cases rejected; cash risk cap, long/short stop direction, float, quote and fill edge cases calculated correctly.');
