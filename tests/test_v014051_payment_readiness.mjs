import assert from 'node:assert/strict';
const api=await import(new URL('../functions/api/gu39-sandbox.js',import.meta.url).href);
const endpoint='https://example.com/api/gu39-sandbox?view=readiness';
const owner='11111111-1111-4111-8111-111111111111';
const PRICE_KEYS=['plan:FULL_MONTHLY','plan:FULL_ANNUAL','plan:LIFETIME','plan:ONDEMAND_MONTHLY',
 'tool:INTERACTIVE_LEARNING','tool:JOURNAL_ANALYTICS','tool:MARKET_SIMULATOR','tool:MARKET_TUTOR'];
const mapping=Object.fromEntries(PRICE_KEYS.map((k,i)=>[k,'price_testing00000'+String(i).padStart(5,'0')]));
const events=['checkout.session.completed','checkout.session.async_payment_succeeded','invoice.paid','invoice.payment_failed',
 'customer.subscription.updated','customer.subscription.deleted','charge.refunded','charge.dispute.created'];
const env={
 SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_testing',
 SUPABASE_SECRET_KEY:'sb_secret_mock',GU39_STRIPE_TEST_SECRET_KEY:'sk_test_mock',
 GU39_STRIPE_TEST_WEBHOOK_SECRET:'whsec_mock',GU39_SANDBOX_SHADOW_GATE:'false',
 GU39_STRIPE_TEST_PRICE_MAP_JSON:JSON.stringify(mapping)};
const authRequest=(jwt='owner')=>new Request(endpoint,{headers:{authorization:'Bearer '+jwt}});
const mock=v=>new Response(JSON.stringify(v),{status:200,headers:{'content-type':'application/json'}});
const prior=globalThis.fetch,urls=[];
let role='OWNER',available=true,registered=true,complete=true,enabled=false,duplicate=false;
globalThis.fetch=async(url,options={})=>{
 const u=String(url),method=options.method||'GET';urls.push([u,method]);
 if(u.endsWith('/auth/v1/user'))return mock({id:owner});
 if(u.endsWith('/rpc/gu_staff_role_v01432r1'))return mock({ok:true,role});
 if(u.endsWith('/v1/account'))return mock({id:'acct_1URGkDJY9FI7byHB'});
 if(u.includes('gu39_sandbox_settings?select=enabled'))return mock([{enabled}]);
 if(u.includes('/v1/webhook_endpoints?')){
  if(!available)return new Response(JSON.stringify({error:{message:'Forbidden'}}),{status:403});
  return mock({data:registered?Array.from({length:duplicate?2:1},(_,i)=>({id:'we_test'+i,url:'https://example.com/api/gu39-stripe-webhook',
    livemode:false,status:'enabled',enabled_events:complete?events:events.slice(0,4)})):[],has_more:false});
 }
 throw Error('Unexpected network request '+u);
};
try{
 let r=await api.onRequestGet({request:authRequest(),env});
 assert.equal(r.status,200,await r.clone().text());
 let data=await r.json();
 assert.equal(data.configurationReady,true);
 assert.equal(data.passed,7);
 assert.equal(data.total,7);
 assert.equal(data.cloudflareGate,false);
 assert.equal(data.ownerMode,false);
 assert.equal(data.liveCheckout,false);
 assert(!JSON.stringify(data).includes(env.GU39_STRIPE_TEST_SECRET_KEY),'Never leak secrets');
 assert(!JSON.stringify(data).includes(env.SUPABASE_SECRET_KEY),'Never leak DB secret');
 assert(urls.every(([u,m])=>!(u.includes('api.stripe.com')&&m!=='GET')),'Readiness may NEVER write to Stripe');
 assert(urls.every(([u])=>!(/user_plan_grants|site_subscriptions|user_tool_passes/.test(u))));
 registered=false;r=await api.onRequestGet({request:authRequest(),env});data=await r.json();
 assert.equal(data.configurationReady,false);
 assert(data.checks.some(x=>x.check==='Stripe TEST webhook destination'&&x.status==='BLOCKED'));
 registered=true;complete=false;r=await api.onRequestGet({request:authRequest(),env});data=await r.json();
 assert.equal(data.configurationReady,false);
 assert(data.checks.some(x=>x.check==='Eight required webhook event subscriptions'&&x.status==='BLOCKED'));
 complete=true;duplicate=true;r=await api.onRequestGet({request:authRequest(),env});data=await r.json();
 assert.equal(data.configurationReady,false,'duplicate endpoint destinations must block test activation');
 duplicate=false;available=false;r=await api.onRequestGet({request:authRequest(),env});data=await r.json();
 assert.equal(data.configurationReady,false,'Stripe API failure must block readiness');
 available=true;r=await api.onRequestGet({request:authRequest(),env:{...env,GU39_STRIPE_TEST_WEBHOOK_SECRET:''}});data=await r.json();
 assert.equal(data.configurationReady,false,'Missing encrypted signing secret must block readiness');
 r=await api.onRequestGet({request:authRequest(),env:{...env,GU39_STRIPE_TEST_PRICE_MAP_JSON:'{}'}});data=await r.json();
 assert.equal(data.configurationReady,false,'Missing price mappings must block readiness');
 role='ADMIN';r=await api.onRequestGet({request:authRequest(),env});
 assert.equal(r.status,403,'Admin cannot use OWNER-only readyness endpoint');
 role='OWNER';r=await api.onRequestGet({request:new Request(endpoint),env});
 assert.equal(r.status,401,'Anonymous cannot inspect readiness');
 console.log('PASS v0.14.0.51: 7-point production TEST readiness, Stripe webhook 8 event types, Owner only, no payment writes or secrets.');
}finally{globalThis.fetch=prior}
