/* Crownlight Watchlist V3 in-app research-review events, never automatic
 * live-market alerts. All authoritative candidates and criteria are read
 * from the member's saved private workspace using a service-only Supabase key.
 */
import {advancedToolContext,privateJson} from '../_lib/advanced-tool-access-v014110.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private,no-store','x-content-type-options':'nosniff'};
const out=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
const bad=(m,s=400)=>Object.assign(new Error(m),{status:s});
const int=x=>/^[1-9][0-9]{0,15}$/.test(String(x||''))&&Number.isSafeInteger(Number(x));
const TYPES=new Set(['ABOVE_REFERENCE','BELOW_REFERENCE','INSIDE_RANGE','OUTSIDE_RANGE']);
const atValid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(s)&&
 Number.isFinite(Date.parse(s))&&Date.parse(s)<=Date.now()+300000&&Date.parse(s)>=Date.parse('2000-01-01T00:00:00Z');
function evaluate(p,body){
 const rules=Array.isArray(p?.monitoringRules)?p.monitoringRules.slice(-10):[];
 const price=body.price;
 return rules.flatMap((r,i)=>{
  if(!r||!TYPES.has(r.type))return [];
  const low=Number(r.low),high=Number(r.high);
  if(!Number.isFinite(low)||low<=0||
   (r.type.endsWith('_RANGE')&&(!Number.isFinite(high)||high<=low)))return [];
  const matches=r.type==='ABOVE_REFERENCE'?price>low:
   r.type==='BELOW_REFERENCE'?price<low:
   r.type==='INSIDE_RANGE'?price>=low&&price<=high:price<low||price>high;
  return matches?[{rule_index:i,rule_kind:r.type}]:[];
 });
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))return out({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  const url=new URL(request.url);
  if(request.method==='POST'&&request.headers.get('origin')!==url.origin)
   throw bad('Cross-site alert updates denied.',403);
  const actor=await advancedToolContext(env,request,'WATCHLIST_WORKBENCH');
  if(!actor.allowed||actor.accessLevel!=='entitled')throw bad('Premium research entitlement required.',403);
  const uid=encodeURIComponent(actor.userId),base='gu_watchlist_alert_events_v3';
  if(request.method==='GET'){
   const entries=await privateJson(actor.c,base+'?select=id,candidate_id,rule_index,rule_kind,observation_at,price,source_note,read_at,created_at'+
    '&user_id=eq.'+uid+'&order=created_at.desc,id.desc&limit=50');
   return out({ok:true,events:entries||[],source:'MANUAL_RESEARCH_REVIEW_ONLY',pushDelivery:false});
  }
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>1024)throw bad('Request too large.',413);
  let body;try{body=JSON.parse(raw)}catch{throw bad('Invalid JSON.')}
  if(!body||typeof body!=='object'||Array.isArray(body))throw bad('Invalid request.');
  if(body.action==='markRead'){
   if(!int(body.eventId)||Object.keys(body).some(k=>!['action','eventId'].includes(k)))
    throw bad('Invalid member notification ID.');
   const changed=await privateJson(actor.c,base+'?id=eq.'+encodeURIComponent(body.eventId)+'&user_id=eq.'+uid,
    'PATCH',{read_at:new Date().toISOString()},'return=representation');
   return out({ok:true,read:changed?.length===1,source:'MANUAL_RESEARCH_REVIEW_ONLY'});
  }
  if(body.action!=='evaluate'||!int(body.candidateId)||!Number.isFinite(body.price)||
    body.price<=0||body.price>=10000000||!atValid(body.observedAt)||
    typeof body.sourceNote!=='string'||body.sourceNote.trim().length<8||body.sourceNote.length>180||
    Object.keys(body).some(k=>!['action','candidateId','price','observedAt','sourceNote'].includes(k)))
   throw bad('Member source, positive price, owned candidate and dated observation required.');
  const candidates=await privateJson(actor.c,'tool_workspace_records?select=id,title,payload'+
    '&id=eq.'+encodeURIComponent(body.candidateId)+'&user_id=eq.'+uid+
    '&tool_code=eq.WATCHLIST_WORKBENCH&record_type=eq.watchlist&limit=1');
  if(!Array.isArray(candidates)||candidates.length!==1)
   throw bad('Private candidate unavailable.',404);
  if(candidates[0].payload?.archived===true)
   throw bad('Archived candidate cannot generate new review notifications.',409);
  const flags=evaluate(candidates[0].payload,body);
  if(!flags.length)return out({ok:true,matched:0,events:[],source:'MANUAL_RESEARCH_REVIEW_ONLY'});
  const payload=flags.map(f=>({
    user_id:actor.userId,candidate_id:Number(body.candidateId),
    rule_index:f.rule_index,rule_kind:f.rule_kind,
    observation_at:new Date(body.observedAt).toISOString(),
    price:body.price,source_note:body.sourceNote.trim(),kind:'MANUAL_RESEARCH_REVIEW'
  }));
  const created=await privateJson(actor.c,base+'?on_conflict=user_id,candidate_id,rule_index,observation_at',
   'POST',payload,'resolution=ignore-duplicates,return=representation');
  return out({ok:true,matched:flags.length,newEvents:created?.length||0,
   events:(created||[]).map(r=>({id:r.id,candidateId:r.candidate_id,ruleKind:r.rule_kind})),
   source:'MEMBER_ENTERED_UNVERIFIED_SNAPSHOT',pushDelivery:false,
   note:'In-app review flags only. No live quote, order or trading recommendation.'});
 }catch(e){const status=[400,401,403,404,405,409,413].includes(e?.status)?e.status:503;
  return out({ok:false,error:status===503?'Private research-review notification service unavailable.':e.message},status)}
}
