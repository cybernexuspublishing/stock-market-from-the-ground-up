/* Local mock API authorization tests. No live user secrets or database writes. */
import assert from 'node:assert/strict';
import {onRequest as planApi} from '../functions/api/plan-controls.js';
import {toolAccess} from '../functions/api/member-tool-access.js';
import {onRequest as labApi} from '../functions/api/lab-content.js';
import {onRequest as trainingApi} from '../functions/api/interactive-training.js';
const env={SUPABASE_URL:'https://unit.supabase.test',SUPABASE_PUBLISHABLE_KEY:'unit_public',SUPABASE_SECRET_KEY:'unit_secret',ENABLE_PAID_CHECKOUT:'false',REQUIRE_STAFF_AAL2_V135:'false'};
let accountKind='member',owner=true,access=true,bookGrant=true,flagStatus='active',reads=[],mutations=[],gradeComplete=false;
const protectedGradingReport={score:100,correct:1,total:1,note:'Reviewed teaching feedback',
 sourceStatus:'book_authored_unverified_market',
 details:[{question:'Which observation is supported?',submitted:'YES',correct:true,
   answer:'SECRET_GRADING_KEY_DO_NOT_EXPOSE',explanation:'Examine the visible open and close prices.'}],
 answer_key:{direction:'SECRET_GRADING_KEY_DO_NOT_EXPOSE'},privateRubric:'SECRET_RUBRIC_DO_NOT_EXPOSE'};
function mockData(path,init){if(path.includes('/auth/v1/user'))return {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'};
 if(path.includes('profiles?'))return[{account_kind:accountKind}];
 if(path.includes('admin_user_flags?'))return [{status:flagStatus}];
 if(path.includes('admin_user_roles?'))return owner?[{role_code:'OWNER',expires_at:null}]:[];
 if(path.includes('rpc/user_has_tool_access'))return access;
 if(path.includes('platform_plans?')&&init.method==='PATCH')throw Error('Plan visibility must be atomic through RPC');
 if(path.includes('platform_plans?'))return[{plan_code:'FULL_MONTHLY',name:'Full',active:true,public_visible:true,checkout_enabled:false,price_cents:6999,billing_interval:'month'}];
 if(path.includes('rpc/v014_owner_plan_visibility')){mutations.push(JSON.parse(init.body));return {ok:true,planCode:'FULL_MONTHLY',active:false,publicVisible:false,checkoutEnabled:false}}
 if(path.includes('platform_labs?'))return[{lab_id:'F2-C07-L01',book_code:'FOUNDATION_BOOK_2',active:true,registry_visible:true}];
 if(path.includes('lab_instruction_v014?'))return[{lab_id:'F2-C07-L01',book_number:2,content:{id:'F2-C07-L01',book:2,concept:'Construct a candle'}}];
 if(path.includes('lab_training_sets_v014?'))return[{lab_id:'F2-C07-L01',version:1,review_state:'reviewed',source_status:'book_authored_unverified_market',questions:[{id:'direction',kind:'choice',prompt:'Does Close exceed Open?',options:['YES','NO'],explanation:'PRIVATE'}]}];
 if(path.includes('lab_training_attempts_v014?'))return [{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',user_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lab_id:'F2-C07-L01',mode:'guided',step_index:gradeComplete?1:0,completed_at:gradeComplete?'2026-10-26T12:00:00Z':null,report:gradeComplete?protectedGradingReport:null}];
 if(path.includes('rpc/v014_training_start'))return {id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',lab_id:'F2-C07-L01',mode:'guided',step_index:0,completed_at:null};
 if(path.includes('rpc/v014_training_answer'))return gradeComplete?{ok:true,complete:true,report:protectedGradingReport,privateAnswer:'SECRET_GRADING_KEY_DO_NOT_EXPOSE'}:{ok:true,complete:false,stepIndex:1,correct:true,explanation:'Authored explanation'};
 if(path.includes('user_library?'))return bookGrant?[{product_code:'FOUNDATION_BOOK_2',expires_at:null}]:[];
 if(path.includes('book_key_redemptions?'))return[];
 return[];
}
globalThis.fetch=async (input,opts={})=>{const path=String(input),init={method:opts.method||'GET',body:opts.body};reads.push(path);return new Response(JSON.stringify(mockData(path,init)),{status:200,headers:{'content-type':'application/json'}})};
const request=(path,method='GET',body=null,session=true)=>new Request('https://example.test'+path,{method,headers:{...(session?{authorization:'Bearer example-jwt'}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
let r=await planApi({request:request('/api/plan-controls','GET',null,false),env});assert.equal(r.status,401);
accountKind='showcase';r=await planApi({request:request('/api/plan-controls'),env});assert.equal(r.status,403);
accountKind='member';owner=false;r=await planApi({request:request('/api/plan-controls'),env});assert.equal(r.status,403);
owner=true;r=await planApi({request:request('/api/plan-controls'),env});assert.equal(r.status,200);
r=await planApi({request:request('/api/plan-controls','POST',{planCode:'FULL_MONTHLY',active:false,publicVisible:false,checkoutEnabled:true}),env});assert.equal(r.status,403,'Cannot enable checkout from Owner plan UI');
r=await planApi({request:request('/api/plan-controls','POST',{planCode:'FULL_MONTHLY',active:false,publicVisible:false,pauseCheckout:true}),env});assert.equal(r.status,200);assert.equal(mutations.at(-1).p_pause_checkout,true);
accountKind='showcase';let a=await toolAccess(env,request('/api/member-tool-access'),'MARKET_SIMULATOR');assert.equal(a.authorized,false);
accountKind='member';flagStatus='suspended';a=await toolAccess(env,request('/api/member-tool-access'),'MARKET_SIMULATOR');assert.equal(a.authorized,false,'Suspended member must be denied at the server');flagStatus='active';access=false;a=await toolAccess(env,request('/api/member-tool-access'),'MARKET_SIMULATOR');assert.equal(a.authorized,false);
access=true;a=await toolAccess(env,request('/api/member-tool-access'),'MARKET_SIMULATOR');assert.equal(a.authorized,true);
r=await labApi({request:request('/api/lab-content?id=F2-C07-L01'),env});assert.equal(r.status,200);assert.equal((await r.json()).lab.id,'F2-C07-L01');
r=await trainingApi({request:request('/api/interactive-training?action=start','POST',{labId:'F2-C07-L01',mode:'guided'}),env});assert.equal(r.status,201);let body=await r.json();assert.equal(body.question.explanation,undefined,'Never leak feedback before graded answer');
r=await trainingApi({request:request('/api/interactive-training?action=available&labId=F2-C07-L01'),env});body=await r.json();assert.equal(body.questionCount,1);assert.equal(JSON.stringify(body).includes('PRIVATE'),false);
r=await trainingApi({request:request('/api/interactive-training?action=answer','POST',{attemptId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',answer:'YES',expectedStep:0}),env});assert.equal(r.status,200);assert(reads.some(x=>x.includes('rpc/v014_training_answer')));
gradeComplete=true;
r=await trainingApi({request:request('/api/interactive-training?action=answer','POST',{attemptId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',answer:'YES',expectedStep:0}),env});
assert.equal(r.status,200);
body=await r.json();
assert.equal(body.knowledgeSync,'formative_mode_not_eligible','Guided grade must never sync official Knowledge evidence');
assert.equal(body.report.score,100);
assert.equal(body.report.details[0].explanation,'Examine the visible open and close prices.');
assert.equal(Object.hasOwn(body.report.details[0],'answer'),false,'Member feedback must never expose protected answer keys');
assert.equal(JSON.stringify(body).includes('SECRET_GRADING_KEY_DO_NOT_EXPOSE'),false);
assert.equal(JSON.stringify(body).includes('SECRET_RUBRIC_DO_NOT_EXPOSE'),false);
r=await trainingApi({request:request('/api/interactive-training?action=resume&id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),env});
assert.equal(r.status,200);body=await r.json();
assert.equal(body.complete,true);assert.equal(body.report.score,100);
assert.equal(JSON.stringify(body).includes('SECRET_GRADING_KEY_DO_NOT_EXPOSE'),false,'Completed resume must not leak the stored answer key');
assert.equal(JSON.stringify(body).includes('SECRET_RUBRIC_DO_NOT_EXPOSE'),false,'Completed resume must not leak the private rubric');
assert.equal(reads.some(x=>x.includes('rpc/gu_v014105_sync_reviewed_knowledge')),false,'Formative completion must not call knowledge sync RPC');
gradeComplete=false;
bookGrant=false;owner=false;r=await trainingApi({request:request('/api/interactive-training?action=start','POST',{labId:'F2-C07-L01',mode:'guided'}),env});assert.equal(r.status,403,'Standalone training entitlement must not reveal unpaid Book II instruction');bookGrant=true;owner=true;
accountKind='showcase';r=await trainingApi({request:request('/api/interactive-training?action=available&labId=F2-C07-L01'),env});assert.equal(r.status,403);
console.log('PASS: Owner-only plan mutations, checkout disabled, synthetic/test denial, tool access, private Lab delivery, no pre-answer feedback/key leaks');
