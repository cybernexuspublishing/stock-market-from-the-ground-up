/* 2026-10-25-B01: mock the real Cloudflare functions and private Supabase
 * boundary. No tokens, purchase, member data or live payment is used.
 */
import assert from 'node:assert/strict';
import {onRequest as labContent} from '../functions/api/lab-content.js';
import {onRequest as labContext} from '../functions/api/lab-player-context.js';

const env={SUPABASE_URL:'https://qa.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_qa',
 SUPABASE_SECRET_KEY:'sb_secret_qa'};
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let kind='member',accountStatus='active',premium=false,ownsBook=false,authValid=true;
let providerOutage=false,privateReads=0,allCalls=[];
const saveFetch=globalThis.fetch;
const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const req=(labId='F1-C02-L01',token='valid')=>new Request('https://site.test/api/lab-content?id='+encodeURIComponent(labId),{headers:token?{authorization:'Bearer '+token}:{}});
const contextReq=(labId,token='valid')=>new Request('https://site.test/api/lab-player-context?id='+encodeURIComponent(labId),{headers:token?{authorization:'Bearer '+token}:{}});
globalThis.fetch=async(url,options={})=>{
 const s=String(url);allCalls.push(s);const u=new URL(s);
 if(u.pathname==='/auth/v1/user')
  return authValid&&options.headers.authorization==='Bearer valid'?reply({id:actor}):reply({error:'invalid'},401);
 if(u.pathname==='/rest/v1/profiles')return reply([{account_kind:kind}]);
 if(u.pathname==='/rest/v1/admin_user_flags')return reply([{status:accountStatus}]);
 if(u.pathname==='/rest/v1/rpc/user_has_tool_access')return providerOutage?reply({error:'offline'},503):reply(premium);
 if(u.pathname==='/rest/v1/lab_instruction_v014'){
  privateReads++;
  const id=decodeURIComponent(u.searchParams.get('lab_id')?.replace(/^eq\./,'')||'F1-C02-L01');
  return reply([{lab_id:id,book_number:id.startsWith('F2-')?2:1,
   source_status:'original_hypothetical_unreviewed_v01496',
   content:{id,concept:'Original source-critical thinking case',lessonBatch:'2026-10-25-B01',
    goal:'Document the observed source, timestamp and risk limitation',internalGradingClaim:false}}]);
 }
 if(u.pathname==='/rest/v1/platform_labs'){
  const id=decodeURIComponent(u.searchParams.get('lab_id')?.replace(/^eq\./,'')||'F1-C02-L02');
  return reply([{lab_id:id,book_code:id.startsWith('F2-')?'FOUNDATION_BOOK_2':'FOUNDATION_BOOK_1',
   title:'Document original evidence',chapter_number:2,
   ticker:null,historical_date:null,timeframe:null,lab_type:'research',
   active:true,registry_visible:true,metadata:{what:'Keep time and source attribution',
    why:'Prevent hindsight interpretations',how:['Choose a valid original source',
     'Document publication time','Separate observations and inference'],
    answer_key:'PRIVATE_DO_NOT_FORWARD'}}]);
 }
 if(u.pathname==='/rest/v1/user_library')
  return reply(ownsBook?[{product_code:'FOUNDATION_BOOK_1',expires_at:null}]:[]);
 if(['/rest/v1/book_key_redemptions','/rest/v1/user_plan_grants','/rest/v1/site_subscriptions',
      '/rest/v1/admin_user_roles'].includes(u.pathname))return reply([]);
 throw new Error('Unexpected privileged provider fetch '+s);
};
const check=async(request,fn=labContent)=>{const r=await fn({request,env});return {status:r.status,body:await r.json(),headers:r.headers}};
try{
 let r=await check(req('F1-C02-L01',''));
 assert.equal(r.status,401,'Guest must not access original private content, even for sample');
 assert.equal(privateReads,0,'Guests must not trigger a private Lab data lookup');
 assert.equal(r.headers.get('cache-control'),'private, no-store');
 authValid=false;
 r=await check(req());assert.equal(r.status,401,'Invalid bearer must be rejected before private reads');
 assert.equal(privateReads,0);
 authValid=true;
 kind='showcase';
 r=await check(req());assert.equal(r.status,403,'Showcase account cannot bypass Lab login gate via free sample');
 assert.equal(privateReads,0);
 kind='member';accountStatus='suspended';
 r=await check(req());assert.equal(r.status,403,'Suspended member cannot open sample');
 assert.equal(privateReads,0);
 accountStatus='restricted';
 r=await check(req());assert.equal(r.status,403,'Restricted member cannot open sample');
 assert.equal(privateReads,0);
 accountStatus='active';providerOutage=true;
 r=await check(req());
 assert.equal(r.status,200,'Eligible member must retain sample access if premium tool RPC is down');
 assert.equal(r.body.instructionReviewed,false);
 assert.equal(r.body.assessmentReviewed,false);
 assert.equal(r.body.lab.lessonBatch,'2026-10-25-B01');
 providerOutage=false;
 r=await check(req('F1-C02-L02'));
 assert.equal(r.status,403,'Free member lacking book and training must be denied non-sample');
 ownsBook=true;
 r=await check(req('F1-C02-L02'));
 assert.equal(r.status,200,'Matching book owner can open private authored companion');
 assert.equal(r.body.guidedAllowed,true);
 assert.equal(r.body.advancedAllowed,false);
 ownsBook=false;premium=true;
 r=await check(req('F1-C02-L02'));
 assert.equal(r.status,404,'Premium member without matching book must receive safe-context fallback, not private lesson');
 assert(!r.body.lab,'No privately authored Lab content in denied response');
 r=await check(contextReq('F1-C02-L02'),labContext);
 assert.equal(r.status,200,'Premium user can access separately entitled canonical orientation');
 assert.equal(r.body.sourceStatus,'canonical_registry_safe_orientation_only');
 assert.equal(r.body.instructionReviewed,false);
 assert.equal(r.body.assessmentReviewed,false);
 assert(!JSON.stringify(r.body).includes('PRIVATE_DO_NOT_FORWARD'));
 premium=false;kind='showcase';
 r=await check(contextReq('F1-C02-L02'),labContext);
 assert.equal(r.status,403,'Showcase account cannot retrieve private metadata through fallback');
 kind='member';accountStatus='active';
 r=await check(req('F2-C02-L01'));
 assert.equal(r.status,403,'A Book I entitlement cannot authorize Book II');
 assert(allCalls.some(x=>x.includes('/rest/v1/platform_labs')),'Canonical fallback must reach a separately authorized registry read');
 console.log('PASS Batch01 guest/expired/showcase/suspended/restricted; free sample; book isolation; premium safe fallback; no grade or private rubric leak');
}finally{globalThis.fetch=saveFetch}
