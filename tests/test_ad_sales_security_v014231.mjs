import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {onRequest as sales} from '../functions/api/ad-sales.js';
import {onRequest as slot} from '../functions/api/ad-slot.js';
const site='https://example.test',env={
 SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',
 SUPABASE_SECRET_KEY:'sb_secret_test',TURNSTILE_SITE_KEY:'0x0000000000000000000000000000000AA',
 TURNSTILE_SECRET_KEY:'0x0000000000000000000000000000000AA'};
const network=(settings={})=>{const old=globalThis.fetch,calls=[];
 globalThis.fetch=async (input,opts={})=>{
  const u=new URL(String(input));calls.push({path:u.pathname,method:opts.method||'GET'});
  let body=[];
  if(u.pathname==='/rest/v1/gu_ad_sales_settings_v014226')
   body=[{accepting_inquiries:true,accepting_payments:false,ad_delivery_enabled:false}];
  if(u.pathname==='/rest/v1/gu_ad_packages_v014226')body=[{
   code:'SITE_SPONSOR',name:'Site Sponsorship',description:'Custom reviewed quote.',
   price_cents:null,pricing_basis:'quote',availability:'quote_only',duration_days:null,public_visible:true}];
  if(settings[u.pathname]!==undefined)body=settings[u.pathname];
  return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
 };
 return {calls,restore:()=>globalThis.fetch=old};
};
const rq=(path,method='GET',body,auth=null)=>new Request(site+path,{method,
 headers:{...(body?{'content-type':'application/json',origin:site}:{}),
 ...(auth?{authorization:'Bearer '+auth}:{})},
 body:body?JSON.stringify(body):undefined});
test('public catalog exposes only quote-only offers with no checkout or price guesses',async()=>{
 const m=network();try{
 const r=await sales({request:rq('/api/ad-sales'),env}),o=await r.json();
 assert.equal(r.status,200);assert.equal(o.onlineCheckoutEnabled,false);
 assert.equal(o.packages[0].price_cents,null);assert.equal(o.turnstileSiteKey,env.TURNSTILE_SITE_KEY);
 assert.equal(m.calls.some(x=>x.path.includes('stripe')),false);
 }finally{m.restore()}
});
test('anonymous cannot view or mutate advertiser details',async()=>{
 const m=network();try{
 const r=await sales({request:rq('/api/ad-sales?admin=1'),env});
 assert.equal(r.status,401);
 const w=await sales({request:rq('/api/ad-sales','POST',{action:'create_campaign'}),env});
 assert.equal(w.status,401);
 assert.equal(m.calls.some(x=>x.method!=='GET'),false);
 }finally{m.restore()}
});
test('unverified sponsor lead is blocked before inserts or remote checkout',async()=>{
 const m=network();try{
 const r=await sales({request:rq('/api/ad-sales','POST',{
 action:'request_quote',company:'Sample Company',contact:'Sample Contact',
 email:'test@example.invalid',packageCode:'SITE_SPONSOR',
 message:'This is a proposal for a reviewed sponsorship campaign.',
 turnstileToken:''}),env});
 assert.equal(r.status,503);
 assert.equal(m.calls.some(x=>x.path==='/rest/v1/gu_ad_inquiries_v014226'),false);
 }finally{m.restore()}
});
test('Owner-only advertising delivery release is fail-closed by default',async()=>{
 const m=network();try{
 for(const path of ['/api/ad-slot?slot=HOME_INLINE&page=%2Findex.html',
 '/api/ad-slot?slot=FREE_DASHBOARD&page=%2Fdashboard.html']){
  const r=await slot({request:rq(path),env}),o=await r.json();
  assert.equal(r.status,200);assert.equal(o.ad,null);
 }
 assert.equal(m.calls.some(x=>x.path==='/rest/v1/ad_campaigns'),false);
 }finally{m.restore()}
});
test('no unsanctioned ad purchase or payment switch endpoints appear in source',()=>{
 const src=fs.readFileSync('functions/api/ad-sales.js','utf8');
 assert.doesNotMatch(src,/\bcheckout\.sessions\.create\b|\/v1\/checkout\/sessions/);
 assert.doesNotMatch(src,/action==='activate_payments'|action==='enable_ad_delivery'/);
 for(const name of ['index.html','store.html','market-commons.html','lab-samples.html','dashboard.html'])
  assert.match(fs.readFileSync(name,'utf8'),/assets\/js\/ad-slots-v014229\.js/);
 assert.match(fs.readFileSync('supabase/migrations/v0.14.0.226_ad_selling_owner_approval_and_inventory.sql','utf8'),
 /AD_RELEASE_REQUIRES_OWNER_APPROVAL_VERIFIED_LIVE_PAYMENT_AND_DELIVERY_GATE/);
});
