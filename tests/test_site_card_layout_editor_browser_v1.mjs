import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const host='https://layout-fixture.test',records=new Map();let writes=0;
function fixture(auth){return ['<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<style>*{box-sizing:border-box}body{margin:0;background:#0b1429;color:white;font:16px system-ui}main{max-width:1100px;margin:auto;padding:20px}.cards{display:flex;flex-direction:column;gap:10px}.card{border:1px solid #446;min-height:110px;background:#182742;padding:15px;border-radius:12px}</style>',
'<link rel="stylesheet" href="/assets/css/crownlight-site-layout-editor-v1.css"></head><body>',
'<main><div class="cards"><article id="study-card" class="card"><h2>Study</h2><p>Lesson card</p></article><section id="chart-landmark" aria-label="Chart and replay controls">Chart stays between cards</section><article id="metrics-card" class="card"><h2>Metrics</h2></article></div></main>',
auth?'<script>window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:"staff-test-token"}}})}})</script>':'<script>window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:null}})}})</script>',
'<script src="/assets/js/crownlight-site-layout-editor-v1.js"></script></body></html>'].join('')}
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{for(const authorized of [false,true]){
 const ctx=await browser.newContext({viewport:{width:1000,height:700},locale:'en-US'});const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());if(u.origin!==host)return route.abort();
  if(u.pathname==='/fixture.html')return route.fulfill({status:200,contentType:'text/html',body:fixture(authorized)});
  if(u.pathname.startsWith('/assets/'))return route.fulfill({status:200,contentType:u.pathname.endsWith('.css')?'text/css':'application/javascript',body:readFileSync(join(root,u.pathname.slice(1)))});
  if(u.pathname==='/api/site-card-layout'){
   if(req.method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,page:'fixture',canEdit:authorized&&!!req.headers().authorization,items:[...records.values()]})});
   const payload=req.postDataJSON();assert(authorized,'Unprivileged browser must never write');writes++;
   if(req.method()==='DELETE')records.delete(payload.cardKey);else records.set(payload.cardKey,{card_key:payload.cardKey,width_pct:payload.widthPct,min_height_px:payload.minHeightPx,sort_index:payload.sortIndex,offset_x_px:payload.offsetXPx,offset_y_px:payload.offsetYPx});
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,saved:true})});
  }return route.fulfill({status:404,body:''});
 });
 try{await page.goto(host+'/fixture.html',{waitUntil:'load'});
  if(!authorized){assert.equal(await page.locator('#gu-layout-toggle').count(),0);assert.equal(await page.locator('.gu-layout-controls').count(),0);continue}
  await page.locator('#gu-layout-toggle').waitFor({state:'visible'});
  assert.deepEqual(await page.locator('.cards').evaluate(el=>[...el.children].map(x=>x.id)),['study-card','chart-landmark','metrics-card'],
   'The import card must not move past a chart before editing');
  await page.locator('#gu-layout-toggle').click();
  assert.equal(await page.locator('#gu-layout-toggle').getAttribute('aria-pressed'),'true');
  const handle=page.locator('#study-card .gu-layout-resize'),bbox=await handle.boundingBox();assert(bbox);
  await page.mouse.move(bbox.x+bbox.width/2,bbox.y+bbox.height/2);await page.mouse.down();
  await page.mouse.move(bbox.x+bbox.width/2-120,bbox.y+bbox.height/2+45,{steps:8});await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('#gu-layout-feedback')?.textContent?.includes('saved'));
  assert(writes>=1,'Resize saves after pointer release');assert(records.has('id:study-card'));
  const beforeCornerWrites=writes;
  const corner=page.locator('#study-card .gu-layout-corner');
  assert.equal(await corner.isVisible(),true,'Bottom-right whole-card resize grip visible');
  const grip=await corner.boundingBox();assert(grip);
  await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);
  await page.mouse.down();
  await page.mouse.move(grip.x+grip.width/2-90,grip.y+grip.height/2+60,{steps:12});
  assert.equal(writes,beforeCornerWrites,'No server writes until pointer released');
  await page.mouse.up();
  await page.waitForFunction(n=>document.querySelector('#gu-layout-feedback')?.textContent?.includes('saved'),null,{timeout:5000});
  assert(writes>beforeCornerWrites,'Bottom-right grip should persist resized dimensions on mouse release');
  assert.equal(await page.locator('#study-card').evaluate(e=>getComputedStyle(e).height.endsWith('px')),true);

  const beforeMoveWrites=writes;
  const move=page.locator('#study-card .gu-layout-move'),moveBox=await move.boundingBox();
  assert(moveBox,'Move card control must be visible');
  await page.mouse.move(moveBox.x+moveBox.width/2,moveBox.y+moveBox.height/2);
  await page.mouse.down();
  await page.mouse.move(moveBox.x+moveBox.width/2,moveBox.y+moveBox.height/2+75,{steps:12});
  assert.equal(writes,beforeMoveWrites,'Move must not write until pointer release');
  await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('#gu-layout-feedback')?.textContent?.includes('Layout saved'));
  assert(writes>beforeMoveWrites,'Move card must save on pointer release');
  assert(Math.abs(records.get('id:study-card').offset_y_px)>=50,'Vertical movement must persist');
  assert.deepEqual(await page.locator('.cards').evaluate(el=>[...el.children].map(x=>x.id)),['study-card','chart-landmark','metrics-card'],
   'Moving a card must not reorder unrelated chart modules');
  await page.locator('#gu-layout-toggle').click();assert.equal(await page.locator('.gu-layout-controls').count(),0);
  await page.reload({waitUntil:'load'});await page.waitForFunction(()=>document.querySelector('#study-card')?.style.width!=='');
  assert.match(await page.locator('#study-card').getAttribute('style'),/width:/);
  assert.match(await page.locator('#study-card').getAttribute('style'),/translate:/);
  assert.deepEqual(await page.locator('.cards').evaluate(el=>[...el.children].map(x=>x.id)),['study-card','chart-landmark','metrics-card']);
  assert.deepEqual(errors,[]);
  console.log('PASS sitewide layout Chromium: gated toggle, resize save on mouse release, persisted reload and Free role denial');
 }finally{await ctx.close()}
}}finally{await browser.close()}
