/* v0.14.0 reviewed, server-graded training steps. No future market bars are
 * generated or exposed. This API is not a broker or a market-data feed.
 * All answer keys and attempts remain in service-role-only tables.
 */
import {toolAccess} from './member-tool-access.js';
import {getBookAccess,getBookCodeAccess} from './lab-content.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:H});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const esc=encodeURIComponent;
function cfg(env){const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),secret=String(env.SUPABASE_SECRET_KEY||'');if(!/^https:\/\/[^/]+$/.test(base)||!secret)throw fail('Training system configuration unavailable.',503);return {base,secret}}
// Opaque sb_secret_* Supabase keys MUST NOT be sent as Bearer JWTs.
const serviceHeaders=secret=>{const headers={apikey:secret,accept:'application/json'};if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))headers.authorization='Bearer '+secret;return headers};
async function db(env,path,method='GET',body){const c=cfg(env),r=await fetch(c.base+'/rest/v1/'+path,{method,headers:{...serviceHeaders(c.secret),...(body===undefined?{}:{'content-type':'application/json',prefer:'return=representation'})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'}),t=await r.text();if(!r.ok)throw fail('Training database contract unavailable; verify installed objects and server permissions.',503);try{return t?JSON.parse(t):[]}catch{throw fail('Invalid training database response.',503)}}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Reviewed book-derived exercises require BOTH a premium training entitlement
// and the matching book entitlement. The private Lab metadata is not public.
const publicSamples=new Set(['F1-C02-L01','F2-C01-L01','F3-C01-L01']);
async function requireMatchingBook(env,request,labId){
 const rows=await db(env,'lab_instruction_v014?select=book_number&lab_id=eq.'+esc(labId)+'&limit=1');
 const book=rows[0]?Number(rows[0].book_number):null;
 if(Number.isInteger(book)&&book>=1&&book<=3){
  if(!publicSamples.has(labId)&&!(await getBookAccess(env,request,book)))throw fail('An active matching book entitlement is required for this book-authored assessment.',403);
  return 'FOUNDATION_BOOK_'+book;
 }
 const published=await db(env,'platform_labs?select=lab_id,book_code,active,registry_visible&lab_id=eq.'+esc(labId)+'&limit=1');
 const lab=published[0];
 if(!lab||lab.active!==true||lab.registry_visible!==true)throw fail('This Lab is not in the released registry.',404);
 if(['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE'].includes(lab.book_code)){
  if(!(await getBookCodeAccess(env,request,lab.book_code)))throw fail('An active matching book entitlement is required for this assessment.',403);
  return lab.book_code;
 }
 if(lab.book_code==='SITE_EXCLUSIVE')return lab.book_code;
 throw fail('Unknown or unapproved Lab collection.',403);
}
function publicState(attempt,set){const step=attempt.step_index||0,n=set.questions.length;return{ok:true,attemptId:attempt.id,labId:attempt.lab_id,mode:attempt.mode,stepIndex:step,total:n,complete:!!attempt.completed_at,question:step<n?{id:set.questions[step].id,prompt:set.questions[step].prompt,kind:set.questions[step].kind,options:set.questions[step].options||[]}:null,report:attempt.completed_at?attempt.report:null,sourceStatus:set.source_status,note:set.source_status?.startsWith('original_hypothetical')?'Original hypothetical instructional assessment. Its invented numbers are NOT historical or actual market observations.':'Uses reviewed book-authored answers only. Historical market data/tape has not been independently verified.'}}
export async function onRequest({request,env}){try{
 const acl=await toolAccess(env,request,'ONDEMAND_TRAINING');if(!acl.authorized)return reply({ok:false,error:acl.reason},403);
 const u=new URL(request.url),action=u.searchParams.get('action')||'';
 if(action==='available'&&request.method==='GET'){const id=u.searchParams.get('labId')||'';if(!/^[A-Za-z0-9_-]{3,90}$/.test(id))throw fail('Invalid Lab ID.');await requireMatchingBook(env,request,id);const rows=await db(env,'lab_training_sets_v014?select=lab_id,version,review_state,source_status,title,questions&lab_id=eq.'+esc(id)+'&review_state=eq.reviewed&order=version.desc&limit=1');return reply({ok:true,available:!!rows[0],sourceStatus:rows[0]?.source_status||null,questionCount:rows[0]?.questions?.length||0})}
 if(action==='start'&&request.method==='POST'){const body=await request.json().catch(()=>null),id=String(body?.labId||''),mode=String(body?.mode||'');if(!/^[A-Za-z0-9_-]{3,90}$/.test(id)||!['guided','practice','blind','assessment'].includes(mode))throw fail('Valid Lab and learning mode required.');await requireMatchingBook(env,request,id);const sets=await db(env,'lab_training_sets_v014?select=lab_id,version,review_state,source_status,title,questions&lab_id=eq.'+esc(id)+'&review_state=eq.reviewed&order=version.desc&limit=1');const set=sets[0];if(!set)return reply({ok:false,error:'Reviewed question-by-question training is not published for this Lab.'},404);
 const record=await db(env,'rpc/v014_training_start','POST',{p_actor:acl.userId,p_lab:id,p_mode:mode});
 if(!record?.id)throw fail('Training attempt was not created.',503);
 // Resume uses the original review version, not a rubric published since start.
 const pinned=record.set_version===set.version?set:(await db(env,'lab_training_sets_v014?select=lab_id,version,review_state,source_status,questions&lab_id=eq.'+esc(id)+'&version=eq.'+Number(record.set_version)+'&limit=1'))[0];
 if(!pinned)throw fail('Pinned rubric version unavailable.',503);
 return reply(publicState(record,pinned),record.resumed?200:201)}
 if(action==='resume'&&request.method==='GET'){const id=u.searchParams.get('id')||'';if(!uuid.test(id))throw fail('Invalid attempt ID.');const rows=await db(env,'lab_training_attempts_v014?select=id,user_id,lab_id,set_version,mode,step_index,completed_at,report&id=eq.'+esc(id)+'&user_id=eq.'+esc(acl.userId)+'&limit=1');const a=rows[0];if(!a)return reply({ok:false,error:'Attempt not found.'},404);await requireMatchingBook(env,request,a.lab_id);const sets=await db(env,'lab_training_sets_v014?select=lab_id,version,review_state,source_status,questions&lab_id=eq.'+esc(a.lab_id)+'&version=eq.'+a.set_version+'&limit=1');const set=sets[0];if(!set)return reply({ok:false,error:'Training version unavailable.'},503);return reply(publicState(a,set))}
 if(action==='answer'&&request.method==='POST'){const b=await request.json().catch(()=>null),id=String(b?.attemptId||''),answer=String(b?.answer??'').trim();
 if(!uuid.test(id)||!answer||answer.length>600||!Number.isSafeInteger(b?.expectedStep)||b.expectedStep<0)throw fail('Attempt, current step, and response are required.');
 const attempts=await db(env,'lab_training_attempts_v014?select=lab_id&user_id=eq.'+esc(acl.userId)+'&id=eq.'+esc(id)+'&limit=1');if(!attempts[0])throw fail('Attempt not found.',404);await requireMatchingBook(env,request,attempts[0].lab_id);const r=await db(env,'rpc/v014_training_answer','POST',{p_actor:acl.userId,p_attempt:id,p_answer:answer,p_expected_step:b.expectedStep});if(!r?.ok)throw fail('Answer could not be evaluated.',503);return reply(r)}
 return reply({ok:false,error:'Unknown training action.'},405);
}catch(e){return reply({ok:false,error:e.message||'Training request failed.'},e.status||500)}}
