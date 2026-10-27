/* StocksToTrade-Browser-Research (8), original Batch XXVI 251–260.
 * This uses fictional member-entered records. No broker performance evidence.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {report} from '../functions/_lib/journal-analytics-v014114.js';

const rows=[
 {id:'A',created_at:'2026-10-01T10:00:00Z',trade_date:'2026-10-01',exit_date:'2026-10-01',status:'closed',journal_type:'paper',decision:'TRADE',net_pnl:120,r_multiple:null,process_grade:'GOOD'},
 {id:'B',created_at:'2026-10-02T10:00:00Z',trade_date:'2026-10-02',exit_date:'2026-10-02',status:'closed',journal_type:'paper',decision:'TRADE',net_pnl:-50,r_multiple:null,process_grade:'GOOD'},
 {id:'C',created_at:'2026-10-03T10:00:00Z',trade_date:'2026-10-03',exit_date:'2026-10-03',status:'closed',journal_type:'paper',decision:'TRADE',net_pnl:-30,r_multiple:null,process_grade:'BAD'},
 {id:'D',created_at:'2026-10-04T10:00:00Z',trade_date:'2026-10-04',exit_date:'2026-10-04',status:'closed',journal_type:'paper',decision:'TRADE',net_pnl:0,r_multiple:null},
 {id:'E',created_at:'2026-10-05T10:00:00Z',trade_date:'2026-10-05',exit_date:'2026-10-05',status:'closed',journal_type:'paper',decision:'TRADE',net_pnl:null}
];
const r=report(rows,{type:'paper',days:'all',today:'2026-10-26'});
assert.equal(r.ok,true);
assert.equal(r.summary.recordsMatched,5);
assert.equal(r.summary.resolvedTrades,4);
assert.equal(r.summary.excludedNoResult,1);
assert.deepEqual([r.summary.winCount,r.summary.lossCount,r.summary.flatCount],[1,2,1]);
assert.equal(r.summary.winRate,25);
assert.equal(r.summary.totalNet,40);
assert.equal(r.summary.expectancyPerTrade,10);
assert.equal(r.summary.profitFactor,1.5);
assert.equal(r.summary.maxDrawdownCurrency,80);
assert.equal(r.summary.averageR,null);
assert.equal(r.summary.rRatedTrades,0);
assert.equal(r.summary.drawdownPercent,null);
assert.deepEqual(r.equity.map(x=>x.value),[120,70,40,40]);
assert.equal(r.metricDefinitions.length,7);
const byKey=Object.fromEntries(r.metricDefinitions.map(m=>[m.key,m]));
for(const key of ['winRate','expectancyPerTrade','profitFactor','averageR','maxDrawdownCurrency','mfe_r','mae_r']){
 const v=byKey[key];assert(v,'Missing contract '+key);
 assert.equal(typeof v.unit,'string');
 assert(v.inclusion.includes('Closed member-entered'));
 assert.equal(v.observationInterval,'all recorded dates');
 assert(v.costBasis.length>15);
 assert(Number.isInteger(v.denominatorCount)&&v.denominatorCount>=0);
 assert(Number.isInteger(v.missingCount)&&v.missingCount>=0);
}
assert.equal(byKey.winRate.denominatorCount,4);
assert.equal(byKey.winRate.missingCount,1);
assert.match(byKey.winRate.note,/Flat \$0 outcomes remain/);
assert.equal(byKey.averageR.denominatorCount,0);
assert.equal(byKey.averageR.missingCount,5);
assert.match(byKey.maxDrawdownCurrency.note,/Not account-equity percentage drawdown/);
assert.equal(byKey.mfe_r.missingCount,5);
assert(!('id' in r.metricDefinitions[0]));
assert(!JSON.stringify(r).includes('2026-10-05T10:00:00Z'));

const invalid={...rows[0],id:'invalid',trade_date:'2026-02-30',exit_date:'2026-02-30',net_pnl:999999};
const wrong=report([...rows,invalid],{type:'paper',days:'all',today:'2026-10-26'});
assert.equal(wrong.summary.recordsMatched,5,'Impossible calendar dates must not enter the sample');
assert.equal(wrong.summary.totalNet,40);
const onlyUnknown=report([rows[4]],{type:'paper',days:'all',today:'2026-10-26'});
assert.equal(onlyUnknown.summary.winRate,null);
assert.equal(onlyUnknown.summary.profitFactor,null);
assert.equal(onlyUnknown.metricDefinitions.find(m=>m.key==='winRate').denominatorCount,0);
assert.equal(onlyUnknown.metricDefinitions.find(m=>m.key==='winRate').missingCount,1);
const live=report(rows,{type:'live',days:'all',today:'2026-10-26'});
assert.equal(live.summary.resolvedTrades,0);
assert.equal(live.metricDefinitions.find(m=>m.key==='winRate').denominatorCount,0);

const page=readFileSync('journal-analytics.html','utf8'),
 ui=readFileSync('assets/js/journal-analytics.js','utf8'),
 api=readFileSync('functions/api/journal-analytics-v014114.js','utf8');
assert(page.includes('id="analytics-metric-methods"')&&page.includes('Denominator')&&page.includes('Missing'));
assert(ui.includes('renderMethods(result.metricDefinitions)'));
assert(ui.includes("row.firstElementChild.scope='row'"));
assert(ui.includes("host.replaceChildren()"));
assert(api.includes("toolAccess(env,request,'JOURNAL_ANALYTICS')"));
assert(api.includes("'&user_id=eq.'+encodeURIComponent(acl.userId)"));
assert(api.includes("cache-control':'private, no-store"));
assert(!api.includes("select=*"),'Private analytics must not fetch raw note bodies');
console.log('PASS research (8) Journal: 4-resolved/1-missing, 25% win rate, +$10 expectancy, 1.5 ratio, $80 cumulative drawdown, zero R, impossible-date rejection, private metric contracts.');
