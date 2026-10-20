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
   throw Error('History storage unavailable');
  }
 const text=await response.text();
 try{return text?JSON.parse(text):null}catch{throw Error('History storage unavailable')}
}
function trimmed(x,max){return typeof x==='string'?x.trim().slice(0,max+1):''}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST','DELETE'].includes(request.method))return out({ok:false,error:'Method not allowed'},405);
  const auth=await toolAccess(env,request,'MARKET_TUTOR');
  if(!auth.authorized)return out({ok:false,error:'An active Market Tutor entitlement is required to access saved Tutor notes.'},403);
  if(!UID.test(auth.userId))return out({ok:false,error:'Invalid member identity.'},403);
  const member=encodeURIComponent(auth.userId),url=new URL(request.url);
  const table='gu_member_tutor_exchanges_v014102';
  if(request.method==='GET'){
   const rows=await rest(env,table+'?select=id,question,learner_answer,mode,answer,generation,source_titles,created_at&user_id=eq.'+member+'&order=created_at.desc&limit=200');
   if(!Array.isArray(rows))throw Error('Invalid history data');
   return out({ok:true,history:rows,limit:200,graded:false,masteryAwarded:false,
    notice:'Member-saved ungraded educational transcripts. No official competency evidence.'});
  }
  if(request.method==='DELETE'){
   const id=String(url.searchParams.get('id')||'');
   const all=url.searchParams.get('all')==='true';
   if(!all&&!UID.test(id))return out({ok:false,error:'Valid exchange ID required.'},400);
   if(all&&request.headers.get('x-confirm-delete')!=='DELETE_MY_TUTOR_HISTORY')return out({ok:false,error:'Explicit deletion confirmation required.'},400);
   await rest(env,table+'?user_id=eq.'+member+(all?'':'&id=eq.'+encodeURIComponent(id)),{method:'DELETE'});
   return out({ok:true,deleted:true});
  }
  if(Number(request.headers.get('content-length')||0)>9000)return out({ok:false,error:'History entry too large.'},413);
  const raw=await request.text();
  if(raw.length>9000)return out({ok:false,error:'History entry too large.'},413);
  let input;try{input=JSON.parse(raw)}catch{return out({ok:false,error:'Invalid JSON.'},400)}
  if(!input||typeof input!=='object'||Array.isArray(input))return out({ok:false,error:'Invalid history entry.'},400);
  const question=trimmed(input.question,450),learner=trimmed(input.learnerAnswer||'',1800),
   answer=trimmed(input.answer,4500),mode=trimmed(input.mode,30),
   generation=trimmed(input.generation,90);
  const sourceTitles=input.sourceTitles;
  if(!UID.test(String(input.requestId||''))||question.length<4||question.length>450||
   learner.length>1800||answer.length<1||answer.length>4500||
   !MODES.has(mode)||!TYPES.has(generation)||
   !Array.isArray(sourceTitles)||sourceTitles.length>3||
   sourceTitles.some(x=>typeof x!=='string'||x.trim().length<1||x.length>120))
    return out({ok:false,error:'Invalid ungraded history entry.'},400);
  const payload={p_user_id:auth.userId,p_request_id:input.requestId,
   p_question:question,p_learner_answer:learner,p_mode:mode,p_answer:answer,
   p_generation:generation,p_source_titles:sourceTitles.map(x=>x.trim())};
  const saved=await rest(env,'rpc/gu_v014102_save_member_tutor_exchange',{
   method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  if(!UID.test(String(saved||'')))throw Error('Invalid stored identifier');
  return out({ok:true,id:saved,saved:true,graded:false,masteryAwarded:false},201);
 }catch(e){
  if(e.status===401)return out({ok:false,error:'Sign in required.'},401);
  if(e.status===403)return out({ok:false,error:'Tutor access required.'},403);
  if(e.status===409)return out({ok:false,error:e.message},409);
  return out({ok:false,error:'Private Tutor history is not installed or temporarily unavailable; this does not affect current-session learning.'},503);
 }
}
