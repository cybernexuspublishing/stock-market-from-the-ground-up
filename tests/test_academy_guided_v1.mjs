import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {Script} from 'node:vm';import {academyPrograms} from '../functions/_lib/bootcamp-academy-v014168.js';
import {onRequest as academyRequest} from '../functions/api/bootcamp-academy.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
assert.deepEqual(academyPrograms.map(p=>p.days),[5,7,10,30,45,60,90,10,10,7]);
assert.equal(academyPrograms.reduce((v,p)=>v+p.curriculum.length,0),274);
for(const code of ['tape10','indicators10','filings7']){
 const program=academyPrograms.find(p=>p.code===code);
 assert(program);
 assert.equal(new Set(program.curriculum.map(d=>d.title)).size,program.days);
 for(const day of program.curriculum)assert(day.lesson?.worked&&day.lesson?.source?.url&&day.lesson?.transfer);
}
for(const p of academyPrograms)for(const day of p.curriculum)assert(day.objective&&day.observe&&day.practice&&day.officiallyGraded===false);
const catalogRequest=new Request('https://example.test/api/bootcamp-academy?action=catalog');
const defaultCatalog=await(await academyRequest({request:catalogRequest,env:{}})).json();
assert.equal(defaultCatalog.programs.length,7,'Unassessed courses must remain unreleased');
const flaggedCatalog=await(await academyRequest({request:catalogRequest,env:{ACADEMY_THREE_CAMPS_ENABLED:'true'}})).json();
assert.equal(flaggedCatalog.programs.length,10);
const js=read('assets/js/academy-guided-v1.js');
for(const word of ['Start','Learn','Calculate / Analyze','Experiment','Predict','Replay / Practice','Assess','Review & Retry','Transfer Challenge','Results','Close & Next — Submit answer','No Lumens charged','CrownlightLearningEChartsV1?.mount','Not Yet Assessed','academy-guided-numeric','Total traded dollars ($)','Full range ($)','Risk per share ($)'])assert(js.includes(word),word);
assert(read('assets/js/bootcamp.js').includes("GroundUpAcademyGuidedV1?.mount"));
assert(read('assets/js/bootcamp-academy-v014168.js').includes("GroundUpAcademyGuidedV1?.mount"));
assert(read('bootcamp.html').includes('gu-bc-guided'));
assert(read('bootcamp-academy.html').includes('academy-guided-v1.js'));
assert(read('assets/css/academy-guided-v1.css').includes('grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)'));
assert.doesNotThrow(()=>new Script(js));
console.log('PASS shared guided experience mapped to ten Boot Camps and 274 day records without protected grading');
