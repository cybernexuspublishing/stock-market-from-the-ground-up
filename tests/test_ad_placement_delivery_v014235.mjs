import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest as adSlot} from '../functions/api/ad-slot.js';
import fs from 'node:fs';
const root='https://training.example',session='11111111-1111-4111-8111-111111110355';
const env={SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pub_ci',SUPABASE_SECRET_KEY:'sb_secret_ci'};
function server({lifetime=false,limit=false,delivery=true,carousel=false}={}){
 const old=globalThis.fetch,calls=[];
 globalThis.fetch=async(input,opts={})=>{
  const url=new URL(String(input)),p=url.pathname;calls.push({path:p,url:url.toString(),method:opts.method||'GET'});
  let rows=[];
  if(p==='/auth/v1/user')rows={id:'11111111-1111-4111-8111-111111110006'};
  else if(p.endsWith('/gu_ad_sales_settings_v014226'))rows=[{ad_delivery_enabled:delivery,accepting_payments:delivery}];
  else if(p.endsWith('/ad_placements'))rows=[{placement_code:'HOME_INLINE',active:true,metadata:{carousel_enabled:carousel}}];
  else if(p.endsWith('/plan_ad_policies'))rows=[{ads_enabled:true,allowed_slots:['HOME_INLINE'],
   max_impressions_per_session:3,max_impressions_per_24h:6,minimum_minutes_between_ads:10}];
  else if(p.endsWith('/user_plan_grants'))rows=lifetime?[{plan_code:'LIFETIME',status:'active',ends_at:null}]:[];
  else if(p.endsWith('/ad_campaigns'))rows=[{id:7,last_verified_invoice:'in_abc123ABC',
   amount_cents:12000,impression_limit:limit?2:null,click_limit:null}];
  else if(p.endsWith('/ad_creatives'))rows=[{id:9,campaign_id:7,headline:'Sponsor resources',
   body:'Educational resources available from the advertiser.',
   destination_url:'https://sponsor.example',disclosure_label:'Advertisement'},
   ...(carousel?[{id:10,campaign_id:7,headline:'Another sponsor resource',body:'Another valid sponsored educational resource.',destination_url:'https://another.example',disclosure_label:'Sponsored'}]:[])];
  else if(p.endsWith('/gu_ad_order_evidence_v014226'))rows=[{campaign_id:7,invoice_ref:'in_abc123ABC',
   state:'verified_paid',payment_mode:'live'}];
  else if(p.endsWith('/rpc/gu_ad_campaign_counts_v014233'))rows=[{campaign_id:7,impressions:limit?2:0,clicks:0}];
  return new Response(JSON.stringify(rows),{status:200,headers:{'content-type':'application/json'}});
 };
 return {calls,restore:()=>globalThis.fetch=old};
}
const url='/api/ad-slot?slot=HOME_INLINE&page=%2Findex.html&sessionToken='+session;
test('disabled ad delivery returns no creative even when paid creative exists',async()=>{
 const m=server({delivery:false});try{const r=await adSlot({request:new Request(root+url),env});assert.equal((await r.json()).ad,null)}
 finally{m.restore()}
});
test('approved, paid and disclosed context-only creative renders when explicitly enabled',async()=>{
 const m=server();try{const r=await adSlot({request:new Request(root+url),env}),data=await r.json();
 assert.equal(r.status,200);assert.equal(data.ad.creativeId,9);
 assert.equal(data.ad.label,'Advertisement');assert.equal(data.ad.destinationUrl,'https://sponsor.example');
 }finally{m.restore()}
});
test('Lifetime members are ad-free even when they visit the public Home page',async()=>{
 const m=server({lifetime:true});
 try{const r=await adSlot({request:new Request(root+url,{headers:{authorization:'Bearer TEST_USER_TOKEN'}}),env});
 assert.equal((await r.json()).ad,null);
 assert.equal(m.calls.some(x=>x.path.endsWith('/ad_campaigns')),false)}
 finally{m.restore()}
});
test('campaign impression budget stops displaying paid ads',async()=>{
 const m=server({limit:true});try{const r=await adSlot({request:new Request(root+url),env});
 assert.equal((await r.json()).ad,null)}
 finally{m.restore()}
});
test('wrong route or missing session token shows no ads',async()=>{
 const m=server();try{
 for(const query of ['/api/ad-slot?slot=HOME_INLINE&page=%2Flab-player.html',
 '/api/ad-slot?slot=HOME_INLINE&page=%2Findex.html']){
  const r=await adSlot({request:new Request(root+query),env});assert.equal((await r.json()).ad,null);
 }
 }finally{m.restore()}
});
test('ad metrics cannot be submitted cross-site or against disabled serving gate',async()=>{
 const m=server({delivery:false});try{
  const r=await adSlot({request:new Request(root+'/api/ad-slot',{method:'POST',
   headers:{origin:'https://other.example','content-type':'application/json'},body:JSON.stringify({
    slot:'HOME_INLINE',page:'/index.html',type:'impression',creativeId:9,campaignId:7,
    sessionToken:session})}),env});
  assert.equal(r.status,403);assert.equal(m.calls.length,0);
 }finally{m.restore()}
});

test('eligible unsold slots show first-party inventory without enabling LIVE delivery',async()=>{
 const m=server({delivery:false});try{
  const r=await adSlot({request:new Request(root+url),env}),data=await r.json();
  assert.equal(r.status,200);assert.equal(data.ad,null);
  assert.equal(data.placeholderAvailable,true);
  assert.equal(m.calls.some(x=>x.path.endsWith('/ad_campaigns')),false);
 }finally{m.restore()}
});
test('ad-free Lifetime entitlement suppresses the default inventory placeholder',async()=>{
 const m=server({lifetime:true,delivery:false});try{
  const r=await adSlot({request:new Request(root+url,{headers:{authorization:'Bearer TEST_USER_TOKEN'}}),env});
  const data=await r.json();
  assert.equal(data.ad,null);assert.equal(data.placeholderAvailable,false);
 }finally{m.restore()}
});
test('misplaced ad slot never displays the inventory placeholder',async()=>{
 const m=server({delivery:false});try{
  const r=await adSlot({request:new Request(root+'/api/ad-slot?slot=HOME_INLINE&page=%2Flab-player.html'),env});
  assert.equal((await r.json()).placeholderAvailable,false);
 }finally{m.restore()}
});
test('all eighteen configured placement mounts are connected without adding sponsors to lessons',()=>{
 const mounted=[
  ['index.html','HOME_INLINE'],['store.html','STORE_INLINE'],
  ['market-commons.html','COMMUNITY_INLINE'],['lab-samples.html','SAMPLE_LABS'],
  ['dashboard.html','FREE_DASHBOARD'],
  ['signin.html','SIGNIN_LEFT'],['signin.html','SIGNIN_RIGHT'],['signin.html','SIGNIN_BOTTOM'],
  ['create-account.html','SIGNUP_LEFT'],['create-account.html','SIGNUP_RIGHT'],['create-account.html','SIGNUP_BOTTOM'],
  ['store.html','STORE_LEFT'],['store.html','STORE_RIGHT'],['market-commons.html','COMMUNITY_TOP'],
  ['books.html','BOOKS_BOTTOM'],['membership.html','MEMBERSHIP_BOTTOM'],
  ['tools.html','TOOLS_BOTTOM'],['about.html','ABOUT_BOTTOM']
 ];
 for(const [file,code] of mounted){
  const source=fs.readFileSync(file,'utf8');
  assert.ok(source.includes('data-ad-slot="'+code+'"'),file+': '+code+' missing');
  assert.ok(source.includes('assets/js/ad-slots-v014229.js'),file+': renderer missing');
 }
 for(const file of ['lab-player.html','simulator.html','market-tutor.html'])
  assert.doesNotMatch(fs.readFileSync(file,'utf8'),/data-ad-slot=/);
});

test('carousel checkbox controls rotation but cannot bypass campaign eligibility',async()=>{
 const m=server({carousel:true,delivery:true});
 try{
  const r=await adSlot({request:new Request(root+url+'&excludeCreativeId=9'),env});
  const d=await r.json();
  assert.equal(d.carouselEnabled,true);assert.equal(d.hasMore,true);assert.equal(d.ad.creativeId,10);
 }finally{m.restore()}
});
test('without carousel checkbox the single-slot response stays a static sponsor',async()=>{
 const m=server({carousel:false,delivery:true});
 try{const d=await (await adSlot({request:new Request(root+url),env})).json();
  assert.equal(d.carouselEnabled,false);assert.equal(d.hasMore,false);
 }finally{m.restore()}
});
test('carousel UI and administrator state originate in first-party source',()=>{
 const client=fs.readFileSync('assets/js/ad-slots-v014229.js','utf8');
 const admin=fs.readFileSync('assets/js/admin-ad-sales-v014228.js','utf8');
 const api=fs.readFileSync('functions/api/ad-sales.js','utf8');
 assert.match(client,/excludeCreativeId/);
 assert.match(client,/prefers-reduced-motion: reduce/);
 assert.match(admin,/set_placement_carousel/);
 assert.match(api,/await owner\(c,request\)/);
 assert.match(api,/action==='set_placement_carousel'/);
});
