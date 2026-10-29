/* Static publication, browser, and licensing guard for production ECharts.
 * Must not require external CDN at runtime or ship proprietary TV code.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const load=readFileSync('assets/js/crownlight-echarts-loader-v1.js','utf8');
const build=readFileSync('scripts/build-pages.sh','utf8');
const expected='/assets/vendor/echarts/6.1.0/echarts.min.js';
assert(load.includes(expected));
assert(!load.includes('cdn.jsdelivr'));
assert(build.includes('echarts@6.1.0'));
assert(build.includes('LICENSE'));
assert(build.includes(expected));
const dist='node_modules/echarts/dist/echarts.min.js';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600}});
 const requested=[];
 await page.route('**/*',route=>{
  const u=route.request().url();
  requested.push(u);
  if(u.endsWith(expected))return route.fulfill({
   status:200,contentType:'application/javascript',body:readFileSync(dist)});
  return route.abort();
 });
 await page.setContent('<html><head><base href="https://chart-fixture.test/"></head><body></body></html>');
 await page.addScriptTag({content:load});
 const info=await page.evaluate(async()=>{
  const a=await Promise.all([CrownlightECharts.load(),CrownlightECharts.load()]);
  return {same:a[0]===a[1],version:CrownlightECharts.version,
   asset:CrownlightECharts.assetUrl,hasRenderer:typeof a[0].init==='function'};
 });
 assert.equal(info.same,true);
 assert.equal(info.asset,expected);
 assert.equal(info.hasRenderer,true);
 assert.equal(info.version,'6.1.0');
 assert.deepEqual(requested,['https://chart-fixture.test'+expected]);
 console.log('PASS self-hosted ECharts loader: pinned asset, same-origin, single request, Apache license build guard');
}finally{await browser.close()}
