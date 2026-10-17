import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/gu39-sandbox.js';
import {readFileSync} from 'node:fs';

const request=(auth=true)=>new Request('https://example.com/api/gu39-sandbox?view=catalog',{
 headers:auth?{authorization:'Bearer owner-session'}:{}});
const env={SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',
 SUPABASE_SECRET_KEY:'sb_secret_test',
 GU39_STRIPE_TEST_SECRET_KEY:'sk_test_fake',
 GU39_STRIPE_TEST_PRICE_MAP_JSON:'{}'};
const original=globalThis.fetch;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
let requests=[],roleStatus=200;
try{
 globalThis.fetch=async(url,options={})=>{
  const u=String(url);
  requests.push({url:u,method:options.method||'GET'});
  if(u.endsWith('/auth/v1/user'))return json({id:'8da97526-b906-4927-a002-6195f69112ee'});
  if(u.endsWith('/rpc/gu_staff_identity_v01431r1'))throw Error('BUG: called private revoked helper');
  if(u.endsWith('/rpc/gu_staff_role_v01432r1'))
   return roleStatus===200?json({ok:true,role:'OWNER'}):json({message:'access denied'},roleStatus);
  if(u.endsWith('/v1/account'))return json({id:'acct_1URGkDJY9FI7byHB'});
  if(u.includes('/v1/products/'))return json({id:u.split('/').at(-1),active:true,livemode:false});
  throw Error('Unexpected endpoint '+u);
 };
 let r=await onRequestGet({request:request(),env}),data=await r.json();
 assert.equal(r.status,200);
 assert.equal(data.productsExpected,8);
 assert.equal(data.productsVerified,8);
 assert.equal(data.pricesVerified,0);
 assert.equal(data.allVerified,false);
 assert(requests.some(x=>x.url.endsWith('/rpc/gu_staff_role_v01432r1')));
 assert(!requests.some(x=>x.url.endsWith('/rpc/gu_staff_identity_v01431r1')));
 assert(requests.filter(x=>x.url.includes('api.stripe.com')).every(x=>x.method==='GET'));
 requests=[];
 roleStatus=403;
 r=await onRequestGet({request:request(),env});data=await r.json();
 assert.equal(r.status,403);
 assert.equal(data.error,'STAFF_ROLE_AUTHORIZATION_FAILED');
 assert(!requests.some(x=>x.url.includes('api.stripe.com')));
 requests=[];
 roleStatus=404;
 r=await onRequestGet({request:request(),env});data=await r.json();
 assert.equal(r.status,503);
 assert.equal(data.error,'STAFF_ROLE_RPC_MISSING');
 assert(!requests.some(x=>x.url.includes('api.stripe.com')));
 const migration=readFileSync(new URL('../supabase/migrations/v0.14.0.31R1_ADMIN_ACCESS_COMMS_REVIEW_REQUIRED.sql',import.meta.url),'utf8');
 const facade=readFileSync(new URL('../supabase/migrations/v0.14.0.32R1_CAPTCHA_PASSWORD_RECONFIRM_REVIEW_REQUIRED.sql',import.meta.url),'utf8');
 assert(migration.includes('REVOKE ALL ON FUNCTION public.gu_staff_identity_v01431r1() FROM PUBLIC,anon,authenticated'));
 assert(facade.includes('GRANT EXECUTE ON FUNCTION public.gu_staff_role_v01432r1() TO authenticated'));
 console.log('PASS v45: read-only staff facade, migration privileges, MFA/role denial, missing RPC fail closed; no live writes.');
}finally{globalThis.fetch=original}
