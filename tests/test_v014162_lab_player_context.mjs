/* Canonical registry fallback: no provider calls or leaking unpublished lab details. */
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/lab-player-context.js';
const old=globalThis.fetch,user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
let active=true,authorized=true,kind='member',storedCode='SITE_EXCLUSIVE',ownsBook=false;const calls=[];
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,init={})=>{
 const target=String(url);calls.push({target,init});
 if(target.endsWith('/auth/v1/user'))return json({id:user});
 if(target.includes('/profiles?'))return json([{account_kind:kind}]);
 if(target.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(target.endsWith('/rpc/user_has_tool_access'))return json(authorized);
 if(target.includes('/user_library?'))return json(ownsBook?[{product_code:storedCode,expires_at:null}]:[]);
 if(target.includes('/book_key_redemptions?'))return json([]);
 if(target.includes('/user_plan_grants?'))return json([]);
 if(target.includes('/site_subscriptions?'))return json([]);
 if(target.includes('/admin_user_roles?'))return json([]);
 if(target.includes('/platform_labs?')){
  assert.equal(init.headers.apikey,'sb_secret_test');
  assert.equal(init.headers.authorization,undefined,'Modern service key cannot be used as JWT');
  return json([{lab_id:'SITE-001',title:'Position sizing practice',book_code:storedCode,chapter_number:null,
   ticker:null,historical_date:null,timeframe:null,lab_type:'interactive',active,registry_visible:true}]);
 }
 throw Error('Unexpected request '+target);
};
const req=(id='SITE-001')=>new Request('https://local.example/api/lab-player-context?id='+encodeURIComponent(id),{headers:{authorization:'Bearer member.jwt'}});
try{
 let r=await onRequest({env,request:req()});assert.equal(r.status,200);
 let b=await r.json();assert.equal(b.ok,true);assert.equal(b.lab.id,'SITE-001');
 assert.equal(b.sourceStatus,'canonical_registry_safe_orientation_only');
 assert.equal(b.advancedAllowed,true);
 assert(!JSON.stringify(b).includes('rubric'));
 assert(!JSON.stringify(b).includes('correctAnswer'));
 active=false;r=await onRequest({env,request:req()});assert.equal(r.status,404);
 active=true;authorized=false;r=await onRequest({env,request:req()});assert.equal(r.status,403);
 storedCode='DAY_TRADING_BOOK_1';ownsBook=true;
 r=await onRequest({env,request:req()});assert.equal(r.status,200,'Book-only member gets matching guided orientation');
 b=await r.json();assert.equal(b.guidedAllowed,true);assert.equal(b.advancedAllowed,false);
 ownsBook=false;r=await onRequest({env,request:req()});assert.equal(r.status,403,'No book or tool means denied');
 storedCode='SITE_EXCLUSIVE';authorized=true;
 authorized=true;kind='showcase';r=await onRequest({env,request:req()});assert.equal(r.status,403);
 r=await onRequest({env,request:req('%27%20OR%201%3D1')});assert.equal(r.status,400);
 assert(calls.some(x=>x.target.includes('lab_id=eq.SITE-001')));
 console.log('PASS D12 canonical member fallback, modern private service header, unpublished/Showcase/unauthorized and malformed ID denials');
}finally{globalThis.fetch=old}
