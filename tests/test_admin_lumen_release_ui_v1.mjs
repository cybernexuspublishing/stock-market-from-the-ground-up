import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 await page.setContent('<div id="admin-lumen-tool-offers"></div><div id="admin-lumen-item-prices"></div><div id="admin-release-register"></div>');
 await page.evaluate(()=>{
  window.__posts=[];
  window.confirm=()=>true;
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'owner-fixture',user:{id:'owner-fixture'}}}})}});
  window.fetch=async(path,options={})=>{
   const method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
   if(method==='POST')window.__posts.push({path,body});
   let data;
   if(path==='/api/owner-lumen-tool-offers'){
    if(method==='POST')data={ok:true,policy:{active_cents:7,proposed_cents:body.proposedCents||7}};
    else data={ok:true,policy:{active_cents:7,proposed_cents:7,revision:1,value_activation_state:'staged'},
     offers:[{offer_code:'WATCHLIST_WORKBENCH_30D',tool_code:'WATCHLIST_WORKBENCH',
      duration_days:30,price_cents:1999,custom_lumens_cost:null,redemption_lumens_cost:286,
      state:'draft',version:1}]};
   }else if(path==='/api/owner-lumen-item-prices'){
    if(method==='POST')data={ok:true,rule:body};
    else data={ok:true,activeCents:7,items:[{sku:'addon:TRADE_PLAN_BUILDER',
     category:'addon',display_name:'Advanced Trade-Plan Builder',status:'coming_soon',
     rule:{sku:'addon:TRADE_PLAN_BUILDER',custom_full_lumens:null,partial_discount_allowed:true,
      full_redemption_allowed:true,release_state:'draft',version:1}}]};
   }else if(path==='/api/owner-release-register'){
    if(method==='POST')data={ok:true,item:body};
    else data={ok:true,summary:{total:1,open:1,accepted:0,betaTesting:0,implemented:1},
      open:[{code:'ADVANCED_WORKBENCH',area:'Watchlists',title:'Advanced Workbench',
       phase:'implemented',version:1,missingGates:['stripe_test','member_browser'],passedGates:['github_ci'],
       gateTotal:3,nextAction:'Complete authenticated acceptance',sourcePath:'advanced-tool.html'}],
      accepted:[]};
   }else data={ok:false,error:'unexpected '+path};
   return new Response(JSON.stringify(data),{status:data.ok?200:404,headers:{'content-type':'application/json'}});
  };
 });
 for(const p of ['assets/js/admin-lumen-tool-offers-v1.js','assets/js/admin-lumen-item-prices-v1.js','assets/js/admin-release-register-v1.js'])
  await page.addScriptTag({content:source(p)});
 await page.waitForFunction(()=>document.querySelector('#admin-release-register')?.textContent.includes('1 open'));
 assert.match(await page.locator('#admin-lumen-tool-offers').textContent(),/Active value/);
 assert.match(await page.locator('#admin-lumen-item-prices').textContent(),/Advanced Trade-Plan Builder/);
 assert.match(await page.locator('#admin-release-register').textContent(),/stripe test/);
 const v=page.locator('#admin-lumen-tool-offers form').first();
 await v.locator('input').fill('9');
 await v.locator('button').click();
 await page.waitForFunction(()=>window.__posts.some(x=>x.body?.action==='propose_unit_value'));
 let writes=await page.evaluate(()=>window.__posts);
 assert.equal(writes.find(x=>x.body?.action==='propose_unit_value').body.proposedCents,9);
 const item=page.locator('#admin-lumen-item-prices form').first();
 await item.locator('input[type=number]').fill('99');
 await item.locator('button').click();
 await page.waitForFunction(()=>window.__posts.some(x=>x.body?.sku==='addon:TRADE_PLAN_BUILDER'));
 writes=await page.evaluate(()=>window.__posts);
 const save=writes.find(x=>x.body?.sku==='addon:TRADE_PLAN_BUILDER');
 assert.equal(save.body.customFullLumens,99);
 assert.equal(save.body.releaseState,'draft');
 const register=page.locator('#admin-release-register form').first();
 assert.equal(await register.locator('select option[value=beta_testing]').count(),0,
  'Owner cannot promote directly into beta by selecting a label');
 console.log('PASS simulated Owner browser pricing, global proposal, full-item SKU editing and safe open release register');
}finally{await browser.close()}
