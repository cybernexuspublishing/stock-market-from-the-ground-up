/* READ-ONLY private Chart Studio trade-plan levels.
 * A plan ID is a locator, never authorization. Entitlement, current session,
 * source ownership and observation chronology are enforced server-side.
 */
import {advancedToolContext,privateJson} from '../_lib/advanced-tool-access-v014110.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const out=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:H});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const id=x=>/^[1-9][0-9]{0,15}$/.test(String(x||''))&&Number.isSafeInteger(Number(x));
const price=x=>x==null||String(x).trim()===''?null:
 Number.isFinite(Number(x))&&Number(x)>0&&Number(x)<1000000?Number(x):null;
const asOf=x=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(String(x||''))&&
 Number.isFinite(Date.parse(x))?Date.parse(x):null;
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return out({ok:false,error:'READ_ONLY'},405);
  const key=new URL(request.url).searchParams.get('planId');
  if(!id(key))throw fail('Valid saved plan reference required.');
  const actor=await advancedToolContext(env,request,'WATCHLIST_WORKBENCH');
  if(!actor.allowed||actor.accessLevel!=='entitled')
   throw fail('Current entitled Watchlist Workbench access is required.',403);
  const rows=await privateJson(actor.c,'tool_workspace_records?select=id,record_type,payload,created_at'+
   '&id=eq.'+key+'&user_id=eq.'+encodeURIComponent(actor.userId)+
   '&tool_code=eq.WATCHLIST_WORKBENCH&record_type=eq.scenario_review&limit=1');
  if(!Array.isArray(rows)||rows.length!==1||rows[0].payload?.kind!=='ADVANCED_TRADE_PLAN_SNAPSHOT_V1')
   throw fail('Private saved plan not found.',404);
  const d=rows[0].payload?.data;
  if(!d||typeof d!=='object'||!/^[A-Za-z][A-Za-z0-9.-]{0,11}$/.test(d.symbol||'')||
     !['LONG','SHORT'].includes(d.direction))
   throw fail('This plan cannot be visualized.',409);
  const observed=asOf(d.asOf);
  if(observed===null||observed>Date.now()+300000)
   throw fail('The recorded plan observation time is missing or invalid.',409);
  const published=d.sourceAt?asOf(d.sourceAt):null;
  if(d.sourceAt&&(published===null||published>observed))
   throw fail('Plan source publication cannot occur after its observation.',409);
  const entry=price(d.entry),stop=price(d.stop);
  if(entry===null||stop===null||(d.direction==='LONG'?stop>=entry:stop<=entry))
   throw fail('Plan entry and stop are invalid.',409);
  const levels=[{kind:'ENTRY',price:entry},{kind:'STOP',price:stop}];
  for(const [key,name] of [['target1','TARGET 1'],['target2','TARGET 2'],['stretch','STRETCH']]){
   if(d[key]===null||d[key]===undefined||String(d[key]).trim()==='')continue;
   const p=price(d[key]);
   if(p===null||(d.direction==='LONG'?p<=entry:p>=entry))throw fail('A saved target is invalid.',409);
   levels.push({kind:name,price:p});
  }
  return out({ok:true,source:'MEMBER_REPORTED_SAVED_PLAN',planId:Number(key),
   symbol:d.symbol.toUpperCase(),direction:d.direction,asOf:d.asOf,
   levels,note:'These are member-entered plan references, not exchange levels, broker orders or verified historical outcomes. The matching ticker and observation-time gate are enforced again by Chart Studio.'});
 }catch(e){
  const status=[400,401,403,404,405,409].includes(e?.status)?e.status:503;
  return out({ok:false,error:e?.message||'Private plan levels unavailable.'},status);
 }
}
