
/* Search and entitlement browser acceptance. Synthetic member identity only. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const catalog=JSON.parse(read('data/competency-lab-paths-v01499.json'));
const details=JSON.parse(read('data/labs.json'));
const script=read('assets/js/learning-destination-picker-v1.js');
const fixture='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><label id="player-catalog-label">Choose a Lab</label><input id="player-catalog-search" type="search" role="combobox" aria-expanded="false"><button id="player-catalog-toggle" aria-expanded="false">Browse all Labs</button><a id="player-lab-id" href="labs.html">All 419 Labs</a><p id="player-catalog-status"></p><div id="player-catalog-browser" hidden><div id="player-catalog-results"></div><button id="player-catalog-retry" hidden>Retry</button></div></body></html>';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
async function setup({auth=false,canonicalOffline=false,releaseOffline=false,width=1280}={}){
 const page=await browser.newPage({viewport:{width,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/picker-fixture',route=>route.fulfill({status:200,contentType:'text/html',body:fixture}));
 await page.route('**/data/competency-lab-paths-v01499.json',route=>route.fulfill({
  status:canonicalOffline?503:200,contentType:'application/json',
  body:canonicalOffline?'{"error":"offline"}':JSON.stringify(catalog)}));
 await page.route('**/data/labs.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(details)}));
 await page.route('**/api/lab-release-availability',route=>route.fulfill({
  status:releaseOffline?503:200,contentType:'application/json',
  body:JSON.stringify(releaseOffline?{error:'offline'}:{ok:true,publishedIds:['F3-C06-L01'],guidedBetaIds:['F1-C02-L01'],trainingOnlyIds:[]})}));
 await page.route('**/api/lab-registry-access',route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({
   ok:true,freeEligible:true,interactive:false,training:false,
   bookCodes:['FOUNDATION_BOOK_3'],freeSampleIds:['F1-C02-L01']})}));
 await page.goto('http://127.0.0.1:8765/picker-fixture');
 await page.evaluate(auth=>{window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{
  session:auth?{user:{id:'synthetic-qa'},access_token:'synthetic'}:null}})}})},auth);
 await page.addScriptTag({content:script});
 await page.waitForFunction(()=>document.querySelectorAll('.gu-picker-item').length>=90);
 return{page,errors};
}
try{
 for(const width of [390,1440]){
  const {page,errors}=await setup({width});
  assert.equal(await page.locator('.gu-picker-item').count(),419,'All 419 Labs must be indexed');
  assert.equal(await page.locator('#player-catalog-browser').isVisible(),false,
   'Loaded dropdown begins compact instead of forcing 419 rows into the lesson');
  await page.locator('#player-catalog-toggle').click();
  assert.equal(await page.locator('#player-catalog-browser').isVisible(),true,
   'Browse button opens the Lab-only chooser');
  await page.locator('#player-catalog-search').fill('vwap');
  const result=page.locator('.gu-picker-item'),n=await result.count();
  assert(n>=17,'VWAP search must find all matching Labs');
  assert.equal(await page.locator('.gu-picker-locked').count(),n,'Unverified access remains locked');
  assert.equal(await result.filter({hasText:'F3-C06-L01'}).locator('a').first().getAttribute('href'),
   'store.html','Unverified Lab Pack must not redirect to a book product');
  await page.locator('#player-catalog-search').press('Escape');
  assert.equal(await page.locator('#player-catalog-browser').isVisible(),false,
   'Escape collapses the dropdown without discarding the search');
  assert.deepEqual(errors,[]);
  await page.close();
  console.log('PASS responsive discovery '+width+'px, 419 Labs, VWAP query and product links');
 }
 {
  const {page,errors}=await setup({auth:true});
  await page.waitForFunction(()=>document.querySelector('.gu-picker-item[data-access="available"]'));
  await page.locator('#player-catalog-search').fill('F3-C06-L01');
  assert.equal(await page.locator('.gu-picker-item').count(),1);
  assert.equal(await page.locator('.gu-picker-item').getAttribute('data-access'),'available');
  assert.equal(await page.locator('.gu-picker-action').getAttribute('href'),'lab-player.html?lab=F3-C06-L01');
  assert.deepEqual(errors,[]);await page.close();
  console.log('PASS server-authorized owner of matching book opens only released Lab');
 }
 {
  const {page,errors}=await setup({canonicalOffline:true});
  assert.equal(await page.locator('.gu-picker-item').count(),details.length);
  assert.match(await page.locator('#player-catalog-status').innerText(),/publicly detailed Labs/);
  assert.deepEqual(errors,[]);await page.close();
  console.log('PASS public catalog fallback shows accurately bounded partial results');
 }
 {
  const {page,errors}=await setup({auth:true,releaseOffline:true});
  assert.equal(await page.locator('.gu-picker-item').count(),419);
  assert.equal(await page.locator('.gu-picker-item[data-access="available"]').count(),0);
  assert.deepEqual(errors,[]);await page.close();
  console.log('PASS release outage fails closed while retaining search');
 }
}finally{await browser.close()}
