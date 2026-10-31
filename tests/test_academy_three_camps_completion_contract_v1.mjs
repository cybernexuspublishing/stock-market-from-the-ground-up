import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {threeCampDefinitions} from '../functions/_lib/academy-three-camps-v1.js';
const read=p=>readFileSync(p,'utf8');
const families={tape10:10,indicators10:10,filings7:7};
assert.equal(threeCampDefinitions.length,3);
for(const course of threeCampDefinitions){
 assert.equal(course.days,families[course.code]);
 assert.equal(course.lessons.length,course.days);
 assert.equal(new Set(course.lessons.map(x=>x.title)).size,course.days);
 for(const [index,lesson] of course.lessons.entries()){
  for(const field of ['title','terms','teach','worked','method','experiment','predict','replay','review','transfer']){
   assert(typeof lesson[field]==='string'&&lesson[field].trim().length>=35,
    course.code+' day '+(index+1)+' needs actual '+field);
  }
  assert.equal(lesson.evidenceType,'FICTIONAL_EDUCATIONAL_DATA_NO_HISTORICAL_LICENSE');
  assert.equal(lesson.editorialStatus,'original_instruction_source_reviewed_whole_lesson_editorial_pending');
  assert(/^https:\/\//.test(lesson.source.url));
 }
}
const frontend=read('assets/js/bootcamp-academy-v014168.js');
const page=read('bootcamp-academy.html');
const instructor=read('assets/js/academy-guided-v1.js');
const evidence=read('assets/js/academy-three-camps-evidence-v1.js');
const assessment=read('assets/js/academy-protected-assessment-v1.js');
const service=read('functions/api/academy-protected-assessment-v1.js');
const academy=read('functions/api/bootcamp-academy.js');
for(const marker of ['academy-three-camps-evidence-v1.js','academy-protected-assessment-v1.js','academy-official-assessment','academy-protected-v1.css'])assert(page.includes(marker));
assert(frontend.includes('mountOfficialAssessment()'));
assert(frontend.includes('protectedAssessmentSession?.dispose?.()'));
assert(frontend.includes("['tape10','indicators10','filings7'].includes(activeCode)"));
assert(instructor.includes('root.GroundUpAcademyEvidenceV1.mount(visual,{day,stage})'));
assert(instructor.includes("day.lesson?.evidenceType==='FICTIONAL_EDUCATIONAL_DATA_NO_HISTORICAL_LICENSE'"));
assert(evidence.includes("if(stage<row.from)continue"),'Future evidence is not rendered ahead of stage');
for(const k of ['microstructure','indicators','filings'])assert(evidence.includes(k));
assert(evidence.includes('FICTIONAL TEACHING CASE'));
assert(assessment.includes("root.getSupabaseClient?.()"));
assert(assessment.includes("method:body===undefined?'GET':'POST'"));
assert(assessment.includes("detail.replaceChildren()"));
assert(!assessment.includes('answer_key'));
assert(service.includes('rpc/submit_competency_case_v135'));
assert(service.includes("ACADEMY_THREE_CAMPS_ENABLED!=='true'"));
assert(academy.includes("const released=env=>env?.ACADEMY_THREE_CAMPS_ENABLED==='true'"));
assert(academy.includes("academyCatalog.filter(p=>!newCourses.has(p.code)||released(env))"));
console.log('PASS ten-program scope: three distinct 27-day curricula, subject-specific evidence, protected assessment UI, hidden public release, no client keys');
