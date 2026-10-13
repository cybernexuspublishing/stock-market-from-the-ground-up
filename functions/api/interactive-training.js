/* v0.14.0 reviewed, server-graded training steps. No future market bars are
 * generated or exposed. This API is not a broker or a market-data feed.
 * All answer keys and attempts remain in service-role-only tables.
 */
import {toolAccess} from './member-tool-access.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:H});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const esc=encodeURIComponent;
function cfg(env){const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),secret=env.SUPABASE_SECRET_KEY;if(!base||!secret)throw fail('Training system configuration unavailable.',503);return {base,secret}}
async function db(env,path,method='GET',body){const c=cfg(env),r=await fetch(c.base+'/rest/v1/'+path,{method,headers:{apikey:c.secret,authorization:'Bearer '+c.secret,accept:'application/json',...(body===undefined?{}:{'content-type':'application/json',prefer:'return=representation'})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'}),t=await r.text();if(!r.ok)throw fail('Training database contract unavailable; verify the new migration.',503);try{return t?JSON.parse(t):[]}catch{throw fail('Invalid training database response.',503)}}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function publicState(attempt,set){const step=attempt.step_index||0,n=set.questions.length;return{ok:true,attemptId:attempt.id,labId:attempt.lab_id,mode:attempt.mode,stepIndex:step,total:n,complete:!!attempt.completed_at,question:step<n?{id:set.questions[step].id,prompt:set.questions[step].prompt,kind:set.questions[step].kind,options:set.questions[step].options||[]}:null,report:attempt.completed_at?attempt.report:null,sourceStatus:set.source_status,note:'Uses reviewed book-authored answers only. Historical market data/tape has not been independently verified.'}}
export async function onRequest({request,env}){try{
 const acl=await toolAccess(env,request,'ONDEMAND_TRAINING');if(!acl.authorized)return reply({ok:false,error:acl.reason},403);
 const u=new URL(request.url),action=u.searchParams.get('action')||'';
 if(action==='available'&&request.method==='GET'){const id=u.searchParams.get('labId')||'';if(!/^[A-Za-z0-9_-]{3,90}$/.test(id))throw fail('Invalid Lab ID.');const rows=await db(env,'lab_training_sets_v014?select=lab_id,version,review_state,source_status,title,questions&lab_id=eq.'+esc(id)+'&review_state=eq.reviewed&order=version.desc&limit=1');return reply({ok:true,available:!!rows[0],sourceStatus:rows[0]?.source_status||null,questionCount:rows[0]?.questions?.length||0})}
 if(action==='start'&&request.method==='POST'){const body=await request.json().catch(()=>null),id=String(body?.labId||''),mode=String(body?.mode||'');if(!/^[A-Za-z0-9_-]{3,90}$/.test(id)||!['guided','practice','blind','assessment'].includes(mode))throw fail('Valid Lab and learning mode required.');const sets=await db(env,'lab_training_sets_v014?select=lab_id,version,review_state,source_status,title,questions&lab_id=eq.'+esc(id)+'&review_state=eq.reviewed&order=version.desc&limit=1');const set=sets[0];if(!set)return reply({ok:false,error:'Reviewed question-by-question training is not published for this Lab.'},404);
 const record=await db(env,'rpc/v014_training_start','POST',{p_actor:acl.userId,p_lab:id,p_mode:mode});
 if(!record?.id)throw fail('Training attempt was not created.',503);
 // Resume uses the original review version, not a rubric published since start.
 const pinned=record.set_version===set.version?set:(await db(env,'lab_training_sets_v014?select=lab_id,version,review_state,source_status,questions&lab_id=eq.'+esc(id)+'&version=eq.'+Number(record.set_version)+'&limit=1'))[0];
 if(!pinned)throw fail('Pinned rubric version unavailable.',503);
 return reply(publicState(record,pinned),record.resumed?200:201)}
 if(action==='resume'&&request.method==='GET'){const id=u.searchParams.get('id')||'';if(!uuid.test(id))throw fail('Invalid attempt ID.');const rows=await db(env,'lab_training_attempts_v014?select=id,user_id,lab_id,set_version,mode,step_index,completed_at,report&id=eq.'+esc(id)+'&user_id=eq.'+esc(acl.userId)+'&limit=1');const a=rows[0];if(!a)return reply({ok:false,error:'Attempt not found.'},404);const sets=await db(env,'lab_training_sets_v014?select=lab_id,version,review_state,source_status,questions&lab_id=eq.'+esc(a.lab_id)+'&version=eq.'+a.set_version+'&limit=1');const set=sets[0];if(!set)return reply({ok:false,error:'Training version unavailable.'},503);return reply(publicState(a,set))}
 if(action==='answer'&&request.method==='POST'){const b=await request.json().catch(()=>null),id=String(b?.attemptId||''),answer=String(b?.answer??'').trim();
 if(!uuid.test(id)||!answer||answer.length>600||!Number.isSafeInteger(b?.expectedStep)||b.expectedStep<0)throw fail('Attempt, current step, and response are required.');
 const r=await db(env,'rpc/v014_training_answer','POST',{p_actor:acl.userId,p_attempt:id,p_answer:answer,p_expected_step:b.expectedStep});if(!r?.ok)throw fail('Answer could not be evaluated.',503);return reply(r)}
 return reply({ok:false,error:'Unknown training action.'},405);
}catch(e){return reply({ok:false,error:e.message||'Training request failed.'},e.status||500)}}
