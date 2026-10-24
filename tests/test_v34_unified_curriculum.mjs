/* Source-level parity + curriculum regression.
 * Protects the nine-stage, 419-ID, 30-day and 30-competency owner contracts.
 * Does not imply editorial acceptance, authorized market history or grading.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';
import {bootcampCurriculumV014144} from '../functions/_lib/bootcamp-curriculum-v014144.js';
const read=path=>readFileSync(path,'utf8');
const file=path=>JSON.parse(read(path));
const guides=file('data/competency-study-guides-v01499.json').guides;
const mapping=file('data/competency-lab-paths-v01499.json');
const authored=file('data/labs.json');
assert.equal(guides.length,30);
assert.equal(bootcampCurriculumV014144.days.length,30);
assert.equal(Object.keys(mapping.byLab).length,419);
assert.equal(authored.length,94);
const env=createContext({});
for(const script of ['assets/js/lab-v34-competency-examples.js',
 'assets/js/lab-v34-interactive-lessons.js',
 'assets/js/lab-v33-instruction-content.js']){
 const source=read(script);
 assert.doesNotThrow(()=>new Script(source,{filename:script}),script);
 new Script(source,{filename:script}).runInContext(env);
}
const examples=env.GroundUpLabV34CompetencyExamples;
const teaching=env.GroundUpLabV34InteractiveLessons;
const author=env.GroundUpLabV33InstructionContent;
assert.equal(examples.codes.length,30);
const known=new Set(guides.map(g=>g.code));
for(const guide of guides){
 const scenario=examples.get(guide.code);
 assert(scenario?.steps?.length>=4,'No complete concept-specific case: '+guide.code);
 assert(scenario.steps.every(x=>typeof x==='string'&&x.length>=55),
  'Worked cases must be instructive, not labels: '+guide.code);
 const plan=author.lesson({stage:1,concept:guide.title,guide});
 assert(plan.worked.length>=4,'Guide omitted its worked case: '+guide.code);
 assert(plan.blocks.length>=3,'Guide lacks staged instruction: '+guide.code);
 const linked=teaching.get({type:'general',feature:'apply',concept:guide.title,guide});
 assert(linked.example.includes(scenario.steps[0]),'Interactive micro lesson omitted authored case: '+guide.code);
 for(const key of ['definition','why','method','example','mistake','limit','question']){
  assert(typeof linked[key]==='string'&&linked[key].length>=15,
   'Missing '+key+' for '+guide.code);
 }
}
for(const [id,meta] of Object.entries(mapping.byLab)){
 assert(Array.isArray(meta.relatedCompetencies)&&meta.relatedCompetencies.length>0,
  'Missing original competency mapping: '+id);
 assert(known.has(meta.relatedCompetencies[0]),'Unknown competency: '+id);
}
for(const day of bootcampCurriculumV014144.days){
 assert(day.day>=1&&day.day<=30&&day.title&&day.objective&&day.observe&&day.practice&&day.caution,
  'Incomplete daily owner-authored material for Day '+day.day);
 assert(day.relatedLabs?.length>0,'Bootcamp day lacks a canonical Lab bridge '+day.day);
 assert(mapping.byLab[day.relatedLabs[0].id],'Bootcamp day uses a noncanonical Lab '+day.day);
 assert(day.competencies?.every(x=>known.has(x)),'Bootcamp day competency mismatch '+day.day);
}
for(const [type,features] of Object.entries({
 candle:['all','open','close','high','low','body','range','percent'],
 vwap:['price','both','volume'],ema:['price','both','volume'],
 structure:['price','both','volume'],volume:['price','both','volume'],
 tape:['prints'],depth:['quotes'],routing:['order']
})){
 for(const feature of features){
  const plan=teaching.get({type,feature,concept:type});
  assert(plan&&plan.example.length>=45&&plan.limit.length>=30&&plan.question.length>=20,
   'Missing reference-depth teaching for '+type+'/'+feature);
 }
}
for(const kind of ['candle','vwap']){
 const steps=teaching.practiceFor(kind);
 assert.equal(steps.length,3,kind+' requires 3 independent intermediate calculations');
 assert(steps.every(x=>Number.isFinite(x.answer)&&x.prompt&&x.help&&x.newExample));
}
const candle=teaching.practiceFor('candle');
assert.deepEqual(candle.map(x=>x.answer),[1,2,50]);
const vwap=teaching.practiceFor('vwap');
assert(Math.abs(vwap[2].answer-2600/300)<.001);
const engine=read('assets/js/lab-engine-v32-universal.js');
const instructor=read('assets/js/lab-v33-instructor.js');
const chart=read('assets/js/lab-v33-visual-interactions.js');
const bootcamp=read('assets/js/bootcamp.js');
assert(engine.includes('gu-v34-unified-lesson')&&engine.includes('gu-v34-visual-focus'));
assert(engine.includes('focusButtons[index+1].click()'));
assert(instructor.includes('gu-v34-topic-tools')&&instructor.includes('gu-v34-focus-answered'));
assert(instructor.includes('teachFeature')&&instructor.includes('featurePhase===0'));
assert(chart.includes('gu-v34-visual-focus'));
assert(bootcamp.includes('checkpoint?.question')&&bootcamp.includes('concept:d.title'));
for(const page of ['lab-player.html','bootcamp.html']){
 const html=read(page);
 assert(html.includes('lab-v34-competency-examples.js')&&html.includes('lab-v34-interactive-lessons.js')&&
  html.includes('lab-v33-instructor.js')&&html.includes('lab-v33-contextual-visuals.js'),
  'Missing unified teaching assets from '+page);
}
console.log('PASS v3.4 contracts: 419 mapped Lab IDs, 30 competency worked cases, 30 Bootcamp days, eight teaching families, 3-step Candle/VWAP mathematics, shared chart/instructor integration');
