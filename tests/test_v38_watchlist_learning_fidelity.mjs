// Regressions for the pictured What Is a Watchlist? Lab defects.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=path=>readFileSync(path,'utf8');
const lessonSource=read('assets/js/lab-v33-instruction-content.js');
const exampleSource=read('assets/js/lab-v34-competency-examples.js');
const engineSource=read('assets/js/lab-engine-v32-universal.js');
const teacherSource=read('assets/js/lab-v33-instructor.js');
const styles=read('assets/css/lab-v33-experience.css');
const context={};
runInNewContext(exampleSource,context);
runInNewContext(lessonSource,context);
const plan=context.GroundUpLabV33InstructionContent.lesson({
 concept:'What Is a Watchlist?',stage:1,visualType:'none',
 guide:{code:'CANDIDATE_QUALITY',title:'Stock watchlist'}
});
assert.equal(plan.category,'watchlist');
assert(plan.blocks.join(' ').includes('A scanner searches'));
assert(plan.blocks.join(' ').includes('NOT a buy list'));
assert(plan.worked.some(x=>x.includes('VERIFY')));
assert(plan.worked.some(x=>x.includes('NO TRADE')));
assert(plan.check.question.includes('Does adding it to a watchlist'));
const scenario=context.GroundUpLabV34CompetencyExamples.get('CANDIDATE_QUALITY','What Is a Watchlist?');
assert.equal(scenario.steps.length,4);
assert(scenario.steps[0].toLowerCase().includes('watchlist'));
assert(scenario.steps[2].includes('Example B'));
assert(!scenario.steps[0].includes('+30%'));
assert(exampleSource.includes('gu-v34-watchlist-table'));
assert(engineSource.includes("if(worked.length&&(visualType==='candle'||visualType==='vwap'))"));
assert(engineSource.includes("if(event.detail?.type==='general')"));
assert(engineSource.includes("teachSupplement?.('Worked example · Step '"));
assert(teacherSource.includes("const title=el('h3','Talia');"));
assert(teacherSource.includes('watchlist'));
assert(styles.includes('.gu-v34-unified-lesson.gu-v34-concept-lesson'));
assert(styles.includes('grid-template-columns:repeat(3,minmax(0,1fr))!important'));
console.log('PASS watchlist education, faithful example, clean instructor, concept layout and nine-stage navigator');
