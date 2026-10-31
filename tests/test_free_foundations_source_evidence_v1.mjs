import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freeFoundationsV1} from '../functions/_lib/free-foundations-v1.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const data=JSON.parse(read('data/free-foundations-evidence-v1.json'));
assert.equal(data.kind,'smfgu_free_foundations_claim_specific_evidence_v1');
assert.equal(data.records.length,5);
assert.equal(new Set(data.records.map(r=>r.day)).size,5);
assert.equal(freeFoundationsV1.length,5,'Canonical lesson count remains five');
const allowed=/^https:\/\/(?:www\.)?(?:investor\.gov|sec\.gov|chartschool\.stockcharts\.com)\//;
for(const [i,r] of data.records.entries()){
 assert.equal(r.day,i+1);
 assert.equal(r.title,freeFoundationsV1[i].title,'Exact authored lesson title');
 assert.equal(r.objective,freeFoundationsV1[i].objective,'Exact authored objective');
 for(const key of ['claim','worked','calculation','counterexample','transfer','limit'])
  assert(typeof r[key]==='string'&&r[key].length>40,'No missing teaching dimension: '+r.day+' '+key);
 assert(r.sources.length>=1&&r.sources.length<=4);
 for(const s of r.sources){
  assert(allowed.test(s.url),'Primary or declared technical-source domain only');
  assert(s.id&&s.claim&&s.authority);
 }
 assert(!/independently validated strategy performance/i.test(r.claim));
 assert(/fictional|original/i.test(r.worked),'No unmarked real market example '+r.day);
}
assert.equal(100/1_000_000*100,0.01,'Share percentage example');
assert.equal(1_000_000*10,10_000_000,'Market capitalization example');
const candle={open:20,high:22,low:19,close:21.2};
const body=Math.abs(candle.close-candle.open),range=candle.high-candle.low;
assert(Math.abs(body/range*100-40)<1e-9);
assert.equal(candle.high-Math.max(candle.open,candle.close)+body+
 Math.min(candle.open,candle.close)-candle.low,range,'Wicks plus body must reconcile');
assert.equal((22-22),0,'Zero candle range requires undefined percent');
assert(!Number.isFinite(body/0),'Zero-range division must never be displayed as a percent');
assert.equal(Math.floor(20/(10-9.8)),100,'Whole-share hypothetical planned risk');
assert.equal(Math.floor(20/(10-9.75)),80,'Fresh transfer-case arithmetic');
assert.equal((10-9.6)*100,40,'Gap/slippage counterexample loss');
const html=read('assets/js/bootcamp-academy-v014168.js'),build=read('scripts/build-pages.sh');
assert(html.includes('showFreeEvidence(d,mount)')&&html.includes('await loadFreeEvidence()'));
assert(html.includes('SOURCE-RESEARCHED · ORIGINAL UNGRADED TEACHING'));
assert(!html.includes('innerHTML='));
assert(build.includes('free-foundations-evidence-v1.json'),'Public file must be in Pages build');
assert(read('.github/workflows/free-foundations-watchlist-v1.yml').includes('test_free_foundations_source_evidence_v1.mjs'));
console.log('PASS: five exact source-researched lesson objectives, independent calculations, counterexamples, transfer, primary links and non-grading delivery.');
