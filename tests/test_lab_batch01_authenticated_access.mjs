/* 2026-10-25-B01: mock the real Cloudflare functions and private Supabase
 * boundary. No tokens, purchase, member data or live payment is used.
 */
import assert from 'node:assert/strict';
import {onRequest as labContent} from '../functions/api/lab-content.js';
import {onRequest as labContext} from '../functions/api/lab-player-context.js';

const env={SUPABASE_URL:'https://qa.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_qa',
 SUPABASE_SECRET_KEY:'sb_secret_qa'};
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let kind='member',accountStatus='active',premium=false,ownsBook=false,ownedBookCode='FOUNDATION_BOOK_1',authValid=true;
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
 if(u.pathname==='/rest/v1/admin_user_roles')return reply([]);
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
  return reply(ownsBook&&u.searchParams.get('product_code')==='eq.'+ownedBookCode?[{product_code:ownedBookCode,expires_at:null}]:[]);
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
 assert.equal(r.body.lab.id,'F1-C02-L01','Authenticated sample retains its canonical Lab identifier');
 assert.equal(r.body.lab.concept,'Original source-critical thinking case','Original conceptual teaching survives the source allowlist');
 assert(!Object.hasOwn(r.body.lab,'lessonBatch'),'Internal editorial batch provenance must not appear in member API');
 assert(!Object.hasOwn(r.body.lab,'internalGradingClaim'),'Private grading claims must not appear in member API');
 assert(!Object.hasOwn(r.body.lab,'goal'),'Unreviewed private authoring fields must not leak through the teaching allowlist');
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
 // Batch B01 registry contract: exercise all twenty existing private Lab IDs,
 // not a representative pair. Book entitlements are separately scoped.
 const b01=["F1-C02-L01","F1-C02-L02","F1-C04-L01","F1-C06-L01","F1-C07-L01","F1-C07-L02","F1-C08-L01","F1-C08-L02","F1-C08-L03","F1-C09-L01","F1-C10-L01","F1-C10-L02","F1-C12-L01","F1-C13-L01","F1-C13-L02","F2-C01-L01","F2-C02-L01","F2-C02-L02","F2-C02-L03","F2-C03-L01"];
 assert.equal(new Set(b01).size,20,'Exactly twenty canonical B01 IDs');
 accountStatus='active';kind='member';premium=false;ownsBook=true;
 for(const [book,selected] of [['FOUNDATION_BOOK_1',b01.filter(x=>x.startsWith('F1-'))],
                                ['FOUNDATION_BOOK_2',b01.filter(x=>x.startsWith('F2-'))]]){
  ownedBookCode=book;
  for(const id of selected){
   const result=await check(req(id));
   assert.equal(result.status,200,id+' must be available to the matching book owner');
   assert.equal(result.body.instructionReviewed,false,id+' private draft is not editorially reviewed');
   assert.equal(result.body.assessmentReviewed,false,id+' has no reviewed assessment');
   assert.equal(result.body.lab?.id,id,id+' must retain its canonical Lab ID');
   assert.equal(result.body.lab?.concept,'Original source-critical thinking case',id+' must expose the approved conceptual teaching field');
   assert(!Object.hasOwn(result.body.lab,'lessonBatch'),id+' must not leak internal editorial batch metadata');
   assert(!Object.hasOwn(result.body.lab,'internalGradingClaim'),id+' must not leak private grading claims');
   assert(!Object.hasOwn(result.body.lab,'goal'),id+' must not forward arbitrary private authoring metadata');
   assert(!JSON.stringify(result.body).includes('PRIVATE_DO_NOT_FORWARD'),id+' cannot leak a hidden rubric');
  }
 }
 ownedBookCode='FOUNDATION_BOOK_1';
 for(const id of b01.filter(x=>x.startsWith('F2-')&&x!=='F2-C01-L01')){
  const result=await check(req(id));
  assert.equal(result.status,403,id+' Book II material cannot be obtained with Book I alone');
 }
 ownedBookCode='FOUNDATION_BOOK_2';
 for(const id of b01.filter(x=>x.startsWith('F1-')&&x!=='F1-C02-L01')){
  const result=await check(req(id));
  assert.equal(result.status,403,id+' Book I material cannot be obtained with Book II alone');
 }
 console.log('PASS all 20 B01 ID access checks for both book rights and cross-book denial; private drafts never grade');
}finally{globalThis.fetch=saveFetch}
