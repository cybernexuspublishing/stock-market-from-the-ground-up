/* Foundations Book I / customer delivery pre-LIVE acceptance.
 * Uses mocked provider, authenticated member and RPC responses; does NOT
 * create checkouts, modify production data, publish books, or charge cards.
 * Actual Stripe digital book checkout remains out of scope/disabled.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestPost,onRequestGet} from '../functions/api/digital-book-download-v01430.js';
const code='FOUNDATION_BOOK_1';
const path=code+'/11111111-1111-4111-8111-111111111111.epub';
const base='https://fixture.supabase.co',origin='https://site.example';
const env={SUPABASE_URL:base,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
const make=(format='epub',auth='Bearer fixture-member',clientOrigin=origin)=>
 new Request(origin+'/api/digital-book-download-v01430',{
  method:'POST',headers:{...(auth?{authorization:auth}:{}),
   ...(clientOrigin?{origin:clientOrigin}:{}),'content-type':'application/json'},
  body:JSON.stringify({code,...(format?{format}:{})})
 });
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const old=globalThis.fetch;
let scenario='paid',signed=0,checks=0,storageRequests=0;
const outcomes={
  'no_purchase':{allowed:false,reason:'no_digital_purchase_or_lifetime_membership'},
  'refunded':{allowed:false,reason:'no_digital_purchase_or_lifetime_membership'},
  'cancelled':{allowed:false,reason:'no_digital_purchase_or_lifetime_membership'},
  'other_user':{allowed:false,reason:'no_digital_purchase_or_lifetime_membership'},
  'print_only':{allowed:false,reason:'no_digital_purchase_or_lifetime_membership'},
  'no_rights':{allowed:false,reason:'rights_or_purchase_unavailable'},
  'select_active':{allowed:false,reason:'rights_or_purchase_unavailable'},
  'restricted':{allowed:false,reason:'account_ineligible'},
  'no_private_file':{allowed:false,reason:'rights_or_purchase_unavailable'}
};
try{
 globalThis.fetch=async(url,options={})=>{
  const p=new URL(url).pathname;
  if(p==='/auth/v1/user')return json({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
  if(p==='/rest/v1/rpc/gu_digital_format_path_v014305'){
   checks++;
   assert.equal(options.headers.authorization,'Bearer fixture-member');
   const params=JSON.parse(options.body||'{}');
   assert.deepEqual(params,{p_code:code,p_format:'epub'});
   if(scenario==='provider_down')return json({message:'Unavailable'},503);
   if(scenario==='wrong_path')return json({allowed:true,path:'OTHER_BOOK/11111111-1111-4111-8111-111111111111.epub'});
   if(scenario==='wrong_extension')return json({allowed:true,path:path.replace('.epub','.pdf')});
   return json(outcomes[scenario]||{allowed:true,path});
  }
  if(p.startsWith('/storage/v1/object/sign/gu-digital-ebooks/')){
   signed++;storageRequests++;
   assert.equal(p,'/storage/v1/object/sign/gu-digital-ebooks/'+path);
   assert.equal(options.headers.authorization,'Bearer sb_secret_fixture');
   assert.equal(JSON.parse(options.body).expiresIn,60);
   return json({signedURL:'/object/sign/gu-digital-ebooks/'+path+'?token=fixture'});
  }
  throw Error('Unexpected route '+p);
 };
 assert.equal((await onRequestGet()).status,405);
 assert.equal((await onRequestPost({request:make('epub',''),env})).status,401);
 assert.equal((await onRequestPost({request:make('epub','Bearer fixture-member','https://attacker.example'),env})).status,403);
 for(const name of Object.keys(outcomes)){
  scenario=name;const before=signed;
  const response=await onRequestPost({request:make(),env});
  assert.equal(response.status,403,name+' should fail closed');
  assert.equal(signed,before,name+' must never receive a private signed URL');
 }
 for(const name of ['wrong_path','wrong_extension','provider_down']){
  scenario=name;const before=signed;
  const response=await onRequestPost({request:make(),env});
  assert.equal(response.status,503,name+' should fail closed');
  assert.equal(signed,before,name+' cannot reach object signing');
 }
 scenario='paid';
 const result=await onRequestPost({request:make(),env});
 assert.equal(result.status,200);
 const body=await result.json();
 assert.equal(body.ok,true);assert.equal(body.expiresInSeconds,60);
 assert.equal(signed,1,'Only a verified entitlement is signed');
 assert.match(body.url,/^https:\/\/fixture\.supabase\.co\/storage\/v1\/object\/sign\/gu-digital-ebooks\/FOUNDATION_BOOK_1\//);
 assert.equal(result.headers.get('cache-control'),'no-store, private');
 assert.equal(result.headers.get('referrer-policy'),'no-referrer');
 // Lock source constraints: the current database entitlement contract is
 // Lemon Squeezy only. A separate Stripe signed book webhook is NOT installed.
 const stripe=readFileSync(new URL('../functions/api/stripe-live-checkout-v01458.js',import.meta.url),'utf8');
 const book=readFileSync(new URL('../functions/api/checkout-v0135.js',import.meta.url),'utf8');
 assert(stripe.includes("'plan','tool'"),'Stripe LIVE checkout must not silently accept books');
 assert(book.includes("gu_digital_offer_status_v01430"),'Book checkout needs independent KDP/rights/asset gate');
 assert(book.includes("format==='paperback'||format==='hardcover'"),'No unsafe printed-book charge');
 console.log('PASS Book I customer API fixtures: paid path, no purchase, refund, cancellation, other user, KDP, restricted, missing file, invalid path. No charge/DB write.');
}finally{globalThis.fetch=old}
