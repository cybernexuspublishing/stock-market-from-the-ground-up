/* v0.14.0.146: Existing journal, tool entitlement and Supabase service storage.
 * No client-side entitlement, cross-account query, synthetic backtest or
 * future-bar reconstruction. Paper and live records NEVER pooled.
 */
import {advancedToolContext,privateJson} from '../_lib/advanced-tool-access-v014110.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store, max-age=0',
 'vary':'Authorization','x-content-type-options':'nosniff','x-robots-tag':'noindex'};
const reply=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
const problem=(message,status)=>Object.assign(new Error(message),{status});
const finite=x=>x===null||x===undefined||String(x).trim()===''?null:
  Number.isFinite(Number(x))&&Math.abs(Number(x))<=1000?Number(x):null;
export function summarize(rows){
 if(!Array.isArray(rows))throw problem('Invalid private Journal records.',503);
 const groups=new Map();
 for(const r of rows){
  if(!r||!['live','paper'].includes(r.journal_type)||r.status!=='closed')continue;
  const kind=r.journal_type;
  const setup=typeof r.setup==='string'&&r.setup.trim()?r.setup.trim().slice(0,120):'Unclassified';
  const key=kind+'\u001f'+setup;
  if(!groups.has(key))groups.set(key,{journalType:kind,setup,records:0,measured:0,wins:0,
   rSum:0,mfeSum:0,mfeCount:0,maeSum:0,maeCount:0,followed:0,followedKnown:0});
  const g=groups.get(key);g.records++;
  const rValue=finite(r.r_multiple),mfe=finite(r.mfe_r),mae=finite(r.mae_r);
  if(rValue!==null){g.measured++;g.rSum+=rValue;if(rValue>0)g.wins++}
  if(mfe!==null){g.mfeSum+=mfe;g.mfeCount++}
  if(mae!==null){g.maeSum+=mae;g.maeCount++}
  if(r.plan_followed===true||r.plan_followed===false){g.followedKnown++;if(r.plan_followed)g.followed++}
 }
 return [...groups.values()].map(g=>({
  journalType:g.journalType,setup:g.setup,records:g.records,measured:g.measured,
  // Withhold estimated rates on small subsets. They are NOT evidence of expectancy.
  insufficientSample:g.measured<20,
  winPct:g.measured>=20?g.wins/g.measured*100:null,
  averageR:g.measured>=20?g.rSum/g.measured:null,
  averageMfeR:g.mfeCount>=20?g.mfeSum/g.mfeCount:null,
  averageMaeR:g.maeCount>=20?g.maeSum/g.maeCount:null,
  planFollowedPct:g.followedKnown>=20?g.followed/g.followedKnown*100:null
 })).sort((a,b)=>b.records-a.records||a.journalType.localeCompare(b.journalType)||a.setup.localeCompare(b.setup));
}
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return reply({ok:false,error:'GET only.'},405);
  const url=new URL(request.url),action=url.searchParams.get('action');
  if(!['review','strategy'].includes(action))return reply({ok:false,error:'Unknown research action.'},404);
  const code=action==='review'?'TRADE_REVIEW_REPLAY':'STRATEGY_VALIDATION';
  const auth=await advancedToolContext(env,request,code);
  if(!auth.allowed)return reply({ok:false,error:'Current entitlement does not include this tool.'},403);
  if(action==='review'){
   const path='decision_journal?select=id,ticker,trade_date,setup,journal_type,status'+
    '&user_id=eq.'+encodeURIComponent(auth.userId)+'&order=created_at.desc,id.desc&limit=50';
   const data=await privateJson(auth.c,path);
   if(!Array.isArray(data)||data.length>50)throw problem('Journal list unavailable.',503);
   return reply({ok:true,tool:code,records:data.map(r=>({
    id:r.id,ticker:r.ticker,trade_date:r.trade_date,setup:r.setup,
    journal_type:r.journal_type,status:r.status
   })),replayAvailable:false,
   notice:'Journal inspection only. An eligible licensed historical dataset and replay entitlement are required separately.'});
  }
  const columns='setup,journal_type,status,r_multiple,mfe_r,mae_r,plan_followed';
  const all=[];
  for(let offset=0;offset<=3000;offset+=500){
   const limit=offset===3000?1:500;
   const path='decision_journal?select='+columns+
    '&user_id=eq.'+encodeURIComponent(auth.userId)+
    '&journal_type=in.(live,paper)&status=eq.closed'+
    '&order=created_at.asc,id.asc&limit='+limit+'&offset='+offset;
   const rows=await privateJson(auth.c,path);
   if(!Array.isArray(rows)||rows.length>limit)throw problem('Invalid private Journal page.',503);
   if(offset===3000&&rows.length)throw problem('More than 3,000 records: analytics withheld to prevent silent truncation.',409);
   if(offset<3000)all.push(...rows);
   if(rows.length<limit)break;
  }
  return reply({ok:true,tool:code,recordCount:all.length,groups:summarize(all),
   source:'PRIVATE_MEMBER_SELF_REPORTED_JOURNAL',
   notice:'Paper and live outcomes remain separate. Only groups with at least 20 nonmissing R observations show descriptive rates; neither backtesting, brokerage execution, independent fill verification nor future expectancy is established.'});
 }catch(e){
  const code=[400,401,403,404,405,409].includes(e?.status)?e.status:503;
  return reply({ok:false,error:code===503?'Private Journal research temporarily unavailable.':
   e?.message||'Research access denied.'},code);
 }
}
