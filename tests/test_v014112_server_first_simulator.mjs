// v0.14.0.112 server-first Simulator and existing forward-only replay.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('simulator.html'),separate=read('verified-replay.html');
const mode=read('assets/js/simulator-mode-v014112.js');
const browser=read('assets/js/simulator.js');
const replay=read('assets/js/verified-replay-v01492.js');
const api=read('functions/api/learning-replay-v01492.js');
const ids=['vr-notice','vr-dataset','vr-refresh','vr-resume','vr-code','vr-start','vr-session',
 'vr-id','vr-index','vr-source','vr-visible-chart','vr-visible-count','vr-bars','vr-plan',
 'vr-decision','vr-reason','vr-side','vr-type','vr-quantity','vr-limit','vr-lock','vr-advance',
 'vr-finish','vr-execution','vr-journal-link','vr-spread','vr-slippage','vr-fees'];
for(const id of ids){
 assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'Exactly one server view field '+id);
 assert(separate.includes('id="'+id+'"'),'Standalone verified workbench must keep matching contract '+id);
}
assert(html.includes('id="sim-server-mode"')&&html.includes('id="sim-legacy-mode" hidden'),
 'Server must default visible; legacy full-candle CSV must be hidden');
assert(html.indexOf('simulator-mode-v014112.js')<html.indexOf('verified-replay-v01492.js'));
assert(html.indexOf('verified-replay-v01492.js')<html.indexOf('assets/js/simulator.js'));
assert(html.includes('id="sim-mode-server" aria-controls="sim-server-mode" aria-pressed="true"'));
assert(html.includes('id="sim-mode-csv" aria-controls="sim-legacy-mode" aria-pressed="false"'));
assert(html.includes('fictional')&&html.includes('rights')&&html.includes('client-inspectable'),
 'Market provenance and untrusted local CSV must be explicit');
assert(!browser.includes("document.addEventListener('DOMContentLoaded',init)"),
 'Legacy browser engine must no longer start automatically');
assert(browser.includes("groundup:activate-legacy-simulator"));
assert(mode.includes("window.GroundUpLegacySimulatorPause"));
assert(api.includes('rpc/v01492_replay_advance'),'Only server RPC may increment private replay cursor');
assert(api.includes('source.metadata?.licensed_for_member_display===true'),
 'Rights-cleared dataset gate must be unchanged');
assert(api.includes('gu_replay_bars_v01492?select=bar_index,bar_at,open,high,low,close,volume&dataset_code=eq.'),
 'Only current and revealed observations are queried');
assert(!mode.includes('localStorage')&&!replay.includes('localStorage'),
 'No private replay session should be persisted in unsafe browser localStorage');
// Execute actual mode selector logic with an isolated fake accessible DOM.
function elem(){
 return {hidden:false,attributes:{},classList:{toggle(name,val){this[name]=val}},
 listeners:{},setAttribute(name,v){this.attributes[name]=v},
 addEventListener(name,fn){this.listeners[name]=fn},
 querySelector(){return null}};
}
const controls=Object.fromEntries(['sim-server-mode','sim-legacy-mode',
 'sim-mode-server','sim-mode-csv','sim-mode-notice'].map(k=>[k,elem()]));
const callbacks={},events=[];let pauseCount=0;
const window={dispatchEvent:e=>events.push(e.type),GroundUpLegacySimulatorPause:()=>pauseCount++};
const document={readyState:'loading',getElementById:id=>controls[id]||null,
 addEventListener:(event,fn)=>{callbacks[event]=fn}};
runInNewContext(mode,{window,document,Event:class{constructor(type){this.type=type}},
 URLSearchParams,location:{search:''}});
callbacks.DOMContentLoaded();
assert.equal(controls['sim-server-mode'].hidden,false);
assert.equal(controls['sim-legacy-mode'].hidden,true);
assert.equal(events.length,0,'Default server mode must NOT initialize legacy CSV');
controls['sim-mode-csv'].listeners.click();
assert.equal(controls['sim-server-mode'].hidden,true);
assert.equal(controls['sim-legacy-mode'].hidden,false);
assert.deepEqual(events,['groundup:activate-legacy-simulator']);
controls['sim-mode-server'].listeners.click();
assert.equal(controls['sim-legacy-mode'].hidden,true);
assert.equal(pauseCount>=1,true,'Switching to protected replay must stop client-side playback');
controls['sim-mode-csv'].listeners.click();
assert.equal(events.length,1,'CSV engine must initialize at most once');
// Execute the original replay-client orderPlan function against a synthetic
// DOM with controlled form fields, not a fabricated provider response.
const block=replay.match(/\nfunction orderPlan\(\)\{[\s\S]*?\n\}/);
assert(block,'Existing verified replay order-plan must be testable');
const state={
 'vr-side':'BUY','vr-type':'MARKET','vr-quantity':'100','vr-limit':'',
 'vr-slippage':'15','vr-spread':'10','vr-fees':'2.50'};
const get=id=>({value:state[id]});
const orderPlan=runInNewContext('('+block[0].trim()+')',{$:get,Error,Number,NumberIsSafeInteger:Number.isSafeInteger});
const p=orderPlan();
assert.equal(p.type,'MARKET');assert.equal(p.slippageBps,15);
assert.equal(p.spreadBps,10);assert.equal(p.fees,2.5);
state['vr-type']='LIMIT';state['vr-limit']='';
assert.throws(()=>orderPlan(),/positive limit or stop/);
state['vr-limit']='7.5';assert.equal(orderPlan().limitPrice,7.5);
state['vr-type']='STOP';assert.equal(orderPlan().stopPrice,7.5);
state['vr-fees']='-1';assert.throws(()=>orderPlan(),/Spread and slippage/);
state['vr-fees']='1';state['vr-quantity']='10.5';assert.throws(()=>orderPlan(),/whole shares/);
state['vr-quantity']='10';state['vr-slippage']='2001';assert.throws(()=>orderPlan(),/basis points/);
console.log('PASS v112: server-default protected replay, explicit lazy legacy CSV, one contract on both pages, no future bars/client grading, validated friction input.');
