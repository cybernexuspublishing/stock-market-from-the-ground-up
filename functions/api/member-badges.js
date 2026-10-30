/* Verified public membership badges. Read-only; never grants access. */
import {memberIdentity} from './member-tool-access.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LABELS=Object.freeze({FREE:'Free Member',FOUNDING_14:'Founding 14-Day Member',
 FOUNDING_30:'Founding 30-Day Member',FOUNDING_60:'Founding 60-Day Member'});
const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
 'x-content-type-options':'nosniff','vary':'Authorization'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEAD});
const failure=(message,status=400)=>Object.assign(new Error(message),{status});
async function rows(cfg,table,params){
 const url=new URL(cfg.base+'/rest/v1/'+table);
 for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
 const h={apikey:cfg.secret,accept:'application/json'};
 if(!cfg.secret.startsWith('sb_secret_'))h.authorization='Bearer '+cfg.secret;
 const res=await fetch(url,{headers:h,cache:'no-store'});
 if(!res.ok)throw failure('Badge verification unavailable.',503);
 const data=await res.json();
 if(!Array.isArray(data))throw failure('Badge verification unavailable.',503);
 return data;
}
const active=(start,end,now)=>(!start||Date.parse(start)<=now)&&(!end||Date.parse(end)>now);
export async function onRequest({env,request}){
 if(request.method!=='GET')return reply({ok:false,error:'Method not allowed.'},405);
 try{
  const {config}=await memberIdentity(env,request);
  const input=new URL(request.url).searchParams.get('ids')||'';
  const ids=[...new Set(input.split(',').map(x=>x.trim()).filter(Boolean))];
  if(!ids.length||ids.length>50||ids.some(id=>!UUID.test(id)))
   throw failure('Provide 1 to 50 valid member identifiers.');
  const filter='in.('+ids.join(',')+')',now=Date.now();
  const [profiles,founders,grants,subscriptions]=await Promise.all([
   rows(config,'profiles',{select:'id',id:filter,deleted_at:'is.null',limit:'50'}),
   rows(config,'gu_founder_members_v014173',{select:'user_id',user_id:filter,revoked_at:'is.null',limit:'50'}),
   rows(config,'user_plan_grants',{select:'user_id,plan_code,status,starts_at,ends_at',
    user_id:filter,status:'eq.active',limit:'500'}),
   rows(config,'site_subscriptions',{select:'user_id,plan_code,status,current_period_end',
    user_id:filter,status:'in.(active,trialing)',limit:'500'})
  ]);
  const existing=new Set(profiles.map(r=>r.id));
  const ledger=new Set(founders.map(r=>r.user_id));
  const ranking=['FOUNDING_60','FOUNDING_30','FOUNDING_14'];
  const earned=new Map();
  function grant(user,plan){
   if(!ledger.has(user)||!ranking.includes(plan))return;
   if(!earned.has(user))earned.set(user,new Set());
   earned.get(user).add(plan);
  }
  for(const g of grants)
   if(g.status==='active'&&active(g.starts_at,g.ends_at,now))grant(g.user_id,g.plan_code);
  for(const s of subscriptions)
   if(['active','trialing'].includes(s.status)&&active(null,s.current_period_end,now))
    grant(s.user_id,s.plan_code);
  return reply({ok:true,badges:ids.filter(id=>existing.has(id)).map(userId=>{
   const planCode=ranking.find(p=>earned.get(userId)?.has(p))||'FREE';
   return {userId,planCode,label:LABELS[planCode]};
  })});
 }catch(err){
  const code=Number.isInteger(err?.status)?err.status:503;
  return reply({ok:false,error:code===400?err.message:code===401?'Sign in required.':
   'Badge verification unavailable.'},code);
 }
}
