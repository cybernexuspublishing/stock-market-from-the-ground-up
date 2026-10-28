import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest as chart} from '../functions/api/member-sparks-chart.js';
import {onRequestGet as prices} from '../functions/api/member-sparks-pricing.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const catalog=source('supabase/migrations/20261028_crownlight_sparks_pricing_chart_passes_v1.sql');
const confirmedChart=source('supabase/migrations/20261028_crownlight_chart_sparks_confirmed_quote_v2.sql');
const confirmedAdfree=source('supabase/migrations/20261028_crownlight_adfree_confirmed_quote_v2.sql');
const confirmedPractice=source('supabase/migrations/20261028_crownlight_practice_confirmed_quote_v2.sql');
const admin=source('functions/api/admin.js'),ui=source('assets/js/admin-sparks-pricing-v1.js');
assert.match(admin,/action==='sparks_prices'/);
assert.match(admin,/action==='sparks_price_save'/);
assert.match(admin,/settings.manage/);
assert.match(admin,/roles.includes\('OWNER'\)/);
assert.match(admin,/sparks.price.update/);
assert.match(admin,/version=eq./);
assert.match(ui,/Add planned item|Add a Spark-priced item/);
assert.match(ui,/sparks_price_save/);
assert.match(confirmedChart,/PRICE_CHANGED/);
assert.match(confirmedAdfree,/PRICE_CHANGED/);
assert.match(confirmedPractice,/PRICE_CHANGED/);
for(const [sku,amount] of [
 ['CHART_ADVANCED_DAY',6],['CHART_ADVANCED_WEEK',24],['CHART_ADVANCED_MONTH',75],
 ['CHART_PROFESSIONAL_DAY',12],['CHART_PROFESSIONAL_WEEK',45],['CHART_PROFESSIONAL_MONTH',125]
]){
 assert.match(catalog,new RegExp("'"+sku+"'"));
 assert.match(catalog,new RegExp(","+amount+",")); 
}
assert.match(catalog,/ENABLE ROW LEVEL SECURITY/);
assert.match(catalog,/REVOKE ALL/);
const env={SUPABASE_URL:'https://sparks-mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pub',
 SUPABASE_SECRET_KEY:'secret'};
const uuid='11111111-1111-4111-8111-111111111111',original=globalThis.fetch;
const captured=[];
globalThis.fetch=async(url,opt={})=>{
 const u=new URL(url);captured.push(u.pathname);
 if(u.pathname==='/auth/v1/user')return new Response(JSON.stringify({id:uuid}),{status:200});
 if(u.pathname==='/rest/v1/gu_sparks_price_catalog_v1')
  return new Response(JSON.stringify([{sku:'CHART_ADVANCED_DAY',label:'Advanced 24h',
    description:'No data license',sparks_cost:6,duration_hours:24,category:'CHART_STUDIO',
    fulfillment:'CHART_PASS',state:'active'}]),{status:200});
 if(u.pathname==='/rest/v1/gu_sparks_chart_passes_v1')
  return new Response(JSON.stringify([]),{status:200});
 throw Error('Unexpected network access '+u.pathname);
};
const req=(method,body)=>new Request('https://site.test/api/member-sparks-chart',{
 method,headers:{authorization:'Bearer simulated_member_token',...(method==='POST'?{
  origin:'https://site.test','content-type':'application/json'}:{})},
 body:body?JSON.stringify(body):undefined
});
try{
 const list=await chart({request:req('GET'),env}),data=await list.json();
 assert.equal(list.status,200);assert.equal(data.offers[0].costSparks,6);
 assert.equal(data.offers[0].tier,'ADVANCED');
 const missing=await chart({request:req('POST',{sku:'CHART_ADVANCED_DAY',
  requestId:'22222222-2222-4222-8222-222222222222'}),env});
 assert.equal(missing.status,400,'No confirmed price means no redemption');
 const quoted=await prices({request:new Request('https://site.test/api/member-sparks-pricing',
   {headers:{authorization:'Bearer simulated_member_token'}}),env});
 assert.equal(quoted.status,200);
 assert.equal((await quoted.json()).items[0].costSparks,6);
 assert(!captured.includes('/rest/v1/rpc/gu_sparks_chart_redeem_v2'),
  'Read-only and invalid quote acceptance must not spend any Sparks');
}finally{globalThis.fetch=original}
console.log('PASS Crownlight price catalog, Owner controls, quote protection and no-debit member read.');
