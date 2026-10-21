import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Browser fixtures must use local static output.');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin!==base)return route.abort();
   if(u.pathname==='/assets/js/supabase-client.js')
    return route.fulfill({status:200,contentType:'application/javascript',
      body:"window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},access_token:'safe-local-token'}}}),getUser:async()=>({data:{user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}}}),onAuthStateChange:(fn)=>{window.__TOOL_AUTH_CB=fn;return {data:{subscription:{unsubscribe(){}}}}}}});"});
   if(u.pathname==='/assets/js/session-manager.js'||u.pathname==='/assets/js/site.js')
    return route.fulfill({status:200,contentType:'application/javascript',body:'/* local test fixture */'});
   if(u.pathname.startsWith('/api/advanced-tool-access-v014110'))
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,authorized:true,
     accessLevel:'entitled',tool:{tool_code:'SCANNER_BUILDER',name:'Scanner Research',description:'Local offline evidence',category:'Research',status:'beta'}})});
   if(u.pathname.startsWith('/api/advanced-tool-workspace-v014110'))
    return route.fulfill({status:200,contentType:'application/json',
     body:JSON.stringify(route.request().method()==='GET'?{ok:true,records:[],hasMore:false}:{ok:true,id:123})});
   return route.continue();
  });
  const response=await page.goto(base+'/advanced-tool.html?tool=SCANNER_BUILDER',{waitUntil:'domcontentloaded'});
  assert.equal(response?.status(),200);
  await page.locator('#u-run').waitFor();
  assert.equal(await page.locator('#tool-title').innerText(),'Scanner Research');
  await page.keyboard.press('Tab');
  const text='symbol,price,change_pct,volume,rvol,float,spread_pct\n'+
   'AAPL,12,15,2500000,4,2000000,1\n'+
   'NOMETRIC,12,,9900000,4,1000000,1\n'+
   'OUTSIDE,40,50,9900000,4,1000000,1\n';
  await page.locator('#u-file').setInputFiles({name:'authorized.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
  await page.locator('#u-run').click();
  assert.match(await page.locator('#tool-status').innerText(),/source note/i);
  await page.locator('#u-source').fill('My authorized personally provided snapshot');
  await page.locator('#u-time').fill('2024-05-03T14:30:00-04:00');
  await page.locator('#u-run').click();
  assert.equal(await page.locator('#u-results tbody tr').count(),1);
  assert.equal((await page.locator('#u-results tbody tr:first-child td:first-child').innerText()).trim(),'AAPL');
  assert.match(await page.locator('#u-audit').innerText(),/1 of 3 records passed/);
  assert.match(await page.locator('#u-audit').innerText(),/1 incomplete/);
  await page.locator('#u-save').click();
  await page.waitForFunction(()=>document.querySelector('#tool-status')?.textContent?.includes('criteria'));
  await page.evaluate(()=>window.__TOOL_AUTH_CB('SIGNED_OUT',null));
  await page.waitForFunction(()=>document.querySelector('#tool-content')?.hidden===true);
  assert.equal(await page.locator('#tool-workbench').innerText(),'','Private tool workspace must be scrubbed on account change');
  await context.close();
  console.log('PASS v145 browser '+width+'px scanner with keyboard, provenance, rigorous exclusions and private filter save');
 }
}finally{await browser.close()}
