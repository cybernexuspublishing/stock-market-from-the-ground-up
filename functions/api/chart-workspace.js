/* Member-private Crownlight Chart Studio workspace.
 * Never stores data bars, grades, tokens, trading orders, or broker keys.
 */
import {crownlightChartEntitlement} from './chart-tier-access.js';
import {memberIdentity} from './member-tool-access.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const answer=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:H});
const ranks={STANDARD:0,ADVANCED:1,PROFESSIONAL:2};
const VALID_STUDIES=new Set(['RSI','MACD','BOLL','MA','EMA','SMA','ATR','VOL']);
const VALID_DRAWINGS=new Set(['segment','horizontalStraightLine','fibonacciLine']);
const VALID_LAYOUTS=new Set(['SIDE_BY_SIDE','STACKED','PRICE_FOCUS']);
const validNumber=n=>typeof n==='number'&&Number.isFinite(n);
export function normalizeWorkspace(input,entitlement){
 const raw=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 const requested=String(raw.selected||'STANDARD');
 const selected=Object.hasOwn(ranks,requested)&&ranks[requested]<=ranks[entitlement.tier]&&
  entitlement.allowed?.includes(requested)?requested:'STANDARD';
 const studies=[...new Set((Array.isArray(raw.studies)?raw.studies:[])
  .map(x=>String(x)).filter(x=>VALID_STUDIES.has(x)))].slice(0,8);
 const drawings=[];
 for(const x of Array.isArray(raw.drawings)?raw.drawings.slice(0,24):[]){
  if(!x||!VALID_DRAWINGS.has(x.name)||!Array.isArray(x.points))continue;
  const points=x.points.slice(0,6).filter(p=>Number.isSafeInteger(p?.timestamp)&&p.timestamp>0&&
   validNumber(p?.value)&&p.value>0).map(p=>({timestamp:p.timestamp,value:p.value}));
  if(points.length&&drawings.length<24)drawings.push({name:x.name,points});
 }
 const layout=selected==='PROFESSIONAL'&&VALID_LAYOUTS.has(raw.layout)?raw.layout:'SIDE_BY_SIDE';
 // Bind saved drawings to their originating chart dataset. Without this,
 // an old support level could appear on another ticker with the same bar times.
 // Legacy documents without a context remain readable and are not deleted.
 const drawingContext=typeof raw.drawingContext==='string'&&
  raw.drawingContext.length>0&&raw.drawingContext.length<=150&&
  !/[\x00-\x1f<>]/.test(raw.drawingContext)?raw.drawingContext:null;
 // Multi-dataset annotation book. Bounded, account-private metadata only:
 // no OHLCV bars, provider credentials, trade state or third-party URLs.
 const drawingSets=[],known=new Set();
 const safeContext=x=>typeof x==='string'&&x.length>0&&x.length<=150&&
  !/[\x00-\x1f<>]/.test(x);
 for(const entry of (Array.isArray(raw.drawingSets)?raw.drawingSets:[]).slice(0,24)){
  if(!entry||!safeContext(entry.context)||known.has(entry.context))continue;
  const subset=[];
  for(const d of (Array.isArray(entry.drawings)?entry.drawings:[]).slice(0,10)){
   if(!d||!VALID_DRAWINGS.has(d.name)||!Array.isArray(d.points))continue;
   const points=d.points.slice(0,6).filter(p=>Number.isSafeInteger(p?.timestamp)&&p.timestamp>0&&
     validNumber(p?.value)&&p.value>0).map(p=>({timestamp:p.timestamp,value:p.value}));
   if(points.length)subset.push({name:d.name,points});
  }
  if(!subset.length)continue;
  known.add(entry.context);
  drawingSets.push({context:entry.context,drawings:subset});
 }
 return {version:2,selected,sync:raw.sync!==false,studies,drawings,layout,drawingContext,drawingSets};
}
const cfg=env=>{
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)||!secret)throw Error('Storage unavailable');
 const h={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))h.authorization='Bearer '+secret;
 return {base,h};
};
async function access(context){
 const e=await crownlightChartEntitlement(context.env,context.request);
 if(e.eligible!==true)throw Object.assign(new Error('Chart membership ineligible'),{status:403});
 const identity=await memberIdentity(context.env,context.request);
 return {e,uid:identity.userId,storage:cfg(context.env)};
}
async function query(storage,path,init){
 const r=await fetch(storage.base+'/rest/v1/'+path,{cache:'no-store',...init,headers:{...storage.h,...init?.headers}});
 if(!r.ok)throw Error('Workspace persistence unavailable');
 return r.status===204?[]:r.json();
}
export async function onRequest({request,env}){
 if(!['GET','PUT'].includes(request.method))return answer({ok:false,error:'Method not allowed'},405);
 const context={request,env};
 try{
  const {e,uid,storage}=await access(context);
  const path='crownlight_chart_workspaces_v1';
  if(request.method==='GET'){
   const rows=await query(storage,path+'?select=settings,updated_at&user_id=eq.'+encodeURIComponent(uid)+'&limit=1');
   const raw=rows[0]?.settings||{};
   return answer({ok:true,tier:e.tier,workspace:normalizeWorkspace(raw,e),updatedAt:rows[0]?.updated_at||null});
  }
  const requestUrl=new URL(request.url);
  if(request.headers.get('origin')!==requestUrl.origin||
    (request.headers.get('sec-fetch-site')&&!['same-origin','none'].includes(request.headers.get('sec-fetch-site'))))
   return answer({ok:false,error:'Cross-site workspace update denied'},403);
  if(request.headers.get('content-type')?.split(';')[0].toLowerCase()!=='application/json')
   return answer({ok:false,error:'Expected JSON'},415);
  if(Number(request.headers.get('content-length'))>16000)return answer({ok:false,error:'Workspace payload too large'},413);
  const raw=await request.text();if(raw.length>16000)return answer({ok:false,error:'Workspace payload too large'},413);
  let value;try{value=JSON.parse(raw)}catch{return answer({ok:false,error:'Invalid JSON'},400)}
  if(!value||typeof value!=='object'||Array.isArray(value))return answer({ok:false,error:'Invalid workspace'},400);
  // An explicit revision is mandatory. Never turn an absent revision
  // into an unprotected last-writer-wins overwrite.
  if(!Object.hasOwn(value,'expectedUpdatedAt')||
    !(value.expectedUpdatedAt===null||
      typeof value.expectedUpdatedAt==='string'&&
      /^\d{4}-\d{2}-\d{2}T/.test(value.expectedUpdatedAt)&&
      Number.isFinite(Date.parse(value.expectedUpdatedAt))))
   return answer({ok:false,error:'Restore workspace before attempting to save.'},409);
  const workspace=normalizeWorkspace(value,e);
  const result=await query(storage,'rpc/gu_crownlight_chart_workspace_save_v4',{method:'POST',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({p_user:uid,p_settings:workspace,
    p_expected:value.expectedUpdatedAt,p_max_tier:e.tier})});
  if(result?.error==='PREMIUM_WORKSPACE_PRESERVED')
   return answer({ok:false,error:'PREMIUM_WORKSPACE_PRESERVED',
    savedTier:result.savedTier,
    message:'A higher-tier chart layout remains saved privately. Your current tier can still be used, but saving cannot overwrite the previous premium workspace until higher-tier access is restored.'},409);
  if(result?.error==='WORKSPACE_CHANGED')
   return answer({ok:false,error:'WORKSPACE_CHANGED',
    message:'Another tab or session saved newer settings. Restore before overwriting.',
    latestUpdatedAt:result.updatedAt||null},409);
  if(result?.ok!==true||!result.updatedAt)
   return answer({ok:false,error:'Workspace save not confirmed'},503);
  return answer({ok:true,tier:e.tier,workspace,updatedAt:result.updatedAt});
 }catch(err){
  const status=err?.status===401?401:err?.status===403?403:503;
  return answer({ok:false,error:status===401?'Sign in required':status===403?'Chart membership ineligible':'Workspace service temporarily unavailable'},status);
 }
}