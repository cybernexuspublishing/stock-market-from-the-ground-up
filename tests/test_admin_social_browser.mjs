/* Credential-free browser validation of the Owner social frontend at multiple viewport sizes.
 * Local mocked Supabase and social endpoint only. No actual X, database, or payment requests.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const paths=['assets/css/admin-social-zero-cost.css','assets/js/admin-social-operations-v014278.js'];
for(const path of paths)assert(readFileSync(path,'utf8').length>100);
try{
 for(const width of [390,900,1280,1440]){
  const context=await browser.newContext({viewport:{width,height:850}});
  const page=await context.newPage();
  await page.setContent('<!doctype html><html><head></head><body><main id="marketing-social-fixture"></main></body></html>');
  await page.addStyleTag({path:paths[0]});
  await page.evaluate(()=>{
   const id='11111111-1111-4111-8111-111111111111';
   const state={
    ok:true,account:{platform:'x',handle:'@SMFGUAcademy',connectionStatus:'manual_only',apiPublishingEnabled:false,platformApiSpendingLimitCents:0},
    providers:[{id:'x',name:'X',account:'@SMFGUAcademy',connection:'manual_only',apiPublishing:false,manuallyPublishable:true,
       automatedCommunityJoin:false,policy:'Native manual joining only.'}],
    accounts:[],posts:[],communities:[],campaigns:[],templates:[],tasks:[],metrics:[],audit:[]
   };
   window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture-no-real-secret'}}})}});
   window.fetch=async(path,opts={})=>{
    if(path!=='/api/admin-social')throw Error('Fixture blocked external request: '+path);
    if(opts.method!=='POST')return new Response(JSON.stringify(state),{status:200,headers:{'content-type':'application/json'}});
    const req=JSON.parse(opts.body),keyByAction={
     save_post:'posts',save_community:'communities',save_campaign:'campaigns',
     save_template:'templates',save_task:'tasks',save_account:'accounts',
     record_metrics:'metrics'
    };
    const key=keyByAction[req.action];
    if(!key)return new Response(JSON.stringify({ok:false,error:'Not implemented in fixture'}),{status:400});
    const record={id,
      ...(key==='posts'?{body:req.body,status:req.status||'draft',planned_at:req.plannedAt||null,
        version:1,campaign_id:req.campaignId||null,external_url:null}:{}),
      ...(key==='communities'?{name:req.name,community_url:req.communityUrl,membership_status:req.membershipStatus||'unknown',
        promotion_policy:req.promotionPolicy||'unverified',notes:req.notes||''}:{}),
      ...(key==='accounts'?{provider:req.provider,handle:req.handle,profile_url:req.profileUrl,notes:req.notes||'',
        connection_status:'manual_only'}:{})
    };
    state[key].unshift(record);
    return new Response(JSON.stringify({ok:true,record,publicationVerified:false}),{status:201,headers:{'content-type':'application/json'}});
   };
  });
  await page.addScriptTag({path:paths[1]});
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('groundup:marketing-social-ready',{
   detail:{container:document.getElementById('marketing-social-fixture')}
  })));
  await page.getByText('Manual-only',{exact:false}).first().waitFor();
  assert.equal(await page.getByRole('button',{name:'Social Accounts'}).count(),1);
  await page.getByRole('button',{name:'Social Accounts'}).click();
  await page.getByRole('heading',{name:'Platform connection directory'}).waitFor();
  await page.locator('[data-social-panel="accounts"] input[name="handle"]').fill('@SMFGUAcademy');
  await page.locator('[data-social-panel="accounts"] input[name="profileUrl"]').fill('https://x.com/SMFGUAcademy');
  await page.locator('[data-social-panel="accounts"] .social-form button[type="submit"]').click();
  await page.getByText('@SMFGUAcademy',{exact:true}).first().waitFor();
  await page.getByRole('button',{name:'Post Studio'}).click();
  await page.locator('[data-social-panel="posts"] textarea[name="body"]').fill('Learn what a candlestick shows before trading.');
  await page.locator('[data-social-panel="posts"] .social-form button[type="submit"]').first().click();
  await page.getByText('Learn what a candlestick shows before trading.',{exact:false}).first().waitFor();
  await page.getByRole('button',{name:'Calendar'}).click();
  await page.getByRole('heading',{name:'Publishing calendar'}).waitFor();
  await page.getByRole('button',{name:'Communities'}).click();
  await page.getByRole('heading',{name:'X Communities directory'}).waitFor();
  await page.getByRole('button',{name:'Campaigns'}).click();
  await page.getByRole('heading',{name:'Campaign manager'}).waitFor();
  await page.getByRole('button',{name:'Engagement tasks'}).click();
  await page.getByRole('heading',{name:'Engagement and follow-up queue'}).waitFor();
  await page.getByRole('button',{name:'Metrics'}).click();
  await page.getByRole('heading',{name:'Manual performance snapshot'}).waitFor();
  const state=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:window.innerWidth}));
  assert(state.scroll<=state.width+4,'Unexpected global horizontal overflow at '+width+': '+JSON.stringify(state));
  console.log('PASS social Owner fixture, saved accounts/drafts, tabs, calendar and viewport '+width+'px');
  await context.close();
 }
}finally{await browser.close()}
