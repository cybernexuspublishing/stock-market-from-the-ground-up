import assert from 'node:assert/strict';
import {fillEstimate,bracketOutcome} from '../functions/_lib/replay-engine-v01492.js';
const x={open:9.75,high:10.5,low:9.4,close:10.1,volume:10000};
let r=fillEstimate({side:'BUY',type:'LIMIT',quantity:100,limitPrice:10,slippageBps:2000,spreadBps:0,fees:1},x);
assert.equal(r.state,'ESTIMATED');
assert(r.price<=10,'BUY LIMIT may not fill ABOVE specified limit');
assert.equal(r.totalEstimatedFriction,1,'A beneficial or limit-capped price must not be counted as adverse friction');
r=fillEstimate({side:'SELL',type:'LIMIT',quantity:100,limitPrice:10,slippageBps:2000,spreadBps:0,fees:2},
 {open:10.3,high:10.8,low:9.7,close:10,volume:10000});
assert.equal(r.state,'ESTIMATED');
assert(r.price>=10,'SELL LIMIT may not fill BELOW specified limit');
assert.equal(r.totalEstimatedFriction,2);
r=fillEstimate({side:'BUY',type:'LIMIT',quantity:100,limitPrice:9,slippageBps:0},x);
assert.equal(r.state,'NOT_TRIGGERED');
r=fillEstimate({side:'BUY',type:'MARKET',quantity:100,slippageBps:100,spreadBps:100,fees:1},
 {open:10,high:11,low:9,close:10,volume:10000});
assert.equal(r.price,10.15);
assert(Math.abs(r.totalEstimatedFriction-16)<1e-9,'Market adverse friction should be vs next bar open');
r=fillEstimate({side:'BUY',type:'STOP',quantity:100,stopPrice:10,slippageBps:100,spreadBps:0,fees:2},
 {open:11,high:12,low:10.5,close:11.5,volume:10000});
assert.equal(r.price,11.11);
assert(Math.abs(r.totalEstimatedFriction-113)<1e-9,'Gap and fees count as adverse stop friction');
const both=bracketOutcome({side:'LONG',stop:9,target:11},{open:10,high:12,low:8,close:10,volume:1000});
assert.equal(both.result,'AMBIGUOUS');assert(both.requiresResolution);
console.log('PASS v93 execution: LIMIT price bounds, nonnegative adverse friction, next-open MARKET slippage, STOP gaps and ambiguous OHLC.');
