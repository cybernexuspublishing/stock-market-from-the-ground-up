/* Read-only authenticated handoff from the saved premium Workbench to a
 * member's existing Free/Paid Trading Journal draft. Never creates a Journal
 * row, locks a plan, bypasses Free quotas or reports a historical execution.
 */
import {advancedToolContext,privateJson} from '../_lib/advanced-tool-access-v014110.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const output=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
const error=(message,status=400)=>Object.assign(new Error(message),{status});
const pattern=/^[1-9][0-9]{0,15}$/;
const clip=(v,n=900)=>String(v??'').slice(0,n);
const positive=(n)=>{const value=Number(n);return Number.isFinite(value)&&value>0&&value<=1000000?value:null};
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return output({ok:false,error:'Read-only handoff.'},405);
  const id=new URL(request.url).searchParams.get('planId');
  if(!pattern.test(id||'')||!Number.isSafeInteger(Number(id)))throw error('Valid saved plan ID required.');
  const auth=await advancedToolContext(env,request,'WATCHLIST_WORKBENCH');
  if(!auth.allowed||auth.accessLevel!=='entitled')
   throw error('Current paid Workbench entitlement required to transfer a saved plan.',403);
  const rows=await privateJson(auth.c,'tool_workspace_records?select=id,record_type,payload,created_at'+
   '&id=eq.'+id+'&user_id=eq.'+encodeURIComponent(auth.userId)+
   '&tool_code=eq.WATCHLIST_WORKBENCH&record_type=eq.scenario_review&limit=1');
  if(!Array.isArray(rows)||rows.length!==1||rows[0].payload?.kind!=='ADVANCED_TRADE_PLAN_SNAPSHOT_V1')
   throw error('Saved plan not found in your private Workbench.',404);
  const snapshot=rows[0],d=snapshot.payload.data;
  if(!d||typeof d!=='object'||!/^[A-Za-z][A-Za-z0-9.-]{0,11}$/.test(d.symbol||'')||
   !['LONG','SHORT'].includes(d.direction)||!['PLAN','WATCH','REJECT','NO TRADE'].includes(d.decision))
   throw error('This snapshot cannot be transferred safely.',409);
  const asOf=Date.parse(d.asOf||'');
  if(!Number.isFinite(asOf)||asOf>Date.now()+300000)
   throw error('Plan observation time is invalid or future-dated.',409);
  const sourceAt=d.sourceAt?Date.parse(d.sourceAt):null;
  if(d.sourceAt&&(!Number.isFinite(sourceAt)||sourceAt>asOf))
   throw error('Catalyst publication time is after the plan observation.',409);
  // A proposed plan is not a real executed trade. 'PLAN' maps to WATCH until
  // the member deliberately records an execution in the Journal.
  const decision=d.decision==='REJECT'||d.decision==='NO TRADE'?'NO TRADE':'WATCH';
  return output({ok:true,source:'MEMBER_REPORTED_SAVED_PLAN',planId:Number(id),
   savedAt:snapshot.created_at,asOf:d.asOf,neverLockAutomatically:true,
   note:'Transfer creates no trade or P&L. Verify copied fields, save the draft, then lock only when appropriate.',
   journalDraft:{
    ticker:clip(d.symbol,12).toUpperCase(),trade_date:new Date(asOf).toISOString().slice(0,10),
    direction:d.direction,decision,setup:clip(d.pattern,120),
    catalyst_context:clip([d.catalyst,d.source,d.sourceUrl].filter(Boolean).join(' | '),1200),
    market_context:clip(['Higher timeframe: '+(d.trend||'not recorded'),
     'Levels: '+(d.levels||'not recorded'),'Holding period: '+(d.holding||'not recorded')].join('\n'),1400),
    evidence:clip(['Workbench plan #'+id+' saved '+snapshot.created_at,
     'Source: '+(d.source||'not recorded'),
     'Source URL: '+(d.sourceUrl||'not supplied'),
     'Source published: '+(d.sourceAt||'not supplied'),
     'Observed as-of: '+d.asOf,
     'Evidence is member-entered and not independently verified.'].join('\n'),2000),
    thesis:clip(d.thesis,1400),entry_trigger:clip(d.trigger,1100),
    invalidation:clip(d.invalidation,1100),
    no_trade_condition:clip(['Cancel if: '+(d.cancel||'not stated'),
     'Alternative: '+(d.alternative||'not stated')].join('\n'),1000),
    planned_entry:positive(d.entry),planned_stop:positive(d.stop),
    planned_target:positive(d.target1),
    share_quantity:Number.isSafeInteger(Number(snapshot.payload?.modeled?.size))&&
     Number(snapshot.payload.modeled.size)>0?Number(snapshot.payload.modeled.size):null,
    planned_exit_reason:clip(['Targets: '+[d.target1,d.target2,d.stretch].filter(Boolean).join(' / '),
     'Order/stop mechanism: '+(d.stopMechanism||'not recorded'),
     'Modeled risk does not guarantee a stop fill.'].join('\n'),1200)
   }});
 }catch(e){
  const status=[400,401,403,404,405,409].includes(e?.status)?e.status:503;
  return output({ok:false,error:status===503?'Private plan transfer temporarily unavailable.':e.message},status);
 }
}
