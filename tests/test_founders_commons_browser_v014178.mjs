/* Browser acceptance of the real production Founders Commons shell.
 * Localhost-only, mocked account data and no network/payment requests.
 * Authorization is independently verified against live PostgreSQL RLS.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Localhost-only testing');
const stub=mode=>`
const isStaff=${['admin','moderator'].includes(mode)};
window.getSupabaseClient=async()=>({
 auth:{getUser:async()=>({data:{user:{id:'11111111-1111-4111-8111-111111111111'}},error:null})},
 rpc:async(name,args)=>{
   if(name==='gu_founder_my_status_v014174')
     return {data:(${JSON.stringify(mode)}==='denied'||${JSON.stringify(mode)}==='qa'||isStaff)?{eligible:false}:
       ${JSON.stringify(mode)}==='standard'?{eligible:true,founderNumber:42,earnedTier:'FOUNDING_30',currentPlan:'FOUNDING_30',council:false}:
       ${JSON.stringify(mode)}==='starter'?{eligible:true,founderNumber:14,earnedTier:'FOUNDING_14',currentPlan:'FOUNDING_14',council:false}:
       {eligible:true,founderNumber:86,earnedTier:'FOUNDING_60',currentPlan:'FOUNDING_60',council:true},error:null};
   if(name==='gu_commons_staff_read_v20261028')return {data:isStaff,error:null};
   if(name==='gu_founder_commons_access_v014174')return {data:${JSON.stringify(mode)}!=='denied',error:null};
   if(name==='gu_founder_noncommercial_qa_v014289')return {data:${JSON.stringify(mode)}==='qa'&&args?.p_user==='11111111-1111-4111-8111-111111111111',error:null};
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
     commons_forums:categories.filter(([id])=>!['standard','starter'].includes(${JSON.stringify(mode)})||id!=='F600_COUNCIL').map(([forum_code,name])=>({forum_code,name,description:'Private founding educational discussion'})),
     commons_topics:[{id:98,forum_code:'F600_MEMBERSHIP',title:'Crownlight Sparks: included and purchased',body:'## WHAT CHANGED\\nCrownlight Sparks are nonexpiring learning credits.\\n\\n## DISCUSSION EXERCISE\\nNine Sparks minus four Sparks leaves five Sparks.',status:'published',is_official:true,author_label:'Official Founders Team',created_at:'2026-10-28T00:00:00Z',reply_count:0}],
     commons_posts:[],
     gu_founder_issues_v014176:[{topic_id:101,issue_kind:'bug',issue_state:'under_review',updated_at:'2026-10-24T17:00:00Z'}],
     gu_founder_design_ballots_v014176:${JSON.stringify(mode)}==='extended'?[{id:'22222222-2222-4222-8222-222222222222',title:'Vote on the next dashboard theme',description:'Choose one reviewed, accessible theme for the next site release.',choices:['Deep navy','Charcoal'],state:'open',opens_at:'2026-10-20T00:00:00Z',closes_at:'2026-11-01T00:00:00Z'}]:[]
   };
   let single=false;
   const chain={select(){return this},eq(){return this},in(){return this},order(){return this},limit(){return this},range(){return this},maybeSingle(){single=true;return this},then(resolve){const data=types[table]||[];return Promise.resolve(resolve({data:single?(data[0]||null):data,error:null,count:data.length}))}};
   return chain;
 }
});`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,900,1280,1440])for(const mode of ['denied','starter','standard','extended','qa','admin','moderator']){
  const page=await browser.newPage({viewport:{width,height:920}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/assets/js/supabase-client.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:stub(mode)}));
  await page.route('**/assets/js/session-manager.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.goto(base+'/founders-commons.html',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#gu-f600-status').waitFor({state:'visible',timeout:30000});
  assert.equal(await page.locator('#v134-commons-member-nav a[href="founders-commons.html"]').count(),1,'Founders navigation link must never duplicate');
  if(mode==='denied'){
    await page.locator('#gu-f600-access').waitFor({state:'visible'});
    assert.equal(await page.locator('#gu-f600-content').isVisible(),false,'No founder content for ordinary member');
    assert.equal(await page.locator('#gu-f600-beta-center').isVisible(),false,'Beta testing instructions must remain founder-private');
  }else{
    await page.locator('#gu-f600-content').waitFor({state:'visible'});
    await page.locator('#gu-f600-beta-center').waitFor({state:'visible'});
    await page.locator('#v13-commons .gu-commons-index-heading').first().waitFor({state:'visible'});
    assert.match(await page.locator('#v13-commons').innerText(),/Forum directory/);
    assert.equal(await page.locator('#gu-f600-beta-center article').count(),9,'All nine member feature families covered');
    assert.equal(await page.locator('#gu-f600-beta-center a[href="market-commons.html?forum=F600_BUGS"]').count(),1);
    assert.equal(await page.locator('#gu-f600-beta-center a[href="dashboard.html?tab=support"]').count(),2,'Private Support is available in workflow and reporting paths');
    assert.match(await page.locator('#gu-f600-beta-center').innerText(),/Guided Beta is ungraded/i);
    if(mode==='qa'){
      assert.match(await page.locator('#gu-f600-identity').innerText(),/Authorized Beta Tester/i);
      assert.doesNotMatch(await page.locator('#gu-f600-identity').innerText(),/Founding #|Earned Extended/i);
    }else if(mode==='admin'||mode==='moderator'){
      assert.match(await page.locator('#gu-f600-identity').innerText(),/Founders moderator/i);
      assert.doesNotMatch(await page.locator('#gu-f600-identity').innerText(),/Founding #|Earned Extended/i);
      assert.match(await page.locator('#gu-f600-status').innerText(),/staff oversight verified/i);
    }else assert.match(await page.locator('#gu-f600-identity').innerText(),/Founding #00(14|42|86)/);
    assert.equal(await page.locator('#gu-f600-forums .gu-f600-forum').count(),8);
    if(mode==='starter')assert.match(await page.locator('#gu-f600-identity').innerText(),/14-Day Starter|Earned Starter Founder/);
    if(mode==='starter'||mode==='standard'||mode==='qa'){
      assert.equal(await page.locator('#v13-commons a[href*="F600_COUNCIL"]').count(),0,'Starter, Standard or QA member cannot navigate Design Council');
      assert.match(await page.locator('#gu-f600-ballots').innerText(),/reserved for eligible Extended/i);
    }else if(mode==='admin'||mode==='moderator'){
      assert.equal(await page.locator('#v13-commons a[href*="F600_COUNCIL"]').count(),1,'Staff may inspect Council topics');
      assert.match(await page.locator('#gu-f600-ballots').innerText(),/reserved for eligible Extended/i,'Staff must not gain founder voting rights');
      assert.equal(await page.locator('#gu-f600-ballots .gu-f600-ballot').count(),0);
    }else{
      assert.equal(await page.locator('#v13-commons a[href*="F600_COUNCIL"]').count(),1);
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
 // This intentionally tests a mocked published Founder discussion and the real
 // production page/renderer source on localhost. It is NOT an authenticated
 // production acceptance of delegated staff credentials.
 for(const mode of ['starter','standard','extended','admin','moderator']){
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/assets/js/supabase-client.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:stub(mode)}));
  await page.route('**/assets/js/session-manager.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.goto(base+'/founders-commons.html?topic=98',{waitUntil:'domcontentloaded',timeout:30000});
  const article=page.locator('[data-forum-content="topic"][data-content-id="98"]');
  await article.waitFor({state:'visible',timeout:30000});
  assert.match(await article.innerText(),/Crownlight Sparks are nonexpiring learning credits/);
  assert.equal(await article.locator('.v133-guide-body h2').count(),2,'V2 heading structure should render');
  assert.match(await article.innerText(),/Nine Sparks minus four Sparks leaves five Sparks/);
  assert.deepEqual(errors,[],'No topic-render errors: '+mode);
  console.log('PASS Founders Commons topic #98 mock render '+mode);
  await page.close();
 }
}finally{await browser.close()}
