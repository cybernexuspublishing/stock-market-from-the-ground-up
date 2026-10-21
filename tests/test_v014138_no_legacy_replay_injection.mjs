/* v0.14.0.138r1 — No legacy phantom 6th Store membership card.
 * Regression models the previously failing historical enhancer, without a
 * Supabase network call, private records, fake payments or customer session.
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../assets/js/commerce-presentation.js',import.meta.url),'utf8');
assert(!src.includes('async function addStore()'),'The obsolete Store replay card injector must remain retired');
assert(!src.includes("node.append(el)"),'Legacy enhancement must not append a second membership card');

function sandbox(pathname){
 let timers=0,dbCalls=0,appends=0,enhanced=0,scheduled=null;
 const rows=pathname==='/membership.html'?[{
  dataset:{},textContent:'Historical Replay Learning — Monthly',
  querySelectorAll(selector){
   assert.equal(selector,'li');
   return [{textContent:''},{textContent:''},{textContent:''}];
  },
  querySelector(selector){
   assert.equal(selector,'a.btn');
   return {textContent:'',getAttribute(){return ''},setAttribute(){}};
  }
 }]:[];
 const document={
  readyState:'complete',
  querySelector(selector){
   if(selector==='#store-plans')return {append(){appends++}};
   if(selector==='#membership-plans .v11-plan')return rows[0]||null;
   return null;
  },
  querySelectorAll(selector){
   if(selector==='#membership-plans .v11-plan')return rows;
   return [];
  },
  addEventListener(){throw Error('Unexpected DOMContentLoaded listener for completed fixture')}
 };
 const window={getSupabaseClient:async()=>{dbCalls++;throw Error('No private DB calls allowed');}};
 const setInterval=(cb,time)=>{timers++;assert.equal(time,250);scheduled=cb;return 1};
 const clearInterval=()=>{enhanced++};
 vm.runInNewContext(src,{window,document,location:{pathname},
  setInterval,clearInterval,setTimeout:()=>{},console});
 if(scheduled)scheduled(); // simulate real next-tick timer after const timer initializes
 return {timers,dbCalls,appends,enhanced,rows};
}
const store=sandbox('/store.html');
assert.equal(store.timers,0,'Store may not schedule legacy membership DOM writes');
assert.equal(store.appends,0,'Canonical Store must own its own five membership cards');
assert.equal(store.dbCalls,0,'Removed injector must not query private Supabase');
const member=sandbox('/membership.html');
assert.equal(member.timers,1,'Existing membership copy enhancer remains present');
assert.equal(member.dbCalls,0,'Membership copy enhancement remains client text-only');
assert.equal(member.appends,0,'Membership copy must not duplicate Store cards');
assert.equal(member.rows[0].dataset.v1354Replay,'1','Existing replay education disclosure preserved');
console.log('PASS v138r1: canonical Store owns approved five plans; obsolete sixth ONDEMAND injected card retired; membership copy retained');
