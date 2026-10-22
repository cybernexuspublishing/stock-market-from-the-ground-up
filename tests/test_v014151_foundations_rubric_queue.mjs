import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const context={Set,Map,Array,Object,Number,String};context.globalThis=context;
runInNewContext(readFileSync('assets/js/foundations-rubric-queue-v014151.js','utf8'),context);
const Q=context.GroundUpFoundationsRubricQueueV014151;
const labs=Q.catalog(JSON.parse(readFileSync('data/labs.json','utf8')));
assert.equal(labs.length,94);
for(const [book,count] of [['1',15],['2',46],['3',33]])assert.equal(Q.summarize(labs,[],book).registered,count);
assert.equal(Q.summarize(labs,[]).missing.length,94);
const versions=[
 {lab_id:'F1-C02-L01',review_state:'draft',version:96},
 {lab_id:'F1-C02-L01',review_state:'reviewed',version:97},
 {lab_id:'F3-C06-L01',review_state:'draft',version:96},
 {lab_id:'DT-C01-L01',review_state:'reviewed',version:96}
];
const summary=Q.summarize(labs,versions);
assert.equal(summary.versioned,2);
assert.equal(summary.reviewed,1);
assert.equal(summary.missing.length,92);
assert.equal(Q.summarize(labs,versions,'3').versioned,1);
assert.equal(Q.summarize(labs,versions,'OTHER').missing.length,0);
const invalid=JSON.parse(readFileSync('data/labs.json','utf8'));invalid[0].concept='Historical simulator exercise';
assert.throws(()=>Q.catalog(invalid),/Invalid Foundations/);
assert.throws(()=>Q.catalog(invalid.slice(0,93)),/Incomplete 94/);
const html=readFileSync('training-editor.html','utf8'),ui=readFileSync('assets/js/training-editor.js','utf8');
assert(html.indexOf('foundations-rubric-queue-v014151.js')<html.indexOf('training-editor.js'));
for(const id of ['author-foundations-book','author-foundations-missing','author-foundations-coverage'])
 assert(html.includes('id="'+id+'"')&&ui.includes("$('#"+id+"')"));
assert(ui.includes('Prepared UNSAVED draft'));
console.log('PASS D11 94 Foundations rubric coverage and safe existing Owner review queue — no auto approvals');
