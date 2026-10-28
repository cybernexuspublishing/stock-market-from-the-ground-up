/* Crownlight Sparks V2: authenticated ad-free pass status and redemption. */
import {memberIdentity} from './member-tool-access.js';
const HEADERS={'content-type':'application/json; charset=utf-8',
 'cache-control':'private, no-store','x-content-type-options':'nosniff'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
async function rpc(config,name,args){
 const h={apikey:config.secret,'content-type':'application/json',accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(config.secret))
  h.authorization='Bearer '+config.secret;
 const response=await fetch(config.base+'/rest/v1/rpc/'+name,{
  method:'POST',headers:h,body:JSON.stringify(args),cache:'no-store'});
 if(!response.ok)throw Error('BACKEND_UNAVAILABLE');
 return response.json();
}
export async function onRequest({request,env}){
 if(!['GET','POST'].includes(request.method))return json({ok:false,error:'METHOD_NOT_ALLOWED'},405);
 try{
  const actor=await memberIdentity(env,request);
  if(request.method==='GET'){
   return json(await rpc(actor.config,'gu_sparks_adfree_status_v1',{p_user_id:actor.userId}));
  }
  if(request.headers.get('origin')!==new URL(request.url).origin)
   return json({ok:false,error:'ORIGIN_MISMATCH'},403);
  if(Number(request.headers.get('content-length')||0)>1024)
   return json({ok:false,error:'INVALID_REQUEST'},413);
  const raw=await request.text();
  if(raw.length>1024)return json({ok:false,error:'INVALID_REQUEST'},413);
  let body;
  try{body=JSON.parse(raw)}catch{return json({ok:false,error:'INVALID_REQUEST'},400)}
  if(!body||!['ADFREE_DAY','ADFREE_WEEK','ADFREE_MONTH'].includes(body.sku)
   ||typeof body.requestId!=='string'||!UUID.test(body.requestId)||!Number.isSafeInteger(body.expectedCost)||
   body.expectedCost<1||body.expectedCost>100000)
   return json({ok:false,error:'INVALID_REQUEST'},400);
  const value=await rpc(actor.config,'gu_sparks_adfree_redeem_v2',{
   p_user_id:actor.userId,p_sku:body.sku,p_request_id:body.requestId,
   p_expected_cost:body.expectedCost});
  return json(value,value.ok===true?200:409);
 }catch(e){
  return json({ok:false,error:e?.status===401?'SIGN_IN_REQUIRED':'SPARKS_SERVICE_UNAVAILABLE'},
   e?.status===401?401:503);
 }
}
