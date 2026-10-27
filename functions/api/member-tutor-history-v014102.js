/* v0.14.0.102: private, opt-in member-saved Tutor exchange history.
 * This is a learner's copy of an educational response, NOT authenticated
 * grading evidence or a verified AI transcript. No raw Journal/PII retrieval.
 * Uses the existing entitlement check and existing Supabase project.
 */
import {toolAccess} from './member-tool-access.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const out=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:H});
const UID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODES=new Set(['explain','question','review','practice']);
const TYPES=new Set(['reviewed-glossary-logic','original-competency-guide','authenticated-practice-history','grounded-model-draft','public-companion-glossary']);
function settings(env){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(url)||!key)throw Error('History storage unavailable');
 const headers={apikey:key,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key))headers.authorization='Bearer '+key;
 return {url,headers};
}
async function rest(env,path,init={}){
 const {url,headers}=settings(env);
 const response=await fetch(url+'/rest/v1/'+path,{cache:'no-store',...init,headers:{...headers,...(init.headers||{})}});
 if(!response.ok){
   const problem=await response.json().catch(()=>null);
   if(problem?.code==='P0001')throw Object.assign(new Error('Your 200 saved Tutor exchanges limit is reached. Delete older saved notes to make space.'),{status:409});
   if(problem?.code==='42703')throw Object.assign(new Error('Optional Tutor feedback columns are not installed.'),{status:503,code:'FEEDBACK_SCHEMA_MISSING'});
   throw Error('History storage unavailable');
  }
 const text=await response.text();
 try{return text?JSON.parse(text):null}catch{throw Error('History storage unavailable')}
}
function trimmed(x,max){return typeof x==='string'?x.trim().slice(0,max+1):''}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST','PATCH','DELETE'].includes(request.method))return out({ok:false,error:'Method not allowed'},405);
  const auth=await toolAccess(env,request,'MARKET_TUTOR');
  // Historic member-owned notes remain readable/editable/deletable after
  // cancellation or expiry. toolAccess has already verified the real Supabase
  // user, account eligibility, Showcase restrictions and member-scoped ID.
  // New Tutor responses continue to require MARKET_TUTOR entitlement at /api/market-tutor.
  if(auth.freeEligible!==true)return out({ok:false,error:'Eligible member account required for private Tutor notes.'},403);
  if(!UID.test(auth.userId))return out({ok:false,error:'Invalid member identity.'},403);
  const member=encodeURIComponent(auth.userId),url=new URL(request.url);
  if(request.method==='PATCH'||request.method==='DELETE'){
   const origin=request.headers.get('origin');
   if(origin&&origin!==url.origin)return out({ok:false,error:'Cross-origin Tutor history mutation denied.'},403);
   const site=request.headers.get('sec-fetch-site');
   if(site&&!['same-origin','none'].includes(site))
    return out({ok:false,error:'Cross-site Tutor history mutation denied.'},403);
  }
  const table='gu_member_tutor_exchanges_v014102';
  if(request.method==='GET'){
   const base='?select=id,question,learner_answer,mode,answer,generation,source_titles,created_at';
   let rows;
   const suffix='&user_id=eq.'+member+'&order=created_at.desc&limit=200';
   try{rows=await rest(env,table+base+',conversation_id,feedback,feedback_note,feedback_at'+suffix)}
   catch(e){
    // A missing optional v149 or v107 column alone permits compatibility fallback.
    // Never hide a network failure, bad grants or RLS denial.
    if(e?.code!=='FEEDBACK_SCHEMA_MISSING')throw e;
    try{rows=await rest(env,table+base+',feedback,feedback_note,feedback_at'+suffix)}
    catch(e2){
     if(e2?.code!=='FEEDBACK_SCHEMA_MISSING')throw e2;
     rows=await rest(env,table+base+suffix);
    }
   }
   if(!Array.isArray(rows))throw Error('Invalid history data');
   return out({ok:true,history:rows,limit:200,graded:false,masteryAwarded:false,
    notice:'Member-saved ungraded educational transcripts. No official competency evidence.'});
  }
  if(request.method==='PATCH'){
   if(Number(request.headers.get('content-length')||0)>1400)return out({ok:false,error:'Feedback request too large.'},413);
   const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>1400)
    return out({ok:false,error:'Feedback request too large.'},413);
   let body;try{body=JSON.parse(raw)}catch{return out({ok:false,error:'Invalid feedback JSON.'},400)}
   const id=String(body?.id||''),feedback=String(body?.feedback||''),note=String(body?.note||'');
   if(!UID.test(id)||!['helpful','not_helpful','report'].includes(feedback)||note.length>500)
    return out({ok:false,error:'Invalid feedback selection.'},400);
   const rows=await rest(env,table+'?user_id=eq.'+member+'&id=eq.'+encodeURIComponent(id),{
    method:'PATCH',headers:{'content-type':'application/json',prefer:'return=representation'},
    body:JSON.stringify({feedback,feedback_note:note,feedback_at:new Date().toISOString()})});
   if(!Array.isArray(rows)||rows.length!==1)return out({ok:false,error:'Saved exchange was not found.'},404);
   return out({ok:true,feedbackSaved:true,graded:false,notice:'Feedback saved privately for editorial review; no score or mastery awarded.'});
  }
  if(request.method==='DELETE'){
   const id=String(url.searchParams.get('id')||'');
   const all=url.searchParams.get('all')==='true';
   if(!all&&!UID.test(id))return out({ok:false,error:'Valid exchange ID required.'},400);
   if(all&&request.headers.get('x-confirm-delete')!=='DELETE_MY_TUTOR_HISTORY')return out({ok:false,error:'Explicit deletion confirmation required.'},400);
   await rest(env,table+'?user_id=eq.'+member+(all?'':'&id=eq.'+encodeURIComponent(id)),{method:'DELETE'});
   return out({ok:true,deleted:true});
  }
  // v107: refuse all client-authored Tutor answer uploads. A learner could
  // previously forge the text and generation label. The source tutor service
  // alone now stores verified:... answers via its authenticated server role.
  return out({ok:false,error:'Tutor responses are saved by the trusted Tutor endpoint, not uploaded by the browser.'},405);
 }catch(e){
  if(e.status===401)return out({ok:false,error:'Sign in required.'},401);
  if(e.status===403)return out({ok:false,error:'Eligible member account required.'},403);
  if(e.status===409)return out({ok:false,error:e.message},409);
  return out({ok:false,error:'Private Tutor history is not installed or temporarily unavailable; this does not affect current-session learning.'},503);
 }
}
