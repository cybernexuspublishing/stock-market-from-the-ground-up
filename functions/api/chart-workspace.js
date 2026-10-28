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
 return {version:2,selected,sync:raw.sync!==false,studies,drawings};
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
  if(request.headers.get('content-type')?.split(';')[0].toLowerCase()!=='application/json')
   return answer({ok:false,error:'Expected JSON'},415);
  if(Number(request.headers.get('content-length'))>16000)return answer({ok:false,error:'Workspace payload too large'},413);
  const raw=await request.text();if(raw.length>16000)return answer({ok:false,error:'Workspace payload too large'},413);
  let value;try{value=JSON.parse(raw)}catch{return answer({ok:false,error:'Invalid JSON'},400)}
  if(!value||typeof value!=='object'||Array.isArray(value))return answer({ok:false,error:'Invalid workspace'},400);
  const workspace=normalizeWorkspace(value,e);
  const rows=await query(storage,path+'?on_conflict=user_id',{method:'POST',
   headers:{'content-type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},
   body:JSON.stringify({user_id:uid,settings:workspace,updated_at:new Date().toISOString()})});
  if(rows.length!==1)return answer({ok:false,error:'Workspace save not confirmed'},503);
  return answer({ok:true,tier:e.tier,workspace,updatedAt:rows[0]?.updated_at||null});
 }catch(err){
  const status=err?.status===401?401:err?.status===403?403:503;
  return answer({ok:false,error:status===401?'Sign in required':status===403?'Chart membership ineligible':'Workspace service temporarily unavailable'},status);
 }
}