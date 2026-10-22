/* D09 v149 — synthetic, zero-cost conversation authorization and SQL contract */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/member-tutor-conversations.js';
import {parseTutorRequest} from '../functions/_lib/tutor-request-boundary-v014147.js';
import {saveVerifiedTutorExchange} from '../functions/_lib/tutor-history-save-v014107.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const conversation='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const qid='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const historyId='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const calls=[];let allow=true,kind='member',account='active';
const orig=globalThis.fetch;
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(path,opts={})=>{
 const url=String(path);calls.push({url,opts});
 if(url.endsWith('/auth/v1/user'))return json({id:uid});
 if(url.includes('/profiles?'))return json([{account_kind:kind}]);
 if(url.includes('/admin_user_flags?'))return json([{status:account}]);
 if(url.includes('/rpc/user_has_tool_access'))return json(allow);
 if(url.includes('/rpc/gu_v014149_create_tutor_conversation'))return json(conversation);
 if(url.includes('/rpc/gu_v014149_delete_tutor_conversation'))return json(true);
 if(url.includes('/rpc/gu_v014149_save_tutor_conversation_exchange') ||
    url.includes('/rpc/gu_v014102_save_member_tutor_exchange'))return json(historyId);
 if(url.includes('/gu_tutor_conversations_v014149?')){
  if(opts.method==='PATCH')return json([{id:conversation,title:'My renamed conversation'}]);
  return json([{id:conversation,title:'Risk exercises',created_at:'2026-10-21T13:00:00Z',updated_at:'2026-10-21T13:00:00Z'}]);
 }
 if(url.includes('/gu_member_tutor_exchanges_v014102?')){
  return json([{id:historyId,question:'Explain VWAP in context',learner_answer:'',mode:'explain',answer:'VWAP is a contextual price benchmark.',generation:'verified:reviewed-glossary-logic',
   conversation_id:conversation,source_titles:[],created_at:'2026-10-21T13:00:00Z'}]);
 }
 throw Error('Unexpected URL '+url);
};
const req=(method='GET',path='',body,headers={})=>new Request('https://school.test/api/member-tutor-conversations'+path,{
 method,headers:{authorization:'Bearer synthetic',...(body?{'content-type':'application/json'}:{}),...headers},
 body:body?JSON.stringify(body):undefined});
const run=async(request)=>{const response=await onRequest({request,env});return {status:response.status,body:await response.json()}};
try{
 let x=await run(req());assert.equal(x.status,200);assert.equal(x.body.conversations.length,1);
 assert.equal(x.body.conversations[0].id,conversation);
 x=await run(req('GET','?conversationId='+conversation));assert.equal(x.status,200);
 assert.equal(x.body.history[0].question,'Explain VWAP in context');
 x=await run(req('POST','',{requestId:qid,title:'Risk exercises'}));assert.equal(x.status,201);
 assert.equal(x.body.id,conversation);
 x=await run(req('PATCH','',{id:conversation,title:'My renamed conversation'}));assert.equal(x.status,200);
 x=await run(req('DELETE','',{id:conversation,confirm:'DELETE_CONVERSATION'}));assert.equal(x.status,200);
 assert(calls.some(x=>x.url.includes('rpc/gu_v014149_delete_tutor_conversation')));
 x=await run(req('DELETE','',{id:conversation,confirm:'wrong'}));assert.equal(x.status,400);
 x=await run(req('POST','',{requestId:'not-uuid',title:'Risk exercises'}));assert.equal(x.status,400);
 x=await run(req('PATCH','',{id:conversation,title:'<h1>x</h1>'},{origin:'https://malicious.test'}));assert.equal(x.status,403);
 allow=false;x=await run(req());assert.equal(x.status,403);allow=true;
 kind='showcase';x=await run(req());assert.equal(x.status,403);kind='member';
 account='suspended';x=await run(req());assert.equal(x.status,403);account='active';
 assert(!calls.some(x=>x.url.includes('api.openai.com')),'No inference calls');
 assert(calls.filter(x=>x.url.includes('gu_tutor_conversations_v014149?')).every(x=>x.url.includes('user_id=eq.'+uid)),
  'Scoped conversation DB reads/writes to authenticated identity');
 const record={requestId:qid,conversationId:conversation,question:'Explain VWAP in context',learnerAnswer:'',
  mode:'explain',answer:'VWAP is a contextual price benchmark.',generation:'reviewed-glossary-logic',sources:[]};
 let id=await saveVerifiedTutorExchange(env,uid,record);
 assert.equal(id,historyId);
 assert(calls.some(x=>x.url.includes('rpc/gu_v014149_save_tutor_conversation_exchange')));
 assert(calls.some(x=>x.url.includes('gu_member_tutor_exchanges_v014102?select=')&&x.url.includes('conversation_id')));
 id=await saveVerifiedTutorExchange(env,uid,{...record,conversationId:null});
 assert.equal(id,historyId,'Prior v102 exchange path remains functional without v149 columns');
 const legacy=calls.filter(x=>x.url.includes('gu_member_tutor_exchanges_v014102?select=')).at(-1);
 assert(!legacy.url.includes('conversation_id'),'Legacy storage must not require a yet-uninstalled optional field');
 const parsed=await parseTutorRequest(new Request('https://school.test/api/market-tutor',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({question:'Explain VWAP context',mode:'explain',conversationId:conversation})}));
 assert.equal(parsed.conversationId,conversation);
 let denied=false;
 try{await parseTutorRequest(new Request('https://school.test/api/market-tutor',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({question:'Explain VWAP context',mode:'explain',conversationId:'bogus'})}))}
 catch(e){denied=e.status===400}
 assert(denied,'Reject untrusted conversation identity before auth and quota');
 const sql=readFileSync(new URL('../supabase/migrations/v0.14.0.149_TUTOR_CONVERSATIONS_OWNER_REVIEW_REQUIRED.sql',import.meta.url),'utf8');
 for(const expected of ['ON DELETE RESTRICT','gu_v014149_save_tutor_conversation_exchange','gu_v014149_delete_tutor_conversation',
  'pg_advisory_xact_lock','gu_v014102_save_member_tutor_exchange','REVOKE ALL','service_role',
  'user_id=p_user_id','conversation_id=p_conversation_id'])
  assert(sql.includes(expected),'Expected SQL safeguard: '+expected);
 assert(!/GRANT (?:SELECT|INSERT|UPDATE|DELETE) ON public\.gu_tutor_conversations_v014149 TO (?:anon|authenticated)/i.test(sql));
 const player=readFileSync(new URL('../assets/js/lab-player.js',import.meta.url),'utf8');
 assert(player.includes('mountLabTutorLink(lab,mode)'));
 assert(player.includes("['guided','practice']"),'Blind/assessment must never launch step-context Tutor');
 assert(player.includes('tutorSafeSubject(lab)'), 'Only topic-safe context reaches Tutor link');
 assert(!player.includes('Ask Market Tutor About This Step?answer_key='));
 console.log('PASS D09: v149 conversation ACL, CRUD, idempotent atomic RPC contract, legacy v102 fallback, no cross-origin write.');
}finally{globalThis.fetch=orig}
