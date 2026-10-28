/* Member-only Lab reference context for educational simulator import.
 * Reference dates come from platform_labs; never synthesize missing timestamps.
 * This endpoint grants no Lab entitlement or market-data license.
 */
import {toolAccess} from './member-tool-access.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
const ID=/^(?:(?:F[123]|DT|TAPE)-C\d{2}-L\d{2}|SITE-\d{3})$/;
export async function onRequest({request,env}){
 if(request.method!=='GET')return send({ok:false,error:'Method not allowed'},405);
 const labId=new URL(request.url).searchParams.get('lab')||'';
 if(!ID.test(labId))return send({ok:false,error:'Invalid Lab ID'},400);
 try{
  const [study,training]=await Promise.all([
   toolAccess(env,request,'INTERACTIVE_LEARNING'),toolAccess(env,request,'ONDEMAND_TRAINING')
  ]);
  if(study.userId!==training.userId||!study.freeEligible||!training.freeEligible)
   return send({ok:false,error:'This member cannot access the Lab catalog.'},403);
  const secret=String(env.SUPABASE_SECRET_KEY||''),base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
  if(!base||!secret)throw new Error('Lab source unavailable');
  const h={apikey:secret,accept:'application/json'};
  if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))h.authorization='Bearer '+secret;
  const r=await fetch(base+'/rest/v1/platform_labs?select=lab_id,title,ticker,historical_date,timeframe,public_sample,active,metadata&lab_id=eq.'+
   encodeURIComponent(labId)+'&limit=1',{headers:h,cache:'no-store'});
  if(!r.ok)throw new Error('Lab reference unavailable');
  const rows=await r.json(),row=rows?.[0];
  if(!row||row.active!==true)return send({ok:false,error:'Lab reference not available'},404);
  const isFree=['F1-C02-L01','F2-C01-L01','F3-C01-L01'].includes(labId)&&row.public_sample===true;
  if(!isFree&&!study.authorized&&!training.authorized)return send({ok:false,error:'This Lab requires additional member access.'},403);
  const date=typeof row.historical_date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(row.historical_date)?row.historical_date:null;
  const ticker=typeof row.ticker==='string'&&/^[A-Z][A-Z0-9.-]{0,11}$/.test(row.ticker)?row.ticker:null;
  const timeframe=typeof row.timeframe==='string'&&row.timeframe.length<42?row.timeframe:null;
  // Only return a time when independently structured and explicitly tagged as verified.
  // Existing canonical Lab metadata has no verified intraday time; report null.
  const startTime=row.metadata?.verified_time===true&&/^\d{2}:\d{2}$/.test(row.metadata?.start_time_et||'')?row.metadata.start_time_et:null;
  const endTime=row.metadata?.verified_time===true&&/^\d{2}:\d{2}$/.test(row.metadata?.end_time_et||'')?row.metadata.end_time_et:null;
  return send({ok:true,labId,title:row.title,referenceDate:date,startTimeET:startTime,endTimeET:endTime,
   ticker,timeframe,timeSource:startTime||endTime?'verified_lab_metadata':'not_provided',
   caveat:'The Lab reference date does not certify market coverage, intraday timestamps, exchange sessions, or provider entitlements.'});
 }catch(e){return send({ok:false,error:e.status===401?'Sign in required':'Unable to verify this Lab context'},e.status===401?401:503)}
}
