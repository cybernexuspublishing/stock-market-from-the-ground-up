/* Trading Journal 2.0 deterministic test and source contract.
 * Fictional records only. No paid API, private session or live payment.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const sandbox={window:{},Date,Intl,Number,String,Math,Map,Set};
runInNewContext(read('assets/js/journal-v2-logic.js'),sandbox);
const v2=sandbox.window.JournalV2;
assert(v2&&Object.isFrozen(v2));
const long=v2.planRisk({direction:'LONG',entry:10,stop:9.5,target:11,quantity:100,riskBudget:40});
assert.equal(long.valid,true);
assert.equal(long.riskPerShare,.5);
assert.equal(long.plannedRisk,50);
assert.equal(long.rewardRisk,2);
assert.equal(long.maxWholeShares,80);
assert.equal(long.withinBudget,false);
assert.equal(v2.planRisk({direction:'LONG',entry:10,stop:10.1,quantity:100,riskBudget:50}).valid,false);
assert.equal(v2.planRisk({direction:'SHORT',entry:10,stop:10.25,quantity:10,riskBudget:30}).maxWholeShares,120);
assert.equal(v2.planRisk({direction:'LONG',entry:'',stop:9,quantity:100}).valid,false);
assert.equal(v2.planRisk({direction:'LONG',entry:10,stop:9.95,quantity:100,riskBudget:'  '}).maxWholeShares,null);
assert.equal(v2.number(null),null);
assert.equal(v2.number(false),null);
assert.equal(v2.number('0'),0);
const rows=[
 {user_id:'A',journal_type:'live',trade_date:'2026-10-26',status:'closed',plan_followed:'YES',process_grade:'GOOD',mistakes:['Chased extension']},
 {user_id:'A',journal_type:'paper',trade_date:'2026-10-27',status:'closed',plan_followed:'NO',process_grade:'BAD',mistakes:['Chased extension','Oversized position']},
 {user_id:'A',journal_type:'observation',trade_date:'2026-10-27',status:'no_trade',decision:'NO TRADE',mistakes:[]},
 {user_id:'A',journal_type:'live',trade_date:'2026-10-26',status:'draft'},
 {user_id:'A',journal_type:'paper',trade_date:'2026-10-19',status:'closed',plan_followed:'PARTIAL'},
 {user_id:'A',journal_type:'historical_lab',trade_date:'2026-10-30',status:'closed'},
 {user_id:'A',journal_type:'live',trade_date:'2026-02-30',status:'closed'},
 {user_id:'A',journal_type:'live',trade_date:'2026-11-03',status:'closed'}
];
const w=v2.processSummary(rows,{asOf:new Date('2026-10-27T18:00:00Z'),weeks:1,type:'all'});
assert.equal(w.start,'2026-10-26');
assert.equal(w.endExclusive,'2026-11-02');
assert.equal(w.total,4,'Only current and past dates within this week');
assert.equal(w.completed,3);
assert.equal(w.drafts,1);
assert.equal(w.noTrade,1);
assert.equal(w.types.live,2);
assert.equal(w.types.paper,1);
assert.equal(w.types.observation,1);
assert.equal(w.types.historical_lab,0);
assert.equal(w.adherence.denominator,2);
assert.equal(w.adherence.yes,1);
assert.equal(w.adherence.no,1);
assert.equal(w.commonMistakes[0].label,'Chased extension');
assert.equal(w.commonMistakes[0].count,2);
const month=v2.processSummary(rows,{asOf:new Date('2026-10-27T18:00:00Z'),weeks:4,type:'paper'});
assert.equal(month.total,2);
assert.equal(month.adherence.partial,1);
assert.equal(v2.processSummary(rows,{asOf:new Date('2026-10-27'),weeks:1,type:'historical_lab'}).total,0);
assert.throws(()=>v2.processSummary(rows,{weeks:0}),/Invalid/);
assert.throws(()=>v2.processSummary(rows,{weeks:20}),/Invalid/);
const helper=read('assets/js/journal-v2-logic.js');
assert(!helper.includes('net_pnl')&&!helper.includes('gross_pnl')&&!helper.includes('r_multiple'),
 'The free process review must not reconstruct premium financial analytics');
const page=read('journal-entry.html'),journal=read('journal.html');
assert(page.includes('journal-v2-logic.js')&&page.includes('journal-guided-v2.js')&&page.includes('journal-v2.css'));
assert(!page.includes('journal-guided-v1.js'),'Old and new stage controllers must not run together');
assert(journal.includes('journal-weekly-v2.js')&&journal.includes('journal-v2-logic.js'));
assert(!journal.includes('journal-weekly-v1.js'),'Old and new summary controllers must not run together');
const guided=read('assets/js/journal-guided-v2.js');
for(const key of ["findHead('1. Context')","findHead('2. Pre-Trade')","findHead('3. Actual')","findHead('4. Automatic')",
 "locked=$('locked-plan-panel')","compare=$('plan-vs-actual')","evidence=$('gu-evidence-panel')",
 "history=$('gu-actual-history')","gu-v2-mode","gu-v2-budget","gu-v2-apply"]){
 assert(guided.includes(key),'Guided workflow missing '+key);
}
assert(!guided.includes('sections[2]'), 'Do not regress to V1 incorrect section indexing');
assert(guided.includes('current.dispatchEvent(new Event('),'Share changes require explicit button click');
assert(guided.includes('current.disabled'),'Locked plan must prevent applying share suggestions');
assert(guided.includes("form.addEventListener('input',updatePanels)"),'Risk preview should update on edits');
const core=read('assets/js/journal-entry.js');
assert(core.includes("Object.assign(patch,window.JournalTools.compute(next))"),
 'Postclosure execution edits must recalculate persisted results');
assert(core.includes(".eq('updated_at',ESTATE.row.updated_at)"),
 'Do not overwrite a concurrent revision');
assert(core.includes('gu-journal-record-loaded'),'Guided V2 must be notified when async record load completes');
assert(core.includes("ESTATE.row?.closed_at||new Date().toISOString()"),
 'Closing again must not rewrite the original completion timestamp');
const weekly=read('assets/js/journal-weekly-v2.js');
assert(weekly.includes("r?.user_id===signedUser"),'Only current member records enter the summary');
assert(weekly.includes("gu-journal-rows-loaded"),'Process dashboard must reuse RLS-owned records');
assert(weekly.includes("No-trade decisions")||weekly.includes("No-trade decisions".toLowerCase())||weekly.includes('No-trade decisions'.replace('No-','No-')));
assert(!weekly.includes('net_pnl')&&!weekly.includes('gross_pnl'));
const listing=read('assets/js/journal.js');
assert(listing.includes('range(offset,offset+size-1)'),
 'Member history must page through the server response cap');
assert(listing.includes('truncated=true')&&listing.includes('if(JSTATE.truncated)'),
 'Incomplete history and CSV export must be disclosed, not silently truncated');
assert(listing.includes('JSTATE.user?.id!==ownerId'),
 'A late response from the previous account must never repopulate the Journal list');
assert(listing.includes('auth.onAuthStateChange'),
 'Switching accounts must scrub the private Journal list');
assert(weekly.includes('partialHistory=e.detail?.truncated===true'),
 'Weekly process results must disclose when the source list is incomplete');
console.log('PASS Journal V2: stage mapping, budget math, no-trade, date bounds, source isolation and closed-trade recalculation.');
