/* Free Foundations teaching parity — five original fictional studios.
 * Pure calculations and source/entitlement controls; no real trading or grades.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('assets/js/free-foundations-teaching-studio-v3.js','utf8');
const scope=vm.createContext({Number,Math,Object,String,Error});
vm.runInContext(source,scope,{filename:'free-foundations-teaching-studio-v3.js'});
const studio=scope.GroundUpFreeStudioV3;
assert.equal(typeof studio.mount,'function');
assert.deepEqual(Array.from(studio.scenarios),[1,2,3,4,5]);
const day1=studio.compute(1,30),day1Large=studio.compute(1,120);
assert.match(day1.detail,/Only 30/);
assert.match(day1Large.detail,/cannot guarantee/);
const candle=studio.compute(2,21);
assert.equal(candle.body,1);assert.equal(candle.range,2);assert.equal(candle.upper,.5);assert.equal(candle.lower,.5);
assert.match(studio.compute(2,19.5).main,/Bearish/);
assert.match(studio.compute(2,20).main,/Doji/);
const pauseEarly=studio.compute(3,490),pauseLate=studio.compute(3,503);
assert.match(pauseEarly.detail,/08:17 repost: FUTURE/);
assert.match(pauseEarly.detail,/08:21 screenshot: FUTURE/);
assert.doesNotMatch(pauseLate.detail,/FUTURE/);
assert.match(studio.compute(4,0).main,/UNVERIFIED/);
assert.match(studio.compute(4,2).detail,/liquidity still unknown/);
const risk=studio.compute(5,9.8),wide=studio.compute(5,9.5);
assert.match(risk.main,/100 illustrative whole shares/);
assert.match(risk.detail,/\$1,000\.00/);
assert.match(wide.main,/40 illustrative whole shares/);
assert.match(studio.compute(5,9.95).sub,/No order was placed/);
for(const [day,value] of [[1,5],[2,25],[3,470],[4,3],[5,10]]){
 assert.throws(()=>studio.compute(day,value),/Unsupported fictional/);
}
const html=readFileSync('bootcamp-academy.html','utf8');
const flow=readFileSync('assets/js/bootcamp-academy-v014168.js','utf8');
assert(html.includes('assets/js/free-foundations-teaching-studio-v3.js'));
assert(html.includes('assets/css/free-foundations-teaching-studio-v3.css'));
assert(flow.includes('studio?.mount?.(d.day,panels[2],panels[4])'));
assert(flow.includes("catalog.href='labs.html'"));
assert(source.includes('No live quote, historical OHLCV, order, outcome or official mastery'));
assert(source.includes('This ungraded practice does not award mastery.'));
assert(!source.includes('/api/')&&!source.includes('fetch('),'Teaching scenes must not hit private APIs');
console.log('PASS: five interactive fictional teaching studios, correct math/time, no-lookahead, honest access boundaries.');
