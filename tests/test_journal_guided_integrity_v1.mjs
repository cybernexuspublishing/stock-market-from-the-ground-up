import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Exercise the real browser helper without a payment, member account, or market record.
const sandbox={window:{},Blob:class{},URL:{},Intl,Date,Number,String,Math};
runInNewContext(readFileSync('assets/js/journal-common.js','utf8'),sandbox);
const j=sandbox.window.JournalTools;
assert.equal(j.num(null),null,'missing is not zero');
assert.equal(j.num(undefined),null);
assert.equal(j.num('  '),null);
assert.equal(j.num(false),null);
assert.equal(j.num([]),null);
assert.equal(j.num('0'),0,'explicit zero is a measured value');
assert.equal(j.outcome({status:'closed',net_pnl:null}),'UNRESOLVED');
assert.equal(j.outcome({status:'draft',net_pnl:0}),'UNRESOLVED');
assert.equal(j.outcome({status:'closed',net_pnl:0}),'FLAT');
assert.equal(j.outcome({status:'no_trade',net_pnl:null}),'NO TRADE');
const base={status:'closed',direction:'LONG',share_quantity:100,planned_entry:10,planned_stop:9.5,planned_target:11,
 actual_entry:10.1,actual_exit:10.6,highest_while_open:10.9,lowest_while_open:9.9,fees:2,
 trade_date:'2026-07-01',exit_date:'2026-07-01',entry_time_et:'09:30',exit_time_et:'10:30'};
const m=j.compute(base);
assert(Math.abs(m.gross_pnl-50)<1e-8);
assert(Math.abs(m.net_pnl-48)<1e-8);
assert.equal(m.initial_planned_risk,50,'R denominator is the original planned risk, not actual-fill-to-stop');
assert(Math.abs(m.r_multiple-0.96)<1e-8);
assert.equal(m.duration_minutes,60);
assert.equal(j.compute({...base,fees:null}).net_pnl,null,'unknown costs cannot be represented as net zero-cost');
assert.equal(j.compute({...base,planned_entry:null}).r_multiple,null,'missing planned entry means undefined R');
assert.equal(j.compute({...base,actual_exit:null}).net_pnl,null);
assert.equal(j.compute({...base,lowest_while_open:11}).mfe_r,null,'invalid high/low data excluded');
assert.equal(j.compute({...base,trade_date:'2026-01-05',exit_date:'2026-01-05'}).duration_minutes,60,'EST winter');
assert.equal(j.compute({...base,trade_date:'2026-03-08',exit_date:'2026-03-08',entry_time_et:'01:30',exit_time_et:'03:30'}).duration_minutes,60,'spring-forward DST');
assert.equal(j.compute({...base,trade_date:'2026-03-08',exit_date:'2026-03-08',entry_time_et:'02:30'}).duration_minutes,null,'nonexistent ET local time');
assert.equal(j.compute({...base,trade_date:'2026-11-01',exit_date:'2026-11-01',entry_time_et:'01:30'}).duration_minutes,null,'ambiguous ET local time');
const strategy=readFileSync('functions/api/advanced-journal-insights.js','utf8');
assert(strategy.includes("['YES','PARTIAL','NO'].includes(r.plan_followed)"),'Use canonical enum, not boolean');
assert(strategy.includes("r.plan_followed==='YES'"),'Only full compliance counts as followed');
const page=readFileSync('journal-entry.html','utf8');
assert(page.includes('assets/js/journal-guided-v1.js')&&page.includes('assets/css/journal-guided-v1.css'));
const guide=readFileSync('assets/js/journal-guided-v1.js','utf8');
assert(guide.includes('gu-journal-mode')&&guide.includes("form.addEventListener('change'"));
assert(guide.includes('Not measured')&&guide.includes('Before-entry risk check'));
const listPage=readFileSync('journal.html','utf8');
assert(listPage.includes('journal-weekly-v1.js'));
assert(page.includes('journal-evidence-v1.js')&&page.includes('journal-actual-history-v1.js'));
const weekly=readFileSync('assets/js/journal-weekly-v1.js','utf8');
assert(weekly.includes('gu-journal-rows-loaded')&&weekly.includes('not paid performance analytics'));
const evidence=readFileSync('assets/js/journal-evidence-v1.js','utf8');
assert(evidence.includes("BUCKET='gu-journal-evidence'"));
assert(evidence.includes("MAX=6,MAX_BYTES=5*1024*1024"));
assert(evidence.includes("createSignedUrl(item.object_key,60)"));
assert(evidence.includes("self_reported_before_decision"));
const evidenceSql=readFileSync('supabase/migrations/20261027_journal_evidence_v1_private_storage.sql','utf8');
for(const token of ['journal_evidence_v1_read_own','journal_evidence_v1_insert_own',
 'journal_evidence_v1_delete_own','gu_journal_evidence_select_v1',
 'gu_journal_evidence_insert_v1','gu_journal_evidence_delete_v1',
 'journal_evidence_v1_enforce_cap','private']){
 assert(evidenceSql.includes(token),'Missing evidence protection '+token);
}
const historySql=readFileSync('supabase/migrations/20261027_journal_actual_corrections_v1.sql','utf8');
assert(historySql.includes('journal_actual_audit_v1')&&historySql.includes('security definer'));
assert(historySql.includes('revoke all on public.journal_actual_history_v1 from public,anon,authenticated;'));
assert(historySql.includes('grant select on public.journal_actual_history_v1 to authenticated;'));
assert(historySql.includes('old.status not in'));
const entryJs=readFileSync('assets/js/journal-entry.js','utf8');
assert(entryJs.includes('Stop must be on the risk side'));
assert(entryJs.includes('Explicit fees must be entered'));
assert(entryJs.includes('gu-journal-actual-updated'));
const taxonomy=JSON.parse(readFileSync('data/journal-taxonomy.json','utf8'));
assert(taxonomy.taxonomyVersion==='2026-10-27'&&taxonomy.setups.length>=10);
console.log('PASS Journal v1: null/flat, planned R, fee validation, MFE range, ET/DST, enum, guided UI.');
