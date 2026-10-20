// v0.14.0.114 — financial integrity and paid Journal authentication.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {report,settled} from '../functions/_lib/journal-analytics-v014114.js';
import {onRequest as endpoint} from '../functions/api/journal-analytics-v014114.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',secret='sb_secret_testing';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_testing',SUPABASE_SECRET_KEY:secret};
const dates=['2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05'];
const base={status:'closed',journal_type:'live',trade_date:dates[0],created_at:'2026-10-01T10:00:00Z',
 setup:'Breakout',plan_followed:'YES',process_grade:'GOOD'};
const rows=[
 {...base,id:1,net_pnl:120,r_multiple:2,exit_date:dates[0]},
 {...base,id:2,net_pnl:-60,r_multiple:-1,trade_date:dates[1],process_grade:'BAD',plan_followed:'NO'},
 {...base,id:3,net_pnl:80,r_multiple:1.1,journal_type:'paper',trade_date:dates[2],setup:'Pullback',process_grade:'BAD'},
 {...base,id:4,net_pnl:-40,r_multiple:-0.5,journal_type:'paper',trade_date:dates[3],setup:'Pullback'},
 {...base,id:5,net_pnl:null,r_multiple:999,trade_date:dates[4],status:'closed',setup:'Unresolved'},
 {...base,id:6,net_pnl:0,r_multiple:0,trade_date:dates[4],process_grade:'UNGRADED'},
 {...base,id:7,net_pnl:999999,r_multiple:500,trade_date:dates[4],status:'open'},
 {...base,id:8,net_pnl:null,trade_date:dates[4],decision:'NO TRADE'},
 {...base,id:9,net_pnl:50000,trade_date:'2027-01-01'}
];
const r=report(rows,{today:'2026-10-20'});
assert.equal(r.summary.recordsMatched,7,'Future dates, open outcomes and no-trade are excluded from selected closed trade population except deliberate no-trade status');
assert.equal(r.summary.resolvedTrades,5);
assert.equal(r.summary.excludedNoResult,2,'Null result and No-trade cannot count as a win, loss or flat.');
assert.equal(r.summary.winCount,2);assert.equal(r.summary.lossCount,2);assert.equal(r.summary.flatCount,1);
assert.equal(r.summary.winRate,40);
assert.equal(r.summary.grossProfit,200);assert.equal(r.summary.grossLoss,100);
assert.equal(r.summary.totalNet,100);assert.equal(r.summary.profitFactor,2);
assert.equal(r.summary.expectancyPerTrade,20);
assert.equal(r.summary.averageR,0.32);
assert.equal(r.summary.maxDrawdownCurrency,60);
assert.equal(r.summary.badProcessWins,1);
assert.equal(r.summary.planFollowedRate,80);
assert.equal(r.summary.lowSample,true);
assert.equal(r.equity.at(-1).value,100);
assert.equal(r.setup.find(x=>x.setup==='Breakout').n,3);
assert.equal(r.livePaper.live.n,3);
assert.equal(r.livePaper.paper.n,2);
assert.equal(r.summary.performanceBasis,'self_reported_member_journal');
assert.deepEqual(r.breakdowns.processOutcome,{good_win:1,good_loss:1,bad_win:1,bad_loss:1});
assert.equal(r.breakdowns.exits.comparable,0);
assert.equal(r.breakdowns.excursion.avgMfeR,null);
assert.equal(r.breakdowns.entryReasons.length,1);
assert.deepEqual(Object.keys(r.equity[0]),['date','value'],'No journal ID, ticker or notes in chart.');
const filter=report(rows,{today:'2026-10-20',type:'paper'});
assert.equal(filter.summary.resolvedTrades,2);assert.equal(filter.summary.profitFactor,2);
assert.equal(report(rows,{today:'2026-10-20',days:'30'}).summary.resolvedTrades,5);
assert.equal(report(rows,{today:'2026-10-20',days:'30',type:'live'}).summary.resolvedTrades,3);
assert.equal(report([ {...base,net_pnl:75} ],{today:'2026-10-20'}).summary.profitFactor,null);
assert.equal(report([ {...base,net_pnl:75} ],{today:'2026-10-20'}).summary.profitFactorReason,'no_recorded_losses');
assert.equal(report([ {...base,net_pnl:0} ],{today:'2026-10-20'}).summary.winRate,0);
assert.equal(settled({...base,net_pnl:null}),false);
assert.equal(settled({...base,net_pnl:''}),false);
assert.throws(()=>report(rows,{type:'all;drop table',today:'2026-10-20'}));
let access=true,kind='member',flag='active',queryCount=0;
const prior=globalThis.fetch;
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opt={})=>{
 const uri=String(url);
 if(uri.endsWith('/auth/v1/user'))return json({id:uid});
 if(uri.includes('/profiles?'))return json([{account_kind:kind}]);
 if(uri.includes('/admin_user_flags?'))return json([{status:flag}]);
 if(uri.includes('/rpc/user_has_tool_access'))return json(access);
 if(uri.includes('/decision_journal?')){
  queryCount++;
  assert(uri.includes('user_id=eq.'+uid),'Journal backend MUST be scoped to validated account');
  assert(uri.includes('journal_type=in.(live,paper)'));
  assert(uri.includes('status=eq.closed'));
  assert(uri.includes('limit=500'));
  assert(!uri.includes('entry_reason')&&!uri.includes('invalidation'),'Private notes must not leave database');
  assert.equal(opt.headers.apikey,secret);
  assert.equal(opt.headers.authorization,undefined,'Opaque service key must not become bearer');
  return json(rows.filter(x=>x.status==='closed'));
 }
 throw Error('Unexpected source '+uri);
};
const request=(type='all')=>new Request('https://education.example/api/journal-analytics-v014114?type='+type,
 {headers:{authorization:'Bearer member-session'}});
try{
 let x=await endpoint({env,request:request()});let v=await x.json();
 assert.equal(x.status,200);assert.equal(v.ok,true);assert.equal(v.summary.resolvedTrades,5);
 assert.equal(v.equity.length,5);
 assert(!JSON.stringify(v).includes('aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'Member identifier must not be in output');
 assert(!JSON.stringify(v).includes('999999'),'Open unreconciled journal outcomes must not appear');
 const queries=queryCount;
 access=false;x=await endpoint({env,request:request()});
 assert.equal(x.status,403);assert.equal(queryCount,queries,'Free accounts cannot query paid analytics rows');
 access=true;kind='showcase';x=await endpoint({env,request:request()});
 assert.equal(x.status,403);assert.equal(queryCount,queries);
 kind='member';flag='suspended';x=await endpoint({env,request:request()});
 assert.equal(x.status,403);assert.equal(queryCount,queries);
 flag='active';x=await endpoint({env,request:request('invalid')});assert.equal(x.status,400);
 // CSV quoting alone is not enough to prevent Excel/Sheets formula execution.
 const legacy=readFileSync(new URL('../assets/js/journal-common.js',import.meta.url),'utf8');
 const {runInNewContext}=await import('node:vm');
 const root={window:{}};runInNewContext(legacy,root);
 const csv=root.window.JournalTools.toCSV([
  {id:1,ticker:'=HYPERLINK("https://phish.invalid")',setup:' +SUM(1,2)',lesson:'@IMPORTXML(0)',trade_date:'2026-10-20'},
  {id:2,ticker:'ABC',lesson:'Normal research'}
 ]);
 assert(csv.includes("'=HYPERLINK("),'Quoted spreadsheet formula is prefixed');
 assert(csv.includes("' +SUM(1,2)"),'Leading spaces and plus sign are treated as risky');
 assert(csv.includes("'@IMPORTXML(0)"),'Leading @ is treated as risky');
 assert(csv.includes('"ABC"'),'Normal cell values remain ordinary quoted CSV');
 const client=readFileSync(new URL('../assets/js/journal-analytics.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../journal-analytics.html',import.meta.url),'utf8');
 assert(!client.includes(".from('decision_journal')"));
 assert(!client.includes('SiteAccess.isMember'));
 assert(client.includes('/api/journal-analytics-v014114'));
 for(const el of ['analytics-equity-chart','analytics-setups','analytics-transfer','analytics-quality'])
  assert(html.includes('id="'+el+'"'),'Missing accessible Journal report '+el);
 console.log('PASS v114: calculated resolved-only win rate, average R, profit factor, expectancy, drawdown, setup segmentation, identity isolation and paid entitlement.');
}finally{globalThis.fetch=prior}
