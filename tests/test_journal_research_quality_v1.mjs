import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {journalResearchQuality} from '../functions/_lib/journal-research-quality-v1.js';
const row=(patch={})=>({
 id:1,trade_date:'2026-10-27',journal_type:'observation',status:'no_trade',
 decision:'NO TRADE',setup:'VWAP hold',evidence:'Seen on completed 5m bar',
 thesis:'Observational hypothesis',invalidation:'Break below VWAP',
 entry_trigger:'Reclaim and hold',catalyst_context:'',no_trade_condition:'Spread too wide',
 plan_locked_at:null,plan_followed:null,...patch});
const rows=[
 row(),
 row({id:2,trade_date:'2026-10-28',journal_type:'paper',status:'closed',decision:'ENTER',
  setup:'breakout',evidence:'',thesis:'Long thesis',catalyst_context:'Filing',
  plan_locked_at:'2026-10-28T14:00:00Z',plan_followed:'YES'}),
 row({id:3,trade_date:'2026-10-28',journal_type:'live',status:'draft',decision:'WATCH',
  setup:'breakout',evidence:'Observation',thesis:'',invalidation:''}),
 row({id:4,trade_date:'2026-12-01',journal_type:'live',status:'closed',decision:'ENTER',
  evidence:'FUTURE PRIVATE DATA'})
];
let result=journalResearchQuality(rows,{today:'2026-10-29'});
assert.equal(result.denominator,3);
assert.equal(result.noTrade,1);
assert.equal(result.plansLocked,1);
assert.equal(result.planAdherence.documented,1);
assert.equal(result.planAdherence.missing,2);
assert.equal(result.sourceCoverage.evidence.present,2);
assert.equal(result.sourceCoverage.evidence.missing,1);
assert.equal(result.sourceCoverage.catalyst_context.missing,2);
assert.equal(result.byStrategy.find(x=>x.name==='breakout').count,2);
assert.equal(result.byType.find(x=>x.name==='live').count,1);
assert(!JSON.stringify(result).includes('Seen on completed'),'Never return raw member research notes');
assert(!JSON.stringify(result).includes('FUTURE PRIVATE'),'Never return future dated notes');
assert.equal(result.noTradeRate,33.3);
assert.equal(result.recordedExecution.denominator,1,'Only closed reported paper/live executions are analyzed');
assert.equal(result.recordedExecution.netPnl.known,0,'Missing outcome is not a zero-dollar trade');
assert.equal(result.recordedExecution.netPnl.sum,null);
assert.equal(result.researchToJournal.denominator,3);
assert.equal(result.researchToJournal.linkedJournalRecords,0);
const linkedRows=[row({id:11,trade_date:'2026-10-28',journal_type:'paper',status:'closed',
  decision:'ENTER',direction:'LONG',planned_entry:5,actual_entry:5.1,share_quantity:100,
  fees:0,gross_pnl:50,net_pnl:50,r_multiple:1.8,mfe_per_share:0.8,mae_per_share:-0.2}),
 row({id:12,trade_date:'2026-10-28',journal_type:'live',status:'closed',
  decision:'ENTER',direction:'SHORT',planned_entry:9,actual_entry:8.9,
  share_quantity:50,fees:null,net_pnl:null})];
const linked=journalResearchQuality(linkedRows,{today:'2026-10-29',researchLinks:[
 {journal_id:11,workbench_record_id:44},{journal_id:11,workbench_record_id:45}]});
assert.equal(linked.recordedExecution.denominator,2);
assert.equal(linked.recordedExecution.fees.known,1);
assert.equal(linked.recordedExecution.fees.sum,0,'Explicit zero-fee observation remains zero');
assert.equal(linked.recordedExecution.netPnl.known,1);
assert.equal(linked.recordedExecution.netPnl.missing,1);
assert.equal(linked.recordedExecution.netPnl.sum,50);
assert.equal(linked.recordedExecution.plannedVsRecordedEntryAdversePct.known,2);
assert.equal(linked.researchToJournal.linkedJournalRecords,1);
assert.equal(linked.researchToJournal.linkedPlanReferences,2);
assert.throws(()=>journalResearchQuality(linkedRows,{researchLinks:null}),/Invalid research/);
assert(!JSON.stringify(linked).includes('Long thesis'),'No private notes in summary');
result=journalResearchQuality(rows,{type:'paper',today:'2026-10-29',days:'30'});
assert.equal(result.denominator,1);
assert.equal(result.planAdherence.rate,100);
result=journalResearchQuality([],{today:'2026-10-29'});
assert.equal(result.noTradeRate,null,'Zero denominator must never be a predicted percentage');
assert.equal(result.planAdherence.rate,null);
assert.throws(()=>journalResearchQuality([row()],{today:'2026-02-30'}));
const api=readFileSync(new URL('../functions/api/journal-research-quality-v1.js',import.meta.url),'utf8');
const frontend=readFileSync(new URL('../assets/js/journal-research-free-v1.js',import.meta.url),'utf8');
assert.match(api,/toolAccess\(env,request,'JOURNAL_ANALYTICS'\)/);
assert.match(api,/user_id=eq\./);
assert.match(api,/More than 3000 records/);
assert.match(api,/More than 3000 links/);
assert.match(api,/gu_journal_research_links_v1/);
assert.match(api,/user_id=eq\./);
assert.match(frontend,/gu-journal-rows-loaded/);
assert.match(frontend,/NO TRADE/i);
assert.doesNotMatch(frontend,/get\.Item\(|localStorage/);
console.log('PASS Free and Paid journal: research completeness, plan adherence, no-trade denominator, as-of filters, entitlement and privacy');
