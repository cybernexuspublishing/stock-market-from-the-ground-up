import {safeToolMetric,statusReason} from '../_lib/tool-telemetry-v014111.js';
import {advancedToolContext} from '../_lib/advanced-tool-access-v014110.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:H});
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return json({ok:false,error:'GET required.'},405);
  const code=new URL(request.url).searchParams.get('tool')||'';
  const state=await advancedToolContext(env,request,code);
  safeToolMetric('beta_access',state.allowed?'allowed':'denied');
  return json({ok:true,authorized:state.allowed,accessLevel:state.accessLevel,
   tool:state.product,canSave:state.allowed,
   notice:'Access is checked against authenticated member entitlements and the active product catalog on every request. Beta calculators run in the browser; server-side access protects saved records, not the inspectable calculator source.'});
 }catch(e){safeToolMetric('beta_access',statusReason(e?.status));return json({ok:false,error:[401,403,404].includes(e.status)?e.message:'Member tool authorization unavailable.'},
  [401,403,404,405].includes(e.status)?e.status:503)}
}
