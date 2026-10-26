/* Exercise the active Dashboard settings renderer, not a substitute form. */
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const source=readFileSync('assets/js/dashboard-ui-legacy.js','utf8');
const begin=source.indexOf('async function settingsPanel(host)'),end=source.indexOf('async function renderHelp',begin);
assert(begin>=0&&end>begin);const renderer=source.slice(begin,end);
assert(renderer.includes('SiteDisplay.render'));assert(!renderer.includes('data-save-accessibility'));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{for(const width of [390,900,1440]){
 const page=await browser.newPage({viewport:{width,height:900}});let saved=null;
 await page.route('https://fixture.test/**',route=>{if(route.request().url().includes('/api/ui-state')){if(route.request().method()==='POST'){saved=route.request().postDataJSON().value;return route.fulfill({json:{ok:true}});}return route.fulfill({json:{ok:true,preferences:[]}});}return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body style="margin:20px"><main id="settings-host"></main></body></html>'});});
 await page.goto('https://fixture.test/dashboard?tab=settings&section=accessibility');
 await page.addStyleTag({path:'assets/css/display-preferences.css'});
 await page.evaluate(()=>{window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture-not-real'}}})}});});
 await page.addScriptTag({path:'assets/js/display-preferences.js'});
 await page.addScriptTag({content:"const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];"+renderer+";window.renderDashboardSettings=settingsPanel;"});
 await page.evaluate(()=>window.renderDashboardSettings(document.getElementById('settings-host')));
 await page.waitForFunction(()=>document.querySelector('[data-display-save]')&&!document.querySelector('[data-display-save]').disabled);
 assert.equal(await page.locator('[data-display]').count(),5);
 await page.locator('[data-display="font"]').selectOption('1.2');await page.locator('[data-display="instructorFont"]').selectOption('1.5');
 await page.getByRole('button',{name:'Save display settings',exact:true}).click();
 await page.getByText('Display settings saved to your account.',{exact:true}).waitFor();assert.equal(saved.font,'1.2');assert.equal(saved.instructorFont,'1.5');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.close();
}console.log('Active Dashboard display renderer: direct section link, five controls, independent sizes, account save, no overflow at 390/900/1440px PASS.');}
finally{await browser.close();}
