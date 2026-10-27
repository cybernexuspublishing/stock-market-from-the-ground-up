// v0.14.0.102: private Tutor history feature contract; all network mocked.
// 30 preexisting Supabase competencies and member grading remain unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/member-tutor-history-v014102.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',recordId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const requestId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const env={SUPABASE_URL:'https://fixtures.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock'};
const endpoint='https://site.test/api/member-tutor-history-v014102';
const prior=globalThis.fetch,calls=[];
let allow=true,kind='member',failStorage=false;
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opts={})=>{
 const path=String(url);calls.push({path,opts});
 if(path.endsWith('/auth/v1/user'))return json({id:uid});
 if(path.includes('/profiles?'))return json([{account_kind:kind}]);
 if(path.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(path.includes('/admin_user_roles?'))return json([]);
 if(path.includes('/rpc/user_has_tool_access'))return json(allow);
 if(path.includes('/gu_member_tutor_exchanges_v014102?')){
  if(failStorage)return json({error:'not installed'},404);
  if(opts.method==='DELETE')return new Response(null,{status:204});
  if(opts.method==='PATCH')return json([{id:recordId,feedback:'helpful'}]);
  return json([{id:recordId,question:'Explain VWAP',learner_answer:'',answer:'Original teaching.',
   generation:'reviewed-glossary-logic',mode:'explain',source_titles:['VWAP'],created_at:'2026-10-19T18:00:00Z'}]);
 }
 if(path.includes('/rpc/gu_v014102_save_member_tutor_exchange')){
  if(failStorage)return json({error:'not installed'},404);
  return json(recordId);
 }
 if(path.includes('api.openai.com'))throw Error('Tutor history must never make an AI provider call');
 throw Error('Unexpected request '+path);
};
const req=(method,path='',body,headers={})=>new Request(endpoint+path,{method,headers:{
 authorization:'Bearer valid',...(body?{'content-type':'application/json'}:{}),...headers
 },body:body?JSON.stringify(body):undefined});
const entry={requestId,question:'Explain VWAP',learnerAnswer:'My own notes',answer:'Original ungraded response',
 mode:'review',generation:'reviewed-glossary-logic',sourceTitles:['VWAP']};
try{
 let r=await onRequest({request:req('GET'),env}),d=await r.json();
 assert.equal(r.status,200);assert.equal(d.history.length,1);assert.equal(d.graded,false);
 const listCall=calls.find(x=>x.path.includes('gu_member_tutor_exchanges_v014102?')&&x.opts.method!=='DELETE');
 assert(listCall.path.includes('user_id=eq.'+uid),'Private read must be scoped to authenticated member');
 assert.equal(listCall.opts.headers.apikey,env.SUPABASE_SECRET_KEY);
 assert.equal(listCall.opts.headers.authorization,undefined,'Never send sb_secret_* as Bearer JWT');
 r=await onRequest({request:req('POST','',entry),env});d=await r.json();
 assert.equal(r.status,405,'Browser must never upload text claiming to be AI generated');
 assert(!calls.some(x=>x.path.includes('rpc/gu_v014102_save_member_tutor_exchange')),
  'Only the authenticated Tutor endpoint can store verified generated replies');
 r=await onRequest({request:req('PATCH','',{id:recordId,feedback:'helpful',note:'Educational explanation is clear.'}),env});
 assert.equal(r.status,200,'Private feedback may be changed on an owned saved note');
 assert(calls.some(x=>x.path.includes('id=eq.'+recordId)&&x.path.includes('user_id=eq.'+uid)&&x.opts.method==='PATCH'));
 r=await onRequest({request:req('PATCH','',{id:recordId,feedback:'forged_grade',note:'No'}),env});
 assert.equal(r.status,400,'No fake assessment feedback');
 r=await onRequest({request:req('DELETE','?id='+recordId),env});
 assert.equal(r.status,200);
 assert(calls.some(x=>x.path.includes('id=eq.'+recordId)&&x.path.includes('user_id=eq.'+uid)&&x.opts.method==='DELETE'));
 r=await onRequest({request:req('DELETE','?all=true'),env});assert.equal(r.status,400,'Bulk delete needs explicit confirmation');
 r=await onRequest({request:req('DELETE','?all=true',undefined,{'x-confirm-delete':'DELETE_MY_TUTOR_HISTORY'}),env});
 assert.equal(r.status,200);



 r=await onRequest({request:req('PUT'),env});assert.equal(r.status,405);
 allow=false;
 r=await onRequest({request:req('GET'),env});
 assert.equal(r.status,200,'Expired tool purchase must not lock owner out of their saved educational notes');
 let expired=await r.json();assert.equal(expired.history.length,1);
 r=await onRequest({request:req('PATCH','',{id:recordId,feedback:'helpful',note:'I retained my original notes.'}),env});
 assert.equal(r.status,200,'Expired subscriber can annotate their own retained notes');
 r=await onRequest({request:req('POST','',entry),env});
 assert.equal(r.status,405,'An expired account cannot forge a new Tutor reply via history');
 assert(read('functions/api/market-tutor-v01492.js').includes('if(!auth.authorized)'),
  'Actual Tutor inference and new teaching remain entitlement-gated');
 allow=true;kind='showcase';r=await onRequest({request:req('GET'),env});assert.equal(r.status,403);
 kind='member';failStorage=true;r=await onRequest({request:req('GET'),env});assert.equal(r.status,503);
 assert.equal(calls.filter(c=>c.path.includes('api.openai.com')).length,0);
 const sql=read('supabase/migrations/v0.14.0.102_PRIVATE_MEMBER_TUTOR_HISTORY_OWNER_REVIEW_REQUIRED.sql');
 for(const token of ['ENABLE ROW LEVEL SECURITY','REVOKE ALL','service_role','pg_advisory_xact_lock','client_request_id','v_count >= 200','ON DELETE CASCADE','NOTIFY pgrst']){
  assert(sql.includes(token),'Missing SQL protection: '+token);
 }
 assert(!/public\.competency_evidence|INSERT INTO public\.competency_definitions|UPDATE public\.user_plan_grants/i.test(sql));
 const html=read('market-tutor.html'),js=read('assets/js/market-tutor.js');
 for(const marker of ['id="tutor-thread"','id="tutor-question"','id="tutor-delete-history"','id="tutor-export"']){
  assert(html.includes(marker),marker+' missing from member page');
 }
 for(const marker of ['member-tutor-history-v014102','textContent','learnerAnswer','renderConversation','sendTutorFeedback','deleteOne','deleteAll','exportConversation','crypto.randomUUID']){
  assert(js.includes(marker),'Missing Tutor interaction: '+marker);
 }
 assert(html.includes('id="tutor-save-history"'),'Member must control transcript saving');
 assert(js.includes("$('tutor-save-history')?.checked===true"),'Browser must respect history preference');
 assert(!js.includes("privateApi('', 'POST'"),'Client must not upload AI responses directly');
 assert(js.includes('onAuthStateChange'),'Account changes must clear private client history');
 assert(js.includes('Type and submit my answer'),'Guided question must have a learner response submission path');
 assert(js.includes('TUTOR.user?.id!==submittingUser'),'Prevent cross-account answer persistence races');
 assert(!/(?:window\.)?localStorage\s*(?:\.|\[)/.test(js),'Never put private Tutor transcripts into shared-browser persistent storage');
 console.log('PASS v102: member-owned notes retained after paid expiry, new paid tutoring gated, per-member scope, idempotent history, no grades or AI.');
}finally{globalThis.fetch=prior}
