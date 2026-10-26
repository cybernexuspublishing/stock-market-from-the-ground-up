/* The 2026-10-26 Owner-designated latest research ZIP (8) includes original
 * SOURCE-SIDE records: STT-S-0318 PLRX and STT-S-0320 SSM. These are not
 * broker confirmations or licensed candles. Assert education does not promote
 * article statements or hypothetical arithmetic to real historical trades.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {academyByCode} from '../functions/_lib/bootcamp-academy-v014168.js';
import {onRequest} from '../functions/api/bootcamp-academy.js';
const bc=academyByCode.truth5;
assert.equal(bc.days,5);
assert.equal(bc.curriculum.length,5);
const cases=[
 {day:3,slug:'two-key-lessons-from-my-live-plrx-trade',label:'PLRX',type:'SOURCE_REPORTED_CASE_WITH_OPEN_VERIFICATION'},
 {day:4,slug:'perfect-example-of-the-vwap-hold',label:'SSM',type:'SOURCE_REPORTED_RETROSPECTIVE_PLAN_NOT_EXECUTION'}
];
for(const {day,slug,label,type} of cases){
 const record=bc.curriculum[day-1];
 assert.equal(record.officiallyGraded,false);
 assert.equal(record.masteryAwarded,false);
 assert.equal(record.sourceStatus,'original_authored_truth5_editorial_review_pending');
 const item=record.lesson.sourceClaimCase;
 assert(item,'No additional source case attached to day '+day);
 assert.equal(item.evidenceType,type);
 assert(item.sourceUrl.startsWith('https://stockstotrade.com/'+slug+'/'));
 assert(item.title.includes(label)&&item.observation.includes(label)||item.title.includes(label));
 assert(item.observation.length>180);
 assert(item.limits.length>180);
 assert(item.question.length>90);
 assert(/not independently|not verified|not established|not a documented|not guaranteed/i.test(item.observation+' '+item.limits));
 assert(!/certified grade|verified fill|broker-confirmed transaction/i.test(item.title+' '+item.observation));
}
const ssm=bc.curriculum[3].lesson.sourceClaimCase;
assert(ssm.observation.includes('$4.23')&&ssm.observation.includes('$4.10')&&ssm.observation.includes('$4.84'));
assert(ssm.limits.includes('0.13')&&ssm.limits.includes('0.61')&&ssm.limits.includes('4.69:1'));
assert(ssm.limits.includes('769 whole shares')&&ssm.limits.includes('$100.10'));
assert.equal(Math.floor(100/(4.23-4.10)),769,'Whole-share sizing floor must not overspend risk budget');
assert.equal(Number(((4.84-4.23)/(4.23-4.10)).toFixed(2)),4.69);
assert(ssm.observation.includes('Sep. 5')&&ssm.observation.includes('Sep. 4'),
 'Archive/public-source displayed-date conflict must not be silently reconciled');
const plrx=bc.curriculum[2].lesson.sourceClaimCase;
assert(plrx.observation.includes('$22.01')&&plrx.observation.includes('$20')&&plrx.observation.includes('$0.22'));
assert(plrx.limits.includes('stop trigger')&&plrx.limits.includes('not a guaranteed transaction price'));
const ui=readFileSync('assets/js/bootcamp-academy-v014168.js','utf8');
const css=readFileSync('assets/css/bootcamp-academy-v014168.css','utf8');
assert(ui.includes('lesson.sourceClaimCase')&&ui.includes('document.createElement(tag)'));
assert(ui.includes('source.hostname===')&&ui.includes("source.hostname==='stockstotrade.com'"));
assert(ui.includes("citation.rel='noopener noreferrer'"));
assert(ui.includes('node(\\'p\\',claim.observation)'));
assert(!/caseBox\.innerHTML|citation\.innerHTML/.test(ui),'Untrusted source teaching may not become HTML');
assert(css.includes('academy-source-claim-case')&&css.includes(':focus-visible'));
const r=await onRequest({request:new Request('https://example.test/api/bootcamp-academy?action=catalog'),env:{}});
assert.equal(r.status,200);
const data=await r.json();
assert.equal(data.ok,true);
assert.equal(data.programs.find(x=>x.code==='truth5').days,5);
assert(!JSON.stringify(data).includes('sourceClaimCase'),'Public unauthenticated catalog must not contain curriculum cases');
console.log('PASS archive-8 source provenance: PLRX chronology + SSM hypothetical 4.69R/769 shares, conflicting page dates acknowledged, accessible read-only ungraded teaching, catalog does not expose cases');
