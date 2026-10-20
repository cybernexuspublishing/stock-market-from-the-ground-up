// v0.14.0.105 reviewed-quiz knowledge-only competency evidence bridge.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest as training} from '../functions/api/interactive-training.js';
import {onRequest as editorial} from '../functions/api/training-editor.js';
import {onRequest as skills} from '../functions/api/competencies.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const secret='sb_secret_mock';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:secret};
let role='OWNER',kind='member',account='active',access=true,bridgeCalls=0,approvals=0;
const calls=[],orig=globalThis.fetch;
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
const definitions=[{competency_code:'CHART_STRUCTURE',category:'Chart',name:'Chart Structure',
 description:'Reviewed official stock-market subject',pass_score:80,mastery_score:90,minimum_evidence:12,
 metadata:{mastery_pass_streak:3},active:true}];
const evidence=[{user_id:uid,competency_code:'CHART_STRUCTURE',source_type:'quiz',
 source_id:'v014-assessment:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',dimension:'knowledge',
 score:90,passed:true,critical_error:false,difficulty:'assessment',
 assessed_at:'2026-10-19T12:00:00Z',weight:1,metadata:{knowledge_only:true,market_history_verified:false}}];
globalThis.fetch=async(url,opts={})=>{
 const u=String(url);calls.push({u,opts});
 if(u.endsWith('/auth/v1/user'))return json({id:uid});
 if(u.includes('/profiles?'))return json([{account_kind:kind}]);
 if(u.includes('/admin_user_roles?'))return json([{role_code:role,expires_at:null}]);
 if(u.includes('/admin_user_flags?'))return json([{status:account}]);
 if(u.includes('/rpc/user_has_tool_access'))return json(access);
 if(u.includes('/gu_lab_competency_knowledge_map_v014105?'))return json([{lab_id:'SITE-001',
  competency_code:'CHART_STRUCTURE',review_state:'candidate',mapping_method:'topic_keyword_suggestion_ungraded',
  rubric_version:0}]);
 if(u.includes('/competency_definitions?'))return json(definitions);
 if(u.includes('/competency_evidence?'))return json(evidence);
 if(u.includes('/rpc/gu_v014105_approve_lab_knowledge_map')){approvals++;return json({ok:true,labId:'SITE-001',
  rubricVersion:7,competencyCode:'CHART_STRUCTURE',knowledgeOnly:true})}
 if(u.includes('/rpc/gu_v014105_sync_member_reviewed_knowledge')){bridgeCalls++;return json({ok:true,attemptsInspected:1,
  approvedEligible:1,knowledgeRowsAdded:1,scope:'knowledge_only',masteryAwarded:false})}
 if(u.includes('/lab_training_sets_v014?'))return json([{lab_id:'SITE-001',version:7,
  review_state:'reviewed',reviewed_by:uid,reviewed_at:'2026-10-19T11:00:00Z',
  title:'One lab rubric that was reviewed',questions:[{id:'q1',prompt:'What observation supports this explanation?',kind:'choice',options:['A','B'],
  explanation:'Describe visible evidence and uncertainty.'}],answer_key:{q1:'A'}}]);
 throw Error('Unexpected backend '+u);
};
const get=(path)=>new Request('https://site.test/api/'+path,{headers:{authorization:'Bearer member'}});
const post=(path,body)=>new Request('https://site.test/api/'+path,{
 method:'POST',headers:{authorization:'Bearer member','content-type':'application/json',origin:'https://site.test'},
 body:JSON.stringify(body)});
try{
 let r=await skills({request:get('competencies?action=summary'),env});let body=await r.json();
 assert.equal(r.status,200);assert.equal(body.skills[0].status,'Conceptual Evidence Only',
  'One quiz knowledge dimension must NEVER be marked Developing, Proficient or Mastered');
 assert.equal(body.skills[0].completeAssessments,0);
 assert(!JSON.stringify(body).includes('Mastered","evidenceCount":1'));
 r=await training({request:post('interactive-training?action=sync-reviewed-knowledge',{}),env});
 body=await r.json();assert.equal(r.status,200);assert.equal(body.knowledgeRowsAdded,1);
 assert.equal(body.masteryAwarded,false);assert.equal(bridgeCalls,1);
 access=false;r=await training({request:post('interactive-training?action=sync-reviewed-knowledge',{}),env});
 assert.equal(r.status,403);assert.equal(bridgeCalls,1);access=true;
 r=await editorial({request:get('training-editor?action=knowledge-map&labId=SITE-001'),env});
 body=await r.json();assert.equal(r.status,200);assert.equal(body.mapping.review_state,'candidate');
 assert(!JSON.stringify(body).includes('answer_key'));
 const approve={labId:'SITE-001',version:7,competencyCode:'CHART_STRUCTURE',
  confirmPhrase:'APPROVE KNOWLEDGE ONLY'};
 role='ADMIN';r=await editorial({request:post('training-editor?action=approve-map',approve),env});
 assert.equal(r.status,403);assert.equal(approvals,0);
 role='OWNER';account='suspended';r=await editorial({request:post('training-editor?action=approve-map',approve),env});
 assert.equal(r.status,403);assert.equal(approvals,0);
 account='active';r=await editorial({request:post('training-editor?action=approve-map',
  {...approve,confirmPhrase:'APPROVE ALL 419'}),env});assert.equal(r.status,400);assert.equal(approvals,0);
 r=await editorial({request:post('training-editor?action=approve-map',approve),env});body=await r.json();
 assert.equal(r.status,200);assert.equal(approvals,1);assert.equal(body.knowledgeOnly,true);
 const approval=calls.find(x=>x.u.endsWith('/rpc/gu_v014105_approve_lab_knowledge_map'));
 assert.equal(JSON.parse(approval.opts.body).p_actor,uid,'Server must derive actor from validated session');
 const sql=readFileSync(new URL('../supabase/migrations/v0.14.0.105_REVIEWED_KNOWLEDGE_EVIDENCE_OWNER_REVIEW_REQUIRED.sql',import.meta.url),'utf8');
 const rows=sql.split('\n').filter(x=>/^\('[^']+','[A-Z0-9_]+','[a-z_]+[a-z_]+'\),?$/.test(x));
 // Count canonical suggestion rows using stable prefix/suffix rather than manual score.
 assert.equal((sql.match(/'topic_keyword_suggestion_ungraded'|'editorial_topic_bridge_ungraded'/g)||[]).length,419);
 for(const word of ["DEFAULT 'candidate'","review_state='approved'","rubric_version=a.set_version",
  "'knowledge'","'quiz'","ON CONFLICT(user_id,competency_code,source_type,source_id,dimension) DO NOTHING",
  "pg_advisory_xact_lock","admin_audit_log","SECURITY INVOKER","REVOKE ALL","'knowledge_only'"])
  assert(sql.includes(word),'Missing conceptual evidence protection: '+word);
 assert(!sql.includes("'recognition',a.score")&&!sql.includes("'process',a.score"),
  'Never invent extra skill dimensions from conceptual quizzes');
 const html=readFileSync(new URL('../training-editor.html',import.meta.url),'utf8');
 const editorJs=readFileSync(new URL('../assets/js/training-editor.js',import.meta.url),'utf8');
 const memberUi=readFileSync(new URL('../skills.html',import.meta.url),'utf8');
 assert(html.includes('id="author-knowledge-approve"')&&editorJs.includes('async function loadKnowledgeMap()'));
 assert(memberUi.includes('id="skills-sync-knowledge"'));
 console.log('PASS v105: all 419 mapping candidates remain unapproved, exact reviewed rubric / Owner approval, knowledge-only no mastery, entitlement and Suspended/Showcase safeguards.');
}finally{globalThis.fetch=orig}
