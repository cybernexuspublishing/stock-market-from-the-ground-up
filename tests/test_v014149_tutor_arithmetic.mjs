import assert from 'node:assert/strict';
import {hypotheticalPosition,hypotheticalLongPnL,hypotheticalCandleBodyPercent} from '../functions/_lib/tutor-arithmetic-v014149.js';
const p=hypotheticalPosition({accountEquity:400,riskPercent:1,entry:2,stop:1.9,target:2.2});
assert.equal(p.ok,true);assert.equal(p.shares,40);assert.equal(p.actualRisk,4);
assert.equal(p.capitalRequired,80);assert.equal(p.rewardRiskRatio,2);
assert.equal(hypotheticalPosition({accountEquity:400,riskPercent:1,entry:2,stop:2.1}).ok,false);
assert.equal(hypotheticalPosition({accountEquity:400,riskPercent:1,entry:2,stop:1.9,target:1.8}).ok,false);
assert.equal(hypotheticalPosition({accountEquity:10,riskPercent:1,entry:20,stop:19}).shares,0);
assert.equal(hypotheticalLongPnL({entry:2,exit:2.1,shares:40}).pnl,4);
assert.equal(hypotheticalLongPnL({entry:2,exit:1.9,shares:40}).pnl,-4);
assert.equal(hypotheticalLongPnL({entry:2,exit:1.9,shares:-1}).ok,false);

const candle=hypotheticalCandleBodyPercent({open:2,high:2.1,low:1.9,close:2.06});
assert.equal(candle.ok,true);assert.equal(candle.hypothetical,true);
assert(Math.abs(candle.bodyPercentOfRange-30)<0.0000001);
assert.equal(candle.direction,'bullish');
assert.equal(hypotheticalCandleBodyPercent({open:2,high:2.1,low:1.9,close:2}).bodyPercentOfRange,0);
assert.equal(hypotheticalCandleBodyPercent({open:2.1,high:2.1,low:1.9,close:1.9}).bodyPercentOfRange,100);
assert.equal(hypotheticalCandleBodyPercent({open:2.1,high:2.1,low:1.9,close:1.9}).direction,'bearish');
for(const args of [{open:2,high:2,low:2,close:2},{open:2,high:1.9,low:1.8,close:2},{open:2,high:2.2,low:2.1,close:2},{open:2,high:2.2,low:-1,close:2},{open:'2',high:2.1,low:1.9,close:2.06}])
 assert.equal(hypotheticalCandleBodyPercent(args).ok,false);

console.log('PASS D09 hypothetical long-only and candle-body mathematics');
