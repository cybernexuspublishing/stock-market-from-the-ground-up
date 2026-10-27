/* B01: actual authenticated route under synthetic PostgREST failures.
 * No real members, Stripe calls, private B01 question keys or historical bars.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/interactive-training.js';
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',attempt='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
let mode='invalid',rpcCalls=0;
const old=globalThis.fetch;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async (url,options={})=>{
 const u=new URL(String(url)),p=u.pathname;
 if(p==='/auth/v1/user')return json({id:actor});
 if(p==='/rest/v1/profiles')return json([{account_kind:'member'}]);
 if(p==='/rest/v1/admin_user_flags')return json([{status:'active'}]);
 if(p==='/rest/v1/admin_user_roles')return json([]);
 if(p==='/rest/v1/rpc/user_has_tool_access')return json(true);
 if(p==='/rest/v1/platform_labs')return json([{
  lab_id:'F1-C02-L01',book_code:'FOUNDATION_BOOK_1',active:true,registry_visible:true
 }]);
 if(p==='/rest/v1/lab_instruction_v014')return json([]);
 if(p==='/rest/v1/lab_training_attempts_v014')return json([{lab_id:'F1-C02-L01',mode:'guided'}]);
 if(p==='/rest/v1/rpc/v014_training_answer'){
  rpcCalls++;
  if(mode==='invalid')return json({code:'22023',message:'Select one of the current question options',details:'PRIVATE SQL DETAIL'},400);
  if(mode==='stale')return json({code:'P0001',message:'Stale training step. Resume current attempt.',hint:'PRIVATE INTERNAL HINT'},400);
  if(mode==='withdrawn')return json({code:'P0001',message:'Reviewed answer key unavailable'},400);
  if(mode==='down')return json({code:'XX000',message:'PRIVATE INTERNAL DATABASE ERROR'},500);
  throw Error('Unexpected mock mode');
 }
 throw Error('Unexpected fixture endpoint '+p);
};
const request=()=>new Request('https://fixture.test/api/interactive-training?action=answer',{
 method:'POST',headers:{authorization:'Bearer signed-fixture',origin:'https://fixture.test','content-type':'application/json'},
 body:JSON.stringify({attemptId:attempt,answer:'wrong synthetic input',expectedStep:0})
});
try{
 for(const [kind,status,phrase] of [
  ['invalid',422,'Select an answer from the current options'],
  ['stale',409,'Refresh the current question'],
  ['withdrawn',409,'no longer available'],
  ['down',503,'Training database contract unavailable']
 ]){
  mode=kind;
  const response=await onRequest({request:request(),env}),body=await response.json();
  assert.equal(response.status,status,kind);
  assert.equal(body.ok,false);
  assert(body.error.includes(phrase),kind+' safe user-facing response');
  assert(!JSON.stringify(body).includes('PRIVATE'),'Never forward raw database details');
 }
 assert.equal(rpcCalls,4);
 const js=readFileSync('assets/js/interactive-training.js','utf8');
 assert(js.includes('Guided correction: identify the missing evidence'));
 assert(js.includes('Refresh my saved assessment step'));
 assert(js.includes("call('resume','GET')"));
 assert(!js.includes('clientAnswerKey'));
 const sql=readFileSync('supabase/migrations/20261027_b01_reject_unlisted_answers.sql','utf8');
 assert(sql.includes("jsonb_array_elements_text(question->'options')"));
 assert(sql.includes('using errcode='));
 assert(sql.includes("review_state='reviewed'"));
 assert(sql.includes('p_expected_step is distinct from a.step_index'));
 assert(sql.includes('creditFraction'));
 assert(!sql.includes('INSERT INTO public.lab_training_sets_v014'));
 console.log('PASS B01: invalid answer HTTP 422, stale step HTTP 409, withdrawn review HTTP 409, private DB error hidden, Talia-guided feedback and safe resume.');
}finally{globalThis.fetch=old}
