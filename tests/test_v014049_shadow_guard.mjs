import assert from 'node:assert/strict';
const hook=await import(new URL('../functions/api/gu39-stripe-webhook.js',import.meta.url).href);
const endpoint='https://example.test/api/gu39-stripe-webhook';
const env={GU39_SANDBOX_SHADOW_GATE:'true',GU39_STRIPE_TEST_SECRET_KEY:'sk_test_mock',
 GU39_STRIPE_TEST_WEBHOOK_SECRET:'whsec_mock',SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_mock'};
const event={id:'evt_sample123456789',type:'checkout.session.completed',livemode:false,
 created:Math.floor(Date.now()/1000),data:{object:{id:'cs_test_mock12345678'}}};
async function send(payload,options={}){
 const body=JSON.stringify(payload),t=String(Math.floor(Date.now()/1000));
 const secret=options.env?.GU39_STRIPE_TEST_WEBHOOK_SECRET||env.GU39_STRIPE_TEST_WEBHOOK_SECRET;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(t+'.'+body)));
 const hex=Array.from(digest,x=>x.toString(16).padStart(2,'0')).join('');
 return hook.onRequestPost({request:new Request(endpoint,{method:'POST',
   headers:{'stripe-signature':'t='+t+',v1='+(options.badSignature?'a'.repeat(64):hex)},body}),
   env:options.env||env});
}
let enabled=false,reads=0,unexpected=0;
const original=globalThis.fetch;
globalThis.fetch=async(url)=>{
 const u=String(url);
 if(u.includes('gu39_sandbox_settings?select=enabled')){reads++;return new Response(JSON.stringify(enabled===null?[]:[{enabled}]),{status:200});}
 unexpected++;throw Error('Unexpected network request '+u);
};
try{
 let r=await send(event,{env:{...env,GU39_SANDBOX_SHADOW_GATE:'false'}});
 assert.equal(r.status,503);assert.equal(reads,0,'Cloudflare gate off must block all DB reads');
 r=await send(event,{badSignature:true});
 assert.equal(r.status,401);assert.equal(reads,0,'bad HMAC must not reach DB');
 r=await send({...event,livemode:true});
 assert.equal(r.status,400);assert.equal(reads,0,'live-mode Stripe events rejected');
 r=await send({...event,account:'acct_different123456'});
 assert.equal(r.status,400);assert.equal(reads,0,'cross-account Connect event rejected');
 r=await send(event);
 assert.equal(r.status,503);assert.equal(await r.text(),'OWNER_TEST_MODE_DISABLED');
 assert.equal(reads,1,'Owner switch checked before Stripe API');
 enabled=null;r=await send(event);
 assert.equal(r.status,503);assert.equal(await r.text(),'OWNER_TEST_MODE_DISABLED');
 globalThis.fetch=async url=>{
   if(String(url).includes('gu39_sandbox_settings?select=enabled')){reads++;throw Error('Temporary DB outage');}
   unexpected++;throw Error('Unexpected '+url);
 };
 r=await send(event);
 assert.equal(r.status,503);assert.equal(await r.text(),'SHADOW_SETTINGS_UNAVAILABLE');
 assert.equal(unexpected,0,'No Stripe or shadow event writes when gates fail');
 console.log('PASS v49: webhook double-gates, settings unavailable, account, test-mode and HMAC rejection.');
}finally{globalThis.fetch=original}
