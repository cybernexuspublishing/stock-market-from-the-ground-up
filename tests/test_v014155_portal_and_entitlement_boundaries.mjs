/* Deployment 15 zero-charge regression: modern/legacy Supabase membership
 * authentication and strict billing portal byte boundary.
 * Does not create a Stripe session, use real credentials, or mutate production.
 */
import assert from 'node:assert/strict';
import {toolAccess} from '../functions/api/member-tool-access.js';
import {onRequestPost} from '../functions/api/stripe-billing-portal-v014122.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const envBase={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock'};
const saved=globalThis.fetch;
const out=x=>new Response(JSON.stringify(x),{status:200,headers:{'content-type':'application/json'}});
const modern='sb_secret_test_disabled';
const legacy='eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.legacySignature';
let requests=[],profile='member',flag='active',grant=true;
globalThis.fetch=async(url,opts={})=>{
 const str=String(url),headers=opts.headers||{};
 requests.push({str,headers});
 if(str.endsWith('/auth/v1/user')){
  assert.equal(headers.apikey,envBase.SUPABASE_PUBLISHABLE_KEY);
  assert.equal(headers.authorization,'Bearer member-session');
  return out({id:uid});
 }
 assert(str.startsWith(envBase.SUPABASE_URL+'/rest/v1/'));
 assert(headers.apikey===modern||headers.apikey===legacy);
 if(headers.apikey===modern)assert(!headers.authorization,'Opaque sb_secret must NOT be sent as JWT');
 if(headers.apikey===legacy)assert.equal(headers.authorization,'Bearer '+legacy);
 if(str.includes('/profiles?'))return out([{account_kind:profile}]);
 if(str.includes('/admin_user_flags?'))return out([{status:flag}]);
 if(str.includes('/rpc/user_has_tool_access'))return out(grant);
 throw Error('Unexpected source endpoint '+str);
};
try{
 const req=new Request('https://course.example/api/member-tool-access?tool=MARKET_TUTOR',{
  method:'GET',headers:{authorization:'Bearer member-session'}});
 let a=await toolAccess({...envBase,SUPABASE_SECRET_KEY:modern},req,'MARKET_TUTOR');
 assert.equal(a.authorized,true);
 a=await toolAccess({...envBase,SUPABASE_SECRET_KEY:legacy},req,'MARKET_TUTOR');
 assert.equal(a.authorized,true);
 flag='restricted';
 a=await toolAccess({...envBase,SUPABASE_SECRET_KEY:modern},req,'MARKET_TUTOR');
 assert.equal(a.authorized,false);
 flag='active';profile='showcase';
 a=await toolAccess({...envBase,SUPABASE_SECRET_KEY:modern},req,'MARKET_TUTOR');
 assert.equal(a.authorized,false);
 profile='member';grant=false;
 a=await toolAccess({...envBase,SUPABASE_SECRET_KEY:modern},req,'MARKET_TUTOR');
 assert.equal(a.authorized,false);
 await assert.rejects(toolAccess({...envBase,SUPABASE_SECRET_KEY:modern},req,'UNKNOWN_PRODUCT'),/Unknown training tool/);
}finally{globalThis.fetch=saved}
let external=0;
globalThis.fetch=async()=>{external++;throw Error('No provider call should occur')};
const portalEnv={...envBase,SUPABASE_SECRET_KEY:modern,
 GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_fake_disabled',GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_MOCK'};
async function bodyAttempt(data,extraHeaders={}){
 return onRequestPost({env:portalEnv,request:new Request('https://course.example/api/stripe-billing-portal-v014122',{
  method:'POST',headers:{origin:'https://course.example','content-type':'application/json',
   authorization:'Bearer member-session',...extraHeaders},body:data
 })});
}
try{
 for(const [body,headers,expected] of [
  ['x'.repeat(1025),{},413],
  ['x'.repeat(1025),{'content-length':'1'},413],
  ['{}',{'content-length':'1025'},413],
  ['{}',{'content-length':'notanumber'},413],
  [new Uint8Array([0xc3,0x28]),{},400]
 ]){
  const response=await bodyAttempt(body,headers);
  assert.equal(response.status,expected);
 }
 assert.equal(external,0,'Invalid request must be rejected before Stripe/Supabase calls');
}finally{globalThis.fetch=saved}
console.log('PASS D15 modern/legacy entitlement authentication, restricted/Showcase denial and streaming billing portal 1-KB cap');
