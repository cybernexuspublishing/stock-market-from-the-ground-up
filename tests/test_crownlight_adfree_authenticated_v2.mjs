/* Authenticated, non-charging Sparks V2 acceptance. Isolated service fixture only.
 * No real member credentials, wallet changes, provider charges, or market data.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest as redeem} from '../functions/api/member-sparks-adfree.js';
import {onRequest as adSlot} from '../functions/api/ad-slot.js';

const member='11111111-1111-4111-8111-111111111111';
const wrong='22222222-2222-4222-8222-222222222222';
const origin='https://learning.example';
const env={SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
const originalFetch=globalThis.fetch;
const prices={ADFREE_DAY:5,ADFREE_WEEK:18,ADFREE_MONTH:50};
const days={ADFREE_DAY:1,ADFREE_WEEK:7,ADFREE_MONTH:30};
const seen=new Map(),debits=[];
let balance=80,expires=0,plan='FREE',impressions=0,adCampaignReads=0;
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async (url,opts={})=>{
 const u=new URL(url),p=u.pathname,h=opts.headers||{};
 assert.equal(u.origin,env.SUPABASE_URL,'The handler must use its verified provider endpoint');
 assert.equal(opts.cache,'no-store');
 if(p==='/auth/v1/user'){
  if(h.authorization!=='Bearer fixture-member-session')return response({error:'invalid_session'},401);
  return response({id:member});
 }
 if(p==='/rest/v1/rpc/gu_sparks_adfree_status_v1'){
  assert.equal(h.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(JSON.parse(opts.body).p_user_id,member);
  return response({ok:true,eligible:plan==='FREE',active:expires>Date.now(),
   expiresAt:expires>Date.now()?new Date(expires).toISOString():null,planCode:plan});
 }
 if(p==='/rest/v1/rpc/gu_sparks_adfree_redeem_v1'){
  assert.equal(h.apikey,env.SUPABASE_SECRET_KEY);
  const b=JSON.parse(opts.body);
  assert.equal(b.p_user_id,member,'User query or posted ID cannot impersonate another member');
  const old=seen.get(b.p_request_id);
  if(old)return response(old.sku===b.p_sku?
   {ok:true,alreadyRedeemed:true,spent:old.cost,expiresAt:old.expiry,balance:{available:balance}}:
   {ok:false,error:'REQUEST_REUSED'});
  if(plan!=='FREE')return response({ok:false,error:'NOT_ELIGIBLE'});
  const cost=prices[b.p_sku];
  if(!Number.isSafeInteger(cost))return response({ok:false,error:'INVALID_REQUEST'});
  if(balance<cost)return response({ok:false,error:'INSUFFICIENT_SPARKS',balance:{available:balance}});
  balance-=cost;
  expires=Math.max(expires,Date.now())+days[b.p_sku]*86400000;
  const expiry=new Date(expires).toISOString();
  seen.set(b.p_request_id,{sku:b.p_sku,cost,expiry});
  debits.push({sku:b.p_sku,cost});
  return response({ok:true,spent:cost,expiresAt:expiry,balance:{available:balance}});
 }
 if(p.startsWith('/rest/v1/admin_user_roles'))return response([]);
 if(p.startsWith('/rest/v1/site_subscriptions'))return response(plan==='LIFETIME'?
  [{plan_code:'LIFETIME',status:'active',current_period_end:null}]:[]);
 if(p.startsWith('/rest/v1/user_plan_grants'))return response([]);
 if(p.startsWith('/rest/v1/gu_sparks_adfree_passes_v1'))return response(expires>Date.now()?
  [{expires_at:new Date(expires).toISOString()}]:[]);
 if(p.startsWith('/rest/v1/ad_placements'))return response([{active:true}]);
 if(p.startsWith('/rest/v1/plan_ad_policies'))return response([{
  ads_enabled:true,allowed_slots:['FREE_DASHBOARD'],
  max_impressions_per_session:5,max_impressions_per_24h:5,minimum_minutes_between_ads:0
 }]);
 if(p.startsWith('/rest/v1/gu_ad_sales_settings_v014226'))return response([{
  ad_delivery_enabled:true,accepting_payments:true
 }]);
 if(p.startsWith('/rest/v1/ad_campaigns')){adCampaignReads++;return response([])}
 if(p.startsWith('/rest/v1/ad_events')){impressions++;return response([])}
 throw Error('Unexpected provider call: '+p);
};
const url=origin+'/api/member-sparks-adfree?userId='+wrong;
const req=(method='GET',body,authenticated=true,requestOrigin=origin)=>{
 const headers=authenticated?{authorization:'Bearer fixture-member-session'}:{};
 if(method==='POST')Object.assign(headers,{origin:requestOrigin,'content-type':'application/json'});
 return new Request(url,{method,headers,...(method==='POST'?{body:JSON.stringify(body)}:{})});
};
const adUrl=origin+'/api/ad-slot?slot=FREE_DASHBOARD&page=%2Fdashboard.html&sessionToken=00000000-0000-4000-8000-000000000001';
const adReq=(method='GET')=>new Request(adUrl,{method,
 headers:{authorization:'Bearer fixture-member-session',...(method==='POST'?{origin,'content-type':'application/json'}:{})},
 ...(method==='POST'?{body:JSON.stringify({slot:'FREE_DASHBOARD',page:'/dashboard.html',
 type:'impression',creativeId:1,campaignId:1,sessionToken:'00000000-0000-4000-8000-000000000001'})}:{})});
try{
 let r=await redeem({request:req(),env});
 assert.equal(r.status,200);assert.equal((await r.json()).eligible,true);
 assert.match(r.headers.get('cache-control'),/no-store/);
 let a=await adSlot({request:adReq(),env});
 assert.equal(a.status,200);assert.equal((await a.json()).placeholderAvailable,true,
  'A Free member without an active pass remains eligible for an ad placeholder');
 for(const [i,sku] of ['ADFREE_DAY','ADFREE_WEEK','ADFREE_MONTH'].entries()){
  const requestId='33333333-3333-4333-8333-'+String(i+1).padStart(12,'0');
  const previousExpiry=expires;
  r=await redeem({request:req('POST',{sku,requestId,userId:wrong,costSparks:1}),env});
  assert.equal(r.status,200,sku+' must be redeemable');
  const body=await r.json();
  assert.equal(body.ok,true);assert.equal(body.spent,prices[sku]);
  assert(expires>previousExpiry,'Pass purchase must extend existing duration');
  r=await redeem({request:req('POST',{sku,requestId}),env});
  assert.equal(r.status,200);assert.equal((await r.json()).alreadyRedeemed,true);
  assert.equal(debits.length,i+1,'Idempotent replay cannot double spend');
 }
 assert.equal(balance,7);assert.deepEqual(debits.map(x=>x.cost),[5,18,50]);
 r=await redeem({request:req('POST',{
  sku:'ADFREE_WEEK',requestId:'44444444-4444-4444-8444-444444444444'}),env});
 assert.equal(r.status,409);assert.equal((await r.json()).error,'INSUFFICIENT_SPARKS');
 r=await redeem({request:req('POST',{
  sku:'ADFREE_WEEK',requestId:'33333333-3333-4333-8333-000000000001'}),env});
 assert.equal(r.status,409);assert.equal((await r.json()).error,'REQUEST_REUSED');
 r=await redeem({request:req('POST',{sku:'ADFREE_DAY',requestId:'55555555-5555-4555-8555-555555555555'},true,'https://attacker.example'),env});
 assert.equal(r.status,403);
 r=await redeem({request:req('POST',{sku:'INVALID',requestId:'55555555-5555-4555-8555-555555555555'}),env});
 assert.equal(r.status,400);
 r=await redeem({request:req(),env});
 assert.equal((await r.json()).active,true);
 r=await redeem({request:req('GET',undefined,false),env});assert.equal(r.status,401);
 a=await adSlot({request:adReq(),env});
 assert.equal(a.status,200);
 const blocked=await a.json();assert.equal(blocked.ad,null);
 assert.equal(blocked.placeholderAvailable,false,'Ad-free must suppress placeholders as well as creatives');
 const adsBefore=adCampaignReads,eventsBefore=impressions;
 a=await adSlot({request:adReq('POST'),env});
 assert.equal(a.status,403,'Ad-free must reject billable-looking ad events');
 assert.equal(adCampaignReads,adsBefore);assert.equal(impressions,eventsBefore);
 plan='LIFETIME';
 r=await redeem({request:req(),env});
 assert.equal((await r.json()).eligible,false);
 r=await redeem({request:req('POST',{sku:'ADFREE_DAY',
  requestId:'66666666-6666-4666-8666-666666666666'}),env});
 assert.equal(r.status,409);assert.equal((await r.json()).error,'NOT_ELIGIBLE');
 assert.equal(balance,7,'Ineligible accounts must never be charged');
 const catalog=JSON.parse(readFileSync('data/crownlight-sparks-store-v014167.json','utf8'));
 assert.equal(catalog.checkoutEnabled,false,'Live payments must remain disabled');
 assert.deepEqual(catalog.adFreePasses.map(p=>[p.code,p.costSparks,p.redeemEnabled]),[
 ['ADFREE_DAY',5,true],['ADFREE_WEEK',18,true],['ADFREE_MONTH',50,true]]);
 console.log('PASS authenticated Sparks V2: three SKUs, atomic-price fixture, extension, replay, denial, impersonation, ad suppression, noncharging checkout');
}finally{globalThis.fetch=originalFetch}
