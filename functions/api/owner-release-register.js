/* Evidence-gated project release register. The Owner can document work
 * stages but cannot self-certify CI/Stripe/Cloudflare, issue entitlements or
 * mark retail-accepted from this API. Full proof is a separate guarded gate.
 */
import {memberIdentity} from './member-tool-access.js';
import {safeAdvancedConfig,privateJson} from '../_lib/advanced-tool-access-v014110.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const out=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:H});
const fail=(s,m)=>Object.assign(new Error(m),{status:s});
const code=/^[A-Z][A-Z0-9_]{3,79}$/;
const validPhase=['research','draft','started','implemented','beta_candidate'];
async function verifiedOwner(env,request){
 const actor=await memberIdentity(env,request),c=safeAdvancedConfig(env),uid=encodeURIComponent(actor.userId);
 const [profile,roles,flags]=await Promise.all([
  privateJson(c,'profiles?select=account_kind,deleted_at&id=eq.'+uid+'&limit=1'),
  privateJson(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+uid+'&limit=50'),
  privateJson(c,'admin_user_flags?select=status&user_id=eq.'+uid+'&limit=20')
 ]);
 if(profile?.[0]?.account_kind!=='member'||profile[0].deleted_at!=null||
  !roles?.some(r=>r.role_code==='OWNER'&&(!r.expires_at||Date.parse(r.expires_at)>Date.now()))||
  roles.some(r=>r.role_code==='SHOWCASE_VIEWER'&&(!r.expires_at||Date.parse(r.expires_at)>Date.now()))||
  flags.some(f=>['suspended','restricted'].includes(String(f.status||'').toLowerCase())))
  throw fail(403,'Active Owner credentials are required.');
 return {c,userId:actor.userId};
}
function annotate(row){
 const missing=(row.required_gates||[]).filter(k=>!['passed','verified_not_applicable'].includes(row.gates?.[k]));
 const accepted=row.phase==='retail_accepted'&&row.accepted_at!=null&&missing.length===0;
 return {code:row.code,area:row.area,title:row.title,phase:row.phase,version:row.version,
  nextAction:row.next_action,sourcePath:row.source_path,updatedAt:row.updated_at,
  missingGates:missing,passedGates:(row.required_gates||[]).filter(k=>!missing.includes(k)),
  gateTotal:(row.required_gates||[]).length,accepted,sourceStatus:row.gates||{}};
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))return out({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  const actor=await verifiedOwner(env,request),table='gu_release_acceptance_v1';
  if(request.method==='GET'){
   const items=await privateJson(actor.c,table+'?select=code,area,title,phase,gates,required_gates,next_action,source_path,updated_at,accepted_at,version&order=area.asc,title.asc&limit=200');
   if(!Array.isArray(items)||items.length>160)throw fail(503,'Release register unavailable.');
   const rows=items.map(annotate);
   return out({ok:true,open:rows.filter(x=>!x.accepted),accepted:rows.filter(x=>x.accepted),
    summary:{total:rows.length,open:rows.filter(x=>!x.accepted).length,accepted:rows.filter(x=>x.accepted).length,
     betaTesting:rows.filter(x=>x.phase==='beta_testing').length,
     implemented:rows.filter(x=>x.phase==='implemented').length},
    policy:'Only independently verified gate evidence can move a product into beta, enable LIVE selling or archive it. Owner stage notes alone never certify Stripe, Supabase, Cloudflare or member acceptance.'});
  }
  if(request.headers.get('origin')!==new URL(request.url).origin)
   throw fail(403,'Origin mismatch.');
  const raw=await request.text();
  if(new TextEncoder().encode(raw).length>3000)throw fail(413,'Request too large.');
  let b;try{b=JSON.parse(raw)}catch{throw fail(400,'Invalid JSON.')}
  if(!b||!code.test(b.code||'')||!Number.isSafeInteger(b.version)||b.version<1||
   !validPhase.includes(b.phase)||typeof b.nextAction!=='string'||
   b.nextAction.length<4||b.nextAction.length>1000)throw fail(400,'Invalid progress update.');
  const where='?code=eq.'+encodeURIComponent(b.code)+'&version=eq.'+b.version+
   '&phase=in.(research,draft,started,implemented,beta_candidate)';
  const changed=await privateJson(actor.c,table+where,'PATCH',{
   phase:b.phase,next_action:b.nextAction,updated_at:new Date().toISOString(),version:b.version+1
  },'return=representation');
  if(!Array.isArray(changed)||changed.length!==1)throw fail(409,'Stage changed or is protected. Refresh.');
  return out({ok:true,item:annotate(changed[0]),notice:'Progress recorded. No beta status, LIVE checkout, credit grant, entitlement or verified acceptance gate was changed.'});
 }catch(e){const s=[400,401,403,405,409,413].includes(e?.status)?e.status:503;
  return out({ok:false,error:s===503?'Owner release registry temporarily unavailable.':e.message},s)}
}
