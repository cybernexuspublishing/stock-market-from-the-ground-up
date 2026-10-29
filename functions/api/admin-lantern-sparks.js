/* Owner-only Crownlight Sparks corrections inside existing Account Management.
 * Never mutates membership/book entitlements or Stripe financial records.
 * SQL v0.14.0.163 + v0.14.0.164 must be installed before activation.
 */
import {memberIdentity} from './member-tool-access.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const reply=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:H});
const failure=(message,status)=>Object.assign(Error(message),{status});
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function settings(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!key)throw failure('Account balance service is unavailable.',503);
 const headers={apikey:key,accept:'application/json','content-type':'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key))
  headers.authorization='Bearer '+key;
 return {base,headers};
}
async function query(env,path,{method='GET',data}={}){
 const {base,headers}=settings(env);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch(base+'/rest/v1/'+path,{method,headers,cache:'no-store',
   signal:controller.signal,body:data===undefined?undefined:JSON.stringify(data)});
  if(!response.ok)throw failure('The Sparks database contract is not ready. No adjustment was confirmed.',503);
  return await response.json();
 }catch(e){if(e.status)throw e;throw failure('The Sparks database request could not be verified. Review audit history before retrying.',503)}
 finally{clearTimeout(timer)}
}
async function requireOwner(env,request){
 const {userId}=await memberIdentity(env,request);
 const actor=await query(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(userId)+'&limit=1');
 if(!actor?.[0]||['test','showcase'].includes(actor[0].account_kind))
  throw failure('Only verified production Owner accounts can manage Sparks.',403);
 const now=Date.now();
 const roles=await query(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(userId));
 if(!roles.some(r=>r.role_code==='OWNER'&&(!r.expires_at||Date.parse(r.expires_at)>now)))
  throw failure('Owner authorization is required to adjust Crownlight Sparks.',403);
 const flags=await query(env,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(userId)+'&limit=1');
 if(['restricted','suspended'].includes(String(flags?.[0]?.status||'').toLowerCase()))
  throw failure('The Owner account is restricted.',403);
 return userId;
}
async function requireMember(env,target,actor){
 if(!UUID.test(target)||target===actor)throw failure('Select another valid member account.',400);
 const account=await query(env,'profiles?select=id,account_kind,username&id=eq.'+encodeURIComponent(target)+'&limit=1');
 if(account?.[0]?.account_kind!=='member')
  throw failure('Sparks can be adjusted only for ordinary member accounts.',403);
 const roles=await query(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(target));
 if(roles.some(r=>['OWNER','ADMIN','MODERATOR'].includes(r.role_code)&&
  (!r.expires_at||Date.parse(r.expires_at)>Date.now())))
  throw failure('Staff balances require a separate administrative review.',403);
 return account[0];
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))return reply({ok:false,error:'Method not allowed.'},405);
  const actor=await requireOwner(env,request);
  const url=new URL(request.url);
  let target=url.searchParams.get('userId')||'',body={};
  let self=request.method==='GET'&&url.searchParams.get('self')==='1';
  if(request.method==='POST'){
   if(Number(request.headers.get('content-length')||0)>2048)throw failure('Request too large.',413);
   const raw=await request.text();
   if(raw.length>2048)throw failure('Request too large.',413);
   try{body=JSON.parse(raw)}catch{throw failure('Invalid JSON request.',400)}
   if(!body||typeof body!=='object'||Array.isArray(body))throw failure('Invalid adjustment request.',400);
   self=body.self===true;
   target=String(body.userId||'');
  }
  if(self){
   // Owner's own wallet is a separate, strictly additive pathway.
   // It NEVER uses the existing member adjust RPC (which forbids self edits).
   if(target&&target!==actor)throw failure('The self-wallet request may only name your account.',400);
   target=actor;
  }else await requireMember(env,target,actor);
  if(request.method==='GET'){
   const [balance,activity]=await Promise.all([
    query(env,'rpc/groundup_question_pass_summary',{method:'POST',data:{p_user_id:target}}),
    query(env,'groundup_question_pass_adjustments?select=created_at,operation,requested_value,delta,previous_available,resulting_available,reason,actor_user_id&user_id=eq.'+
     encodeURIComponent(target)+'&order=created_at.desc&limit=20')
   ]);
   return reply({ok:true,balance,activity});
  }
  const {operation,value,reason,requestId}=body;
  if(self&&(operation!=='add'||!Number.isInteger(value)||value<1||value>10000))
   throw failure('Your Owner wallet allows Add Sparks only, from 1 to 10,000 per request.',400);
  if(!['add','remove','set'].includes(operation)||
   !Number.isInteger(value)||value<0||value>100000||
   (operation!=='set'&&value===0)||!UUID.test(String(requestId||''))||
   typeof reason!=='string'||reason.trim().length<10||reason.trim().length>500)
   throw failure('Choose an operation, a valid whole-number amount, and an audit reason of 10–500 characters.',400);
  const result=self?
   await query(env,'rpc/groundup_owner_self_sparks_add',{method:'POST',
    data:{p_actor_id:actor,p_value:value,p_reason:reason.trim(),p_request_id:requestId}}):
   await query(env,'rpc/groundup_question_pass_adjust',{method:'POST',
    data:{p_actor_id:actor,p_user_id:target,p_operation:operation,p_value:value,
     p_reason:reason.trim(),p_request_id:requestId}});
  if(result?.ok!==true)return reply({ok:false,error:String(result?.error||'Balance change rejected.').slice(0,160)},409);
  return reply({ok:true,balance:result.balance,delta:result.delta||0,alreadyApplied:result.alreadyApplied===true});
 }catch(e){
  return reply({ok:false,error:e?.status===503?'Sparks administration is unavailable or awaiting its database migration.':String(e.message||'Access denied.').slice(0,180)},e.status||500);
 }
}
