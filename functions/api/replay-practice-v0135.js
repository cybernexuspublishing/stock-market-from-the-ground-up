/* Historical Replay decision ledger — user-entered / self-reported, NOT graded evidence.
 * Premium permissions reuse exactly the independently verified OnDemand training entitlement helper.
 * Server validates the lab metadata; no stock candles or brokerage credentials are stored.
 */
import {authorized} from './ondemand-training.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'};
const result=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:H});
const clean=x=>String(x??'').trim();
const UID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function cfg(env){const base=clean(env.SUPABASE_URL).replace(/\/$/,''),secret=clean(env.SUPABASE_SECRET_KEY);if(!base||!secret)throw Object.assign(new Error('Replay backend unavailable.'),{status:503});return{base,secret}}
async function db(env,route,method='GET',data){const{base,secret}=cfg(env),r=await fetch(base+'/rest/v1/'+route,{method,headers:{apikey:secret,authorization:'Bearer '+secret,accept:'application/json',...(data===undefined?{}:{'content-type':'application/json','prefer':'return=representation'})},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store'});
 if(!r.ok)throw Object.assign(new Error('Replay operation failed.'),{status:r.status===409?409:503});const t=await r.text();return t?JSON.parse(t):[]}
function validText(s,min=5,max=2000){return typeof s==='string'&&s.trim().length>=min&&s.trim().length<=max}
async function lab(env,id){if(!/^[A-Za-z0-9._-]{2,90}$/.test(id))throw Object.assign(new Error('Invalid case ID.'),{status:400});const rows=await db(env,'platform_labs?select=lab_id,ticker,historical_date,timeframe,active,registry_visible&lab_id=eq.'+encodeURIComponent(id)+'&limit=1');
 const row=rows[0];if(!row||!row.active||!row.registry_visible||!row.ticker||!row.historical_date)throw Object.assign(new Error('This case has no verified historical ticker/date or is not active.'),{status:404});return row}
export async function onRequest({request,env}){try{
 const state=await authorized(env,request);
 if(state.kind!=='authorized')return result({ok:false,error:'Active Historical Replay Training entitlement required. Synthetic Showcase accounts cannot record practice.'},403);
 const url=new URL(request.url),action=url.searchParams.get('action')||'recent';
 if(request.method==='GET'&&action==='recent'){
   const rows=await db(env,'replay_practice_sessions_v135?select=id,lab_id,ticker,historical_date,decision_time_et,decision,locked_at,reviewed_at,observed_outcome,reflection&user_id=eq.'+encodeURIComponent(state.id)+'&order=locked_at.desc&limit=25');
   return result({ok:true,entries:rows});
 }
 if(request.method!=='POST')return result({ok:false,error:'Unsupported operation.'},405);
 const body=await request.json().catch(()=>null);
 if(!body||JSON.stringify(body).length>14000)return result({ok:false,error:'Invalid request size.'},400);
 if(action==='lock'){
  const caseId=clean(body.labId),row=await lab(env,caseId),decision=clean(body.decision).toUpperCase();
  if(!['ENTER','WATCH','NO_TRADE'].includes(decision)||!/^(?:[01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$/.test(clean(body.decisionTimeEt))||!validText(body.evidence,20,6000)||!validText(body.invalidation)||!validText(body.riskPlan))return result({ok:false,error:'Complete decision, time (ET), evidence (20+ characters), invalidation and risk plan.'},400);
  const locked=(await db(env,'replay_practice_sessions_v135','POST',{user_id:state.id,lab_id:row.lab_id,ticker:row.ticker,historical_date:row.historical_date,timeframe:row.timeframe||null,decision_time_et:clean(body.decisionTimeEt),decision,evidence:clean(body.evidence),invalidation:clean(body.invalidation),risk_plan:clean(body.riskPlan)}))[0];
  return result({ok:true,entry:{id:locked.id,labId:locked.lab_id,lockedAt:locked.locked_at,decision:locked.decision},notice:'Your first decision is locked and cannot be changed. Only now resume historical playback.'},201);
 }
 if(action==='review'){
  const id=clean(body.id);if(!UID.test(id)||!validText(body.observedOutcome,5,6000)||!validText(body.reflection,5,6000))return result({ok:false,error:'Review ID, observed outcome and reflection are required.'},400);
  // Require unreviewed state in the UPDATE predicate. Trigger also forbids changes to locked fields.
  const updated=await db(env,'replay_practice_sessions_v135?id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(state.id)+'&reviewed_at=is.null','PATCH',{observed_outcome:clean(body.observedOutcome),reflection:clean(body.reflection),reviewed_at:new Date().toISOString()});
  return updated.length?result({ok:true,id,notice:'Reflection recorded as self-reported practice; not graded competency evidence.'}):result({ok:false,error:'Entry not found or already reviewed.'},404);
 }
 return result({ok:false,error:'Unknown action.'},404);
}catch(e){return result({ok:false,error:e.status===503?'Replay service unavailable.':e.message||'Replay request failed.'},e.status||500)}}
