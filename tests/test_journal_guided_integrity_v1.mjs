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
console.log('PASS Journal v1: null/flat, planned R, fee validation, MFE range, ET/DST, enum, guided UI.');
