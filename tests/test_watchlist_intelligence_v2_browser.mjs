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
 await page.route('**/api/watchlist-alerts-v3',async route=>{
   const body=route.request().method()==='POST'?route.request().postDataJSON():null;
   if(route.request().method()==='GET')
     return route.fulfill({json:{ok:true,events:[],source:'MANUAL_RESEARCH_REVIEW_ONLY'}});
   if(body?.action==='evaluate')
     return route.fulfill({json:{ok:true,matched:1,newEvents:1,events:[{id:90}]}});
   if(body?.action==='markRead')
     return route.fulfill({json:{ok:true,read:true}});
   return route.fulfill({status:400,json:{ok:false,error:'Unexpected review action'}});
 });
 await page.route('**/api/journal-plan-prefill?*',async route=>{
   assert.equal(new URL(route.request().url()).searchParams.get('planId'),'123');
   return route.fulfill({json:{ok:true,planId:123,journalDraft:{ticker:'TEST'}}});
 });
 await page.route('**/api/watchlist-journal-transfer-v3',async route=>{
   assert.deepEqual(route.request().postDataJSON(),{planId:123});
   return route.fulfill({json:{ok:true,journalId:555,alreadyExists:false}});
 });
 await page.goto('http://127.0.0.1:'+port+'/fixture');
 await page.evaluate(userId=>{
  window.getSupabaseClient=async()=>({auth:{
   getSession:async()=>({data:{session:{user:{id:userId},access_token:'fixture'}}}),
   onAuthStateChange:callback=>{window.__watchlistAuthListener=callback;return {data:{subscription:{unsubscribe(){}}}}}
  }});
  window.GroundUpWatchlistIntelligenceV1={mount:()=>17};
  window.CrownlightECharts={load:async()=>({init:()=>({setOption(){},resize(){},dispose(){}})})};
 },user);
 await page.addScriptTag({path:'assets/js/market-research-engine-v014145.js'});
 await page.addScriptTag({path:'assets/js/watchlist-research-core-v2.js'});
 await page.addScriptTag({path:'assets/js/watchlist-learning-v3.js'});
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
 const monitor=region.locator('.cl-wi-monitor');
 await monitor.locator('label').filter({hasText:'Manual price trigger / lower reference'}).locator('input').fill('155.22');
 await monitor.locator('label').filter({hasText:'Pattern-monitor evidence'}).locator('input')
  .fill('Manual fictional price threshold for evidence review, not a buy signal.');
 await monitor.getByRole('button',{name:'Save manual pattern-monitor rule'}).click();
 await page.waitForFunction(()=>document.querySelector('.cl-wi-monitor [role=status]')?.textContent.includes('1 manually saved'),null,{timeout:10000});
 assert.equal(record.payload.monitoringRules.length,1,'manual monitor persisted under same private record');
 await monitor.locator('label').filter({hasText:'Observed price from user-provided snapshot'}).locator('input').fill('156.4');
 await monitor.locator('label').filter({hasText:'Observation source / data rights'}).locator('input')
  .fill('Personal fictional CSV snapshot, source unverified');
 await monitor.getByRole('button',{name:'Evaluate and record a manual research review'}).click();
 await page.waitForFunction(()=>document.querySelector('.cl-wi-monitor [role=status]')?.textContent.includes('1 of 1'),null,{timeout:10000});
 assert.equal(record.payload.researchHistory.at(-1).kind,'MANUAL_PATTERN_REVIEW');
 assert.equal(writes,5,'only authenticated revision-guarded PATCH changes are persisted');
 assert.equal(await region.getByText('Saved scanner/discovery filters').count(),1);
 assert.equal(await region.getByRole('button',{name:'Attach saved plan to owned Journal record'}).count(),1);
 const scanner=region.locator('.cl-wi-scanner');
 await scanner.locator('label').filter({hasText:'Saved scanner/discovery filters'}).locator('select').selectOption('22');
 await scanner.locator('label').filter({hasText:'Authorized scanner snapshot'}).locator('input').fill('Fictional authorized example snapshot, no live quotes');
 await scanner.locator('label').filter({hasText:'Snapshot observation time'}).locator('input').fill('2026-10-29T10:00:00Z');
 await scanner.locator('input[type=file]').setInputFiles({name:'fictional.csv',mimeType:'text/csv',
  buffer:Buffer.from('symbol,price,change_pct,volume,rvol,float,spread_pct\nFAKE,4,10,2000000,2,8000000,1.5\n')});
 await scanner.getByRole('button',{name:'Evaluate saved scanner criteria'}).click();
 await page.waitForTimeout(400);
 const scanOutput=await scanner.innerText();
 const statusOutput=await region.locator('p[role=status]').first().innerText();
 assert.match(scanOutput,/1 \/ 1 supplied snapshot rows matched/,
   'Saved scanner integration failed. Panel: '+scanOutput.slice(-450)+'; status: '+statusOutput);
 assert.equal(writes,5,'scanner inspection cannot mutate a saved Watchlist record');
 await region.locator('.cl-wi-editor label').filter({hasText:'Candidate lifecycle status'}).locator('select').selectOption('QUALIFIED');
 await region.locator('.cl-wi-editor label').filter({hasText:'Checkpoint evidence'}).locator('input')
  .fill('Member documented initial fictional research evidence without claiming a live market trigger.');
 await region.getByRole('button',{name:'Save candidate status with evidence'}).click();
 await page.waitForFunction(()=>[...document.querySelectorAll('.cl-wi-layout select option')]
   .some(x=>x.textContent?.includes('QUALIFIED /')),null,{timeout:10000});
 assert.equal(record.payload.candidateState,'QUALIFIED','Candidate status must persist through the authenticated workspace API');
 assert.equal(record.payload.researchHistory.at(-1).kind,'CANDIDATE_STATE_CHANGE');
 assert.equal(writes,6,'candidate lifecycle must use one revision-guarded save');
 await region.locator('.cl-wi-learning-v3 textarea').fill('I verified the fictional source time and would stop if the source chronology changed.');
 await region.getByRole('button',{name:'Save Talia research reflection'}).click();
 await page.waitForFunction(()=>document.querySelector('.cl-wi-v2 p[role=status]')?.textContent.includes('Ungraded Talia research reflection'),null,{timeout:10000});
 assert.equal(record.payload.researchHistory.at(-1).kind,'TALIA_RESEARCH_REFLECTION');
 assert.equal(writes,7,'Talia reflection must use a single revision-guarded private save');
 await region.locator('label').filter({hasText:'Optional existing saved Trade-Plan snapshot ID'}).locator('input').fill('123');
 await region.getByRole('button',{name:'Create Journal draft from saved plan'}).click();
 const journalLink=region.getByRole('link',{name:'Open this private Journal draft'});
 await journalLink.waitFor();
 assert.match(await journalLink.getAttribute('href'),/journal-entry.html\\?id=555/);
 assert.equal(writes,7,'Journal draft creation must not silently modify Watchlist record');
 await page.evaluate(()=>window.__watchlistAuthListener('SIGNED_OUT',null));
 assert.equal(await region.isHidden(),true,'private panel must hide on sign-out');
 assert.equal(await region.innerText(),'','private notes must be destroyed on sign-out, not only visually hidden');
 console.log('PASS Chrome Watchlist V2: private optimistic writes, folder/tag/stage, archive/restore, saved scanner filter, manual monitor, Journal link and sign-out scrub');
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
