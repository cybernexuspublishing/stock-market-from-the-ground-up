import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
/* Real Chromium, mock authentication and catalog fixtures; NOT real member QA. */
const site='https://catalog-fixture.test',root=process.cwd();
const template=readFileSync('ondemand-training.html','utf8').replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/gi,'');
const html=template.replace('</body>','<script src="/qa-config.js"></script><script src="/assets/js/learning.js"></script></body>');
const data=Array.from({length:36},(_,i)=>({id:'F1-C02-L'+String(i+1).padStart(2,'0'),title:'Historical practice '+(i+1),ticker:i===0?'DIS':'AAPL',date:i===0?'2024-05-07':'2024-05-03',timeframe:'3-minute',href:'/site-lab.html?lab=F1-C02-L02'}));
let published=false;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin!==site)return route.abort();
  if(u.pathname==='/ondemand-training.html')return route.fulfill({status:200,contentType:'text/html',body:html});
  if(u.pathname==='/qa-config.js')return route.fulfill({status:200,contentType:'application/javascript',body:"window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'fake-qa-token'}}})}});"});
  if(u.pathname==='/api/ondemand-training')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,access:'active',modules:[],labs:data})});
  if(u.pathname==='/api/learning-replay-v01492')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,datasets:published?[{code:'APPROVED_DIS',ticker:'DIS',date:'2024-05-07'}]:[]})});
  const file=path.join(root,u.pathname.slice(1));
  if(!file.startsWith(root+path.sep)||!existsSync(file))return route.fulfill({status:404,body:'missing'});
  return route.fulfill({status:200,contentType:file.endsWith('.css')?'text/css':'application/javascript',body:readFileSync(file)});
 });
 await page.goto(site+'/ondemand-training.html',{waitUntil:'load'});
 await page.waitForFunction(()=>document.querySelectorAll('#v135-labs article').length===24);
 assert.equal(await page.getByRole('link',{name:'Open Website Classroom'}).count(),0,'Unapproved sources must not produce a clickable classroom button');
 assert.equal(await page.getByText('Historical chart pending source approval.').count(),24);
 assert.equal(await page.getByRole('link',{name:'Independent thinkorswim Instructions'}).count(),24);
 await page.getByRole('button',{name:'Show 24 More Cases'}).click();
 assert.equal(await page.locator('#v135-labs article').count(),36);
 published=true;
 await page.reload({waitUntil:'load'});
 await page.waitForFunction(()=>document.querySelectorAll('#v135-labs article').length===24);
 assert.equal(await page.getByRole('link',{name:'Open Website Classroom'}).count(),1);
 const approved=page.getByRole('link',{name:'Open Website Classroom'});
 assert.match(await approved.getAttribute('href'),/ticker=DIS&date=2024-05-07&timeframe=3/);
 assert.equal(await page.getByRole('link',{name:'Independent thinkorswim Instructions'}).count(),24);
 assert.deepEqual(errors,[]);
 console.log('PASS mock browser: 36 canonical cases, pagination, no unapproved chart links, entitlement-approved source enables exact DIS chart, thinkorswim remains optional.');
}finally{await browser.close();}
