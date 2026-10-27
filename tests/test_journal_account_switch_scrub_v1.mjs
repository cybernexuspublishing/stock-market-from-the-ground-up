/* Product 03 Journal session-crossing privacy regression.
 * Exercise actual member script under a simulated auth transition without
 * claiming to be a real Supabase signed-in browser test.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const src=readFileSync('assets/js/journal-analytics.js','utf8');
let onReady=null,onAuth=null,session={user:{id:'MEMBER_A'},access_token:'token-a'};
const nodes=new Map(),req=[];
const get=id=>{
 if(!nodes.has(id))nodes.set(id,{
  id,hidden:false,textContent:'PRIVATE PREVIOUS MEMBER RESULTS',value:'all',
  children:['PRIVATE PREVIOUS MEMBER RESULTS'],clearCount:0,
  replaceChildren(){this.children=[];this.textContent='';this.clearCount++},
  addEventListener(){}
 });
 return nodes.get(id);
};
const document={
 getElementById:get,addEventListener(name,cb){if(name==='DOMContentLoaded')onReady=cb}
};
const auth={
 getSession:async()=>({data:{session}}),
 onAuthStateChange(cb){onAuth=cb;return {data:{subscription:{unsubscribe(){}}}}}
};
const fakeFetch=(url,opts)=>new Promise(resolve=>{req.push({url,opts,resolve})});
const context={document,window:{getSupabaseClient:async()=>({auth})},fetch:fakeFetch,
 queueMicrotask,console,Intl,Number,Date,String,Array,Object,Promise,Math,
 setTimeout,clearTimeout};
runInNewContext(src,context,{filename:'assets/js/journal-analytics.js'});
assert.equal(typeof onReady,'function');
onReady();
const tick=()=>new Promise(resolve=>setImmediate(resolve));
await tick();await tick();
assert.equal(req.length,1,'Authenticated private request should begin once');
assert.equal(req[0].opts.headers.authorization,'Bearer token-a');
get('analytics-content').hidden=false;get('analytics-kpis').children=['private A results'];
session=null;
onAuth('SIGNED_OUT',null);
assert.equal(get('analytics-content').hidden,true,'Sign out hides prior member results synchronously');
assert.equal(get('analytics-kpis').children.length,0,'Sign out erases sensitive metrics in DOM');
assert.match(get('analytics-gate').textContent,/session changed/);
req[0].resolve({ok:true,json:async()=>({ok:true,summary:{totalNet:999999}})});
await tick();await tick();
assert.equal(get('analytics-content').hidden,true,'Late response for old member must not rerender');
assert.equal(get('analytics-kpis').children.length,0,'Late response cannot restore old member data');
session={user:{id:'MEMBER_B'},access_token:'token-b'};
onAuth('SIGNED_IN',session);
await tick();await tick();
assert.equal(req.length,2,'Second account issues independent request');
assert.equal(req[1].opts.headers.authorization,'Bearer token-b');
req[1].resolve({ok:false,json:async()=>({ok:false,error:'Entitlement not available'})});
await tick();await tick();
assert.equal(get('analytics-content').hidden,true,'Unauthorized second member cannot reuse first result');
assert.equal(get('analytics-kpis').children.length,0);
assert(src.includes('requestCounter++'), 'Account switch invalidates prior request sequence');
assert(src.includes('sb.auth.onAuthStateChange'));
console.log('PASS private Journal UI: logout scrubs DOM, stale response cannot return, second member never inherits results.');
