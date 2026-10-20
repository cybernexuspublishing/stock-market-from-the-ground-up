/* v0.14.0.114 — paid Journal private analytics. 
 * Unlike the legacy browser SiteAccess.isMember check, server verifies
 * JOURNAL_ANALYTICS entitlement for every query and scopes source to auth user.
 */
import {toolAccess} from './member-tool-access.js';
import {report} from '../_lib/journal-analytics-v014114.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store, max-age=0',
 'x-content-type-options':'nosniff','x-robots-tag':'noindex'};
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:H});
const err=(msg,status)=>Object.assign(new Error(msg),{status});
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return json({ok:false,error:'GET required.'},405);
  const url=new URL(request.url),type=url.searchParams.get('type')||'all',
   days=url.searchParams.get('days')||'all';
  if(!['all','live','paper'].includes(type)||!['all','30','90','365'].includes(days))
   return json({ok:false,error:'Invalid analytics filter.'},400);
  const acl=await toolAccess(env,request,'JOURNAL_ANALYTICS');
  if(!acl.authorized)throw err('Current Journal & Analytics entitlement required.',403);
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),
   key=String(env.SUPABASE_SECRET_KEY||'');
  if(!/^https:\/\/[^/]+$/.test(base)||!key)throw err('Private Journal analytics unavailable.',503);
  const headers={apikey:key,accept:'application/json'};
  if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key))
   headers.authorization='Bearer '+key;
  const fields='id,created_at,trade_date,exit_date,journal_type,status,decision,net_pnl,r_multiple,setup,process_grade,plan_followed';
  const all=[];
  for(let offset=0;offset<=3000;offset+=500){
   const count=offset===3000?1:500;
   const endpoint=base+'/rest/v1/decision_journal?select='+fields+
    '&user_id=eq.'+encodeURIComponent(acl.userId)+
    '&journal_type=in.(live,paper)&status=eq.closed'+
    '&order=trade_date.asc,created_at.asc,id.asc&limit='+count+'&offset='+offset;
   let response;
   try{response=await fetch(endpoint,{headers,cache:'no-store'})}
   catch{throw err('Private Journal storage unavailable.',503)}
   if(!response.ok)throw err('Private Journal storage unavailable.',503);
   const rows=await response.json().catch(()=>null);
   if(!Array.isArray(rows)||rows.length>count)throw err('Private Journal response is invalid.',503);
   if(offset===3000&&rows.length)throw err('More than 3000 records. A larger verified analytics export is required; this report was NOT truncated.',409);
   if(offset<3000)all.push(...rows);
   if(rows.length<count)break;
  }
  const result=report(all,{type,days,today:new Date().toISOString().slice(0,10)});
  // Analytics output never includes raw trade notes, journal ID, exact
  // position sizes, personal account settings or any other user's records.
  return json(result);
 }catch(e){
  return json({ok:false,error:[400,401,403,405,409].includes(e?.status)?e.message:
   'Journal analytics service unavailable.'},
   [400,401,403,405,409].includes(e?.status)?e.status:503);
 }
}
