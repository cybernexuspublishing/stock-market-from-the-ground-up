import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
class Fake{
 constructor(tag){this.tag=tag;this.innerHTML='';this.className=''}
 querySelector(){return null}
}
const context={document:{createElement:tag=>new Fake(tag)}};
context.globalThis=context;
runInNewContext(readFileSync('assets/js/lab-engine-v33-visual.js','utf8'),context);
const visual=context.GroundUpLabV33Visual;
test('candle chart updates displayed OHLC and accessible table',()=>{
 const c=visual.create('candle',32);
 assert.match(c.wrap.innerHTML,/aria-label="Bullish candle with labeled Open High Low Close price levels"/);
 assert.match(c.wrap.innerHTML,/Show accessible OHLC table/);
 assert.match(c.wrap.innerHTML,/OPEN \$31\.00/);
 assert.match(c.wrap.innerHTML,/CLOSE \$32\.00/);
 c.update(31.5);
 assert.match(c.wrap.innerHTML,/CLOSE \$31\.50/);
 assert.match(c.wrap.innerHTML,/Synthetic example/);
});
test('volume experiment changes VWAP and share totals with fixed prices',()=>{
 const v=visual.create('vwap',100);
 assert.match(v.wrap.innerHTML,/\$8\.67/);
 v.update(300);
 assert.match(v.wrap.innerHTML,/\$9\.20/);
 assert.match(v.wrap.innerHTML,/500 shares/);
});
