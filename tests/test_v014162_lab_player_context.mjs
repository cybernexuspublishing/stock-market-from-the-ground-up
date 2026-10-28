/* Canonical registry fallback: no provider calls or leaking unpublished lab details. */
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/lab-player-context.js';
const old=globalThis.fetch,user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
let active=true,authorized=true,interactive=false,kind='member',storedCode='DAY_TRADING_BOOK_1',ownsBook=false,howOverride=null;const calls=[];
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,init={})=>{
 const target=String(url);calls.push({target,init});
 if(target.endsWith('/auth/v1/user'))return json({id:user});
 if(target.includes('/profiles?'))return json([{account_kind:kind}]);
 if(target.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(target.endsWith('/rpc/user_has_tool_access'))return json(JSON.parse(init.body||'{}').target_tool==='INTERACTIVE_LEARNING'?interactive:authorized);
 if(target.includes('/user_library?'))return json(ownsBook?[{product_code:storedCode,expires_at:null}]:[]);
 if(target.includes('/book_key_redemptions?'))return json([]);
 if(target.includes('/user_plan_grants?'))return json([]);
 if(target.includes('/site_subscriptions?'))return json([]);
 if(target.includes('/admin_user_roles?'))return json([]);
 if(target.includes('/platform_labs?')){
  assert.equal(init.headers.apikey,'sb_secret_test');
  assert.equal(init.headers.authorization,undefined,'Modern service key cannot be used as JWT');
  return json([{lab_id:(new URL(target)).searchParams.get('lab_id')?.replace(/^eq\./,'')||'DT-C01-L01',title:'Position sizing practice',book_code:storedCode,chapter_number:null,
   ticker:null,historical_date:null,timeframe:null,lab_type:'interactive',active,registry_visible:true,
   metadata:{what:'Define the risk per share before sizing.',why:'A fixed loss limit needs a known invalidation.',when:'Before a hypothetical entry.',
    objective:'Explain the position-size constraint.',how:howOverride||['Identify the limit.','Calculate risk per share.','Check size.'],
    questions:['What changes if the stop is wider?'],answer_key:'NEVER RETURN THIS'}}]);
 }
 throw Error('Unexpected request '+target);
};
const req=(id='DT-C01-L01')=>new Request('https://local.example/api/lab-player-context?id='+encodeURIComponent(id),{headers:{authorization:'Bearer member.jwt'}});
try{
 let r=await onRequest({env,request:req()});assert.equal(r.status,200);
 let b=await r.json();assert.equal(b.ok,true);assert.equal(b.lab.id,'DT-C01-L01');
 assert.equal(b.sourceStatus,'canonical_registry_safe_orientation_only');
 assert.equal(b.advancedAllowed,true);
 assert.equal(b.lab.goal,'Explain the position-size constraint.');
 assert.equal(b.lab.teaching.what,'Define the risk per share before sizing.');
 assert.equal(b.lab.practiceSteps.length,3);
 assert.equal(b.lab.start,'','A canonical-only orientation must not invent a historical observation start');
 assert.equal(b.lab.end,'','A canonical-only orientation must not invent a replay end time');
 assert.match(b.lab.dataNote,/Canonical registry metadata only/);
 assert(!JSON.stringify(b).includes('NEVER RETURN THIS'));
 assert(!JSON.stringify(b).includes('rubric'));
 assert(!JSON.stringify(b).includes('correctAnswer'));
 // The curriculum's nine-step sequence must reach Review, Transfer and Results.
 // Keep a strict bound: metadata must not be allowed to stream arbitrary extra steps.
 howOverride=['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results','UNTRUSTED_TENTH'];
 r=await onRequest({env,request:req()});assert.equal(r.status,200);
 b=await r.json();
 assert.deepEqual(b.lab.teaching.how,howOverride.slice(0,9));
 assert.deepEqual(b.lab.practiceSteps,howOverride.slice(0,9));
 assert(!JSON.stringify(b).includes('UNTRUSTED_TENTH'));
 assert(!JSON.stringify(b).includes('NEVER RETURN THIS'));
 howOverride=null;
 active=false;r=await onRequest({env,request:req()});assert.equal(r.status,404);
 active=true;authorized=false;interactive=true;
 r=await onRequest({env,request:req()});assert.equal(r.status,200,'Interactive Learning purchase reaches authorized metadata-only Lab study');
 b=await r.json();assert.equal(b.advancedAllowed,true);
 assert.equal(b.sourceStatus,'canonical_registry_safe_orientation_only');
 storedCode='SITE_EXCLUSIVE';r=await onRequest({env,request:req('SITE-018')});
 assert.equal(r.status,403,'Interactive tool alone must not unlock the 83 Upcoming private QA lessons');
 storedCode='DAY_TRADING_BOOK_1';interactive=false;
 r=await onRequest({env,request:req()});assert.equal(r.status,403);
 storedCode='DAY_TRADING_BOOK_1';ownsBook=true;
 r=await onRequest({env,request:req()});assert.equal(r.status,200,'Book-only member gets matching guided orientation');
 b=await r.json();assert.equal(b.guidedAllowed,true);assert.equal(b.advancedAllowed,false);
 ownsBook=false;r=await onRequest({env,request:req()});assert.equal(r.status,403,'No book or tool means denied');
 storedCode='SITE_EXCLUSIVE';authorized=true;
 authorized=true;kind='showcase';r=await onRequest({env,request:req()});assert.equal(r.status,403);
 r=await onRequest({env,request:req('%27%20OR%201%3D1')});assert.equal(r.status,400);
 assert(calls.some(x=>x.target.includes('lab_id=eq.DT-C01-L01')));

 // Premium RPC errors must not prevent a member's matching-book Guided access.
 let rpcFail=false;
 const previousFetch=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{
  if(String(url).endsWith('/rpc/user_has_tool_access')&&rpcFail)return json({code:'PGRST202'},404);
  return previousFetch(url,init);
 };
 kind='member';storedCode='DAY_TRADING_BOOK_1';ownsBook=true;rpcFail=true;
 r=await onRequest({env,request:req()});assert.equal(r.status,200,'Owned book Guided works despite missing premium RPC');
 b=await r.json();assert.equal(b.advancedAllowed,false);
 storedCode='SITE_EXCLUSIVE';rpcFail=true;
 r=await onRequest({env,request:req('SITE-018')});assert.equal(r.status,503,'Site-exclusive cannot bypass missing premium RPC');
 assert.equal((await r.json()).code,'LAB_PREMIUM_UNAVAILABLE','Safe stage identifies the failing authorization dependency');
 storedCode='FOUNDATION_BOOK_1';rpcFail=true;ownsBook=false;
 r=await onRequest({env,request:req('F1-C02-L01')});assert.equal(r.status,200,'Approved free sample works for signed-in member despite RPC outage');
 globalThis.fetch=previousFetch;
 console.log('PASS D12 canonical member fallback, modern private service header, unpublished/Showcase/unauthorized and malformed ID denials');
}finally{globalThis.fetch=old}
