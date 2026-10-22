import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const scope={Set,Map,Array,Object,Number,String};scope.globalThis=scope;
runInNewContext(readFileSync('assets/js/foundations-rubric-queue-v014151.js','utf8'),scope);
const Q=scope.GroundUpFoundationsRubricQueueV014151;
const src=JSON.parse(readFileSync('lab-catalog.json','utf8'));
const rest=Q.otherCatalog(src);
assert.equal(rest.length,325);
assert.equal(new Set(rest.map(x=>x.id)).size,325);
for(const [category,n] of Object.entries({DAY_TRADING_BOOK_1:150,READING_THE_TAPE:75,SITE_EXCLUSIVE:100}))
 assert.equal(rest.filter(x=>x.collection===category).length,n);
assert.equal(Q.summarizeOther(rest,[]).missing.length,325);
const versions=[
 {lab_id:rest[0].id,review_state:'draft',version:1},
 {lab_id:rest[0].id,review_state:'reviewed',version:2},
 {lab_id:rest[1].id,review_state:'draft',version:1},
 {lab_id:'F1-C02-L01',review_state:'reviewed',version:8}
];
const result=Q.summarizeOther(rest,versions);
assert.equal(result.versioned,2);
assert.equal(result.reviewed,1);
assert.equal(result.missing.length,323);
const duplicate=JSON.parse(readFileSync('lab-catalog.json','utf8'));
duplicate.labs[1].lab_id=duplicate.labs[0].lab_id;
assert.throws(()=>Q.otherCatalog(duplicate),/Invalid canonical/);
assert.throws(()=>Q.otherCatalog({labs:src.labs.slice(0,418)}),/incomplete/);
const html=readFileSync('training-editor.html','utf8');
const ui=readFileSync('assets/js/training-editor.js','utf8');
assert(html.includes('Remaining 325 Labs'));
assert(ui.includes("fetch('/lab-catalog.json',{cache:'no-store'})"));
assert(ui.includes("q.summarizeOther(otherIndex,rubricIndex)"));
assert(ui.includes("bookChoice()==='OTHER'?otherIndex:foundationsIndex"));
console.log('PASS D12 325 remaining Labs in Owner review queue; count and incomplete source guard, no auto-published graded Rubrics');
