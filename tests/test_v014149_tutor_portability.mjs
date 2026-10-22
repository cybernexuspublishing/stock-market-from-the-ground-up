/* D09: authenticated personal-note export after paid entitlement expires.
 * Synthetic-only, no database, vendor AI or real customer data.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/member-tutor-export.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_pub_test',
 SUPABASE_SECRET_KEY:'sb_secret_test'};
let kind='member';const calls=[];const orig=globalThis.fetch;
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,init={})=>{
 const u=String(url);calls.push({u,init});
 if(u.endsWith('/auth/v1/user'))return json({id:uid});
 if(u.includes('/profiles?'))return json([{account_kind:kind}]);
 if(u.includes('/gu_member_tutor_exchanges_v014102?'))return json([
  {id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',question:'My own test question',
   learner_answer:'My own reflection',answer:'Original source-only answer',mode:'explain',
   source_titles:[],generation:'verified:reviewed-glossary-logic',created_at:'2026-10-21T00:00:00Z'}
 ]);
 if(u.includes('/gu_tutor_conversations_v014149?'))return json([{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',title:'My lesson notes'}]);
 throw Error('Unexpected service call '+u);
};
const req=(token=true,method='GET')=>new Request('https://school.test/api/member-tutor-export',{
 method,headers:token?{authorization:'Bearer expired-entitlement-but-valid-login'}:{}});
try{
 const good=await onRequest({request:req(),env}),body=await good.json();
 assert.equal(good.status,200);assert.equal(body.ok,true);
 assert.equal(body.savedExchanges.length,1);
 assert.equal(body.conversations.length,1);
 assert.equal(body.masteryAwarded,false);
 assert(calls.some(x=>x.u.includes('user_id=eq.'+uid)));
 assert(!calls.some(x=>x.u.includes('/rpc/user_has_tool_access')),
  'Data portability cannot require active paid Tutor subscription');
 assert(!calls.some(x=>x.u.includes('api.openai.com')),'Export must not call AI');
 assert(!calls.some(x=>x.u.includes('/gu_member_tutor_exchanges_v014102?')&&!x.u.includes('user_id=eq.'+uid)));
 const secret=calls.find(x=>x.u.includes('/gu_member_tutor_exchanges_v014102?'));
 assert.equal(secret.init.headers.authorization,undefined,'Opaque Supabase service key must not be Bearer');
 kind='showcase';let deny=await onRequest({request:req(),env});assert.equal(deny.status,403);
 kind='member';deny=await onRequest({request:req(false),env});assert.equal(deny.status,401);
 deny=await onRequest({request:req(true,'POST'),env});assert.equal(deny.status,405);
 const client=readFileSync(new URL('../assets/js/market-tutor.js',import.meta.url),'utf8');
 assert(client.includes('exportAllPrivateTutorNotes'));
 assert(client.includes("fetch('/api/member-tutor-export'"));
 console.log('PASS D09: member data export without paid entitlement, server identity isolation and Showcase denial.');
}finally{globalThis.fetch=orig}
