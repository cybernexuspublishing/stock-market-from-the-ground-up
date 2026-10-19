/* v74 Owner-directed change: keep restricted $0 QA visible; all checkout remains server-locked until configured. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../assets/js/store-zero-live-qa.js',import.meta.url),'utf8');
const store=readFileSync(new URL('../store.html',import.meta.url),'utf8');
const listing=/<section id="store-zero-monthly-qa"([^>]*)>/i.exec(store);
assert.ok(listing,'Store is missing its restricted $0 test membership');
assert.ok(!/\bhidden\b/i.test(listing[1]),'Store test membership must be visible without JavaScript');
assert.ok(store.includes('Monthly Membership Test'),'Store QA needs its own distinct product label');
assert.ok(store.includes('NOT A PUBLIC OFFER'),'Permanent $0 test price must not be advertised as a normal membership');
const planRenderer=readFileSync(new URL('../assets/js/store.js',import.meta.url),'utf8');
assert.ok(planRenderer.includes("monthly.after(qa)")&&planRenderer.includes("planRoot.append(qa)"),'Position $0 verification card among platform pricing cards');
assert.ok(!src.includes('section.hidden=true'),'Store script must never silently hide test card');
async function run(query,reply,signed=true){
 const element=()=>({hidden:true,disabled:true,textContent:'',child:null,events:{},
  addEventListener(type,fn){this.events[type]=fn},
  append(x){this.child=x},
  after(x){this.child=x},
  querySelector(){return null}});
 const section=element(),begin=element(),reset=element(),refresh=element(),status=element();
 const id={ 'store-zero-monthly-qa':section,'store-zero-monthly-begin':begin,
  'store-zero-monthly-reset':reset,'store-zero-monthly-refresh':refresh,'store-zero-monthly-status':status };
 const req=[];
 const userId='00000000-0000-4000-8000-000000000001';
 const document={
  readyState:'complete',
  getElementById:k=>id[k],
  createElement(tag){const el=element();el.tag=tag;return el},
  createTextNode:t=>t,
 };
 const ctx={document,
  window:{getSupabaseClient:async()=>({auth:{getSession:async()=>({data:{session:signed?{access_token:'jwt',user:{id:userId}}:null}})}}),
   confirm:()=>false},
  navigator:{clipboard:{writeText:async()=>{}}},
  location:{search:query,assign(){throw Error('Unexpected redirect')}},
  URLSearchParams,URL,Error,
  setTimeout:(fn)=>{fn();return 1},
  fetch:async(url,opts)=>{req.push({url,opts});return {ok:reply.ok,json:async()=>reply.json}},
 };
 vm.runInNewContext(src,ctx,{filename:'store-zero-live-qa.js'});
 for(let i=0;i<30;i++)await Promise.resolve();
 return {section,begin,reset,status,req};
}
let r=await run('?gu72=setup',{ok:false,json:{ok:false,error:'QA_CONFIGURATION_MISSING'}});
assert.equal(r.section.hidden,false,'explicit QA setup view visible to member');
assert.equal(r.begin.disabled,true,'cannot buy when not configured');
assert.match(r.status.textContent,/not configured|locked/i);
assert.equal(r.req.filter(x=>x.opts.method==='POST').length,0,'no checkout initiated');
r=await run('',{ok:false,json:{ok:false,error:'QA_CONFIGURATION_MISSING'}});
assert.equal(r.section.hidden,false,'normal Store must show restricted $0 test membership even while backend is not ready');
assert.equal(r.begin.disabled,true,'normal Store must keep checkout locked when QA configuration is absent');
r=await run('',{ok:true,json:{ok:true,available:false}});
assert.equal(r.section.hidden,false,'QA is visible even when backend reports unavailable');
assert.equal(r.begin.disabled,true,'QA is not purchasable when backend reports unavailable');
r=await run('?gu72=setup',{ok:false,json:{ok:false,error:'SIGN_IN_REQUIRED'}},false);
assert.equal(r.begin.disabled,true,'unsigned user can never buy');
r=await run('',{ok:true,json:{ok:true,available:true,amountCents:0}});
assert.equal(r.section.hidden,false,'allowlisted eligible member automatically sees tile');
assert.equal(r.begin.disabled,false,'only the server-allowed member gets the CTA');
r=await run('',{ok:true,json:{ok:true,available:false,canReset:true,planCode:'FULL_MONTHLY'}});
assert.equal(r.begin.disabled,true,'Cannot repeat before reset');
assert.equal(r.reset.hidden,false,'Same QA member can see explicit reset button');
r=await run('',{ok:true,json:{ok:true,available:false,canReset:false,planCode:'FULL_MONTHLY'}});
assert.equal(r.reset.hidden,true,'Other paid subscriptions never show QA reset button');
assert.ok(store.includes('id="store-zero-monthly-reset"'),'Visible Store requires gated reset action');
assert.ok(src.includes('checkoutAttemptId'),'Checkout must send unique user attempt');
console.log('PASS v76: Store QA visible and safe, per-member reset shown only when signed backend says canReset');
