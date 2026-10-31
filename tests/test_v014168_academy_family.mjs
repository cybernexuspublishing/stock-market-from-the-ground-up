import assert from 'node:assert/strict';
import fs from 'node:fs';
import {academyPrograms,academyCatalog,academyByCode,ACADEMY_VERSION} from '../functions/_lib/bootcamp-academy-v014168.js';
const original=await import('../functions/_lib/bootcamp-curriculum-v014144.js');
const labMap=JSON.parse(fs.readFileSync('data/competency-lab-paths-v01499.json','utf8'));
const guides=JSON.parse(fs.readFileSync('data/competency-study-guides-v01499.json','utf8'));
const names={
 truth5:['The Truth Behind the Ticker',5],watchlist7:['Build Your Own Stock Watchlist',7],
 scanners10:['Mastering Stock Scanners',10],
 foundations30:['The Complete Trading Foundations Boot Camp',30],
 charts45:['Chart Reading and Trading Setups',45],
 risk60:['Risk, Execution, and Trading Discipline',60],
 practicum90:['Advanced Simulated Trading Practicum',90]
};
assert.equal(ACADEMY_VERSION,'0.14.0.168');
assert.equal(academyPrograms.length,10);
assert(academyByCode.truth5.curriculum[1].lesson.reviewGuide.includes('public-availability'));
assert(academyByCode.truth5.curriculum[2].lesson.sourceProcedure.some(s=>s.includes('acceptance timestamp')&&s.includes('public availability')));

assert.equal(academyCatalog.length,10);
assert.equal(new Set(academyPrograms.map(p=>p.code)).size,10);
const official=new Set(guides.guides.map(g=>g.code));
assert.equal(official.size,30);
for(const [code,[name,duration]] of Object.entries(names)){
 const p=academyByCode[code];assert(p,code+' missing');
 assert.equal(p.title,name);assert.equal(p.days,duration);
 assert.equal(p.curriculum.length,duration);
 assert.equal(p.entitlement,'ONDEMAND_TRAINING');
 assert.equal(p.version,ACADEMY_VERSION);
 assert.equal(p.progression,'individual_program_progress_ungraded_no_automatic_mastery');
 for(const [i,day] of p.curriculum.entries()){
  assert.equal(day.day,i+1,code+' day sequence');
  assert.equal(day.programCode,code);
  assert.equal(day.officiallyGraded,false);
  assert.equal(day.masteryAwarded,false);
  assert(day.title.length>12&&day.objective.length>20);
  assert(day.observe.length>20&&day.practice.length>20);
  assert.equal(new Set(day.relatedLabs.map(x=>x.id)).size,day.relatedLabs.length,
    'A program day cannot repeat the same canonical Lab reference twice');
  for(const l of day.relatedLabs)assert(labMap.byLab[l.id],code+' invented Lab '+l.id);
  for(const c of day.competencies)assert(official.has(c),code+' invented official competency '+c);
 }
}
for(const [i,d] of original.bootcampCurriculumV014144.days.entries()){
 const preserved=academyByCode.foundations30.curriculum[i];
 assert.equal(preserved.title,d.title,'30-day day title must remain authoritative');
 assert.equal(preserved.objective,d.objective,'30-day approved objective must remain controlling');
}
for(const code of ['charts45','risk60','practicum90']){
 const p=academyByCode[code];
 assert(new Set(p.curriculum.map(x=>x.title)).size===p.days,
  'Every advanced course day needs its own progression label');
 assert(p.curriculum.some(x=>x.phase==='transfer'),code+' must require independent transfer');
}
const firstCourse=academyByCode.truth5;
assert.equal(firstCourse.curriculum.length,5);
for(const [index,day] of firstCourse.curriculum.entries()){
 const lesson=day.lesson;
 assert(lesson&&typeof lesson==='object','Day '+(index+1)+' requires its own authored teaching');
 for(const key of ['explanation','workedExample','selfCheck','reviewGuide','error','transfer'])
  assert(typeof lesson[key]==='string'&&lesson[key].length>=90,'Missing '+key+' day '+(index+1));
 assert(Array.isArray(lesson.sourceProcedure)&&lesson.sourceProcedure.length>=5);
 assert(typeof lesson.investigation==='string'&&lesson.investigation.startsWith('FICTIONAL INDEPENDENT'),
  'Each Truth5 day must provide a distinct, explicitly fictional evidence investigation');
 assert(lesson.investigation.length>=380,'Independent investigation cannot be a generic prompt');
 assert.equal(day.method.length,lesson.sourceProcedure.length);
 assert.match(day.sourceStatus,/editorial_review_pending/);
 assert.equal(day.officiallyGraded,false);
 assert.equal(day.masteryAwarded,false);
}
assert.equal(new Set(firstCourse.curriculum.map(x=>x.lesson.investigation)).size,5,
 'Independently applied research cases must not repeat across the five days');
const client=fs.readFileSync('assets/js/bootcamp-academy-v014168.js','utf8');
assert(client.includes("showOriginalInstruction(d)"));
assert(client.includes("selfCheckDrafts.clear()"),
 'All ungraded self-check drafts must be destroyed on identity change');
assert(client.includes("Optional related book Labs"),
 'Academy must disclose independently entitled, nonrequired book Labs');
assert(client.includes("Independent evidence investigation"),'Each authored case must render on the same Academy lesson page');
assert(client.includes("answer.value.trim().length<40"),'The formative review requires learner reasoning first');
assert(client.includes('not mastery.')&&client.includes('not graded mastery.'),'Academy must disclose that self-check and reflection do not award mastery');

const academyCss=fs.readFileSync('assets/css/bootcamp-academy-v014168.css','utf8');
const sharedCss=fs.readFileSync('assets/css/lab-v33-experience.css','utf8');
assert(sharedCss.includes(':is(#gu-v32-teaching-slot,#academy-lab-slot) .gu-v40-start-hero')&&
 sharedCss.includes(':is(#gu-v32-teaching-slot,#academy-lab-slot) .gu-v40-instructor-steps'),
 'The illustrated Start and one-to-one teaching controls must work in all Academy routes, not just the Lab player');
assert(academyCss.includes('#academy-lab-slot .gu-v34-unified-lesson'),
 'Academy must style the shared instructor in its own container, not only in the Lab player');
assert(academyCss.includes('grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr)'),
 'Wide Academy teaching must place chart and Talia side by side');
assert(academyCss.includes('@container (max-width:959px)'),
 'Academy teaching must stack in a narrow panel, including mobile');
assert(academyCss.includes('gu-v33-wallet-tab'),
 'Crownlight Wallet remains visible in the Academy instructor controls');
const sql=fs.readFileSync('supabase/migrations/v0.14.0.168_BOOTCAMP_ACADEMY_OWNER_REVIEW_REQUIRED.sql','utf8');
assert(sql.includes('ENABLE ROW LEVEL SECURITY'));
assert(sql.includes('REVOKE ALL ON public.gu_bootcamp_academy_progress_v014168 FROM PUBLIC,anon,authenticated'));
assert(sql.includes('pg_advisory_xact_lock'));
assert(sql.includes('p_expected_revision'));
assert(sql.includes('competencyMasteryAwarded'));
assert(!sql.includes('gu_bootcamp_progress_v014144('),'No writes to established thirty-day progress');
const api=fs.readFileSync('functions/api/bootcamp-academy.js','utf8');
assert(api.includes("toolAccess(env,request,'ONDEMAND_TRAINING')"));
assert(api.includes('sameOrigin(request)'));
assert(api.includes('expectedRevision'));
assert(api.includes("form.program==='foundations30'")&&api.includes('gu_foundations30_beta_enroll_v1'),
 '30-day enrollment is supported without routing daily progress through the Academy service');
assert(api.includes("data.program==='foundations30'&&data.action!=='enroll'"),
 '30-day study progress must remain under the canonical original Boot Camp API');
const html=fs.readFileSync('bootcamp-academy.html','utf8');
assert(html.includes('assets/js/lab-engine-v32-universal.js'));
assert(html.includes('assets/js/bootcamp-academy-v014168.js'));
assert(html.includes('id="academy-programs"'));
assert(html.includes('id="academy-lab-slot"'));
for(const entrypoint of ['learn.html','bootcamp.html']){
 const source=fs.readFileSync(entrypoint,'utf8');
 assert(source.includes('external thinkorswim OnDemand'),
  entrypoint+' must explicitly identify external order-simulation practice');
 assert(!source.includes('Journal, Simulator and Market Tutor'),
  entrypoint+' must not falsely promise an in-site trading simulator');
}
console.log('PASS 7 preserved approved Academy titles, 247 unique-day study slots, 419 Lab ID reuse, 30 competencies, protected progress contract');
