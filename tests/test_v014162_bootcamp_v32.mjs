import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bootcampCurriculumV014144} from '../functions/_lib/bootcamp-curriculum-v014144.js';
const labs=JSON.parse(readFileSync('data/competency-lab-paths-v01499.json','utf8')).byLab;
const guides=JSON.parse(readFileSync('data/competency-study-guides-v01499.json','utf8')).guides;
const known=new Set(guides.map(x=>x.code));
assert.equal(bootcampCurriculumV014144.days.length,30);
for(const d of bootcampCurriculumV014144.days){
 assert(d.relatedLabs.length>0,'No Lab bridge for day '+d.day);
 assert(d.relatedLabs.every(l=>labs[l.id]),'Invalid Lab ID in day '+d.day);
 assert(d.competencies.every(c=>known.has(c)),'Unknown competency in day '+d.day);
}
const h=readFileSync('bootcamp.html','utf8'),b=readFileSync('assets/js/bootcamp.js','utf8'),e=readFileSync('assets/js/lab-engine-v32-universal.js','utf8');
assert(h.includes('gu-bc-v32-stage'));
assert(h.indexOf('lab-engine-v32-universal.js')<h.indexOf('bootcamp.js'));
assert(b.includes("labId:first,mode:'guided',target:guideSlot"));
assert(b.includes("focusId:'gu-bc-note'"));
assert(e.includes("document.getElementById(focusId||'ev-decision')"));
console.log('PASS all 30 Bootcamp days linked to shared nine-stage Lab v3.2 subject study');
