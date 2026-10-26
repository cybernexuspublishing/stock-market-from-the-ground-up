import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const js=readFileSync('assets/js/display-preferences.js','utf8'),css=readFileSync('assets/css/display-preferences.css','utf8');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let count=0;
try{
 for(const width of [390,800,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  let saved={font:'1',instructorFont:'1',density:'default',contrast:'default',motion:'default'},fail=false,writes=0;
  await page.route('https://fixture.test/**',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/api/ui-state'){
    assert.equal(route.request().headers().authorization,'Bearer fixture-token');
    if(route.request().method()==='POST'){writes++;if(fail)return route.fulfill({status:503,json:{error:'Storage unavailable'}});const b=route.request().postDataJSON();assert.equal(b.key,'display');saved=b.value;return route.fulfill({json:{ok:true}});}
    return route.fulfill({json:{ok:true,preferences:[{pref_key:'display',pref_value:saved}]}});
   }
   return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><style>body{margin:0;font:16px system-ui}.section{padding:48px}.card{padding:24px}p{font-size:1rem}svg{width:200px;height:100px}</style></head><body><main class="section"><article class="card"><p id="website">Website text</p><div class="gu-v33-instructor-narration"><p class="gu-v33-instructor-typing">Instructor text</p><p class="gu-v33-instructor-reserve">Instructor reserve</p></div><svg viewBox="0 0 200 100" aria-label="Chart"></svg></article><div data-display-settings></div></main></body></html>'});
  });
  await page.goto('https://fixture.test/');
  await page.evaluate(()=>{window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture-token',user:{id:'fixture-user'}}}})}});});
  await page.addStyleTag({content:css});await page.addScriptTag({content:js});
  const save=page.getByRole('button',{name:'Save display settings',exact:true});await save.waitFor();await page.waitForFunction(()=>!document.querySelector('[data-display-save]').disabled);
  const geometry=()=>page.evaluate(()=>({font:getComputedStyle(document.querySelector('#website')).fontSize,instructor:getComputedStyle(document.querySelector('.gu-v33-instructor-typing')).fontSize,reserve:getComputedStyle(document.querySelector('.gu-v33-instructor-reserve')).fontSize,padding:getComputedStyle(document.querySelector('.card')).paddingTop,chart:document.querySelector('svg').getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth}));
  const a=await geometry();await page.locator('[data-display="density"]').selectOption('compact');const b=await geometry();assert.equal(a.font,b.font);assert(parseFloat(b.padding)<parseFloat(a.padding));assert.equal(a.chart,b.chart);count++;
  await page.locator('[data-display="font"]').selectOption('1.5');const c=await geometry();assert.equal(c.font,'24px');assert.equal(c.instructor,'16px');count++;
  await page.locator('[data-display="instructorFont"]').selectOption('2');const d=await geometry();assert.equal(d.instructor,'32px');assert.equal(d.reserve,d.instructor);assert.equal(d.font,'24px');assert.equal(d.chart,200);assert.equal(d.overflow,false);count++;
  await save.click();await page.getByText('Display settings saved to your account.',{exact:true}).waitFor();assert.equal(saved.instructorFont,'2');assert.equal(saved.font,'1.5');assert.equal(saved.density,'compact');count++;
  await page.reload();await page.evaluate(()=>{window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}}})}});});await page.addStyleTag({content:css});await page.addScriptTag({content:js});await page.waitForFunction(()=>!document.querySelector('[data-display-save]').disabled);assert.equal(await page.locator('[data-display="instructorFont"]').inputValue(),'2');count++;
  fail=true;await page.getByRole('button',{name:'Restore defaults',exact:true}).click();await page.getByRole('button',{name:'Save display settings',exact:true}).click();await page.getByText(/changes have not been confirmed saved/).waitFor();assert.equal(saved.font,'1.5');assert(writes>=2);count++;
  const normalized=await page.evaluate(()=>window.SiteDisplay.normalize({font:'999',instructorFont:'-1',density:'hacked',motion:'x'}));assert.equal(normalized.font,'1');assert.equal(normalized.instructorFont,'1');assert.equal(normalized.density,'compact');count++;
  await page.close();
 }
}finally{await browser.close();}
console.log(count+' display browser checks passed at 390, 800 and 1440px.');
