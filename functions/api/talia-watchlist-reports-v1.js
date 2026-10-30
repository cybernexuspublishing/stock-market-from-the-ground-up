/* Permanent Talia Research Reports V1 — Free and entitled Advanced watchlists.
 * Supabase service key stays in the Worker. Member identity and Free eligibility
 * are verified server-side. Immutable, self-reported educational checkpoints
 * have no official assessment, market-trade or rewards significance.
 */
import {toolAccess} from './member-tool-access.js';
const TABLE='gu_talia_watchlist_checkpoints_v1';
const REPORT='gu_talia_watchlist_reports_v1';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
 'x-content-type-options':'nosniff','x-robots-tag':'noindex','vary':'authorization'};
const out=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
const bad=(reason,status=400)=>Object.assign(new Error(reason),{status});
const TOPICS=new Set(['building','sector','pricevolume','rvol','company','catalyst','structure',
 'trends','candles','vwap','averages','indicators','levels','breakout','failure','thesis',
 'risk','spread','compare','reject','maintenance','hindsight','macd','rsi','bollinger','patterns','shorts']);
const DIMENSIONS=Object.freeze({Observe:'Recognition',Explain:'Knowledge',Investigate:'Process',
 Interpret:'Recognition',Challenge:'Decision',Plan:'Decision',Practice:'Decision',Review:'Process'});
const MISTAKES=new Set(['NONE','MISSING_SOURCE','FUTURE_KNOWLEDGE','INDICATOR_CERTAINTY',
 'LIQUIDITY_RISK','NO_INVALIDATION','OTHER']);
const CASES=new Set(['trend','range','failure']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const symbol=/^[A-Z][A-Z0-9.-]{0,11}$/;
function config(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)||!key)throw bad('Private report storage unavailable.',503);
 const headers={apikey:key,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key))
  headers.authorization='Bearer '+key;
 return {base,headers};
}
async function store(c,path,method='GET',data,prefer='return=representation'){
 let response;
 try{
  response=await fetch(c.base+'/rest/v1/'+path,{
   method,headers:{...c.headers,...(data!==undefined?{'content-type':'application/json'}:{}),
    ...(method!=='GET'?{prefer}:{})},
   ...(data!==undefined?{body:JSON.stringify(data)}:{}),cache:'no-store',
   signal:AbortSignal.timeout(12000)});
 }catch{throw bad('Private research database request failed.',503)}
 if(!response.ok)throw bad('Private research database operation failed.',503);
 const result=await response.json().catch(()=>null);
 if(result===null)throw bad('Research database acknowledgement unavailable.',503);
 return result;
}
function sameOrigin(request){
 const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
 if(origin!==new URL(request.url).origin || (site&&!['same-origin','none'].includes(site)))
  throw bad('Cross-origin changes denied.',403);
}
async function body(request){
 const len=Number(request.headers.get('content-length')||0);
 if(len>2600)throw bad('Research checkpoint exceeds size limit.',413);
 const raw=await request.text();
 if(new TextEncoder().encode(raw).byteLength>2600)throw bad('Research checkpoint exceeds size limit.',413);
 let o;try{o=JSON.parse(raw)}catch{throw bad('Invalid JSON.')}
 if(!o||typeof o!=='object'||Array.isArray(o))throw bad('Research checkpoint must be an object.');
 const keys=['eventId','topic','step','dimension','answer','misconception','fictionalCase','cutoff','symbol'];
 if(Object.keys(o).some(k=>!keys.includes(k)))throw bad('Unknown or unauthorized research field.');
 if(!uuid.test(o.eventId)||!TOPICS.has(o.topic)||!Object.hasOwn(DIMENSIONS,o.step)||
  o.dimension!==DIMENSIONS[o.step]||!MISTAKES.has(o.misconception)||
  !CASES.has(o.fictionalCase)||!Number.isInteger(o.cutoff)||o.cutoff<12||o.cutoff>48||
  typeof o.answer!=='string'||o.answer.trim().length<25||o.answer.trim().length>1400||
  (o.symbol!==''&&o.symbol!==null&&o.symbol!==undefined&&(!symbol.test(o.symbol))))
  throw bad('Invalid ungraded research evidence. Review the subject, answer and fictional cutoff.');
 return {event_id:o.eventId,topic_id:o.topic,research_action:o.step,dimension:o.dimension,
  answer:o.answer.trim(),misconception:o.misconception,fictional_case:o.fictionalCase,
  revealed_bars:o.cutoff,symbol:o.symbol||null};
}
const select='user_id,event_id,topic_id,research_action,dimension,answer,misconception,fictional_case,revealed_bars,symbol,created_at';
function mapped(row,uid){
 if(row?.user_id!==uid)throw bad('Member ownership verification failed.',503);
 return {eventId:row.event_id,topic:row.topic_id,step:row.research_action,
  dimension:row.dimension,answer:row.answer,misconception:row.misconception,
  fictionalCase:row.fictional_case,cutoff:row.revealed_bars,symbol:row.symbol||'',
  at:row.created_at,source:'MEMBER_REPORTED_UNGRADED'};
}
function summary(row,uid){
 if(!row)return {totalAttempts:0,dimensionCounts:{},misconceptionCounts:{},topicCounts:{},
  firstSavedAt:null,lastSavedAt:null,source:'MEMBER_REPORTED_UNGRADED',officialMastery:false};
 if(row.user_id!==uid||row.data_status!=='MEMBER_REPORTED_UNGRADED')throw bad('Research summary ownership verification failed.',503);
 return {totalAttempts:Number(row.total_attempts),dimensionCounts:row.dimension_counts||{},
  misconceptionCounts:row.misconception_counts||{},topicCounts:row.topic_counts||{},
  firstSavedAt:row.first_saved_at,lastSavedAt:row.last_saved_at,
  source:'MEMBER_REPORTED_UNGRADED',officialMastery:false};
}
async function getSummary(c,uid){
 const rows=await store(c,REPORT+'?select=user_id,total_attempts,dimension_counts,misconception_counts,topic_counts,first_saved_at,last_saved_at,data_status'+
  '&user_id=eq.'+encodeURIComponent(uid)+'&limit=1');
 if(!Array.isArray(rows)||rows.length>1)throw bad('Research summary response is invalid.',503);
 return summary(rows[0],uid);
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST','DELETE'].includes(request.method))throw bad('Method not allowed.',405);
  if(request.method!=='GET')sameOrigin(request);
  const actor=await toolAccess(env,request,'MARKET_SIMULATOR');
  if(!actor.userId||actor.freeEligible!==true)throw bad(actor.reason||'Eligible signed-in member required.',403);
  const uid=actor.userId,c=config(env);
  if(request.method==='GET'){
   const u=new URL(request.url),limit=Number(u.searchParams.get('limit')||100),
    offset=Number(u.searchParams.get('offset')||0);
   if([...u.searchParams.keys()].some(x=>!['limit','offset'].includes(x))||
    !Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||offset>50000)
    throw bad('Invalid report history page.');
   const [rows,rollup]=await Promise.all([
    store(c,TABLE+'?select='+select+'&user_id=eq.'+encodeURIComponent(uid)+
     '&order=created_at.desc,event_id.desc&limit='+limit+'&offset='+offset),getSummary(c,uid)]);
   if(!Array.isArray(rows)||rows.length>limit)throw bad('Private history page invalid.',503);
   return out({ok:true,report:rollup,history:rows.map(r=>mapped(r,uid)),offset,limit,
    hasMore:offset+rows.length<rollup.totalAttempts,ungraded:true});
  }
  if(request.method==='DELETE'){
   // Explicit confirmed member deletion in the browser; service-role-only RPC
   // clears notes and rollup atomically in one PostgreSQL transaction.
   const raw=await request.text();
   if(raw!=='{"confirm":"DELETE_ALL_TALIA_RESEARCH"}')
    throw bad('Explicit report deletion confirmation required.',400);
   const deleted=await store(c,'rpc/gu_talia_watchlist_clear_v1','POST',{p_user:uid});
   if(!Number.isInteger(deleted)||deleted<0)throw bad('Report clear acknowledgement invalid.',503);
   return out({ok:true,deletedCheckpoints:deleted,report:summary(null,uid)});
  }
  const data=await body(request);
  const inserted=await store(c,TABLE+'?on_conflict=user_id,event_id','POST',
   {user_id:uid,...data},'resolution=ignore-duplicates,return=representation');
  if(!Array.isArray(inserted)||inserted.length>1)throw bad('Research save acknowledgement invalid.',503);
  let existing=inserted[0];
  if(!existing){
   const rows=await store(c,TABLE+'?select='+select+'&user_id=eq.'+encodeURIComponent(uid)+
    '&event_id=eq.'+encodeURIComponent(data.event_id)+'&limit=1');
   existing=rows?.[0];
   if(!existing||['topic_id','research_action','dimension','answer','misconception','fictional_case','revealed_bars','symbol']
    .some(k=>existing[k]!==data[k]))throw bad('Research retry conflicts with a different saved checkpoint.',409);
  }
  const saved=mapped(existing,uid),rollup=await getSummary(c,uid);
  return out({ok:true,saved,report:rollup,alreadySaved:inserted.length===0,ungraded:true});
 }catch(e){
  const status=[400,401,403,405,409,413].includes(e?.status)?e.status:503;
  return out({ok:false,error:status===503?'Private Talia research report unavailable.':e.message},status);
 }
}
