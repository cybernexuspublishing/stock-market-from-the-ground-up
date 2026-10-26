/* Authenticated Free research watchlist. Not a brokerage watchlist, quote feed,
 * verified historical-data source or official assessment. Reuses the existing
 * member Auth/profile/suspension decision and service-only Supabase storage.
 */
import {toolAccess} from './member-tool-access.js';
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
 'x-content-type-options':'nosniff'};
const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const T='gu_free_research_watchlist_v1';
const validSymbols=/^[A-Z][A-Z0-9.\-]{0,11}$/;
const validStatuses=new Set(['RESEARCH','WAITING_FOR_SOURCE','NO_TRADE','ARCHIVED']);
const validKinds=new Set(['UNVERIFIED','USER_RESEARCH','FICTIONAL']);
function sameOrigin(request){
 const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
 if(origin&&origin!==new URL(request.url).origin)throw fail('Cross-origin modifications are denied.',403);
 if(site&&!['same-origin','none'].includes(site))throw fail('Cross-site modifications are denied.',403);
}
function backend(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+\.supabase\.co$/.test(base)||!secret)throw fail('Private watchlist storage unavailable.',503);
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))headers.authorization='Bearer '+secret;
 return{base,headers};
}
async function store(env,path,method='GET',body){
 const c=backend(env);
 let r;
 try{r=await fetch(c.base+'/rest/v1/'+path,{
  method,cache:'no-store',headers:{...c.headers,...(body?{'content-type':'application/json',prefer:'return=representation'}:{})},
  body:body===undefined?undefined:JSON.stringify(body),
  signal:AbortSignal.timeout(12000)
 })}catch{throw fail('Watchlist database unavailable.',503)}
 if(!r.ok){
  const x=await r.json().catch(()=>({}));
  if(r.status===409||x.code==='23505'||String(x.message||'').includes('FREE_WATCHLIST_MAX_20_ENTRIES'))
   throw fail('This symbol already exists or your 20-entry Free watchlist limit has been reached.',409);
  throw fail('Watchlist database update could not be verified.',503);
 }
 const data=await r.json().catch(()=>null);
 if(!Array.isArray(data))throw fail('Watchlist database returned an invalid result.',503);
 return data;
}
async function input(request){
 const header=Number(request.headers.get('content-length')||0);
 if(header>2400)throw fail('Watchlist request is too large.',413);
 const text=await request.text();
 if(text.length>2400)throw fail('Watchlist request is too large.',413);
 let body;
 try{body=JSON.parse(text)}catch{throw fail('Invalid JSON.')}
 if(!body||typeof body!=='object'||Array.isArray(body))throw fail('Invalid research watchlist action.');
 const action=String(body.action||'');
 if(!['add','update','remove'].includes(action))throw fail('Unsupported watchlist action.');
 const symbol=String(body.symbol||'').trim().toUpperCase();
 if(!validSymbols.test(symbol))throw fail('Enter a valid uppercase symbol (1–12 characters).');
 if(action==='remove')return{action,symbol};
 const status=String(body.status||'RESEARCH').toUpperCase();
 const sourceKind=String(body.sourceKind||'UNVERIFIED').toUpperCase();
 const researchNote=typeof body.researchNote==='string'?body.researchNote.trim():'';
 const sourceNote=typeof body.sourceNote==='string'?body.sourceNote.trim():'';
 if(!validStatuses.has(status)||!validKinds.has(sourceKind)||
  researchNote.length<30||researchNote.length>600||sourceNote.length>400)
  throw fail('Choose a research state, label the source, and explain your reasoning in 30–600 characters.');
 // Members may classify their own entries as USER_RESEARCH or FICTIONAL,
 // but this is never upgraded to independent historical/source verification.
 return{action,symbol,status,source_kind:sourceKind,research_note:researchNote,source_note:sourceNote};
}
function verifyRecord(row,user,symbol){
 if(!row||row.user_id!==user||row.symbol!==symbol)
  throw fail('The saved private research entry could not be verified.',503);
 return{symbol:row.symbol,status:row.status,sourceKind:row.source_kind,
  researchNote:row.research_note,sourceNote:row.source_note,
  createdAt:row.created_at,updatedAt:row.updated_at};
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))throw fail('Method not allowed.',405);
  // toolAccess verifies the Supabase bearer at /auth/v1/user, production
  // profile kind, account flags, and existing entitlements. An account with
  // NO paid tool grant is still eligible for ungraded Free research practice.
  const a=await toolAccess(env,request,'MARKET_SIMULATOR');
  const free=a.userId&&
   (a.authorized===true||a.reason==='An active plan or matching individual tool entitlement is required.');
  if(!free)throw fail(a.reason||'Free member access required.',403);
  const id=a.userId;
  if(request.method==='GET'){
   const rows=await store(env,T+'?select=user_id,symbol,status,source_kind,research_note,source_note,created_at,updated_at&user_id=eq.'+
    encodeURIComponent(id)+'&order=updated_at.desc&limit=20');
   if(rows.length>20||rows.some(x=>x.user_id!==id))throw fail('Watchlist ownership check failed.',503);
   return send({ok:true,entries:rows.map(x=>verifyRecord(x,id,x.symbol)),limit:20,
    sourceBoundary:'User-supplied research only; no real-time quotes, independently verified prices, broker orders or automatic trade recommendations.'});
  }
  sameOrigin(request);
  const entry=await input(request);
  const key='user_id=eq.'+encodeURIComponent(id)+'&symbol=eq.'+encodeURIComponent(entry.symbol);
  if(entry.action==='remove'){
   const removed=await store(env,T+'?select=user_id,symbol&'+key,'DELETE');
   if(removed.length!==1||removed[0].user_id!==id)throw fail('The entry no longer exists.',404);
   return send({ok:true,removed:entry.symbol});
  }
  const row={status:entry.status,source_kind:entry.source_kind,
   research_note:entry.research_note,source_note:entry.source_note};
  const rows=entry.action==='add'?
   await store(env,T+'?select=user_id,symbol,status,source_kind,research_note,source_note,created_at,updated_at','POST',
    {...row,user_id:id,symbol:entry.symbol}):
   await store(env,T+'?select=user_id,symbol,status,source_kind,research_note,source_note,created_at,updated_at&'+key,'PATCH',row);
  if(rows.length!==1){
   if(entry.action==='update'&&rows.length===0)throw fail('The research entry no longer exists.',404);
   throw fail('The research entry could not be verified.',503);
  }
  return send({ok:true,entry:verifyRecord(rows[0],id,entry.symbol)},entry.action==='add'?201:200);
 }catch(e){
  const status=[400,401,403,404,405,409,413].includes(e.status)?e.status:503;
  return send({ok:false,error:status===503?'Private watchlist service unavailable. No change has been confirmed.':
   e.message||'Watchlist request unavailable.'},status);
 }
}
