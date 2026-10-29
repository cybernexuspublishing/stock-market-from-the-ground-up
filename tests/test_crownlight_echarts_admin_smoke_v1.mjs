import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';
const lib='node_modules/echarts/dist/echarts.min.js';
assert(existsSync(lib),'Pinned Apache ECharts must be installed in CI');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:850}});
 const errors=[];page.on('pageerror',x=>errors.push(x.message));
 await page.route('**/assets/vendor/echarts/6.1.0/echarts.min.js',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:readFileSync(lib)}));
 await page.setContent('<html><head><base href="https://admin-charts-fixture.test/"></head><body><section id="admin-external-chart-engine-readiness">'+
  '<button data-ce-engine-test>Test Apache ECharts renderer</button>'+
  '<p role="status" data-ce-engine-test-status></p>'+
  '<div data-ce-engine-test-chart hidden style="height:260px;width:870px"></div>'+
  '</section></body></html>');
 for(const src of ['assets/js/crownlight-echarts-loader-v1.js','assets/js/admin-chart-engines-test-v1.js'])
  await page.addScriptTag({content:readFileSync(src,'utf8')});
 await page.locator('[data-ce-engine-test]').click();
 await page.waitForFunction(()=>window.echarts?.getInstanceByDom(document.querySelector('[data-ce-engine-test-chart]'))?.getOption()?.series?.length===1);
 const info=await page.evaluate(()=>{
  const e=window.echarts.getInstanceByDom(document.querySelector('[data-ce-engine-test-chart]'));
  return {data:e.getOption().series[0].data,kind:e.getOption().series[0].type,width:e.getWidth()};
 });
 assert.equal(info.kind,'bar');assert.deepEqual(info.data,[1,3,2,4]);assert(info.width>500);
 assert.match(await page.locator('[data-ce-engine-test-status]').innerText(),/synthetic diagnostic successfully/);
 await page.locator('[data-ce-engine-test]').click();
 assert.equal(await page.locator('[data-ce-engine-test-chart]').isHidden(),true);
 assert.equal(await page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('[data-ce-engine-test-chart]'))),undefined);
 assert.deepEqual(errors,[]);
 console.log('PASS Owner ECharts installation test: actual renderer, synthetic data, disposal, no provider calls');
}finally{await browser.close()}
