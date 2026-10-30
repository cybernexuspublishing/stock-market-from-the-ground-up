import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
let chromium;
try{({chromium}=await import('playwright'))}
catch{console.error('PLAYWRIGHT_BROWSER_DEPENDENCY_MISSING: run npm install --no-save --no-package-lock --ignore-scripts playwright@1.56.1 && npx playwright install --with-deps chromium');process.exit(2)}
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let record={id:11,tool_code:'WATCHLIST_WORKBENCH',record_type:'watchlist',
 title:'TEST',updated_at:'2026-10-29T11:00:00.000Z',created_at:'2026-10-29T10:00:00.000Z',
 payload:{status:'WATCH',asOf:'2026-10-29T10:00:00Z',sourceNote:'Fictional market data source',
 invalidation:'NO TRADE if any validation fails',why:'Fictional pattern review'}};
let writes=0;
const server=createServer((req,res)=>{
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.end('<!doctype html><html><body style="background:#0c1523;color:#fff"><main><div id="host"></div></main></body></html>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({acceptDownloads:true});
 await page.route('**/api/advanced-tool-workspace-v014110?*',async route=>{
  const request=route.request(),url=new URL(request.url()),method=request.method();
  assert.equal(request.headers().authorization,'Bearer fixture');
  assert.equal(url.searchParams.get('tool'),'WATCHLIST_WORKBENCH');
  if(method==='GET'&&url.searchParams.get('type')==='filter_set')
   return route.fulfill({json:{ok:true,records:[{id:22,record_type:'filter_set',title:'Private scanner criteria',
    payload:{filters:{minPrice:1},asOf:'2026-10-29T10:00:00Z'}}]}});
  if(method==='GET'&&url.searchParams.get('type')==='watchlist')
   return route.fulfill({json:{ok:true,records:[record]}});
  if(method==='PATCH'){
   assert.equal(url.searchParams.get('id'),'11');
   const body=request.postDataJSON();
   assert.equal(body.expectedUpdatedAt,record.updated_at);
   assert.equal(body.recordType,'watchlist');
   assert.equal(body.title,'TEST');
   assert.equal(Object.hasOwn(body,'user_id'),false);
   record={...record,payload:body.payload,updated_at:'2026-10-29T11:00:0'+(++writes)+'.000Z'};
   return route.fulfill({json:{ok:true,id:11,updated:true}});
  }
  return route.fulfill({status:404,json:{ok:false,error:'Unexpected fixture path'}});
 });
 await page.goto('http://127.0.0.1:'+port+'/fixture');
 await page.evaluate(userId=>{
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{
   session:{user:{id:userId},access_token:'fixture'}}})}});
  window.GroundUpWatchlistIntelligenceV1={mount:()=>17};
  window.CrownlightECharts={load:async()=>({init:()=>({setOption(){},resize(){},dispose(){}})})};
 },user);
 await page.addScriptTag({path:'assets/js/watchlist-research-core-v2.js'});
 await page.addScriptTag({path:'assets/js/watchlist-intelligence-v2.js'});
 const v=await page.evaluate(()=>{
  return window.GroundUpWatchlistIntelligenceV1.mount({
   host:document.querySelector('#host'),recs:[{
    id:11,record_type:'watchlist',title:'TEST',updated_at:'2026-10-29T11:00:00.000Z',
    payload:{status:'WATCH',asOf:'2026-10-29T10:00:00Z',
     sourceNote:'Fictional source',invalidation:'NO TRADE',why:'Fictional research'}}],alive:()=>true});
 });
 assert.equal(v,17,'wrap must preserve legacy mount result');
 const region=page.locator('.cl-wi-v2');
 await region.getByRole('button',{name:'Save research folder, tags and stage'}).waitFor();
 await region.locator('.cl-wi-editor label').filter({hasText:'Folder'}).locator('input').fill('Patterns');
 await region.locator('.cl-wi-editor label').filter({hasText:'Tags'}).locator('input').fill('volume, fictional');
 await region.locator('.cl-wi-editor label').filter({hasText:'Eight-stage candidate review'}).locator('select').selectOption('RESEARCH');
 await region.locator('.cl-wi-editor label').filter({hasText:'Checkpoint evidence'}).locator('input')
  .fill('Manually reviewed fictional research source and invalidation criteria.');
 await region.getByRole('button',{name:'Save research folder, tags and stage'}).click();
 await page.waitForFunction(()=>document.querySelector('.cl-wi-v2 p[role=status]')?.textContent.includes('Private candidate updated'),null,{timeout:10000});
 assert.equal(record.payload.folder,'Patterns');assert.deepEqual(record.payload.tags,['volume','fictional']);
 assert.equal(record.payload.workflowStage,'RESEARCH');assert.equal(record.payload.researchHistory.length,1);
 await region.locator('.cl-wi-editor label').filter({hasText:'Archive this candidate'}).locator('input').check();
 await region.getByRole('button',{name:'Save research folder, tags and stage'}).click();
 await page.waitForFunction(()=>document.querySelector('.cl-wi-v2 p[role=status]')?.textContent.includes('Private candidate updated'),null,{timeout:10000});
 assert.equal(record.payload.archived,true);
 await region.locator('.cl-wi-filters input[type=checkbox]').check();
 await region.locator('.cl-wi-editor label').filter({hasText:'Archive this candidate'}).locator('input').uncheck();
 await region.getByRole('button',{name:'Save research folder, tags and stage'}).click();
 await page.waitForTimeout(100);
 assert.equal(record.payload.archived,false,'restoration must be persisted by authenticated API');
 assert.equal(writes,3,'only the three expected server-revision PATCH writes');
 assert.equal(await region.getByText('Saved scanner/discovery filters').count(),1);
 console.log('PASS Chrome Watchlist V2 integration: authenticated optimistic PATCH, folder/tag/stage, archive/restore, saved scanner criteria, legacy mount preserved');
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
