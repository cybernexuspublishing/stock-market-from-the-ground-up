/* Product 03: Journal analytics chronology and no-lookahead contract.
 * Original fictional records; this is a source-level unit test and no member
 * or payment data is accessed. At most the as-of date can be scored.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {report} from '../functions/_lib/journal-analytics-v014114.js';
const mk=(id,trade_date,exit_date,net_pnl)=>({
 id,created_at:trade_date+'T13:00:00Z',trade_date,exit_date,
 status:'closed',journal_type:'paper',decision:'TRADE',net_pnl,
 process_grade:'GOOD',setup:'Illustrative historical-clock research'
});
const input=[
 mk('known','2026-10-22','2026-10-22',120),
 mk('flat','2026-10-23','2026-10-23',0),
 mk('future','2026-10-24','2026-11-02',1000000),
 mk('impossible','2026-10-24','2026-02-30',1000000),
 mk('beforeEntry','2026-10-24','2026-10-23',1000000),
 mk('unknownExit','2026-10-25',null,-20),
 mk('unknownOutcome','2026-10-25','2026-10-25',null)
];
const before=report(input,{type:'paper',days:'all',today:'2026-10-26'});
assert.equal(before.ok,true);
assert.equal(before.summary.recordsMatched,7);
assert.equal(before.summary.resolvedTrades,3);
assert.equal(before.summary.excludedNoResult,4);
assert.equal(before.summary.excludedFutureExitDates,1);
assert.equal(before.summary.excludedInvalidExitDates,2);
assert.equal(before.summary.totalNet,100);
assert.equal(before.summary.winRate,33.33);
assert.equal(before.summary.flatCount,1);
assert.equal(before.summary.expectancyPerTrade,33.33);
assert.deepEqual(before.equity.map(x=>x.date),['2026-10-22','2026-10-23','2026-10-25']);
assert(before.notices.some(x=>/future exit/i.test(x)));
assert(before.metricDefinitions.every(x=>x.inclusion.includes('post-as-of exit date')));
assert(!JSON.stringify(before).includes('1000000'),'Future or invalid close profits must never appear in summary');
assert(!JSON.stringify(before).includes('beforeEntry'),'Private IDs must not be serialized');
const after=report(input,{type:'paper',days:'all',today:'2026-11-05'});
assert.equal(after.summary.resolvedTrades,4);
assert.equal(after.summary.excludedFutureExitDates,0);
assert.equal(after.summary.excludedInvalidExitDates,2);
assert.equal(after.summary.totalNet,1000100);
assert.equal(after.summary.recordsMatched,7);
const closedUnknown=report([mk('missing-result','2026-10-22',null,null)],{
 type:'paper',days:'all',today:'2026-10-26'});
assert.equal(closedUnknown.summary.resolvedTrades,0);
assert.equal(closedUnknown.summary.excludedNoResult,1);
const invalid={...mk('invalid','2026-10-20','tomorrow',50000)};
const noFuture=report([invalid],{type:'paper',days:'all',today:'2026-10-26'});
assert.equal(noFuture.summary.resolvedTrades,0);
assert.equal(noFuture.summary.excludedInvalidExitDates,1);
const lib=readFileSync('functions/_lib/journal-analytics-v014114.js','utf8');
const ui=readFileSync('assets/js/journal-analytics.js','utf8');
const api=readFileSync('functions/api/journal-analytics-v014114.js','utf8');
assert(lib.includes('exitKnownAsOf(r,today)'));
assert(lib.includes("r.exit_date>=r.trade_date&&r.exit_date<=today"));
assert(ui.includes("s.excludedFutureExitDates??0"));
assert(ui.includes("s.excludedInvalidExitDates??0"));
assert(api.includes("toolAccess(env,request,'JOURNAL_ANALYTICS')"));
assert(api.includes("'&user_id=eq.'+encodeURIComponent(acl.userId)"));
assert(api.includes("'cache-control':'private, no-store"));
console.log('PASS Journal Product 03: future/invalid exits excluded, as-of report remains truthful, missing and flat separated, private scope unaffected.');
