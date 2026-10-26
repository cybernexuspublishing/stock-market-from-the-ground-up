/* All root HTML routes, signed-out desktop/mobile audit. Restricted member
 * content is recorded as gated, never counted as authenticated visual acceptance. */
import {readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.GU_PRODUCTION_URL||'https://stock-market-from-the-ground-up-d1r.pages.dev';
const out='artifacts/sitewide-appearance';mkdirSync(out,{recursive:true});
const files=readdirSync('.').filter(x=>/^[a-z0-9-]+\.html$/.test(x));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const pending=files.flatMap(route=>[390,1440].map(width=>({route,width}))),results=[];
async function worker(){
 while(pending.length){const item=pending.shift(),context=await browser.newContext({viewport:{width:item.width,height:1000}}),page=await context.newPage();
  try{const response=await page.goto(base+'/'+item.route,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(1600);if(item.route==='labs.html')await page.waitForURL(/\/signin(?:\.html)?(?:\?|$)/,{timeout:15000});
   const final=new URL(page.url()),gated=/\/(signin|create-account)(\.html)?$/.test(final.pathname)&&!item.route.startsWith('signin')&&!item.route.startsWith('create-account');
   const state=await page.evaluate(()=>{const h=document.querySelector('h1'),header=document.querySelector('.site-header');const visible=e=>!!e&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0;return {title:document.title,overflow:document.documentElement.scrollWidth>innerWidth+2,headingClipped:visible(h)&&visible(header)&&h.getBoundingClientRect().top<header.getBoundingClientRect().bottom-2,hiddenBody:getComputedStyle(document.body).visibility==='hidden',heading:h?.textContent||'',surface:document.body.dataset.guSurface||'teaching/standalone'};});
   const issues=[];if(response?.status()>=500)issues.push('HTTP '+response.status());if(!gated){if(state.overflow)issues.push('horizontal overflow');if(state.headingClipped)issues.push('heading beneath header');if(state.hiddenBody)issues.push('body remains hidden');}
   results.push({...item,url:page.url(),gated,...state,issues});
   if(issues.length||['simulator.html','philosophy.html','signin.html'].includes(item.route))await page.screenshot({path:out+'/'+item.route.replace('.html','')+'-'+item.width+'.png',fullPage:false});
  }catch(e){results.push({...item,error:e.message,issues:['navigation failed']});}
  finally{await context.close();}
 }
}
try{await Promise.all(Array.from({length:4},worker));}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),scope:'All root HTML routes, signed-out desktop and mobile; authenticated content unverified',routes:files.length,checks:results.length,gated:results.filter(x=>x.gated).length,failures:results.filter(x=>x.issues.length),results};
writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({routes:report.routes,checks:report.checks,gated:report.gated,failures:report.failures.map(x=>({route:x.route,width:x.width,issues:x.issues}))},null,2));
if(report.failures.length)process.exitCode=1;
