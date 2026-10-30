import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const engine=require('../assets/js/crownlight-data-source-integrity-v3.js');
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const time0='2024-05-07T13:30:00Z',time1='2024-05-07T13:31:00Z';
const bars=[{timestamp:time0,open:10,high:10.5,low:9.8,close:10.2,volume:1000},
 {timestamp:time1,open:10.2,high:10.8,low:10,close:10.6,volume:2500,providerVwap:10.4}];
const proof={strictlyChronological:true,observations:2,firstTimestamp:time0,lastTimestamp:time1,
 feedCompletenessVerified:false,licensedForMemberWidePublication:false,
 approvedForOfficialReplay:false,feed:'IEX_SINGLE_EXCHANGE'};
const payload={ok:true,provider:'ALPACA_BYO',ticker:'AAPL',bars,integrity:proof,
 sourceNote:'PRIVATE personal Alpaca IEX single-exchange history'};
const checked=engine.validateProvider(payload,{provider:'ALPACA_BYO',ticker:'AAPL'});
assert.equal(checked.candles.length,2);
assert.equal(checked.candles[1].providerVwap,10.4);
assert.equal(checked.rights.officialReplay,false);
assert.equal(checked.rights.memberRedistribution,false);
assert.equal(checked.classification,'PERSONAL_PROVIDER_UNGRADED_ONLY');
for(const [label,change] of [
 ['provider mismatch',{provider:'TIINGO_BYO'}],
 ['ticker mismatch',{ticker:'MSFT'}],
 ['unapproved official replay',{integrity:{...proof,approvedForOfficialReplay:true}}],
 ['false complete data',{integrity:{...proof,feedCompletenessVerified:true}}],
 ['invalid feed',{integrity:{...proof,feed:'SIP'}}],
 ['inconsistent count',{integrity:{...proof,observations:3}}],
 ['incorrect last time',{integrity:{...proof,lastTimestamp:time0}}],
 ['reversed order',{bars:bars.toReversed()}],
 ['duplicate bars',{bars:[bars[0],bars[0]]}],
 ['negative volume',{bars:[bars[0],{...bars[1],volume:-1}]}],
 ['impossible OHLC',{bars:[bars[0],{...bars[1],high:9}]}],
 ['invalid offset',{bars:[{...bars[0],timestamp:'2024-05-07T13:30:00'},bars[1]]}],
 ['future data',{bars:[bars[0],{...bars[1],timestamp:'2099-05-07T13:31:00Z'}]}]
]){
 assert.throws(()=>engine.validateProvider({...payload,...change},
  {provider:'ALPACA_BYO',ticker:'AAPL'}),undefined,label);
}
const tiingo=engine.validateProvider({...payload,provider:'TIINGO_BYO',
 integrity:{...proof,feed:'TIINGO_PERSONAL_ACCOUNT'}},{provider:'TIINGO_BYO',ticker:'AAPL'});
assert.equal(tiingo.feed,'TIINGO_PERSONAL_ACCOUNT');
const client=src('assets/js/simulator.js');
const loadPart=client.slice(client.indexOf('async function loadProvider(){'),client.indexOf('async function loadContextEnvelope('));
assert(loadPart.includes('validateProvider(j,{provider,ticker})'));
assert(loadPart.indexOf('const source=window.CrownlightSourceIntegrityV3.validateProvider')<
 loadPart.indexOf('SIM.candles=source.candles'),'Never replace existing replay before integrity validation');
assert(loadPart.includes('SIM.user?.id!==memberId'),'Member identity switch must discard old response');
assert(client.includes('const validated=parseCSV(text);if(SIM.user?.id!==memberId)return;SIM.candles=validated'));
const api=src('functions/api/marketdata.js');
assert(api.includes('validateHistoricalOhlcv'));
assert(api.includes('feedCompletenessVerified:false'));
assert(api.includes('licensedForMemberWidePublication:false'));
assert(api.includes('approvedForOfficialReplay:false'));
assert(api.includes("feed:alpaca?'IEX_SINGLE_EXCHANGE':'TIINGO_PERSONAL_ACCOUNT'"));
const html=src('simulator.html');
assert(html.indexOf('crownlight-data-source-integrity-v3.js')<html.indexOf('assets/js/simulator.js'));
const paper=src('assets/js/crownlight-paper-terminal-v1.js');
assert(paper.includes('const clientOrderId=pendingOrder?.id||crypto.randomUUID();'));
assert(paper.includes('accountReady=false;'));
assert(paper.includes('crownlight:member-changed'));
const workspace=src('assets/js/crownlight-workspace-v2.js');
assert(workspace.includes('expectedUpdatedAt:workspaceRevision'));
assert(workspace.includes("e.code==='WORKSPACE_CHANGED'"));
assert(workspace.includes('workspaceRevision=null'));
const sql=src('supabase/migrations/20261030_crownlight_chart_workspace_cas_v3.sql');
assert(sql.includes('pg_advisory_xact_lock'));
assert(sql.includes('WORKSPACE_CHANGED'));
assert(sql.includes('REVOKE ALL ON FUNCTION'));
assert(!sql.includes('UPDATE public.gu_sparks_'));
console.log('PASS Chart Studio V3: BYO source integrity and licensing, no future bars, unchanged CSV on failure, provider account isolation, paper idempotency, workspace revision guards');
