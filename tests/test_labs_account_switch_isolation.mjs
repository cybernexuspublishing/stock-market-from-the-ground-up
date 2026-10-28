// Deterministic browser-controller regression: no real accounts, payments, or external network.
// Fixture identities and 419 Lab rows are intentionally invented TEST DATA, never market history.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync('assets/js/labs.js','utf8');
const identities={a:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 b:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 c:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 d:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'};
const elements=new Map();
function element(id){
 if(!elements.has(id)){
  elements.set(id,{id,value:'',textContent:'',innerHTML:'',dataset:{},classList:{add(){}},
   addEventListener(){},querySelectorAll(){return[]},scrollIntoView(){}});
 }
 return elements.get(id);
}
const documents={
 getElementById:element,
 addEventListener(type,handler){if(type==='DOMContentLoaded')this.ready=handler;}
};
const labId='QA-001';
const crosswalk=Object.fromEntries(Array.from({length:419},(_,i)=>[
 'QA-'+String(i+1).padStart(3,'0'),
 {bookCode:'SITE_EXCLUSIVE',title:'Private account fixture '+(i+1),
  relatedCompetencies:['QA_EDUCATION']}
]));
const savedByUser={
 [identities.a]:[{lab_id:labId,status:'completed',completed_at:'2026-10-26T01:00:00Z'},
  {lab_id:'QA-002',status:'completed',completed_at:'2026-10-26T01:00:00Z'}],
 [identities.b]:[{lab_id:labId,status:'in_progress',updated_at:'2026-10-26T01:10:00Z'}],
 [identities.c]:[{lab_id:labId,status:'completed',completed_at:'2026-10-26T01:20:00Z'}],
 [identities.d]:[]
};
const deferrals=new Map();
let current=identities.a,callback=null;
const supabase={
 auth:{
  getUser:async()=>({data:{user:current?{id:current}:null}}),
  getSession:async()=>({data:{session:current?{access_token:'fixture-'+current,user:{id:current}}:null}}),
  onAuthStateChange(cb){callback=cb;return {data:{subscription:{unsubscribe(){}}}}}
 },
 from(table){
  assert.equal(table,'lab_progress');
  return {
   select(cols){
    assert(!cols.includes('answer_key'),'Do not query secret grading data');
    return {eq(key,userId){
     assert.equal(key,'user_id','Every progress read must be scoped to an identity');
     return deferrals.has(userId)?deferrals.get(userId).promise:
      Promise.resolve({data:savedByUser[userId]||[],error:null});
    }};
   }
  };
 }
};
const context={
 document:documents,
 window:{getSupabaseClient:async()=>supabase,location:{search:''},setTimeout(){}},
 loadJSON:async path=>{
  if(path==='data/labs.json')return[];
  if(path==='data/competency-lab-paths-v01499.json')return{totalCanonicalLabs:419,byLab:crosswalk};
  throw Error('Unexpected fixture source: '+path);
 },
 fetch:async(url,opts={})=>{
  if(url==='/api/lab-release-availability')
   return {ok:true,json:async()=>({ok:true,publishedIds:[labId],guidedBetaIds:['QA-002']})};
  if(url==='/api/lab-beta-scope')return {ok:false,json:async()=>({ok:false})};
  if(url==='/api/lab-registry-access'){
   const token=String(opts.headers?.authorization||'');
   assert(/^Bearer fixture-[a-d]{8}-/.test(token),'Registry rights require a member session');
   return {ok:true,json:async()=>({ok:true,freeEligible:true,
    interactive:false,training:true,bookCodes:[],freeSampleIds:[]})};
  }
  throw Error('Unexpected registry request: '+url);
 },
 URLSearchParams,Map,Set,Promise,Date,Error,Array,String,Object,Number,console
};
vm.runInNewContext(source,context,{filename:'assets/js/labs.js'});
assert.equal(typeof documents.ready,'function');
await documents.ready();
async function tick(){await new Promise(resolve=>setImmediate(resolve));}
await tick();
assert.match(element('lab-body').innerHTML,/data-status="completed"/);
assert.match(element('lab-body').innerHTML,/Self-tracked complete/);
assert.match(element('lab-body').innerHTML,/Saved self-tracked Lab activity · ungraded, no mastery credit/,
 'Returning members must see saved guided practice without false mastery');
assert.match(element('lab-body').innerHTML,/row-QA-002" data-status="completed"/);

current=identities.b;
callback('SIGNED_IN',{user:{id:current}});
assert.doesNotMatch(element('lab-body').innerHTML,/data-status="completed"/,
 'Old account progress must disappear synchronously when auth changes');
assert.doesNotMatch(element('lab-body').innerHTML,/Saved self-tracked Lab activity · ungraded, no mastery credit/,
 'Previous member guided practice must not be visible to the new user');
await tick();
assert.match(element('lab-body').innerHTML,/data-status="in_progress"/);
assert.doesNotMatch(element('lab-body').innerHTML,/data-status="completed"/);

// Test a stale delayed previous-member response after a subsequent switch.
let release;
const pending=new Promise(resolve=>{release=resolve});
deferrals.set(identities.c,{promise:pending});
current=identities.c;
callback('SIGNED_IN',{user:{id:current}});
assert.doesNotMatch(element('lab-body').innerHTML,/data-status="in_progress"/);
current=identities.d;
callback('SIGNED_IN',{user:{id:current}});
await tick();
release({data:savedByUser[identities.c],error:null});
await tick();
assert.doesNotMatch(element('lab-body').innerHTML,/data-status="completed"/,
 'Late previous-member response must never overwrite a new account');
assert.doesNotMatch(element('lab-body').innerHTML,/data-status="in_progress"/);
assert.match(element('lab-body').innerHTML,/data-status="not_started"/);

current='';
callback('SIGNED_OUT',null);
assert.doesNotMatch(element('lab-body').innerHTML,/data-status="completed"|data-status="in_progress"/);
assert.match(element('lab-body').innerHTML,/Sign in to track progress/);
assert.doesNotMatch(source,/localStorage|sessionStorage/);
console.log('PASS Lab account switch: immediate DOM scrub, separate member progress, late response ignored, sign-out clears');
