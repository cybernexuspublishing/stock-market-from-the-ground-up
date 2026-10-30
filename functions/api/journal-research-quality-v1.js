/* Paid Journal research analytics, server-verified JOURNAL_ANALYTICS access.
 * Uses the existing decision_journal; private raw notes never leave the server.
 */
import {toolAccess} from './member-tool-access.js';
import {journalResearchQuality} from '../_lib/journal-research-quality-v1.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex'};
const out=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:H});
const err=(message,status=400)=>Object.assign(new Error(message),{status});
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return out({ok:false,error:'GET required.'},405);
  const url=new URL(request.url);
  const type=url.searchParams.get('type')||'all',days=url.searchParams.get('days')||'all';
  if(!['all','live','paper','observation','historical_lab'].includes(type)||
   !['all','30','90','365'].includes(days))throw err('Invalid research filter.');
  const member=await toolAccess(env,request,'JOURNAL_ANALYTICS');
  if(!member.authorized)throw err('Paid Journal Analytics access required.',403);
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
  const secret=String(env.SUPABASE_SECRET_KEY||'');
  if(!/^https:\/\/[^/]+$/.test(base)||!secret)throw err('Research statistics unavailable.',503);
  const headers={apikey:secret,accept:'application/json'};
  if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
   headers.authorization='Bearer '+secret;
  const fields='id,trade_date,journal_type,status,decision,setup,evidence,thesis,invalidation,entry_trigger,catalyst_context,no_trade_condition,plan_locked_at,plan_followed,direction,planned_entry,actual_entry,planned_stop,planned_target,actual_exit,share_quantity,fees,gross_pnl,net_pnl,r_multiple,mfe_per_share,mae_per_share';
  const rows=[];
  for(let offset=0;offset<=3000;offset+=500){
   const count=offset===3000?1:500;
   const endpoint=base+'/rest/v1/decision_journal?select='+fields+
    '&user_id=eq.'+encodeURIComponent(member.userId)+
    '&order=trade_date.asc,id.asc&limit='+count+'&offset='+offset;
   const response=await fetch(endpoint,{headers,cache:'no-store'}).catch(()=>null);
   if(!response?.ok)throw err('Private Journal data unavailable.',503);
   const page=await response.json().catch(()=>null);
   if(!Array.isArray(page)||page.length>count)throw err('Private data unavailable.',503);
   if(offset===3000&&page.length)throw err('More than 3000 records: full research analysis unavailable rather than truncated.',409);
   if(offset<3000)rows.push(...page);
   if(page.length<count)break;
  }
  // Owner-scoped existing Journal research links, not a second Journal store.
  // Fail rather than silently truncate linked-record denominators.
  const links=[];
  for(let offset=0;offset<=3000;offset+=500){
   const count=offset===3000?1:500;
   const endpoint=base+'/rest/v1/gu_journal_research_links_v1?select=journal_id,workbench_record_id'+
    '&user_id=eq.'+encodeURIComponent(member.userId)+
    '&order=journal_id.asc,id.asc&limit='+count+'&offset='+offset;
   const response=await fetch(endpoint,{headers,cache:'no-store'}).catch(()=>null);
   if(!response?.ok)throw err('Private Journal link analysis unavailable.',503);
   const page=await response.json().catch(()=>null);
   if(!Array.isArray(page)||page.length>count)throw err('Private Journal link analysis unavailable.',503);
   if(offset===3000&&page.length)throw err('More than 3000 links: full linkage analysis unavailable rather than truncated.',409);
   if(offset<3000)links.push(...page);
   if(page.length<count)break;
  }
  const result=journalResearchQuality(rows,{type,days,today:new Date().toISOString().slice(0,10),researchLinks:links});
  return out({ok:true,...result});
 }catch(e){const status=[400,401,403,405,409].includes(e?.status)?e.status:503;
  return out({ok:false,error:status===503?'Private research report unavailable.':e.message},status)}
}
