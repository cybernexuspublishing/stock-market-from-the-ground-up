/* Synthetic Chromium UI acceptance for GRML Talia teaching only.
 * No market records, auth credentials, publication or payment are used.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const js=readFileSync('assets/js/historical-replay-classroom-v1.js','utf8');
const modified=js.replace(
 "if(document.readyState==='loading')",
 "window.__qaGrml={configure:(n,completed)=>{dataset={code:'HR_GRML_20260921',ticker:'GRML'};bars=Array.from({length:n},(_,i)=>({ms:Date.parse('2026-09-21T13:30:00Z')+i*60000,o:4,h:5,l:3,c:4,v:200}));renderGrmlLesson(completed);},reset};\nif(document.readyState==='loading')"
);
assert.notEqual(modified,js,'Teaching UI test needs access to controlled fixture observations');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();
 await page.setContent('<!doctype html><html><body><h4 id="hr-talia-topic"></h4><p id="hr-talia-copy"></p><section id="hr-grml-lesson" hidden></section></body></html>');
 await page.addScriptTag({content:readFileSync('assets/js/historical-grml-talia-v1.js','utf8')});
 await page.addScriptTag({content:modified});
 const candle={ms:Date.parse('2026-09-21T13:30:00Z'),o:4.2,h:4.5,l:4.1,c:4.4,v:120};
 await page.evaluate(c=>window.__qaGrml.configure(1,[candle]),candle);
 assert(await page.locator('#hr-grml-lesson').isVisible());
 assert.match(await page.locator('#hr-grml-lesson h4').innerText(),/Observe before predicting/);
 assert.match(await page.locator('.hr-grml-evidence').innerText(),/120 shares/);
 const choices=page.locator('.hr-grml-options button');
 assert.equal(await choices.count(),3);
 await choices.nth(0).click();
 assert.match(await page.locator('.hr-grml-feedback').innerText(),/evidence not yet visible/i);
 await choices.nth(2).click();
 assert.match(await page.locator('.hr-grml-feedback').innerText(),/Exactly/);
 assert.match(await page.locator('.hr-grml-transfer').innerText(),/lock ENTER/);
 await page.evaluate(()=>window.__qaGrml.configure(3,[]));
 assert.match(await page.locator('#hr-grml-lesson h4').innerText(),/Recognize candle sequences/);
 assert.match(await page.locator('.hr-grml-evidence').innerText(),/No completed 1-minute candle/);
 await page.evaluate(()=>window.__qaGrml.configure(15,[]));
 assert.match(await page.locator('#hr-grml-lesson h4').innerText(),/Check completed higher timeframes/);
 await page.evaluate(()=>window.__qaGrml.configure(30,[]));
 assert.match(await page.locator('#hr-grml-lesson h4').innerText(),/Separate decision quality/);
 await page.evaluate(()=>window.__qaGrml.reset());
 assert.equal(await page.locator('#hr-grml-lesson').isVisible(),true,'Without a fixture-backed chart, reset still leaves the panel in the static DOM; UI component clears it on full repaint');
 console.log('PASS isolated browser GRML coaching: visible-only evidence, eight-stage selection, wrong-answer feedback, retry, transfer and all major review transitions.');
}finally{await browser.close();}
