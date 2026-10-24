/* Browser acceptance of the real production Founders Commons shell.
 * Localhost-only, mocked account data and no network/payment requests.
 * Authorization is independently verified against live PostgreSQL RLS.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Localhost-only testing');
const stub=mode=>`
window.getSupabaseClient=async()=>({
 auth:{getUser:async()=>({data:{user:{id:'11111111-1111-4111-8111-111111111111'}},error:null})},
 rpc:async(name,args)=>{
   if(name==='gu_founder_my_status_v014174')
     return {data:${JSON.stringify(mode)}==='denied'?{eligible:false}:
       ${JSON.stringify(mode)}==='standard'?{eligible:true,founderNumber:42,earnedTier:'FOUNDING_30',currentPlan:'FOUNDING_30',council:false}:
       {eligible:true,founderNumber:86,earnedTier:'FOUNDING_60',currentPlan:'FOUNDING_60',council:true},error:null};
   if(name==='gu_founder_commons_access_v014174')return {data:false,error:null};
   if(name==='gu_founder_cast_design_vote_v014176')return {data:{ok:true,recorded:true},error:null};
   return {data:null,error:{message:'Unknown RPC'}};
 },
 from:(table)=>{
   const categories=${JSON.stringify([
     ['F600_HEADQUARTERS','Founders Headquarters'],
     ['F600_LOUNGE','Founders Lounge'],
     ['F600_BUGS','Bug Reports and Technical Issues'],
     ['F600_SUGGESTIONS','Suggestions and Product Development'],
     ['F600_LEARNING','Learning and Trading Education'],
     ['F600_MEMBERSHIP','Memberships, Purchases and Sparks'],
     ['F600_COUNCIL','Founding Design Council'],
     ['F600_TRACKER','Feedback and Development Tracker']
   ])};
   const types={
     commons_forums:categories.filter(([id])=>${JSON.stringify(mode)}!=='standard'||id!=='F600_COUNCIL').map(([forum_code,name])=>({forum_code,name,description:'Private founding educational discussion'})),
     gu_founder_issues_v014176:[{topic_id:101,issue_kind:'bug',issue_state:'under_review',updated_at:'2026-10-24T17:00:00Z'}],
     gu_founder_design_ballots_v014176:${JSON.stringify(mode)}==='extended'?[{id:'22222222-2222-4222-8222-222222222222',title:'Vote on the next dashboard theme',description:'Choose one reviewed, accessible theme for the next site release.',choices:['Deep navy','Charcoal'],state:'open',opens_at:'2026-10-20T00:00:00Z',closes_at:'2026-11-01T00:00:00Z'}]:[]
   };
   const chain={select(){return this},eq(){return this},order(){return this},limit(){return this},then(resolve){return Promise.resolve(resolve({data:types[table]||[],error:null}))}};
   return chain;
 }
});`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,1280])for(const mode of ['denied','standard','extended']){
  const page=await browser.newPage({viewport:{width,height:920}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/assets/js/supabase-client.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:stub(mode)}));
  await page.route('**/assets/js/session-manager.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.goto(base+'/founders-commons.html',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#gu-f600-status').waitFor({state:'visible',timeout:30000});
  if(mode==='denied'){
    await page.locator('#gu-f600-access').waitFor({state:'visible'});
    assert.equal(await page.locator('#gu-f600-content').isVisible(),false,'No founder content for ordinary member');
  }else{
    await page.locator('#gu-f600-content').waitFor({state:'visible'});
    assert.match(await page.locator('#gu-f600-identity').innerText(),/Founding #00(42|86)/);
    assert.equal(await page.locator('#gu-f600-forums .gu-f600-forum').count(),8);
    if(mode==='standard'){
      assert.equal(await page.locator('a[href*="F600_COUNCIL"]').count(),0,'Standard Founder cannot navigate Design Council');
      assert.match(await page.locator('#gu-f600-ballots').innerText(),/reserved for eligible Extended/i);
    }else{
      assert.equal(await page.locator('a[href*="F600_COUNCIL"]').count(),1);
      await page.locator('#gu-f600-ballots .gu-f600-ballot').waitFor();
      await page.locator('#gu-f600-ballots input[type=radio]').first().check();
      await page.getByRole('button',{name:'Cast my one vote'}).click();
      assert.match(await page.locator('.gu-f600-vote-status').innerText(),/vote was recorded/i);
    }
  }
  const h=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
  assert.equal(h,false,'Founders Commons must not overflow at '+width+'px / '+mode);
  assert.deepEqual(errors,[],'No page errors: '+mode+' '+width);
  console.log('PASS Founders Commons '+mode+' at '+width+'px');
  await page.close();
 }
}finally{await browser.close()}
