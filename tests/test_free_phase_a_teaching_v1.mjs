import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {academyByCode,academyCatalog} from '../functions/_lib/bootcamp-academy-v014168.js';
import {phaseAFreeFoundations} from '../functions/_lib/free-foundations-phase-a-v1.js';
const free=academyByCode.free5;
assert.equal(free.entitlement,'ELIGIBLE_FREE_MEMBER');
assert.equal(free.curriculum.length,5);assert.equal(phaseAFreeFoundations.length,5);
assert(!academyCatalog.some(x=>x.code==='free5'),'Free is not an extra paid Boot Camp');
for(const [index,day] of free.curriculum.entries()){
 assert.equal(day.day,index+1);assert.equal(day.programCode,'free5');
 assert.equal(day.officiallyGraded,false);assert.equal(day.masteryAwarded,false);
 assert.deepEqual(day.relatedLabs,[]);
 const x=day.lesson.phaseA;assert.equal(x,phaseAFreeFoundations[index]);
 assert.equal(x.terms.length,4);assert.equal(x.steps.length,4);assert(x.corrections.length>=2);
 for(const term of x.terms)assert(term[0].length>3&&term[1].length>25);
 for(const part of x.steps)assert(part.length>75,'Requires substantive worked instruction');
 for(const r of x.corrections){
  for(const f of ['name','why','how','case','review'])assert(r[f]?.length>30,'Missing meaningful '+f);
  assert.match(r.case,/FICTIONAL/i);
 }
 assert.match(day.lesson.workedExample,/FICTIONAL/i);
}
const ui=readFileSync(new URL('../assets/js/bootcamp-academy-v014168.js',import.meta.url),'utf8');
assert(ui.includes("d.programCode==='free5'&&lesson.phaseA"),'Free only');
assert(ui.includes('academy-free-phase-a-error')&&ui.includes("node('details')"),'Disclosure paths');
assert(ui.includes('Compare with a worked review — ungraded'),'No grading claim');
const css=readFileSync(new URL('../assets/css/free-foundations-v1.css',import.meta.url),'utf8');
assert(css.includes('.academy-free-phase-a summary:focus-visible'));
console.log('PASS Free Phase A content, misconception remediation, scope and ungraded boundaries.');
