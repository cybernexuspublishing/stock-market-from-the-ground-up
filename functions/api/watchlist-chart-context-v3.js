/* Crownlight V3 private Watchlist -> Chart Studio context.
 * Requires current premium membership; returns ONLY sanitized member-owned
 * manual research annotations. No candles, provider secrets or live prices.
 */
import {advancedToolContext,privateJson} from '../_lib/advanced-tool-access-v014110.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private,no-store','x-content-type-options':'nosniff'};
const out=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
const fail=(msg,status=400)=>Object.assign(new Error(msg),{status});
const validId=x=>/^[1-9][0-9]{0,15}$/.test(String(x||''))&&Number.isSafeInteger(Number(x));
const clip=(value,max=300)=>String(value??'').trim().slice(0,max);
const KINDS=new Set(['SUPPORT','RESISTANCE','BREAKOUT','PULLBACK','INVALIDATION','OTHER']);
const validDate=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&Date.parse(x)<=Date.now()+300000;
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return out({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  const id=new URL(request.url).searchParams.get('candidateId');
  if(!validId(id))throw fail('Saved candidate ID required.');
  const member=await advancedToolContext(env,request,'WATCHLIST_WORKBENCH');
  if(!member.allowed||member.accessLevel!=='entitled')throw fail('Premium Watchlist access is required.',403);
  const rows=await privateJson(member.c,'tool_workspace_records?select=id,title,payload,updated_at'+
    '&id=eq.'+id+'&record_type=eq.watchlist&tool_code=eq.WATCHLIST_WORKBENCH'+
    '&user_id=eq.'+encodeURIComponent(member.userId)+'&limit=1');
  const record=rows?.[0],symbol=clip(record?.title,12).toUpperCase();
  if(!record||!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol))
   throw fail('Saved member-owned candidate not found.',404);
  const p=record.payload&&typeof record.payload==='object'?record.payload:{};
  const raw=Array.isArray(p.chartAnnotations)?p.chartAnnotations.slice(-40):[];
  const annotations=raw.filter(x=>x&&KINDS.has(x.kind)&&validDate(x.at)&&
     Number.isFinite(Number(x.price))&&Number(x.price)>0&&Number(x.price)<1e7)
   .map(x=>({kind:x.kind,at:x.at,price:Number(x.price),
    timeframe:clip(x.timeframe||'1D',24),
    note:clip(x.note,360),source:'MANUAL_ANNOTATION_NOT_LIVE_MARKET_DATA'}));
  return out({ok:true,candidateId:Number(id),symbol,
   folder:clip(p.folder||'Unfiled',40),stage:clip(p.workflowStage||'DISCOVER',24),
   asOf:validDate(p.asOf)?p.asOf:null,sourceNote:clip(p.sourceNote,250),
   invalidation:clip(p.invalidation,400),archived:p.archived===true,
   annotations,revision:record.updated_at,
   source:'MEMBER_ENTERED_NOT_INDEPENDENTLY_VERIFIED',
   chartDataIncluded:false,livePriceIncluded:false,sourceRightsNotCertified:true});
 }catch(e){const status=[400,401,403,404,405].includes(e?.status)?e.status:503;
  return out({ok:false,error:status===503?'Private chart handoff unavailable.':e.message},status)}
}
