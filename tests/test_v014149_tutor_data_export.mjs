import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/member-tutor-data-export.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pub',SUPABASE_SECRET_KEY:'sb_secret_test'};
const old=globalThis.fetch;let queries=0,authOk=true;
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opts={})=>{
 const u=String(url);
 if(u.endsWith('/auth/v1/user'))return authOk?json({id:uid}):json({error:'expired'},401);
 if(u.includes('/rest/v1/gu_member_tutor_exchanges_v014102?')){
  assert(u.includes('user_id=eq.'+uid));queries++;
  assert.equal(opts.headers.apikey,'sb_secret_test');
  return json([{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',question:'My question',answer:'My answer',generation:'verified:reviewed-glossary-logic'}]);
 }
 throw Error('Unexpected authorization dependency '+u);
};
try{
 let r=await onRequest({env,request:new Request('https://site.test/api/member-tutor-data-export')});
 assert.equal(r.status,401);
 const request=()=>new Request('https://site.test/api/member-tutor-data-export',{headers:{authorization:'Bearer valid-token'}});
 r=await onRequest({env,request:request()});
 const data=await r.json();
 assert.equal(r.status,200);assert.equal(data.exchanges.length,1);
 assert.equal(data.graded,false);assert.equal(data.masteryAwarded,false);
 assert.equal(queries,1,'Export should not require active paid entitlements');
 authOk=false;r=await onRequest({env,request:request()});
 assert.equal(r.status,401);
 console.log('PASS D09 own-note export remains available after Tutor entitlement expiry, never bypasses identity validation');
}finally{globalThis.fetch=old}
