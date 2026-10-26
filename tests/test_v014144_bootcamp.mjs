import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bootcampCurriculumV014144 as curriculum} from '../functions/_lib/bootcamp-curriculum-v014144.js';
import {onRequest} from '../functions/api/bootcamp.js';
const guides=JSON.parse(readFileSync('data/competency-study-guides-v01499.json','utf8'));
const ids=JSON.parse(readFileSync('data/competency-lab-paths-v01499.json','utf8'));
assert.equal(guides.guides.length,30);
assert.equal(ids.totalCanonicalLabs,419);
assert.equal(curriculum.days.length,30);
assert.deepEqual(curriculum.days.map(d=>d.day),Array.from({length:30},(_,i)=>i+1));
const legalCodes=new Set(guides.guides.map(g=>g.code)),seen=new Set();
for(const d of curriculum.days){
 for(const field of ['title','objective','observe','practice','caution','toolPath'])
  assert(typeof d[field]==='string'&&d[field].length>=(field==='toolPath'?9:12),'Empty day '+d.day+' '+field);
 assert(d.practice.length>70&&d.caution.length>50,'Study material must be substantive');
 assert(/^([a-z0-9-]+\.html)$/.test(d.toolPath),'Only existing relative tools may be linked');
 assert(d.competencies.length>=2);
 for(const skill of d.competencies){assert(legalCodes.has(skill),'Unknown skill '+skill);seen.add(skill)}
 assert(d.relatedLabs.length>=2&&d.relatedLabs.every(l=>ids.byLab[l.id]&&l.bookCode===ids.byLab[l.id].bookCode&&l.editorial==='PROVISIONAL_UNGRADED'));
}
assert.equal(seen.size,30,'All thirty existing competencies must be mapped without creating a 31st');
assert(curriculum.officiallyGraded===false&&curriculum.marketHistoryProvided===false);
assert(!JSON.stringify(curriculum).includes('guessed fill'));
const app=readFileSync('bootcamp.html','utf8'),client=readFileSync('assets/js/bootcamp.js','utf8');
const learn=readFileSync('learn.html','utf8');
const sql=readFileSync('supabase/migrations/v0.14.0.144_BOOTCAMP_PROGRESS_OWNER_REVIEW_REQUIRED.sql','utf8');
assert(learn.includes('href="bootcamp.html"'),'Integrate the path into the EXISTING Learning System');
for(const id of ['gu-bc-status','gu-bc-metric','gu-bc-title','gu-bc-days','gu-bc-note','gu-bc-save-status','gu-bc-save','gu-bc-start'])
 assert(app.includes('id="'+id+'"'));
assert(app.includes('data-auth-required="true"'));
assert(client.includes('onAuthStateChange')&&client.includes('loadSerial')&&client.includes('clear()'));
assert(client.includes('progressAvailable')&&client.includes("q('gu-bc-save').disabled=busy||!progressAvailable"));
assert(!client.includes('localStorage')&&!client.includes('sessionStorage'));
assert(sql.includes('ON CONFLICT(user_id,day_number) DO UPDATE')&&sql.includes('first_reflected_at=coalesce'));
assert(sql.includes('SECURITY INVOKER')&&sql.includes('FROM PUBLIC,anon,authenticated'));
assert(sql.includes('TO service_role')&&!sql.includes('INSERT INTO public.lab_attempts'));
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let who=user,role='member',flag='active',access=true,schema=true,rows=[],mutations=0,reads=0;
const original=globalThis.fetch,json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opt={})=>{
 const x=String(url);
 if(x.endsWith('/auth/v1/user'))return json({id:who});
 if(x.includes('/profiles?'))return json([{account_kind:role}]);
 if(x.includes('/admin_user_flags?'))return json([{status:flag}]);
 if(x.includes('/admin_user_roles?'))return json([]);
 if(x.includes('/rpc/user_has_tool_access'))return json(access);
 if(x.includes('/gu_bootcamp_progress_v014144?')){
  reads++;assert(x.includes('user_id=eq.'+who),'Only authenticated member may query own study progress');
  assert.equal(opt.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert(!opt.headers.authorization,'Opaque secrets must never be JWT Authorization');
  return schema?json(rows.filter(r=>r.user_id===who)):json({message:'relation missing'},404);
 }
 if(x.endsWith('/rpc/gu_bootcamp_save_progress_v014144')){
  mutations++;assert.equal(opt.headers.apikey,env.SUPABASE_SECRET_KEY);
  const b=JSON.parse(opt.body);
  assert.equal(b.p_user,who,'Never trust user_id from the browser');
  if(!schema)return json({message:'schema not installed'},404);
  rows.push({user_id:who,day_number:b.p_day,revision:1,status:b.p_action==='start'?'in_progress':'reflection_saved',
             reflection:b.p_reflection,first_reflected_at:b.p_action==='start'?null:'2026-10-21T13:00:00Z'});
  return json({day:b.p_day,revision:1,status:b.p_action==='start'?'in_progress':'reflection_saved',
               reflection:b.p_reflection,graded:false,competencyMasteryAwarded:false});
 }
 throw Error('Unexpected Bootcamp source '+x);
};
const req=(method='GET',payload,token=true,origin='https://education.example')=>new Request('https://education.example/api/bootcamp'+(method==='GET'?'?action=curriculum':''),{
 method,headers:{...(token?{authorization:'Bearer member-token'}:{}),
 ...(method==='POST'?{'content-type':'application/json',origin}:{} )},
 ...(payload?{body:JSON.stringify(payload)}:{})});
const run=async(...args)=>{const r=await onRequest({request:req(...args),env});return [r.status,await r.json()]};
try{
 let [s]=await run('GET',undefined,false);assert.equal(s,401);assert.equal(reads,0);
 role='showcase';[s]=await run();assert.equal(s,403);assert.equal(reads,0);
 role='member';flag='suspended';[s]=await run();assert.equal(s,403);assert.equal(reads,0);
 flag='active';access=false;[s]=await run();assert.equal(s,403);assert.equal(reads,0);
 access=true;[s]=await run();assert.equal(s,200);
 let [,d]=await run();assert.equal(d.curriculum.days.length,30);assert.equal(d.progressAvailable,true);
 schema=false;[,d]=await run();assert.equal(d.progressAvailable,false);assert.equal(d.progress,null);
 assert.match(d.error,/not been verified/);
 const note='I checked a primary source against a dated market observation, and I cannot infer either a guaranteed return or a real execution from a single chart.';
 [s]=await run('POST',{day:1,action:'save_reflection',reflection:note,expectedRevision:0});assert.equal(s,503,'No phantom saved progress if table absent');
 schema=true;
 [s]=await run('POST',{day:1,action:'save_reflection',reflection:'short'});assert.equal(s,400);
 [s]=await run('POST',{day:31,action:'save_reflection',reflection:note});assert.equal(s,400);
 [s]=await run('POST',{day:1,action:'save_reflection',reflection:note,expectedRevision:0},true,'https://outside.example');assert.equal(s,403);
 let prev=mutations;[s]=await run('POST',{day:1,action:'save_reflection',reflection:note,expectedRevision:0});
 assert.equal(s,200);assert.equal(mutations,prev+1);
 assert(!JSON.stringify(d).includes('answer_key'),'No private rubric content should ever be in the response');
 who=other;[,d]=await run();assert.equal(d.progress.length,0,'Another account must have no progress rows');
 who=user;[,d]=await run();assert.equal(d.progress.length,1);assert.equal(d.progress[0].reflection,note);
 console.log('PASS v144: all 30 lessons/competencies, 419 Lab crosswalk, member-only persistent reflections, no fake grading, isolation and schema-blocked writes');
}finally{globalThis.fetch=original}
