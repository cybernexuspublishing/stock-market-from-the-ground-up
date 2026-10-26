import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest as competencies} from '../functions/api/competencies.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const catalog=JSON.parse(read('lab-catalog.json'));
const guides=JSON.parse(read('data/competency-study-guides-v01499.json'));
const map=JSON.parse(read('data/competency-lab-paths-v01499.json'));
assert.equal(catalog.labs.length,419);
assert.equal(map.totalCanonicalLabs,419);
assert.equal(map.mappedLabs,419);
assert.deepEqual(map.unmatchedLabIds,[]);
assert.equal(guides.guides.length,30);
assert.equal(new Set(guides.guides.map(x=>x.code)).size,30);
const idMap=new Map(catalog.labs.map(x=>[x.lab_id,x]));
assert.equal(Object.keys(map.byLab).length,419);
for(const [id,rec] of Object.entries(map.byLab)){
 const lab=idMap.get(id);assert(lab,'Unknown Lab '+id);
 assert.equal(lab.title,rec.title);
 assert.equal(lab.book_code,rec.bookCode);
 assert(rec.relatedCompetencies.length>=1&&rec.relatedCompetencies.length<=3);
 assert(['editorial_topic_bridge_ungraded','topic_keyword_suggestion_ungraded'].includes(rec.method));
 assert(rec.relatedCompetencies.every(c=>guides.guides.some(g=>g.code===c)));
}
const bySkillKeys=new Set(Object.keys(map.bySkill));
assert.deepEqual(bySkillKeys,new Set(guides.guides.map(x=>x.code)));
for(const g of guides.guides){
 for(const key of ['concept','procedure','limit','invalidation','commonError','selfCheck','reviewExplanation']){
  assert.equal(typeof g[key],'string',g.code+' missing '+key);
  assert(g[key].length>=40,g.code+' has inadequate '+key);
 }
 assert(map.bySkill[g.code].length>=1,'No canonical Labs for '+g.code);
}
for(const [code,items] of Object.entries(map.bySkill))for(const id of items){
 assert(idMap.has(id),'Nonexistent Lab '+id);
 assert(map.byLab[id].relatedCompetencies.includes(code));
}
const schema=read('supabase/migrations/v0.13.4_SKILLS_ADMIN_SHOWCASE.sql');
const first=schema.indexOf('insert into public.competency_definitions(');
const last=schema.indexOf('on conflict',first);
// Include digits: LEVEL2_READING is the 24th v0.13.4 seed entry.
const sourceCodes=[...schema.slice(first,last).matchAll(/\('([A-Z][A-Z0-9_]{3,})','[^']*','[^']*'/g)].map(x=>x[1]);
assert.equal(sourceCodes.length,30,'The approved v0.13.4 source already contains 30 competencies');
assert.equal(new Set(sourceCodes).size,30,'Unique canonical competency codes required');
assert(sourceCodes.includes('LEVEL2_READING'),'LEVEL2_READING is an existing approved code');
assert(!sourceCodes.includes('REPLAY_DISCIPLINE'),'Replay chronology is not a 31st official skill');
assert.deepEqual(new Set(guides.guides.map(x=>x.code)),new Set(sourceCodes));
assert.equal(guides.supplementalGuides?.length,1);
assert.equal(guides.supplementalGuides[0].code,'REPLAY_DISCIPLINE');
assert.equal(guides.supplementalGuides[0].officialCompetency,false);
assert.deepEqual(bySkillKeys,new Set(sourceCodes));
assert(map.bySkill.LEVEL2_READING.length>=3,'Level II must link to existing ungraded source Labs');
assert(!('REPLAY_DISCIPLINE' in map.bySkill),'Supplemental replay topic is not scored competency');
const migration=read('supabase/migrations/v0.14.0.99_COMPLETE_EXISTING_30_COMPETENCIES_OWNER_REVIEW_REQUIRED.sql');
const audit=read('supabase/admin/v0.14.0.101_COMPETENCY_CATALOG_RECONCILIATION_READ_ONLY.sql');
assert(migration.includes('BEGIN READ ONLY')&&migration.includes('LEVEL2_READING'));
assert(audit.includes('BEGIN READ ONLY')&&audit.includes('LEVEL2_READING'));
for(const sql of [migration,audit]){
 assert(!/^\s*(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|CREATE|DROP)\s/mi.test(sql),'Catalog SQL must not mutate the approved 30');
 assert(!sql.includes("('REPLAY_DISCIPLINE'::text)"),'31st skill must not appear as canonical seed');
}
for(const path of ['assets/js/site-lab-experience.js','assets/js/lab-player.js','assets/js/market-tutor.js']){
 assert(read(path).includes('/data/competency-lab-paths-v01499.json'),path+' not linked to guides');
 assert(read(path).includes('skills.html#guide-'),path+' missing guide navigation');
}
assert(read('assets/js/lab-registry.js').includes('gradedScore:grades.get(x.lab_id)'));
assert(read('assets/js/skills.js').includes('/data/competency-study-guides-v01499.json'));
assert(read('assets/js/skills.js').includes('host.replaceChildren()'));
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',calls=[],old=globalThis.fetch;
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
const skill={competency_code:'CANDLE_READING',category:'Chart Skills',name:'Candlesticks',
 description:'Read available candle evidence',minimum_evidence:10,pass_score:80,
 mastery_score:90,metadata:{mastery_pass_streak:3}};
let evidence=[{user_id:actor,competency_code:'CANDLE_READING',
 source_type:'quiz',source_id:'private-authored-case',dimension:'knowledge',
 score:100,passed:true,critical_error:false,difficulty:'guided',weight:1,
 assessed_at:'2026-10-19T22:00:00Z'}],accountKind='member';
globalThis.fetch=async (u,opts={})=>{
 const url=String(u);calls.push(url);
 if(url.endsWith('/auth/v1/user'))return json({id:actor});
 if(url.includes('/profiles?'))return json([{account_kind:accountKind}]);
 if(url.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(url.includes('/competency_definitions?'))return json([skill]);
 if(url.includes('/competency_evidence?'))return json(evidence);
 throw Error('Unexpected mock '+url);
};
try{
 const query=async()=>{const response=await competencies({env,request:new Request('https://site.test/api/competencies?action=summary',{headers:{authorization:'Bearer member-access'}})});return [response.status,await response.json()]};
 let [status,result]=await query();
 assert.equal(status,200);
 assert.equal(result.skills[0].completeAssessments,0);
 assert.equal(result.skills[0].status,'Conceptual Evidence Only','Single knowledge quiz must never certify competency proficiency');
 assert.equal(result.snapshot.strongest.length,0,'Partial knowledge-only scores must not become strongest complete competencies');
 assert.match(result.skills[0].diagnosis,/Partial evidence/i);
 evidence.push(...['knowledge','recognition','decision','process'].map(d=>({
  user_id:actor,competency_code:'CANDLE_READING',source_type:'quiz',source_id:'low-complete-assessment',
  dimension:d,score:50,passed:false,critical_error:false,difficulty:'assessment',
  weight:1,assessed_at:'2026-10-19T23:00:00Z'})));
 [status,result]=await query();
 assert.equal(status,200);assert.equal(result.skills[0].completeAssessments,1);
 assert.equal(result.skills[0].score,50);
 assert.equal(result.skills[0].status,'Needs Work','A perfect partial quiz cannot promote a poor complete assessment');
 // A latest complete high-scoring assessment with a critical risk error cannot
 // be 'Proficient' merely because its numeric average is high.
 evidence=[...['knowledge','recognition','decision','process'].map(d=>({
  user_id:actor,competency_code:'CANDLE_READING',source_type:'reviewed_case',source_id:'latest-critical',
  dimension:d,score:95,passed:true,critical_error:d==='decision',difficulty:'assessment',
  weight:1,assessed_at:'2026-10-20T23:00:00Z'}))];
 [status,result]=await query();
 assert.equal(status,200);
 assert.equal(result.skills[0].score,95);
 assert.equal(result.skills[0].status,'Developing','Latest critical error caps proficiency despite 95 average');
 assert.match(result.skills[0].nextStep,/latest critical risk or decision error/);
 // A newer, independently recorded complete assessment may demonstrate recovery.
 evidence.push(...['knowledge','recognition','decision','process'].map(d=>({
  user_id:actor,competency_code:'CANDLE_READING',source_type:'reviewed_case',source_id:'newer-clear',
  dimension:d,score:95,passed:true,critical_error:false,difficulty:'assessment',
  metadata:{independent:true,assistance:'none'},weight:1,assessed_at:'2026-10-21T23:00:00Z'})));
 [status,result]=await query();
 assert.equal(result.skills[0].status,'Proficient','A new clean complete result allows proficiency, not automatic mastery');
 assert.equal(result.skills[0].completeAssessments,2);
 assert.equal(result.skills[0].independentAssessments,1);
 assert.equal(result.skills[0].independentScore,95);
 // Removing trusted independence evidence must prevent Proficient classification.
 evidence=evidence.map(row=>({...row,metadata:{independent:false,assistance:'hint'}}));
 [status,result]=await query();
 assert.equal(result.skills[0].status,'Developing','Unverified/assisted assessment cannot satisfy proficiency');
 assert.equal(result.skills[0].independentAssessments,0);
 assert.match(result.skills[0].diagnosis,/not proven independently assessed/i);
 evidence=evidence.map(row=>row.source_id==='newer-clear'?{...row,metadata:{independent:true,assistance:'none'}}:row);
 [status,result]=await query();
 assert.equal(result.skills[0].status,'Proficient');
 // A single dimension marked as assisted taints the entire four-dimensional attempt.
 evidence=evidence.map(row=>row.source_id==='newer-clear'&&row.dimension==='process'?{...row,metadata:{independent:true,assistance:'Talia'}}:row);
 [status,result]=await query();
 assert.equal(result.skills[0].status,'Developing');
 accountKind='showcase';[status,result]=await query();
 assert.equal(status,200);assert.equal(result.synthetic,true);
 accountKind='member';
 evidence=[];[status,result]=await query();
 assert.equal(status,200);assert.equal(result.skills[0].status,'Not Yet Assessed');
 console.log('PASS v99: 419 canonical crosslinks, 30 original study guides, typed source catalog, source 30 skills, nonmutating SQL, full Lab/Tutor routes, no false proficiency from partial skills.');
}finally{globalThis.fetch=old}

// The existing learning-core CI automatically executes this independent,
// noncharging Lab recall contract without adding another workflow.
await import('./test_v014301_lab_concept_spaced_review.mjs');
await import('./test_v014301_prerequisite_author_demo.mjs');
await import('./test_v38_formative_reasoning.mjs');
