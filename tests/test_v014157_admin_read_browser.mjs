/* D16/17 static fixture Playwright — only localhost mock APIs, no Supabase,
 * Stripe, paid checkout, entitlement grants, role mutations, or login writes.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Only local static source fixtures are permitted.');
const person='123e4567-e89b-12d3-a456-426614174000';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:860},serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await ctx.newPage(),pageErrors=[],actions=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await ctx.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!==base)return route.abort();
   if(url.pathname==='/assets/js/supabase-client.js'){
    return route.fulfill({status:200,contentType:'application/javascript',body:
     'window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:"safe-local-staff-token"}}})}});'});
   }
   if(url.pathname==='/api/admin'){
    assert.equal(route.request().method(),'GET','Unified Admin preview cannot perform edits');
    const action=url.searchParams.get('action');actions.push(action);
    const result=action==='context'?{ok:true,roles:['OWNER'],permissions:['control_panel.access','users.view','roles.view','audit.view']}:
     action==='users'?{ok:true,users:[{id:person,email:'member@example.test',flag:{status:'active'}}],page:1,perPage:50,hasNext:false,searchScope:'CURRENT_AUTH_PAGE_ONLY'}:
     action==='user_summary'?{ok:true,minimized:true,user:{id:person,email:'member@example.test'},profile:{username:'MemberA',account_kind:'member'},flag:{status:'active'},roles:[],activity:{journalCount:0,labAttemptCount:0}}:
     action==='roles'?{ok:true,roles:[{role_code:'OWNER',name:'Owner'}],rolePermissions:[{role_code:'OWNER',permission_code:'users.view'}]}:
     action==='audit'?{ok:true,entries:[],page:1,perPage:50,hasNext:false}:{ok:true,summary:{}};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
   }
   return route.continue();
  });
  try{
   const response=await page.goto(base+'/admin-unified-preview.html#members',{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200);
   await page.getByRole('button',{name:'Inspect member'}).waitFor({timeout:12000});
   await page.getByRole('button',{name:'Inspect member'}).click();
   await page.waitForFunction(()=>document.querySelector('#unified-results')?.textContent?.includes('MemberA'),null,{timeout:12000});
   assert.match(await page.locator('#unified-status').innerText(),/Read-only minimized member information/);
   assert.match(await page.locator('#unified-results').innerText(),/MemberA/);
   assert(!/private note|bank account|stripe customer/i.test(await page.locator('#unified-results').innerText()));
   await page.getByRole('button',{name:'Back to Members'}).click();
   await page.getByRole('button',{name:'Audit Log'}).click();
   await page.getByRole('button',{name:'Previous page'}).waitFor({timeout:12000});
   assert.equal(await page.getByRole('button',{name:'Previous page'}).isDisabled(),true);
   assert(actions.includes('user_summary')&&actions.includes('audit'));
   assert.deepEqual(pageErrors,[], 'Unified Admin must have zero JavaScript crashes');
   console.log('PASS local Admin '+width+'px member inspection, private summary and audit pagination');
  }finally{await ctx.close()}
 }
}finally{await browser.close()}
