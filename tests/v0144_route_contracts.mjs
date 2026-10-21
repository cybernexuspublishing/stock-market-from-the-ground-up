/* v0.14.0.4: negative auth/security coverage without live credentials. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const importFile=async path=>import('data:text/javascript;base64,'+Buffer.from(await fs.readFile(path,'utf8')).toString('base64'));
const market=await import('data:text/javascript;base64,'+Buffer.from((await fs.readFile('functions/api/marketdata.js','utf8')).replace("import {toolAccess} from './member-tool-access.js';", 'const toolAccess=async()=>({authorized:false});')).toString('base64'));
const plans=await importFile('functions/api/plan-controls.js');
const checkout=await importFile('functions/api/checkout.js');
const report=await importFile('functions/api/commons-report.js');
const checkoutSource=await fs.readFile('functions/api/checkout.js','utf8');
const checkoutNewSource=await fs.readFile('functions/api/checkout-v0135.js','utf8');
assert.match(checkoutSource,/env\.ENABLE_PAID_CHECKOUT==='true'&&master===true&&it\.enabled===true/,'Legacy quote must include env/item flags');
assert.match(checkoutNewSource,/env\.ENABLE_PAID_CHECKOUT==='true'&&setting\?\.value===true/,'Book quote must include global flag');
const env={SUPABASE_URL:'https://unit-test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public-test',SUPABASE_SECRET_KEY:'server-secret'};
let profileKind='test',status='active',writes=0,seen=[],pause=null;
const respond=(data,code=200)=>new Response(JSON.stringify(data),{status:code,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const u=String(url);seen.push([u,options.method||'GET']);
 if(u.endsWith('/auth/v1/user'))return respond({id:'123e4567-e89b-12d3-a456-426614174000'});
 if(u.includes('/profiles?'))return respond([{account_kind:profileKind}]);
 if(u.includes('/admin_user_flags?'))return respond([{status}]);
 if(u.includes('/admin_user_roles?'))return respond([{role_code:'OWNER'}]);
 if(u.includes('/platform_plans?')&&u.includes('limit=1'))return respond([{plan_code:'FULL_MONTHLY',active:true,public_visible:true,checkout_enabled:true,price_cents:6999}]);
 if(u.includes('/platform_plans?'))return respond([{plan_code:'FULL_MONTHLY',name:'Monthly',active:true,public_visible:true,checkout_enabled:true,price_cents:6999}]);
 if(u.endsWith('/rpc/v014_owner_plan_visibility')){writes++;pause=JSON.parse(options.body).p_pause_checkout;return respond({ok:true,checkoutEnabled:false})}
 if(u.includes('/user_market_data_connections?'))return respond([]);
 if(u.includes('/site_settings?'))return respond([{value:true}]);
 if(u.includes('/rest/v1/commons_topics?'))return respond([{id:14}]);
 if(u.includes('/rpc/v014_community_report')){writes++;return respond({ok:true})}
 if(u.includes('api.tiingo.com'))return respond([]);
 throw Error('Unexpected mock endpoint '+u);
};
const fake=(url,method='GET',body)=>({request:new Request(url,{method,headers:{authorization:'Bearer mock',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env});
for(const account of ['test','showcase']){
 profileKind=account;seen=[];const res=await market.onRequest(fake('https://unit.test/api/marketdata?action=connect','POST',{provider:'TIINGO_BYO',token:'exampleproviderkey'}));
 assert.equal(res.status,403,`${account} credential writes denied`);assert(!seen.some(([u])=>u.includes('tiingo.com')),`${account} never sends credentials to provider`);
}
profileKind='test';status='active';const blockedQuote=await checkout.onRequest(fake('https://unit.test/api/checkout?action=quote&type=plan&code=FULL_MONTHLY'));
assert.equal(blockedQuote.status,403,'Test accounts cannot obtain purchaser session');
profileKind='showcase';const blockedReport=await report.onRequestPost(fake('https://unit.test/api/commons-report','POST',{id:14,type:'topic',reason:'spam'}));
assert.equal(blockedReport.status,403,'Synthetic accounts cannot report production content');
profileKind='member';status='suspended';const restrictedQuote=await checkout.onRequest(fake('https://unit.test/api/checkout?action=quote&type=plan&code=FULL_MONTHLY'));
assert.equal(restrictedQuote.status,403,'Suspended account cannot initiate a purchase');
profileKind='member';status='suspended';const suspended=await market.onRequest(fake('https://unit.test/api/marketdata?action=list'));
assert.equal(suspended.status,403,'Suspended member blocked');
status='active';const quotes=await checkout.onRequest(fake('https://unit.test/api/checkout?action=quote&type=plan&code=FULL_MONTHLY'));
const quoteData=await quotes.json();assert.equal(quoteData.checkoutEnabled,false,'Quote must not advertise checkout when environment rollout is off');
const member=await market.onRequest(fake('https://unit.test/api/marketdata?action=list'));
assert.equal(member.status,200,'Eligible production member list allowed');
profileKind='member';const disabled=await plans.onRequest(fake('https://unit.test/api/plan-controls','POST',{planCode:'FULL_MONTHLY',checkoutEnabled:false}));
assert.equal(disabled.status,200,'Explicit plan purchase pause is accepted');assert.equal(pause,true,'Purchase pause reaches SQL RPC');
const denied=await plans.onRequest(fake('https://unit.test/api/plan-controls','POST',{planCode:'FULL_MONTHLY',checkoutEnabled:true}));
assert.equal(denied.status,403,'Checkout cannot be activated through Owner screen');
assert.equal(writes,1,'No unauthorized writes occur');
console.log('v0.14.0.4: route-contract regression PASS (synthetic accounts, suspended, normal, checkout quotes, purchase pause, checkout activation deny, forum reports)');
