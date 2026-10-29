/* Real Chromium Admin UI acceptance; synthetic Owner, mocked API, no production credits. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const js=readFileSync('assets/js/admin-my-sparks-v1.js','utf8');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1200,height:850}});
const html='<html><body><section class="admin-panel active" data-admin-panel="sparks">'+
 '<article id="admin-my-sparks-wallet" hidden>'+
 '<p data-owner-sparks-balance></p>'+
 '<form data-owner-sparks-form><input type="number" name="amount" min="1" max="10000" required>'+
 '<textarea name="reason" minlength="10" maxlength="500" required></textarea>'+
 '<button type="submit" disabled>Add Sparks to My Account</button>'+
 '<button type="button" data-owner-sparks-refresh>Refresh</button></form>'+
 '<p data-owner-sparks-status></p><div data-owner-sparks-history></div>'+
 '</article></section></body></html>';
try{
 await page.route('https://site.example/admin.html',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
 await page.goto('https://site.example/admin.html');
 await page.evaluate(()=>{
  window.__writes=[];window.__calls=0;window.__failedOnce=false;window.__confirmation=0;
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'test-OWNER'}}})}});
  window.confirm=()=>{window.__confirmation++;return true};
  window.fetch=async(url,init={})=>{
   const address=String(url);
   if(!address.startsWith('/api/admin-lantern-sparks'))throw Error('Unexpected API '+url);
   if(init.method==='POST'){
    const body=JSON.parse(init.body);
    window.__writes.push(body);
    if(!window.__failedOnce){
     window.__failedOnce=true;throw Error('Simulated lost connection AFTER possible server acceptance');
    }
    return new Response(JSON.stringify({ok:true,alreadyApplied:true,delta:0,
     balance:{available:12,manual:12,included:0,purchased:0}}),{
      status:200,headers:{'content-type':'application/json'}});
   }
   window.__calls++;
   return new Response(JSON.stringify({ok:true,balance:{
     available:window.__failedOnce?12:0,manual:window.__failedOnce?12:0,included:0,purchased:0},
     activity:window.__failedOnce?[{created_at:'2026-10-28T00:00:00Z',delta:12,
       previous_available:0,resulting_available:12,reason:'Owner review manual QA credit'}]:[]}),{
     status:200,headers:{'content-type':'application/json'}});
  };
 });
 await page.addScriptTag({content:js});
 await page.waitForFunction(()=>{
  const box=document.getElementById('admin-my-sparks-wallet');
  return box&&!box.hidden&&!box.querySelector('[type="submit"]').disabled;
 });
 assert.match(await page.locator('[data-owner-sparks-balance]').innerText(),/0 available/);
 assert.equal(await page.evaluate(()=>window.__writes.length),0,'Reading wallet may not auto-credit');
 await page.locator('input[name="amount"]').fill('12');
 await page.locator('textarea[name="reason"]').fill('Owner review manual QA credit');
 await page.locator('button[type="submit"]').click();
 await page.waitForFunction(()=>window.__writes.length===1);
 await page.waitForFunction(()=>!document.querySelector('[type="submit"]').disabled);
 assert.match(await page.locator('[data-owner-sparks-status]').innerText(),/NOT confirmed/);
 await page.locator('button[type="submit"]').click();
 await page.waitForFunction(()=>window.__writes.length===2);
 await page.waitForFunction(()=>document.querySelector('[data-owner-sparks-status]').textContent.includes('already applied'));
 const writes=await page.evaluate(()=>window.__writes);
 assert.equal(writes.length,2);
 assert.equal(writes[0].requestId,writes[1].requestId,'Lost response retry must use one idempotency UUID');
 assert.deepEqual({self:writes[0].self,operation:writes[0].operation,value:writes[0].value},
  {self:true,operation:'add',value:12});
 assert.equal(await page.locator('[data-owner-sparks-balance]').innerText().then(x=>x.includes('12 available')),true);
 assert.equal(await page.evaluate(()=>window.__confirmation),2,'Both attempts require explicit confirmation');
 console.log('PASS real Admin Chromium: wallet read-only load, Owner Add form, uncertain response retry, one UUID, verified balance');
}finally{await browser.close()}
