/* v73: Store opt-in QA setup view must not reveal or enable a $0 checkout without backend approval. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../assets/js/store-zero-live-qa.js',import.meta.url),'utf8');
async function run(query,reply,signed=true){
 const element=()=>({hidden:true,disabled:true,textContent:'',child:null,events:{},
  addEventListener(type,fn){this.events[type]=fn},
  append(x){this.child=x},
  after(x){this.child=x},
  querySelector(){return null}});
 const section=element(),begin=element(),refresh=element(),status=element();
 const id={ 'store-zero-monthly-qa':section,'store-zero-monthly-begin':begin,
  'store-zero-monthly-refresh':refresh,'store-zero-monthly-status':status };
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
 return {section,begin,status,req};
}
let r=await run('?gu72=setup',{ok:false,json:{ok:false,error:'QA_CONFIGURATION_MISSING'}});
assert.equal(r.section.hidden,false,'explicit QA setup view visible to member');
assert.equal(r.begin.disabled,true,'cannot buy when not configured');
assert.match(r.status.textContent,/not configured|locked/i);
assert.equal(r.req.filter(x=>x.opts.method==='POST').length,0,'no checkout initiated');
r=await run('',{ok:false,json:{ok:false,error:'QA_CONFIGURATION_MISSING'}});
assert.equal(r.section.hidden,true,'normal Store does not advertise unavailable internal QA');
r=await run('?gu72=setup',{ok:false,json:{ok:false,error:'SIGN_IN_REQUIRED'}},false);
assert.equal(r.begin.disabled,true,'unsigned user can never buy');
r=await run('',{ok:true,json:{ok:true,available:true,amountCents:0}});
assert.equal(r.section.hidden,false,'allowlisted eligible member automatically sees tile');
assert.equal(r.begin.disabled,false,'only the server-allowed member gets the CTA');
console.log('PASS v73: Store setup visibility, no public QA advertisement, backend-controlled checkout eligibility');
