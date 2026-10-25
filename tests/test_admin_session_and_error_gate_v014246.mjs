/* Admin reliability regression: fresh tokens, async load failures and non-interference with independent controllers. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const main=readFileSync('assets/js/admin.js','utf8');
const platform=readFileSync('assets/js/admin-platform.js','utf8');
const legacy=readFileSync('assets/js/admin-legacy-routing.js','utf8');

let reads=0,fail=false;
const requests=[];
const noticeHost={
 items:[],
 querySelector(){return this.items[0]||null;},
 prepend(item){this.items.unshift(item);}
};
function element(){
 return {dataset:{},children:[],append(node){this.children.push(node);},setAttribute(k,v){this[k]=v;},addEventListener(k,fn){this['on_'+k]=fn;},remove(){noticeHost.items=noticeHost.items.filter(n=>n!==this);}};
}
const document={
 addEventListener(){},
 querySelector(selector){return selector==='[data-admin-panel="dashboard"]'?noticeHost:null;},
 createElement:element,
 createTextNode:text=>({text})
};
const sandbox={
 document, URLSearchParams, Date, String, Number,
 window:{getSupabaseClient:async()=>({auth:{getSession:async()=>({data:{session:{access_token:'rotated-'+(++reads)}}})}})},
 fetch:async(url,options)=>{
  requests.push({url,authorization:options.headers.authorization});
  return {ok:!fail,status:fail?503:200,json:async()=>fail?{ok:false,error:'Service temporarily unavailable.'}:{ok:true}};
 }
};
vm.createContext(sandbox);
vm.runInContext(main,sandbox,{filename:'admin.js'});
await sandbox.api('context');
await sandbox.api('roles');
assert.equal(reads,2,'Admin requests must always retrieve current Supabase session');
assert.deepEqual(requests.map(x=>x.authorization),['Bearer rotated-1','Bearer rotated-2']);
fail=true;
await sandbox.loadPanel('dashboard');
assert.equal(noticeHost.items.length,1,'Asynchronous API failures must display one visible panel error');
assert.equal(noticeHost.items[0].role,'alert','Failure announced accessibly');
assert.equal(noticeHost.items[0].children[1].textContent,'Retry section');
await sandbox.loadPanel('dashboard');
assert.equal(noticeHost.items.length,1,'Repeated retries must not stack stale errors');
assert(main.includes("document.querySelectorAll('#admin-tabs button[data-panel]')"),'Only core tabs receive core handlers');
assert(platform.includes('const access=await auth()'),'Platform module must refresh token for every API request');
assert(platform.includes('authorization:`Bearer ${access}`'),'Platform API must use fresh token');
assert(legacy.includes('const fresh=data?.session?.access_token'),'Legacy Admin API must refresh token for every request');
console.log('PASS Admin fresh-session rotation, asynchronous retry feedback, and modular navigation isolation');
