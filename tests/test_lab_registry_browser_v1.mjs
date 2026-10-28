/* Genuine Chromium DOM acceptance; provider and member sessions are mocked.
 * Do not infer live-account authorization from this test.
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const origin='https://registry-fixture.test';
const id='11111111-1111-4111-8111-111111111111';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const mode of ['free','interactive','training','offline']){
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript((uid)=>{
   const user={id:uid};
   window.getSupabaseClient=async()=>({auth:{
    getUser:async()=>({data:{user}}),
    getSession:async()=>({data:{session:{user,access_token:'fixture-token'}}}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
   },from:()=>({select:()=>({eq:async()=>({data:[],error:null})})})});
  },id);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin!==origin)return route.abort();
   if(u.pathname==='/api/lab-beta-scope')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false})});
   if(u.pathname==='/api/lab-release-availability')return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({ok:true,publishedIds:['F1-C02-L01','F2-C07-L01'],guidedBetaIds:['SITE-021'],trainingOnlyIds:['SITE-021']})});
   if(u.pathname==='/api/lab-registry-access'){
    if(mode==='offline')return route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
     ok:true,freeEligible:true,interactive:mode==='interactive',training:mode==='training',bookCodes:[],
     freeSampleIds:['F1-C02-L01','F2-C01-L01','F3-C01-L01']
    })});
   }
   if(u.pathname==='/assets/js/site.js')return route.fulfill({status:200,contentType:'application/javascript',
    body:'window.loadJSON=async path=>{const r=await fetch(path);if(!r.ok)throw Error("fixture data unavailable");return r.json()};'});
   if(['/assets/js/session-manager.js','/assets/js/supabase-client.js','/config.js'].includes(u.pathname))
    return route.fulfill({status:200,contentType:'application/javascript',body:'// mocked identity'});
   const path=join(root,u.pathname.slice(1));
   if(!path.startsWith(root+'/')||!existsSync(path))return route.fulfill({status:404,body:''});
   const ext=extname(path);
   return route.fulfill({status:200,contentType:ext==='.js'?'application/javascript':ext==='.css'?'text/css':ext==='.json'?'application/json':'text/html',body:readFileSync(path)});
  });
  try{
   await page.goto(origin+'/labs.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelectorAll('#lab-body article.lab-card').length===419,{timeout:20000});
   await page.waitForFunction(expected=>document.body.dataset.labRegistryAccess===expected,mode==='offline'?'unavailable':'verified',{timeout:20000});
   assert.equal(await page.locator('#lab-body article.lab-card').count(),419);
   const state=async id=>page.locator('#row-'+id).getAttribute('data-access');
   const open=async id=>page.locator('#row-'+id+' .lab-open-btn').count();
   assert.equal(await state('F1-C02-L01'),mode==='offline'?'locked':'available');
   assert.equal(await state('F2-C07-L01'),mode==='interactive'||mode==='training'?'available':'locked');
   assert.equal(await state('SITE-021'),mode==='training'?'available':'locked');
   assert.equal(await open('F1-C02-L01'),mode==='offline'?0:1);
   assert.equal(await open('F2-C07-L01'),mode==='interactive'||mode==='training'?1:0);
   assert.equal(await open('SITE-021'),mode==='training'?1:0);
   assert.match(await page.locator('#row-F2-C07-L01 .lab-access-tag').innerText(),
     mode==='interactive'||mode==='training'?/Available/i:/Access|membership|verification/i);
   assert.deepEqual(errors,[]);
   console.log('PASS Registry Chromium '+mode+': 419 discoverable; Free, premium, SITE and outage locks verified');
  }finally{await context.close()}
 }
}finally{await browser.close()}
