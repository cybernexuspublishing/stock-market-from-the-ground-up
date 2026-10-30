import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {execFileSync} from 'node:child_process';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
for(const name of ['assets/js/trade-plan-order-lifecycle-v1.js','assets/js/advanced-trade-plan-v1.js'])
 execFileSync(process.execPath,['--check',new URL('../'+name,import.meta.url).pathname]);
const window={};
runInNewContext(read('assets/js/trade-plan-order-lifecycle-v1.js'),{window});
const engine=window.GroundUpTradePlanOrderLifecycleV1;
assert.equal(engine.version,'1.0');
assert.equal(typeof engine.mount,'function');
const start=Date.now()-3600000;
const events=(...actions)=>actions.map(([type,shares,price],i)=>({
 type,shares,price,at:new Date(start+i*1000).toISOString()}));
const execute=(actions,quantity=124,direction='LONG')=>engine.replay({events:actions,quantity,direction});
assert.equal(execute(events(['SUBMIT'],['ACCEPT'],['FILL',124,5.01])).state,'FILLED');
assert.equal(execute(events(['SUBMIT'],['ACCEPT'],['FILL',124,5.01])).remaining,0);
const partial=execute(events(['SUBMIT'],['ACCEPT'],['PARTIAL_FILL',40,5.01],
 ['CANCEL_REQUEST'],['PARTIAL_FILL',20,5.02],['CANCEL_ACK']));
assert.equal(partial.ok,true);
assert.equal(partial.state,'CANCELED');
assert.equal(partial.filled,60,'Cancellation may race with further fills');
assert.equal(partial.remaining,64);
assert.equal(partial.averageFill,5.013333);
assert.equal(partial.totalNotional,300.8);
assert.equal(partial.history[3].state,'PENDING_CANCEL');
assert.equal(partial.history[4].state,'PENDING_CANCEL');
assert.equal(execute(events(['SUBMIT'],['REJECT'])).state,'REJECTED');
assert.equal(execute(events(['SUBMIT'],['ACCEPT'],['EXPIRE'])).state,'EXPIRED');
assert.equal(execute(events(['SUBMIT'],['ACCEPT'],['CANCEL_ACK'])).ok,false,
 'A cancellation without a pending request must not be modeled as complete');
assert.equal(execute(events(['SUBMIT'],['ACCEPT'],['PARTIAL_FILL',124,5])).ok,false,
 'An entire fill cannot be presented as partial');
assert.equal(execute(events(['SUBMIT'],['ACCEPT'],['FILL',123,5])).ok,false,
 'A complete fill requires all remaining shares');
assert.equal(execute(events(['SUBMIT'],['ACCEPT'],['PARTIAL_FILL',125,5])).ok,false,
 'Overfills must be rejected');
assert.equal(execute(events(['SUBMIT'],['ACCEPT'],['PARTIAL_FILL',4.2,5])).ok,false,
 'Fractional educational stock shares must be rejected in this scenario');
assert.equal(execute(events(['SUBMIT'],['ACCEPT'],['PARTIAL_FILL',10,-5])).ok,false);
assert.equal(execute(events(['SUBMIT'],['ACCEPT'],['CANCEL_REQUEST'],['FILL',124,5])).state,'FILLED',
 'A complete fill can arrive before cancellation acknowledgement');
assert.equal(execute(events(['SUBMIT'],['REJECT'],['ACCEPT'])).ok,false);
assert.equal(execute(events(['SUBMIT'],['ACCEPT'],['FILL',124,5],['EXPIRE'])).ok,false);
assert.equal(execute(events(['ACCEPT'])).ok,false);
const descending=events(['SUBMIT'],['ACCEPT']);
descending[1].at=new Date(start-1000).toISOString();
assert.equal(execute(descending).ok,false,'No backward event chronology');
const future=events(['SUBMIT']);future[0].at=new Date(Date.now()+600000).toISOString();
assert.equal(execute(future).ok,false,'No future-dated event claims');
assert.equal(execute(events([]),0).ok,false,'No zero quantity');
const html=read('advanced-tool.html'),planner=read('assets/js/advanced-trade-plan-v1.js');
assert.match(html,/trade-plan-order-lifecycle-v1\.js/);
assert.match(planner,/GroundUpTradePlanOrderLifecycleV1/);
assert.match(planner,/\['orders','3\. Order Lifecycle'\]/);
const code=read('assets/js/trade-plan-order-lifecycle-v1.js');
assert.doesNotMatch(code,/localStorage|sessionStorage|fetch\s*\(/,
 'The manual educational model must never store data or send broker requests');
assert.match(code,/All events and fills are member-entered hypothetical scenarios/);
console.log('PASS educational order lifecycle: accepted / partial / cancel race / reject / expire / chronology / no overfill / no persisted order');
