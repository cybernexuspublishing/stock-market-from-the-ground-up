import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
class Fake{
 constructor(tag){this.tag=tag;this.textContent='';this.attributes={};this.children=[];this.className=''}
 setAttribute(k,v){this.attributes[k]=String(v)}
 append(...args){this.children.push(...args)}
 replaceChildren(...args){this.children=args}
}
const context={document:{createElement:tag=>new Fake(tag),createElementNS:(ns,tag)=>new Fake(tag)}};
context.globalThis=context;
runInNewContext(readFileSync('assets/js/lab-engine-v33-visual.js','utf8'),context);
const visual=context.GroundUpLabV33Visual;
test('candle chart updates actual price-guide values and accessible table',()=>{
 const c=visual.create('candle',32);
 assert.equal(c.wrap.children.length,2);
 let rows=c.wrap.children[1].children;
 assert.ok(rows.some(e=>e.textContent==='Real body'));
 assert.ok(rows.some(e=>e.textContent==='$1.00'));
 c.update(31.5);
 rows=c.wrap.children[1].children;
 assert.ok(rows.some(e=>e.textContent==='$0.50'));
 assert.ok(rows.some(e=>e.textContent==='25.0%'));
 assert.equal(c.wrap.children[0].attributes['aria-label'],'Fictional OHLC candlestick');
});
test('volume experiment changes VWAP and share totals with fixed prices',()=>{
 const v=visual.create('vwap',100);
 let rows=v.wrap.children[1].children;
 assert.ok(rows.some(e=>e.textContent==='$8.67'));
 v.update(300);rows=v.wrap.children[1].children;
 assert.ok(rows.some(e=>e.textContent==='$9.20'));
 assert.ok(rows.some(e=>e.textContent==='500'));
});
