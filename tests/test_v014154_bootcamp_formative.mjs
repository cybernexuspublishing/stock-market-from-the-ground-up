import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bootcampCurriculumV014144} from '../functions/_lib/bootcamp-curriculum-v014144.js';
const data=JSON.parse(readFileSync('data/bootcamp-formative-v014154.json','utf8'));
assert.equal(data.graded,false);
assert.equal(data.officialCompetencyEvidence,false);
assert.equal(data.days.length,30);
assert.deepEqual(data.days.map(d=>d.day),Array.from({length:30},(_,i)=>i+1));
assert.equal(new Set(data.days.map(d=>d.question)).size,30);
for(const d of data.days){
 assert.equal(bootcampCurriculumV014144.days[d.day-1].day,d.day);
 assert(d.question.length>=65&&d.reviewGuide.length>=90&&d.commonMistake.length>=50);
 assert.equal(d.graded,false);
 assert(!('answerKey' in d)&&!('correctAnswer' in d)&&!('historicalBars' in d));
}
const html=readFileSync('bootcamp.html','utf8'),js=readFileSync('assets/js/bootcamp.js','utf8');
for(const id of ['gu-bc-check-question','gu-bc-check-copy','gu-bc-check-reveal','gu-bc-check-review'])
 assert(html.includes('id="'+id+'"')&&js.includes("q('"+id+"')"));
assert(js.includes("fetch('/data/bootcamp-formative-v014154.json',{cache:'no-store'})"));
assert(js.includes('checkpoints.clear()'));
assert(js.includes('field.value+=addition'));
assert(js.includes("api('POST'"),'The prior authenticated member progress workflow remains unchanged');
console.log('PASS D14 30 distinct original formative prompts, private reflection integration and explicit ungraded status');
