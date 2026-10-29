import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const src=readFileSync('assets/js/crownlight-chart-tiers-v1.js','utf8');
const admin=readFileSync('assets/js/admin-chart-studio-menu-v1.js','utf8');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const origin='https://tier-menu-fixture.test';
try{
 for(const [visible,allowed,expectedOptions,expectedEnabled] of [
  [['STANDARD','PROFESSIONAL'],['STANDARD'],['STANDARD','PROFESSIONAL'],['STANDARD']],
  [['PROFESSIONAL'],['STANDARD','ADVANCED','PROFESSIONAL'],['PROFESSIONAL'],['PROFESSIONAL']],
  [['ADVANCED','PROFESSIONAL'],['STANDARD'],['ADVANCED','PROFESSIONAL'],[]],
  [['STANDARD','ADVANCED','PROFESSIONAL'],['STANDARD','ADVANCED'],['STANDARD','ADVANCED','PROFESSIONAL'],['STANDARD','ADVANCED']]
 ]){
  const page=await browser.newPage({viewport:{width:1190,height:820}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/'&&u.origin===origin)return route.fulfill({status:200,contentType:'text/html',body:'<html><body></body></html>'});
   if(u.pathname==='/api/chart-studio-menu')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,visible})});
   if(u.pathname==='/api/chart-tier-access')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,eligible:true,allowed,tier:allowed.at(-1)})});
   return route.abort();
  });
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.setContent('<html><body><section class="sim-chart-panel"><div class="crownlight-shell"><div class="crownlight-plot">Standard chart</div></div></section></body></html>');
  await page.evaluate(()=>{
   window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{
    user:{id:'11111111-1111-4111-8111-111111111111'},access_token:'synthetic'}}}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}});
  });
  await page.addScriptTag({content:src});
  await page.waitForFunction(()=>window.CrownlightChartTiers?.getStatus()?.verified===true);
  const options=await page.locator('.cl-chart-tier-bar select option').evaluateAll(a=>a.filter(x=>!!x.value).map(x=>x.value));
  const enabled=await page.locator('.cl-chart-tier-bar select option:not([disabled])').evaluateAll(a=>a.map(x=>x.value));
  assert.deepEqual(options,expectedOptions);
  assert.deepEqual(enabled,expectedEnabled);
  const info=await page.evaluate(()=>window.CrownlightChartTiers.getStatus());
  assert.deepEqual(info.allowed,allowed,'Hiding cannot rewrite entitlements');
  assert.deepEqual(info.visible,visible,'Menu does not invent options');
  assert.deepEqual(errors,[]);
  await page.close();
 }
 const page=await browser.newPage();
 await page.setContent('<html><body><section id="admin-chart-studio-menu-control" hidden><div data-chart-menu-options></div><button data-chart-menu-save></button><a data-chart-menu-preview></a><p data-chart-menu-status></p></section></body></html>');
 await page.evaluate(()=>{
  window.__saved=null;
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'owner-fixture'}}})}});
  window.fetch=async(url,opts={})=>{
   const action=new URL(url,'https://mock-admin.test').searchParams.get('action');
   const data=action==='context'?{ok:true,roles:['OWNER']}:
     action==='settings'?{ok:true,settings:[{setting_key:'feature.crownlight_chart_studio_menu_v1',
       value:{visible:['STANDARD','ADVANCED','PROFESSIONAL']}}]}:
     action==='setting_save'?(window.__saved=JSON.parse(opts.body),{ok:true}):{ok:false};
   return new Response(JSON.stringify(data),{status:data.ok?200:400,headers:{'content-type':'application/json'}});
  };
 });
 await page.addScriptTag({content:admin});
 await page.waitForFunction(()=>!document.querySelector('#admin-chart-studio-menu-control').hidden);
 const check=page.locator('[data-chart-menu-tier]');assert.equal(await check.count(),4);
 await page.locator('[data-chart-menu-tier="ADVANCED"]').uncheck();
 await page.locator('[data-chart-menu-save]').click();
 await page.waitForFunction(()=>window.__saved!==null);
 assert.deepEqual((await page.evaluate(()=>window.__saved)).value.visible,['STANDARD','PROFESSIONAL','ECHARTS']);
 await page.locator('[data-chart-menu-tier="STANDARD"]').uncheck();
 await page.locator('[data-chart-menu-tier="PROFESSIONAL"]').uncheck();
 await page.locator('[data-chart-menu-tier="ECHARTS"]').uncheck();
 assert.equal(await page.locator('[data-chart-menu-save]').isDisabled(),true);
 console.log('PASS Chromium: 4-view dropdown visibility, locked membership, Owner saves, cannot hide all');
}finally{await browser.close()}
