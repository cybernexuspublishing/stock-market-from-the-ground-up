import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest as adSlot} from '../functions/api/ad-slot.js';
const root='https://training.example',session='11111111-1111-4111-8111-111111110355';
const env={SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pub_ci',SUPABASE_SECRET_KEY:'sb_secret_ci'};
function server({lifetime=false,limit=false,delivery=true}={}){
 const old=globalThis.fetch,calls=[];
 globalThis.fetch=async(input,opts={})=>{
  const url=new URL(String(input)),p=url.pathname;calls.push({path:p,url:url.toString(),method:opts.method||'GET'});
  let rows=[];
  if(p==='/auth/v1/user')rows={id:'11111111-1111-4111-8111-111111110006'};
  else if(p.endsWith('/gu_ad_sales_settings_v014226'))rows=[{ad_delivery_enabled:delivery,accepting_payments:delivery}];
  else if(p.endsWith('/ad_placements'))rows=[{placement_code:'HOME_INLINE',active:true}];
  else if(p.endsWith('/plan_ad_policies'))rows=[{ads_enabled:true,allowed_slots:['HOME_INLINE'],
   max_impressions_per_session:3,max_impressions_per_24h:6,minimum_minutes_between_ads:10}];
  else if(p.endsWith('/user_plan_grants'))rows=lifetime?[{plan_code:'LIFETIME',status:'active',ends_at:null}]:[];
  else if(p.endsWith('/ad_campaigns'))rows=[{id:7,last_verified_invoice:'in_abc123ABC',
   amount_cents:12000,impression_limit:limit?2:null,click_limit:null}];
  else if(p.endsWith('/ad_creatives'))rows=[{id:9,campaign_id:7,headline:'Sponsor resources',
   body:'Educational resources available from the advertiser.',
   destination_url:'https://sponsor.example',disclosure_label:'Advertisement'}];
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
