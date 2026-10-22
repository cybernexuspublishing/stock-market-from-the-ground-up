import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root={TextEncoder,Intl,Date,Number,Array,Object,String,Set,Math,RegExp,Map};root.globalThis=root;
runInNewContext(readFileSync('assets/js/market-analysis-engine-v014146.js','utf8'),root);
const A=root.GroundUpMarketAnalysisV014146;
assert(A&&Object.isFrozen(A),'pure engine must be frozen');
const t='timestamp,price,size,bid,ask,quote_timestamp\n'+
 '2026-10-21T09:30:00-04:00,10.10,100,10,10.10,2026-10-21T09:30:00-04:00\n'+
 '2026-10-21T09:30:01-04:00,10,200,10,10.10,2026-10-21T09:30:01-04:00\n'+
 '2026-10-21T09:31:00-04:00,10.10,300,10,10.10,2026-10-21T09:30:00-04:00\n'+
 '2026-10-21T09:32:00-04:00,10.05,150,,,\n';
let r=A.tape(t);assert.equal(r.length,4);const report=A.tapeSummary(r,4,250);
assert.equal(report.shares,750);
assert.equal(report.atAsk,100);
assert.equal(report.atBid,200);
assert.equal(report.unknown,450,'stale/missing quotes MUST NOT be classified');
assert.equal(report.large,1);
assert.equal(report.quoteContext,2);
for (const invalid of [
 'timestamp,price,size\n2026-10-21T09:30:00,10,100',
 'timestamp,price,size\n2026-10-21T09:30:00Z,10,',
 'timestamp,price,size\n2026-10-21T09:30:00Z,10,1.5',
 'timestamp,price,size,bid,ask\n2026-10-21T09:30:00Z,10,10,10,9',
 'timestamp,price,size\n"bad,12,100',
 'timestamp,timestamp,price,size\nA,B,10,100'
 ])assert.throws(()=>A.tape(invalid),'invalid tape must fail closed: '+invalid);
assert.throws(()=>A.tape('x'.repeat(A.LIMIT_BYTES+1)),/2 MB/);
assert.throws(()=>A.tapeSummary(r,0,10),/Invalid/);
assert.throws(()=>A.tapeSummary(r,1,0),/Invalid/);
const csv='timestamp,open,high,low,close,volume\n'+
 '2026-10-21T02:00:00-04:00,10,10.2,9.8,10,100\n'+
 '2026-10-21T04:01:00-04:00,10,10.3,9.9,10.2,100\n'+
 '2026-10-21T09:30:00-04:00,10,10.4,9.9,10.1,200\n'+
 '2026-10-21T16:01:00-04:00,10,10.5,9.8,10.2,300\n'+
 '2026-10-22T09:30:00-04:00,10,10.6,9.7,10.2,400\n';
const b=A.bars(csv);
const sessions=A.sessions(b);
assert.equal(sessions.excluded,1,'overnight cannot be mislabeled premarket');
assert.equal(sessions.groups.length,4,'sessions must be split by date and market period');
assert.equal(sessions.groups[0].day,'2026-10-21');
assert.equal(sessions.groups.at(-1).day,'2026-10-22');
assert.throws(()=>A.bars('timestamp,open,high,low,close,volume\n2026-10-21T09:30:00,1,2,1,2,100'),/timezone-ambiguous/);
assert.throws(()=>A.bars('timestamp,open,high,low,close,volume\n2026-10-21T09:30:00Z,10,9,8,10,100'),/Invalid/);
const highs=[10,11,13,12,11,10,9,8],bars=highs.map((high,i)=>({
 timestamp:Date.parse('2026-10-21T13:30:00Z')+i*60000,
 high,low:high-2,open:high-1,close:high-1,volume:100
}));
const pivots=A.confirmedPivots(bars);
const pivot=pivots.find(x=>x.type==='H'&&x.price===13);
assert(pivot);assert.equal(pivot.confirmedAt,bars[4].timestamp,'candidate high at index 2 first confirmable at index 4');
assert(!A.confirmedPivots(bars.slice(0,4)).length,'no premature pivot labels');
const ui=readFileSync('assets/js/market-analysis-workbenches-v014146.js','utf8');
const advanced=readFileSync('assets/js/advanced-tools.js','utf8');
const html=readFileSync('advanced-tool.html','utf8');
for(const code of ['ORDER_FLOW_TAPE_LAB','MARKET_STRUCTURE_LAB','MARKET_CONTEXT_LAB',
 'MULTI_TIMEFRAME_LAB','TRADE_REVIEW_REPLAY','STRATEGY_VALIDATION','PATTERN_FAILURE_LIBRARY'])
 assert(ui.includes(code),'D06 UI must support '+code);
assert(advanced.includes('v6.render(TOOL.tool_code'),'existing beta tool route must be preserved');
assert(html.indexOf('market-analysis-engine-v014146.js')<html.indexOf('market-analysis-workbenches-v014146.js'));
assert(html.indexOf('market-analysis-workbenches-v014146.js')<html.indexOf('advanced-tools.js'));
assert(!ui.includes("SB.from('decision_journal')"),'journal query cannot bypass dedicated server');
console.log('PASS D06: strict tape; no fabricated aggressive trades; quote staleness, ET session boundaries, input caps and confirmed no-lookahead pivots.');
