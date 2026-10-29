import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const src=readFileSync('assets/js/admin-crownlight-workspace-v1.js','utf8');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1180,height:900}});
try{
 await page.setContent('<html><body><section id="admin-crownlight-workspace-control" hidden><input type="checkbox" data-cl-admin-enabled><div data-cl-admin-pages></div><select data-cl-admin-preview-page></select><div data-cl-admin-style-gallery></div><p data-cl-admin-style-description></p><button data-cl-admin-page-reset></button><button data-cl-admin-reset-all></button><button data-cl-admin-save></button><a data-cl-admin-preview></a><a data-cl-admin-classic></a><p data-cl-admin-message></p></section></body></html>');
 await page.evaluate(()=>{
  window.__saved=[];
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture-owner-session'}}})}});
  window.fetch=async(url,opts={})=>{
   const act=new URL(url,'https://site.example').searchParams.get('action');
   let body;
   if(act==='context')body={ok:true,roles:['OWNER']};
   else if(act==='settings')body={ok:true,settings:[{setting_key:'feature.crownlight_continuous_workspace_v1',value:{enabled:false,pages:['simulator.html']}}]};
   else if(act==='setting_save'){window.__saved.push(JSON.parse(opts.body));body={ok:true};}
   else throw Error('Unexpected admin action '+act);
   return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
  };
 });
 await page.addScriptTag({content:src});
 await page.waitForFunction(()=>!document.querySelector('#admin-crownlight-workspace-control').hidden);
 assert.equal(await page.locator('[data-cl-admin-style-gallery] button').count(),5);
 assert.equal(await page.locator('input[data-cl-page]:checked').count(),1);
 await page.locator('[data-cl-admin-preview-page]').selectOption('journal.html');
 await page.locator('[data-cl-style="compact"]').click();
 assert.equal(await page.locator('select[data-cl-page-style][data-page="journal.html"]').inputValue(),'compact');
 assert.equal(await page.locator('[data-cl-admin-preview]').getAttribute('href'),'/journal.html?workspace=compact');
 await page.locator('[data-cl-style="classic"]').click();
 assert.equal(await page.locator('input[data-cl-page][value="journal.html"]').isChecked(),false);
 await page.locator('[data-cl-admin-preview-page]').selectOption('simulator.html');
 await page.locator('[data-cl-style="spacious"]').click();
 await page.locator('[data-cl-admin-enabled]').check();
 await page.locator('[data-cl-admin-save]').click();
 let x=await page.evaluate(()=>window.__saved.at(-1).value);
 assert.deepEqual(x,{enabled:true,pages:['simulator.html'],styles:{'simulator.html':'spacious'}});
 await page.locator('[data-cl-admin-reset-all]').click();
 await page.locator('[data-cl-admin-save]').click();
 x=await page.evaluate(()=>window.__saved.at(-1).value);
 assert.deepEqual(x,{enabled:false,pages:[],styles:{}});
 assert.equal(await page.locator('[data-cl-admin-preview]').getAttribute('href'),'/simulator.html?workspace=classic');
 console.log('PASS Admin visual gallery, independent page style, Original reset, preview links, Save and Remove all');
}finally{await browser.close()}
