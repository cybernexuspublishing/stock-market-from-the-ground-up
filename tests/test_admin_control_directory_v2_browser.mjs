import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const source=readFileSync('assets/js/admin-control-directory-v1.js','utf8');
assert(source.includes("false,'/admin-operations.html'"),'Lab Library must use a link, not a truthy Owner flag');
assert(!source.includes("'Lab Registry Management','/admin-operations.html']"));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const origin='https://admin-directory.fixture';
const html=`<!doctype html><html><head><style>.cc-owner-hidden{display:none}</style></head><body>
<div id="admin-gate" hidden></div><div id="admin-app"><section class="admin-panel active" id="dashboard-panel">Today panel</section></div>
<nav id="admin-tabs">
  <div data-cc-nav-group="Overview"><button data-panel="dashboard">Today</button></div>
  <div data-cc-nav-group="Commerce"><button data-panel="products">Products &amp; Prices</button></div>
  <div data-cc-nav-group="Website Management">
    <button id="installed-new-control">Taxonomy Override Console</button>
    <button id="private-control" hidden>Secret Root Debugger</button>
    <button id="not-authorized" disabled>Forbidden Feature Toggle</button>
    <details class="cc-group-more"><summary>More</summary><button id="legacy-more-control">Lesser-Known Authoring Tool</button></details>
  </div>
  <div data-cc-nav-group="Security &amp; Governance"><button id="audit-nav-control">Audit Privilege Console</button></div>
</nav></body></html>`;
try{
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(origin+'/**',route=>{
   const path=new URL(route.request().url()).pathname;
   route.fulfill({status:200,contentType:'text/html',body:path==='/admin.html'?html:'<!doctype html><title>Authorized standalone page</title>'});
 });
 await page.goto(origin+'/admin.html');
 await page.evaluate(()=>{
  window.ADMIN={ctx:{roles:['OWNER']}};
  window.__directoryClicked=[];
  for(const id of ['installed-new-control','legacy-more-control','audit-nav-control']){
   document.getElementById(id).addEventListener('click',()=>window.__directoryClicked.push(id));
  }
 });
 await page.addScriptTag({content:source});
 await page.evaluate(()=>window.GroundUpAdminDirectory.open('Taxonomy Override'));
 await page.locator('#cc-directory-results').getByRole('button',{name:'Taxonomy Override Console'}).click();
 assert.deepEqual(await page.evaluate(()=>window.__directoryClicked),['installed-new-control']);
 await page.evaluate(()=>window.GroundUpAdminDirectory.open('Secret Root Debugger'));
 assert.equal(await page.locator('#cc-directory-results').getByRole('button',{name:'Secret Root Debugger'}).count(),0,
   'A hidden nav control must not be discoverable');
 await page.evaluate(()=>window.GroundUpAdminDirectory.open('Forbidden Feature Toggle'));
 assert.equal(await page.locator('#cc-directory-results').getByRole('button',{name:'Forbidden Feature Toggle'}).count(),0);
 await page.evaluate(()=>window.GroundUpAdminDirectory.open('Lesser-Known Authoring'));
 await page.locator('#cc-directory-results').getByRole('button',{name:'Lesser-Known Authoring Tool'}).click();
 assert.equal(await page.locator('details.cc-group-more').getAttribute('open'),'',
   'Directory must expand more-menu before clicking the original authorized module');
 assert.deepEqual(await page.evaluate(()=>window.__directoryClicked),
  ['installed-new-control','legacy-more-control']);
 await page.evaluate(()=>window.GroundUpAdminDirectory.open('Late-installed Control'));
 await page.evaluate(()=>{
  const b=document.createElement('button');b.type='button';
  b.id='later-admin-tool';b.textContent='Late-installed Control';
  b.addEventListener('click',()=>window.__directoryClicked.push(b.id));
  document.querySelector('[data-cc-nav-group="Website Management"]').append(b);
 });
 await page.locator('#cc-directory-results').getByRole('button',{name:'Late-installed Control'}).waitFor({timeout:3000});
 await page.locator('#cc-directory-results').getByRole('button',{name:'Late-installed Control'}).click();
 assert.deepEqual(await page.evaluate(()=>window.__directoryClicked),
  ['installed-new-control','legacy-more-control','later-admin-tool']);
 await page.evaluate(()=>{
  document.getElementById('later-admin-tool').hidden=true;
  window.GroundUpAdminDirectory.open('Late-installed Control');
 });
 assert.equal(await page.locator('#cc-directory-results').getByRole('button',{name:'Late-installed Control'}).count(),0,
  'Auth-denied controls must disappear immediately from search');
 await page.evaluate(()=>{
  window.ADMIN.ctx.roles=['SHOWCASE_VIEWER'];
  window.GroundUpAdminDirectory.open('Audit Privilege Console');
 });
 assert.equal(await page.locator('#cc-directory-results').getByRole('button',{name:'Audit Privilege Console'}).count(),0,
  'Showcase Viewer must not discover Security & Governance modules');
 await page.evaluate(()=>{
  window.ADMIN.ctx.roles=['MODERATOR'];
  window.GroundUpAdminDirectory.open('Lab Library');
 });
 await page.locator('#cc-directory-results').getByRole('button',{name:'Lab Library'}).click();
 await page.waitForURL(origin+'/admin-operations.html',{timeout:4000});
 assert.deepEqual(errors,[]);
 console.log('PASS Admin finder: repaired Lab Library deep link, live installed modules, late module injection, user-visible role filtering, hidden/disabled controls and collapsed More actions');
}finally{await browser.close()}
