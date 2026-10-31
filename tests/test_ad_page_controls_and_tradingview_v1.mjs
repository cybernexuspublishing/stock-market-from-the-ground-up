import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {onRequest as sales} from '../functions/api/ad-sales.js';
import {onRequest as adSlot} from '../functions/api/ad-slot.js';

const host='https://example.test';
const env={SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
const owner='11111111-1111-4111-8111-111111110111';
function mock(){
 const original=globalThis.fetch,seen=[];
 const placements=[
  {placement_code:'STORE_LEFT',page_pattern:'/store.html',active:true},
  {placement_code:'STORE_RIGHT',page_pattern:'/store.html',active:true},
  {placement_code:'KNOWLEDGE_TRADINGVIEW',page_pattern:'/knowledge-database.html',active:true}
 ];
 globalThis.fetch=async (input,init={})=>{
  const url=new URL(String(input)),path=url.pathname,method=init.method||'GET';
  seen.push({path,method,query:url.search,body:init.body});
  let data=[];
  if(path==='/auth/v1/user')data={id:owner};
  else if(path.endsWith('/admin_user_roles'))data=[{role_code:'OWNER',expires_at:null}];
  else if(path.endsWith('/profiles'))data=[{account_kind:'member',deleted_at:null}];
  else if(path.endsWith('/admin_user_flags'))data=[];
  else if(path.endsWith('/ad_placements')){
   if(method==='PATCH'){
    const values=String(url.searchParams.get('placement_code')||'').replace('in.(','').replace(')','').split(',');
    const active=JSON.parse(init.body).active;
    data=placements.filter(p=>values.includes(p.placement_code)).map(p=>{p.active=active;return {...p}});
   }else{
    const exact=url.searchParams.get('page_pattern')?.replace(/^eq\./,'');
    const code=url.searchParams.get('placement_code')?.replace(/^eq\./,'');
    data=placements.filter(p=>(!exact||p.page_pattern===exact)&&(!code||p.placement_code===code));
   }
  }
  else if(path.endsWith('/gu_ad_admin_audit_v014226'))data=[{id:1}];
  else if(path.endsWith('/plan_ad_policies'))data=[{ads_enabled:true,allowed_slots:['KNOWLEDGE_TRADINGVIEW']}];
  else if(path.endsWith('/gu_ad_sales_settings_v014226'))data=[{ad_delivery_enabled:false,accepting_payments:false}];
  return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
 };
 return {seen,placements,restore:()=>{globalThis.fetch=original}};
}
const req=(action,token='fixture')=>new Request(host+'/api/ad-sales',{method:'POST',headers:{
 origin:host,'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
 body:JSON.stringify(action)});
test('Owner page switch disables all Store placements in one operation without altering other pages or billing',async()=>{
 const m=mock();
 try{
  const response=await sales({request:req({action:'set_page_placements_active',pagePattern:'/store.html',enabled:false}),env});
  const result=await response.json();
  assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.updatedCount,2);
  assert.equal(result.paymentStateChanged,false);assert.equal(result.campaignStateChanged,false);
  assert.equal(m.placements.filter(p=>p.page_pattern==='/store.html').every(p=>p.active===false),true);
  assert.equal(m.placements.find(p=>p.placement_code==='KNOWLEDGE_TRADINGVIEW').active,true);
  assert.equal(m.seen.filter(x=>x.method==='PATCH').length,1);
  assert.equal(m.seen.some(x=>x.path.includes('stripe')||x.path.endsWith('/ad_campaigns')),false);
 }finally{m.restore()}
});
test('No unauthorized user can operate the page advertising switch',async()=>{
 const m=mock();try{
  const response=await sales({request:req({action:'set_page_placements_active',pagePattern:'/store.html',enabled:false},null),env});
  assert.equal(response.status,401);assert.equal(m.seen.filter(x=>x.method==='PATCH').length,0);
 }finally{m.restore()}
});
test('Knowledge Database banner follows server placement toggle, even with paid campaigns disabled',async()=>{
 const m=mock();try{
  const endpoint=host+'/api/ad-slot?slot=KNOWLEDGE_TRADINGVIEW&page=%2Fknowledge-database.html';
  const first=await adSlot({request:new Request(endpoint),env});
  assert.equal((await first.json()).placeholderAvailable,true);
  m.placements.find(p=>p.placement_code==='KNOWLEDGE_TRADINGVIEW').active=false;
  const second=await adSlot({request:new Request(endpoint),env});
  const disabled=await second.json();assert.equal(disabled.placeholderAvailable,false);
  assert.equal(disabled.ad,null);
 }finally{m.restore()}
});
test('Knowledge Database uses a short visible paid-referral label and fail-closed visibility script',()=>{
 const html=fs.readFileSync('knowledge-database.html','utf8');
 const js=fs.readFileSync('assets/js/knowledge-partner-banner-v1.js','utf8');
 const admin=fs.readFileSync('admin-advertising.html','utf8');
 const ui=fs.readFileSync('assets/js/admin-ad-sales-v014228.js','utf8');
 assert.match(html,/id="gu-knowledge-partner-banner"[^>]*hidden/);
 assert.match(html,/Paid referral/);
 assert.doesNotMatch(html,/We may earn a commission from purchases through this link/);
 assert.match(js,/KNOWLEDGE_TRADINGVIEW/);
 assert.match(js,/banner\.hidden=true/);
 assert.match(ui,/set_page_placements_active/);
 assert.match(admin,/Page advertising visibility/);
 assert.match(admin,/Placements &amp; Creatives/);
});
