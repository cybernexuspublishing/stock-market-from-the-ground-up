import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
// Existing visual source renders complete HTML strings. This fixture captures
// real resulting markup without incorrectly pretending innerHTML parses child nodes.
class Fake{
 constructor(tag){this.tag=tag;this.textContent='';this.innerHTML='';this.attributes={};this.children=[];this.className=''}
 setAttribute(k,v){this.attributes[k]=String(v)}
 append(...args){this.children.push(...args)}
 replaceChildren(...args){this.children=args}
 querySelector(){return null}
}
const context={document:{createElement:tag=>new Fake(tag),createElementNS:(ns,tag)=>new Fake(tag)}};
context.globalThis=context;
runInNewContext(readFileSync('assets/js/lab-engine-v33-visual.js','utf8'),context);
const visual=context.GroundUpLabV33Visual;
test('candle chart updates real body and range calculations in accessible displayed markup',()=>{
 const c=visual.create('candle',32);
 assert.match(c.wrap.innerHTML,/Real body: \$1\.00/);
 assert.match(c.wrap.innerHTML,/Full range: \$2\.00/);
 assert.match(c.wrap.innerHTML,/Body percentage: 50\.0%/);
 assert.match(c.wrap.innerHTML,/aria-label="Bullish candle with labeled Open High Low Close price levels"/);
 assert.match(c.wrap.innerHTML,/Show accessible OHLC table/);
 c.update(31.5);
 assert.match(c.wrap.innerHTML,/Real body: \$0\.50/);
 assert.match(c.wrap.innerHTML,/Body percentage: 25\.0%/);
 assert.match(c.wrap.innerHTML,/CLOSE \$31\.50/);
});
test('volume experiment changes the displayed VWAP and share totals for fixed prices',()=>{
 const v=visual.create('vwap',100);
 assert.match(v.wrap.innerHTML,/\$8\.67/);
 v.update(300);
 assert.match(v.wrap.innerHTML,/\$9\.20/);
 assert.match(v.wrap.innerHTML,/500 shares/);
});
