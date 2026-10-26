import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync('store-tool-journal-analytics.html','utf8');
const sum=[120,-50,-30,0].reduce((a,b)=>a+b,0);
assert.equal(sum,40);
assert.equal(sum/4,10);
assert.equal(1/4,0.25);
assert.equal(120/(50+30),1.5);
const values=[120,70,40,40];assert.equal(Math.max(...values)-Math.min(...values.slice(1)),80);
for(const phrase of ['Fictional, illustrative outcomes','Unknown','Unresolved','25%','+$40',
  '+$10','1.50','do not substitute zero','not account-equity drawdown','Research (8)',
  'journal.html','investor.gov','R-multiple']){
 assert(page.includes(phrase),'Missing grounded research explanation: '+phrase);
}
assert(!page.includes('Guaranteed trade profits'));
assert(!page.includes('checkout.html?type=tool'));
console.log('PASS: Research (8) original example arithmetic and honest Journal beta educational scope.');
