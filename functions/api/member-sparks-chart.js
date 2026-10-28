/* Crownlight Sparks Chart Studio passes: no checkout and no trading access. */
import {memberIdentity} from './member-tool-access.js';
import {crownlightChartEntitlement} from './chart-tier-access.js';
const HEADERS={'content-type':'application/json; charset=utf-8',
 'cache-control':'private, no-store','x-content-type-options':'nosniff'};
const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:HEADERS});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SKUS=new Set(['CHART_ADVANCED_DAY','CHART_ADVANCED_WEEK','CHART_ADVANCED_MONTH',
 'CHART_PROFESSIONAL_DAY','CHART_PROFESSIONAL_WEEK','CHART_PROFESSIONAL_MONTH']);
const rank={STANDARD:0,ADVANCED:1,PROFESSIONAL:2};
function authHeaders(secret){
 const h={apikey:secret,accept:'application/json','content-type':'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))h.authorization='Bearer '+secret;
 return h;
}
async function rest(actor,path,body){
 const r=await fetch(actor.config.base+'/rest/v1/'+path,{
  method:body?'POST':'GET',headers:authHeaders(actor.config.secret),
  body:body?JSON.stringify(body):undefined,cache:'no-store'
 });
 if(!r.ok)throw Error('SPARKS_SERVICE_UNAVAILABLE');
 return r.json();
}
export async function onRequest({request,env}){
 if(!['GET','POST'].includes(request.method))return response({ok:false,error:'METHOD_NOT_ALLOWED'},405);
 try{
  const actor=await memberIdentity(env,request);
  if(request.method==='GET'){
   const offers=await rest(actor,'gu_sparks_price_catalog_v1?select=sku,label,description,sparks_cost,duration_hours,state&category=eq.CHART_STUDIO&fulfillment=eq.CHART_PASS&state=eq.active&order=duration_hours.asc,sku.asc');
   const passes=await rest(actor,'gu_sparks_chart_passes_v1?select=tier,expires_at&user_id=eq.'+encodeURIComponent(actor.userId));
   return response({ok:true,offers:(offers||[]).filter(x=>SKUS.has(x.sku)).map(x=>({
    sku:x.sku,tier:x.sku.startsWith('CHART_ADVANCED_')?'ADVANCED':'PROFESSIONAL',
    label:x.label,costSparks:x.sparks_cost,durationHours:x.duration_hours,
    description:x.description
   })),passes:(passes||[]).filter(x=>x.expires_at&&Date.parse(x.expires_at)>Date.now())});
  }
  if(request.headers.get('origin')!==new URL(request.url).origin)
   return response({ok:false,error:'ORIGIN_MISMATCH'},403);
  if(Number(request.headers.get('content-length')||0)>1024)
   return response({ok:false,error:'INVALID_REQUEST'},413);
  const raw=await request.text();
  if(raw.length>1024)return response({ok:false,error:'INVALID_REQUEST'},413);
  let b;try{b=JSON.parse(raw)}catch{return response({ok:false,error:'INVALID_REQUEST'},400)}
  if(!b||!SKUS.has(b.sku)||typeof b.requestId!=='string'||!uuid.test(b.requestId)||
     !Number.isSafeInteger(b.expectedCost)||b.expectedCost<1||b.expectedCost>100000
   return response({ok:false,error:'INVALID_REQUEST'},400);
  // An existing paid/full membership or Owner QA access is not a Sparks purchase.
  const current=await crownlightChartEntitlement(env,request);
  if(!current.eligible)return response({ok:false,error:'NOT_ELIGIBLE'},403);
  const want=b.sku.startsWith('CHART_ADVANCED_')?'ADVANCED':'PROFESSIONAL';
  if(rank[current.tier]>=rank[want]&&current.temporaryAccess?.kind!=='SPARKS')
   return response({ok:false,error:'ALREADY_INCLUDED'},409);
  const result=await rest(actor,'rpc/gu_sparks_chart_redeem_v2',{
   p_user_id:actor.userId,p_sku:b.sku,p_request_id:b.requestId,p_expected_cost:b.expectedCost
  });
  return response(result,result.ok===true?200:409);
 }catch(e){return response({ok:false,error:e?.status===401?'SIGN_IN_REQUIRED':'SPARKS_SERVICE_UNAVAILABLE'},
  e?.status===401?401:503)}
}
