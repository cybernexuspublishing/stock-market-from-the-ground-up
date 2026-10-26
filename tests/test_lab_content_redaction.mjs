// TEST FIXTURE only — fake lesson text deliberately includes fake secret markers.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicGuidedLesson} from '../functions/api/lab-content.js';

const privateMaterial='TEST_SECRET_PRIVATE_ANSWER_AND_RUBRIC';
const raw={
 id:'FAKE-OTHER-ACCOUNT',book:999,concept:'Understanding candles',objective:'Explain the open, high, low and close.',
 what:'A candle summarizes prices.',why:'It shows price movement.',when:'During a defined time interval.',
 steps:['Find the open and close','Compare the high and low','Explain what remains uncertain'],
 workedExample:'An illustrative candle opens at $20 and closes at $21.',
 grader:privateMaterial,reviewGuide:privateMaterial,gradingStatus:privateMaterial,
 questions:[{answer:privateMaterial,rubric:privateMaterial}],correctAnswer:privateMaterial,
 answer_key:privateMaterial,privateReviewerNotes:privateMaterial,
 teaching:{
  what:'The candle body indicates open-to-close change.',
  how:['Mark the highest and lowest price','Calculate the full range'],
  why:'Observe change, not guaranteed outcomes.',
  questions:[privateMaterial],
  grader:privateMaterial,reviewGuide:privateMaterial,developerSecret:privateMaterial
 },
 arbitraryNewFuturePrivateProperty:privateMaterial
};
const payload=publicGuidedLesson(raw,'F2-C07-L01',2);
assert.equal(payload.id,'F2-C07-L01');
assert.equal(payload.book,2);
assert.equal(payload.objective,'Explain the open, high, low and close.');
assert.equal(payload.teaching.how.length,2);
assert.equal(payload.workedExample,'An illustrative candle opens at $20 and closes at $21.');
for(const bad of ['grader','reviewGuide','gradingStatus','questions','correctAnswer','answer_key',
 'privateReviewerNotes','arbitraryNewFuturePrivateProperty']){
 assert(!Object.hasOwn(payload,bad),bad+' must be removed');
 assert(!Object.hasOwn(payload.teaching,bad),bad+' nested must be removed');
}
assert(!JSON.stringify(payload).includes(privateMaterial));
const weird=publicGuidedLesson({teaching:{how:{answer:privateMaterial}},questions:[privateMaterial]},'F1-C02-L01',1);
assert.deepEqual(weird.steps,[]);
assert.deepEqual(weird.teaching.how,[]);
assert(!JSON.stringify(weird).includes(privateMaterial));
const api=readFileSync('functions/api/lab-content.js','utf8');
assert(!/labs:\s*rows\.filter[\s\S]*?\.map\(r=>r\.content\)/.test(api),'bulk list must not return raw content');
assert(!/lab:\s*row\.content\b/.test(api),'individual lesson must not return raw content');
assert.match(api,/lab:publicGuidedLesson\(row\.content,row\.lab_id,row\.book_number\)/);
assert.match(api,/const allowed=rows\.filter\(row=>isBetaCandidateLab\(row\.lab_id\)/s);
assert.match(api,/labs:allowed\.map\(row=>\(\{\s*\.\.\.publicGuidedLesson\(row\.content,row\.lab_id,row\.book_number\)/s);
console.log('PASS: member Lab API whitelists teaching only, excludes grading/review/private question keys (single and bulk)');
