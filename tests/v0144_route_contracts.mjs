/* v0.14.0.148 reconciliation of the original v0.14.0.4 regression debt.
 * Preserve negative auth, catalog-pause and forum-report checks against the
 * CURRENT Stripe-first route. This test MUST NOT invoke LIVE payment.
 */
import assert from 'node:assert/strict';
import {onRequest as market} from '../functions/api/marketdata.js';
import {onRequest as plans} from '../functions/api/plan-controls.js';
import {onRequest as checkout} from '../functions/api/checkout.js';
import {onRequestPost as report} from '../functions/api/commons-report.js';

const env={SUPABASE_URL:'https://unit-test.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_server_mock',
 GU58_LIVE_CHECKOUT_ENABLED:'false',ENABLE_PAID_CHECKOUT:'false'};
const uid='123e4567-e89b-42d3-a456-426614174000';
let profileKind='test',status='active',writes=0,pause=null,observed=[],ownerRole='OWNER';
const respond=(data,code=200)=>new Response(JSON.stringify(data),{status:code,headers:{'content-type':'application/json'}});
const previousFetch=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const u=String(url),m=options.method||'GET';observed.push([u,m,options]);
 assert(!u.startsWith('https://api.stripe.com/')&&!u.startsWith('https://api.lemonsqueezy.com/'),
 'Legacy negative tests must not call real payment providers');
 if(u.endsWith('/auth/v1/user'))return respond({id:uid});
 if(u.includes('/rest/v1/')){
  assert.equal(options.headers?.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(options.headers?.authorization,undefined,
    'Opaque sb_secret_* must NEVER be sent as a fake Bearer JWT');
 }
 if(u.includes('/profiles?'))return respond([{account_kind:profileKind}]);
 if(u.includes('/admin_user_flags?'))return respond([{status}]);
 if(u.includes('/admin_user_roles?'))return respond([{role_code:ownerRole,expires_at:null}]);
 if(u.includes('/platform_plans?'))return respond([{plan_code:'FULL_MONTHLY',name:'Monthly Membership',
  description:'Approved plan',active:true,public_visible:true,checkout_enabled:true,
  price_cents:6999,billing_interval:'month'}]);
 if(u.endsWith('/rpc/v014_owner_plan_visibility')){writes++;pause=JSON.parse(options.body).p_pause_checkout;return respond({ok:true,checkoutEnabled:false})}
 if(u.includes('/user_market_data_connections?')||u.includes('/user_secure_credentials?')){
  assert.match(u,/user_id=eq\.123e4567-e89b-42d3-a456-426614174000/,
   'Private credential reads must be scoped to the authenticated owner');
  return respond([]);
 }
 if(u.includes('/site_settings?'))return respond([{value:true}]);
 if(u.includes('/rest/v1/commons_topics?'))return respond([{id:14}]);
 if(u.includes('/rpc/v014_community_report')){writes++;return respond({ok:true})}
 if(u.includes('api.tiingo.com'))throw Error('Unexpected attempted BYO token verification');
 throw Error('Unexpected mocked endpoint '+u);
};
const fake=(path,method='GET',body)=>({request:new Request('https://unit.test/'+path,{
 method,headers:{authorization:'Bearer mock-member',...(body?{'content-type':'application/json'}:{})},
 ...(body?{body:JSON.stringify(body)}:{})
}),env});
try{
 for(const kind of ['test','showcase']){
  profileKind=kind;observed=[];
  const r=await market(fake('api/marketdata?action=connect','POST',
   {provider:'TIINGO_BYO',token:'notarealprovidercredential'}));
  assert.equal(r.status,403,kind+' cannot create real market-data provider connection');
  assert(!observed.some(([u])=>u.includes('tiingo.com')),'Synthetic account never calls market-data provider');
 }
 profileKind='test';status='active';
 let r=await checkout(fake('api/checkout?action=quote&type=plan&code=FULL_MONTHLY'));
 assert.equal(r.status,403,'Test accounts cannot initiate purchaser quote');
 profileKind='showcase';
 r=await report(fake('api/commons-report','POST',{id:14,type:'topic',reason:'spam'}));
 assert.equal(r.status,403,'Showcase cannot report actual production content');
 profileKind='member';status='suspended';
 r=await checkout(fake('api/checkout?action=quote&type=plan&code=FULL_MONTHLY'));
 assert.equal(r.status,403,'Suspended account cannot obtain purchaser quote');
 r=await market(fake('api/marketdata?action=list'));
 assert.equal(r.status,403,'Suspended member cannot list private market-data credentials');
 status='active';
 r=await checkout(fake('api/checkout?action=quote&type=plan&code=FULL_MONTHLY'));
 let q=await r.json();
 assert.equal(r.status,200,'Valid active member obtains no-charge quote');
 assert.equal(q.checkoutEnabled,false,'No paid provider rollout flag => checkout must stay unavailable');
 assert.equal(q.item.code,'FULL_MONTHLY');
 assert.equal(observed.filter(([u])=>u.includes('/api.stripe.com/')).length,0);
 r=await market(fake('api/marketdata?action=list'));
 assert.equal(r.status,200,'Eligible production member can list only their own provider connections');
 observed=[];
 r=await plans(fake('api/plan-controls','POST',{planCode:'FULL_MONTHLY',checkoutEnabled:false}));
 assert.equal(r.status,200,'Owner can pause purchases using audited RPC');
 assert.equal(pause,true);
 assert(observed.some(([u])=>u.endsWith('/rpc/v014_owner_plan_visibility')));
 r=await plans(fake('api/plan-controls','POST',{planCode:'FULL_MONTHLY',checkoutEnabled:true}));
 assert.equal(r.status,403,'Owner may not bypass separately audited paid rollout');
 assert.equal(writes,1,'No unauthorized writes');
 ownerRole='MODERATOR';
 r=await plans(fake('api/plan-controls'));
 assert.equal(r.status,403,'Moderator may not access Owner-only plan controls');
 console.log('PASS v0.14.0.148: reconciled legacy route tests against current checkout/owner permission model, opaque key handling, synthetic account denial, no provider calls or charges.');
}finally{globalThis.fetch=previousFetch}
