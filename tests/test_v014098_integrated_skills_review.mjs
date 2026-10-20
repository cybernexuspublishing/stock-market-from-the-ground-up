// v0.14.0.98 | 419 Lab progress, Owner review, all 30 actual competencies.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest as training} from '../functions/api/interactive-training.js';
import {onRequest as competency} from '../functions/api/competencies.js';
import {onRequest as editor} from '../functions/api/training-editor.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',secret='sb_secret_private';
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',
 SUPABASE_SECRET_KEY:secret};
const old=globalThis.fetch,calls=[];let kind='member',accountStatus='active',grant=true,role='OWNER';
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json'}});
const completed=[
 {lab_id:'SITE-001',score:45,mode:'guided',completed_at:'2026-10-19T22:00:00Z'},
 {lab_id:'F1-C02-L01',score:85,mode:'assessment',completed_at:'2026-10-19T21:00:00Z'},
 {lab_id:'SITE-001',score:95,mode:'practice',completed_at:'2026-10-18T22:00:00Z'}
];
const defs=Array.from({length:30},(_,i)=>({
 competency_code:'SKILL_'+String(i+1).padStart(2,'0'),category:'Stock Market',
 name:'Competency '+(i+1),description:'Approved skill definition',minimum_evidence:10,
 pass_score:80,mastery_score:90,metadata:{mastery_pass_streak:3}}));
const rubric={lab_id:'SITE-001',version:96,review_state:'draft',
 title:'Site original authored training sample',source_status:'original_hypothetical_unreviewed_v01496',
 questions:[{id:'Q01',kind:'choice',prompt:'Which observation is directly supported by the supplied source?',
 options:['Visible observation','Fabricated future'],explanation:'Identify observed data and distinguish inference.'}],
 answer_key:{Q01:'Visible observation'}};
globalThis.fetch=async(url,opts={})=>{
 const path=String(url);calls.push({path,opts});
 if(path.endsWith('/auth/v1/user'))return json({id:uid});
 if(path.includes('/profiles?'))return json([{account_kind:kind}]);
 if(path.includes('/admin_user_flags?'))return json([{status:accountStatus}]);
 if(path.includes('/admin_user_roles?'))return json([{role_code:role,expires_at:null}]);
 if(path.includes('/rpc/user_has_tool_access'))return json(grant);
 if(path.includes('/lab_training_attempts_v014?'))return json(completed);
 if(path.includes('/competency_definitions?'))return json(defs);
 if(path.includes('/competency_evidence?'))return json([]);
 if(path.includes('/lab_training_sets_v014?')&&opts.method==='PATCH'){
  assert.equal(JSON.parse(opts.body).source_status,rubric.source_status);
  return json([{...rubric,review_state:'draft'}]);
 }
 if(path.includes('/lab_training_sets_v014?')&&path.includes('select=version,review_state,source_status'))return json([{version:96,review_state:'draft',source_status:rubric.source_status}]);
 if(path.includes('/lab_training_sets_v014?')&&path.includes('select=*'))return json([rubric]);
 if(path.includes('/lab_training_sets_v014?'))return json([{lab_id:rubric.lab_id,version:96,title:rubric.title,review_state:'draft',source_status:rubric.source_status}]);
 throw Error('Unexpected mock route: '+path);
};
const req=(path,body)=>new Request('https://school.example/api/'+path,{
 method:body?'POST':'GET',
 headers:{authorization:'Bearer user-session',...(body?{'content-type':'application/json'}:{})},
 ...(body?{body:JSON.stringify(body)}:{})});
const get=async(handler,path,body)=>{
 const response=await handler({request:req(path,body),env});return [response.status,await response.json()];
};
try{
 let [status,body]=await get(training,'interactive-training?action=progress');
 assert.equal(status,200);assert.equal(body.reviewedRows,3);
 assert.deepEqual(body.latestByLab.map(x=>[x.labId,x.score]),[['SITE-001',45],['F1-C02-L01',85]]);
 assert.equal(body.masteryAwarded,false);
 assert(!JSON.stringify(body).includes('answer_key'));
 assert(!JSON.stringify(body).includes('private'));
 grant=false;[status]=await get(training,'interactive-training?action=progress');
 assert.equal(status,403,'No tool access means no private training transcript');grant=true;
 [status,body]=await get(competency,'competencies?action=summary');
 assert.equal(status,200);assert.equal(body.skills.length,30);
 assert(body.skills.every(x=>x.status==='Not Yet Assessed'&&x.evidenceCount===0));
 assert(!JSON.stringify(body).includes('Recorded score: 45'));
 accountStatus='restricted';
 [status]=await get(competency,'competencies?action=summary');
 assert.equal(status,403,'Restricted member must not read private competency records');
 accountStatus='active';
 [status,body]=await get(editor,'training-editor?action=list');
 assert.equal(status,200);assert.equal(body.sets[0].review_state,'draft');
 [status,body]=await get(editor,'training-editor?action=draft',{
  labId:'SITE-001',title:rubric.title,questions:rubric.questions,answerKey:rubric.answer_key
 });
 assert.equal(status,200);assert.equal(body.reviewState,'draft');
 assert(!JSON.stringify(body).includes('Visible observation'));
 role='ADMIN';[status]=await get(editor,'training-editor?action=list');
 assert.equal(status,403,'Owner-only private grading keys');
 role='OWNER';kind='showcase';[status]=await get(editor,'training-editor?action=list');
 assert.equal(status,403,'Showcase not permitted to modify grading system');
 for(const {path,opts} of calls.filter(x=>x.path.includes('/rest/v1/'))){
  assert.equal(opts.headers.apikey,secret);
  assert.equal(opts.headers.authorization,undefined,'Opaque sb_secret must not be used as JWT');
 }
 const skill=readFileSync(new URL('../assets/js/skills.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../skills.html',import.meta.url),'utf8');
 assert(skill.includes("'/api/interactive-training?action=progress'"));
 assert(skill.includes("'/api/competencies?action=summary'"));
 assert(skill.includes('verified assessment evidence'));
 assert(ui.includes('id="official-competencies"')&&ui.includes('id="recorded-training-grades"'));
 const editorUI=readFileSync(new URL('../training-editor.html',import.meta.url),'utf8');
 assert(editorUI.includes('id="author-filter"')&&editorUI.includes('id="author-queue-count"'));
 console.log('PASS v98: private 419 Lab grade history, 30 actual competency definitions, no fabricated mastery, restricted-role security, and Owner draft source preservation.');
}finally{globalThis.fetch=old}
