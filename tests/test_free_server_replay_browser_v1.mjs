/* Chromium acceptance of REAL replay page/client interactions with simulated network.
 * NOT production auth acceptance: real API and RLS are tested separately.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const origin='https://local-free-replay.test';
const sessionId='00000000-0000-4000-8000-000000000333';
const time=i=>new Date(Date.parse('2040-02-06T14:30:00Z')+i*300000).toISOString();
const bars=[0,1,2].map(i=>({index:i,timestamp:time(i),open:10+i*.1,
 high:10.3+i*.1,low:9.8+i*.1,close:10.1+i*.1,volume:24000}));
const dataset={code:'GUSIM_DT_C01_L01',title:'Original Fictional Starter',ticker:'SIMULATION',
 sourceAttribution:'Original computer-created fictional educational sequence',
 licenseNotice:'Fictional education only',synthetic:true};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
async function testAtWidth(width){
 const ctx=await browser.newContext({viewport:{width,height:900}});
 await ctx.addInitScript(()=>{
  const user={id:'00000000-0000-4000-8000-000000000111'};
  window.getSupabaseClient=async()=>({auth:{
   getUser:async()=>({data:{user}}),
   getSession:async()=>({data:{session:{user,access_token:'fixture_bearer_not_real'}}}),
   onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
  }});
 });
 const page=await ctx.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 let state=null;
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;
  if(path==='/api/learning-replay-v01492'){
   assert.equal(url.searchParams.get('scope'),'fictional');
   const action=url.searchParams.get('action');
   let x={ok:true},status=200;
   if(action==='catalog')x={ok:true,datasets:[dataset],notice:'FICTIONAL ONLY'};
   else if(action==='resume')x={ok:true,session:state?{
    id:sessionId,currentIndex:state.cursor,decisionLocked:state.locked,
    decision:state.decision,bar:bars[state.cursor],dataset}:null};
   else if(action==='start'){state={cursor:0,locked:false,decision:null};
    x={ok:true,sessionId,dataset,currentIndex:0,bar:bars[0],
      decisionLocked:false,scope:'fictional',notice:'Fictional candle 1 revealed.'};status=201;}
   else if(action==='lock'){
    const b=JSON.parse(req.postData());
    assert.equal(b.decision,'NO_TRADE');
    assert(b.reasoning.length>=20);
    state.locked=true;state.decision=b.decision;
    x={ok:true,sessionId,decisionLocked:true,decision:b.decision,notice:'Decision locked.'};
   }
   else if(action==='advance'){const b=JSON.parse(req.postData());
    assert.equal(b.expectedIndex,state.cursor);
    assert.equal(state.locked,true);state.cursor++;
    x={ok:true,sessionId,currentIndex:state.cursor,bar:bars[state.cursor],
      execution:null,decisionLocked:true,notice:'Fictional next bar.'};}
   else if(action==='visible'){x={ok:true,sessionId,currentIndex:state.cursor,
    decisionLocked:state.locked,bars:bars.slice(0,state.cursor+1)};}
   else if(action==='finish'){x={ok:true,sessionId,barsSeen:state.cursor+1,journalLinked:false,
    notice:'Fictional practice finished without grading or trade fill.'};state=null;}
   else if(action==='current')x={ok:true,sessionId,currentIndex:state.cursor,bar:bars[state.cursor]};
   else {x={ok:false,error:'unhandled action'};status=404;}
   return route.fulfill({status,contentType:'application/json',body:JSON.stringify(x)});
  }
  if(['/config.js','/assets/js/site.js','/assets/js/supabase-client.js','/assets/js/session-manager.js'].includes(path))
   return route.fulfill({status:200,contentType:'application/javascript',body:'/* Auth dependency simulated for UI regression only */'});
  if(path==='/favicon.ico')return route.fulfill({status:404,body:''});
  const file=join(root,path.replace(/^\//,''));
  if(!file.startsWith(root+'/')||!existsSync(file))return route.fulfill({status:404,body:''});
  const ext=extname(file);
  return route.fulfill({status:200,contentType:ext==='.js'?'application/javascript':
   ext==='.css'?'text/css':ext==='.html'?'text/html':'text/plain',body:readFileSync(file)});
 });
 try{
  await page.goto(origin+'/verified-replay.html?scope=fictional',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#vr-dataset')?.options.length===2,{timeout:20000});
  assert.match(await page.locator('h1').innerText(),/Free Server-Controlled Fictional Replay/);
  assert.match(await page.locator('.section-intro').innerText(),/invented 2040/i);
  assert.equal(await page.locator('#vr-dataset option').nth(1).getAttribute('value'),dataset.code);
  await page.locator('#vr-dataset').selectOption(dataset.code);
  await page.locator('#vr-start').click();
  await page.waitForFunction(()=>document.querySelector('#vr-bars')?.children.length===1);
  assert.equal(await page.locator('#vr-advance').isEnabled(),false);
  assert.equal(await page.locator('#vr-session').isVisible(),true);
  assert.equal(await page.locator('#vr-plan fieldset').isVisible(),false,'fictional mode must not claim simulated fill assumptions');
  assert.equal((await page.locator('#vr-bars').innerText()).includes(time(1)),false);
  await page.locator('#vr-decision').selectOption('NO_TRADE');
  await page.locator('#vr-reason').fill('I need original evidence and sufficient liquidity; the fictional candle alone does not justify a position.');
  await page.locator('#vr-lock').click();
  await page.waitForFunction(()=>document.querySelector('#vr-advance')?.disabled===false);
  await page.locator('#vr-advance').click();
  await page.waitForFunction(()=>document.querySelector('#vr-bars')?.children.length===2);
  assert.equal((await page.locator('#vr-bars').innerText()).includes(time(2)),false,'must not reveal future candle');
  assert.equal(await page.locator('#vr-execution').isVisible(),false);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#vr-bars')?.children.length===2);
  assert.match(await page.locator('#vr-notice').innerText(),/Session restored at bar 1/);
  await page.locator('#vr-finish').click();
  await page.waitForFunction(()=>document.querySelector('#vr-session')?.hidden===true);
  assert.match(await page.locator('#vr-notice').innerText(),/without grading/);
  assert.deepEqual(errors,[]);
  console.log('PASS '+width+'px: real browser source renders fictional scope, server-visible bars, NO_TRADE lock, resume and no fills.');
 }finally{await ctx.close()}
}
try{for(const width of [390,900,1280,1440])await testAtWidth(width)}
finally{await browser.close()}
