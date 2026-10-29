/* Owner-only fixed-term Lumen offer price editor.
 * GET lists drafts. POST must explicitly set state=active to release. No
 * purchase, grant, payment, refund or wallet debit takes place here.
 */
import {memberIdentity} from './member-tool-access.js';
import {safeAdvancedConfig,privateJson} from '../_lib/advanced-tool-access-v014110.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const out=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:H});
const error=(m,s=400)=>Object.assign(new Error(m),{status:s});
const code=/^[A-Z][A-Z0-9_]{2,79}$/;
async function owner(env,request){
 const actor=await memberIdentity(env,request),c=safeAdvancedConfig(env),uid=encodeURIComponent(actor.userId);
 const [p,r,f]=await Promise.all([
  privateJson(c,'profiles?select=account_kind,deleted_at&id=eq.'+uid+'&limit=1'),
  privateJson(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+uid+'&limit=20'),
  privateJson(c,'admin_user_flags?select=status&user_id=eq.'+uid+'&limit=20')
 ]);
 if(p?.[0]?.account_kind!=='member'||p[0]?.deleted_at!=null||
  f?.some(x=>['suspended','restricted'].includes(String(x?.status||'').toLowerCase()))||
  r?.some(x=>x.role_code==='SHOWCASE_VIEWER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now()))||
  !r?.some(x=>x.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())))
  throw error('Only an active Owner can manage Lumen offers.',403);
 return {c,userId:actor.userId};
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))return out({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  const actor=await owner(env,request);
  const path='gu_lumen_tool_offers_v1';
  if(request.method==='GET'){
   const rows=await privateJson(actor.c,path+'?select=offer_code,tool_code,duration_days,price_cents,lumens_cost,state,version,updated_at&order=tool_code.asc,duration_days.asc&limit=200');
   return out({ok:true,offers:rows||[],rateCents:7});
  }
  if(request.headers.get('origin')!==new URL(request.url).origin)
   throw error('Origin mismatch.',403);
  const text=await request.text();
  if(new TextEncoder().encode(text).byteLength>1500)throw error('Payload too large.',413);
  let b;try{b=JSON.parse(text)}catch{throw error('Invalid JSON.')}
  if(!b||!code.test(b.offerCode||'')||!Number.isSafeInteger(b.version)||b.version<1||
   !['draft','active','retired'].includes(b.state)||
   (b.priceCents!==null&&(!Number.isSafeInteger(b.priceCents)||b.priceCents<1||b.priceCents>50000000))||
   (b.state==='active'&&b.priceCents===null))
   throw error('A valid SKU, expected version, positive price and state are required.');
  const [existing]=await privateJson(actor.c,path+'?select=offer_code,tool_code,duration_days,version'+
   '&offer_code=eq.'+encodeURIComponent(b.offerCode)+'&limit=1');
  if(!existing)throw error('Unknown Lumen offer.',404);
  if(b.state==='active'){
   const [tool,access]=await Promise.all([
    privateJson(actor.c,'platform_tools?select=active,status&tool_code=eq.'+encodeURIComponent(existing.tool_code)+'&limit=1'),
    privateJson(actor.c,'gu_product_access_config_v1?select=paid_access,purchase_durations'+
     '&product_code=eq.'+encodeURIComponent(existing.tool_code)+'&limit=1')
   ]);
   if(tool?.[0]?.active!==true||!['live','beta'].includes(tool?.[0]?.status)||
    access?.[0]?.paid_access!==true||!access?.[0]?.purchase_durations?.includes(existing.duration_days))
    throw error('The product and selected duration are not authorized for sales.',409);
  }
  const data=await privateJson(actor.c,path+'?offer_code=eq.'+encodeURIComponent(b.offerCode)+
   '&version=eq.'+b.version,'PATCH',{price_cents:b.priceCents,state:b.state,
    version:b.version+1,updated_at:new Date().toISOString(),updated_by:actor.userId},'return=representation');
  if(!Array.isArray(data)||data.length!==1)throw error('Offer revision changed. Refresh before editing.',409);
  return out({ok:true,offer:data[0]});
 }catch(e){const s=[400,401,403,404,405,409,413].includes(e?.status)?e.status:503;
  return out({ok:false,error:s===503?'Owner Lumen catalog unavailable.':e.message},s)}
}
