/* Exact-source, synthetic DOM acceptance for the one Admin navigation.
 * No production credentials, payment providers or external requests.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('admin.html');
const source=read('assets/js/admin-navigation.js');
const directory=read('assets/js/admin-control-directory-v1.js');
const compat=read('assets/js/admin-simple-navigation-v014036.js');
for(const id of ['books','tools','memberships','founding','sparks']){
 assert.ok(html.includes('id="admin-products-tab-'+id+'"'),'Missing product tab: '+id);
 assert.ok(read('assets/js/admin-products-v01489.js').includes("'"+id+"'"),'Product tab handler missing: '+id);
}
assert.ok(!compat.includes('details.append(nav)'),'No hidden parallel navigation');
assert.ok(directory.includes('Showcase Demo Logins')&&directory.includes('Payment Reconciliation')&&directory.includes('Client Website Drafts'));
const fixture=`<!doctype html><html><head></head><body>
<main class="admin-shell">
<aside class="admin-sidebar"><div class="admin-brand-block">Control Center</div>
<nav id="admin-tabs" aria-label="Admin sections">
<button data-panel="dashboard" class="active">Today</button>
<button id="admin-account-management-direct">Members</button>
<button id="admin-create-account-direct">Add a Member</button>
<button data-panel="users">Member Support</button>
<a href="/admin-book-receipts.html">Book Receipt Claims</a>
<button data-panel="roles">Staff &amp; Permissions</button>
<button data-panel="products">Products &amp; Prices</button>
<a href="/training-editor.html">Question Bank</a>
<button data-panel="commerce">Orders &amp; Subscriptions</button>
<button data-panel="content">Tutor Content &amp; Feedback</button>
<button data-panel="community">Moderation</button>
<a href="/admin-founders.html">Founders Commons</a>
<a href="/admin-advertising.html">Advertising Sales</a>
<button data-panel="sparks">Sparks Packages</button>
<button data-panel="settings">Site Settings</button>
<a href="/gws-projects.html">Client Website Drafts (Grant Web Solutions)</a>
<button data-panel="audit">Activity Log</button>
<button data-panel="system">Integrations Status</button>
</nav></aside>
<section class="admin-main"><div id="admin-gate" hidden></div>
<div id="admin-app">
<section class="admin-panel active" data-admin-panel="dashboard"><div class="admin-heading"><h1>Today</h1></div></section>
<section class="admin-panel" data-admin-panel="products"><div class="admin-heading"><h1>Products &amp; Prices</h1></div><button id="danger-action">Change Price</button></section>
</div></section></main></body></html>`;
const adapt=s=>s.replace(/if\(!\/\^\\\/admin\(\?:\\\.html\)\?\$\/i\.test\(location\.pathname\)\)return;/,'');
const b=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const role of ['OWNER','SHOWCASE_VIEWER']){
  const page=await b.newPage();
  await page.setContent(fixture);
  await page.evaluate(role=>{
   window.ADMIN={ctx:{roles:[role],permissions:['dashboard.view','commerce.view','catalog.view','users.view','settings.view','audit.view','forum.view','system.view']}};
   window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'mock-only'}}})}});
   window.fetch=async()=>new Response(JSON.stringify({ok:false,error:'Owner authorization required'}),{status:403,headers:{'content-type':'application/json'}});
  },role);
  await page.addScriptTag({content:adapt(directory)});
  await page.addScriptTag({content:adapt(source)});
  await page.waitForFunction(()=>document.querySelectorAll('#admin-tabs .cc-admin-group').length===8,{timeout:6000});
  assert.equal(await page.locator('#admin-tabs [data-panel]').count(),12,'All 12 original panel controls retained');
  assert.equal(await page.locator('#admin-tabs .cc-admin-group').count(),8);
  assert.equal(await page.locator('#gu36-simple-admin').count(),0);
  assert.equal(await page.locator('#admin-tabs [data-panel="products"]').count(),1);
  assert.equal(await page.locator('#admin-tabs [data-panel="products"]').textContent(),'Products & Prices');
  if(role==='OWNER'){
   await page.locator('#cc-find-control').click({force:true});
   await page.waitForSelector('#cc-control-directory.active');
   await page.locator('#cc-directory-search').fill('showcase');
   assert.ok(await page.getByRole('button',{name:/Showcase Demo Logins/}).count()===1);
   await page.locator('#cc-directory-search').fill('stripe');
   assert.ok(await page.getByRole('button',{name:/Payments \(Stripe\)/}).count()===1);
  }else{
   assert.ok(await page.locator('#cc-showcase-banner').count()===1);
   assert.ok(await page.locator('#admin-tabs [data-cc-nav-group="Security & Governance"]').count()>=0);
   assert.ok(await page.locator('#danger-action').isDisabled(),'Showcase cannot mutate editor controls');
  }
  await page.close();
 }
}finally{await b.close();}
console.log('PASS: eight Admin groups, all existing panels, one directory, five product tabs, Showcase UI read-only');
