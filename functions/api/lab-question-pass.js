/* Member Crownlight Sparks: server-authoritative balance and atomic spends.
 * NO billing grants, no simulated credits, no official grading or hidden
 * answer keys. Deployed only after owner-reviewed ledger migration.
 */
import {memberIdentity} from './member-tool-access.js';
import {getBookCodeAccess} from './lab-content.js';
const JSON_HEADERS={'content-type':'application/json; charset=utf-8',
 'cache-control':'private, no-store','x-content-type-options':'nosniff'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:JSON_HEADERS});
const deny=(message,status)=>Object.assign(Error(message),{status});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LABS=Object.freeze({
 'F2-C07-L01':{book:'FOUNDATION_BOOK_2',questions:['body','range','percent']},
 'F2-C07-L02':{book:'FOUNDATION_BOOK_2',questions:['body','range','percent']},
 'F3-C06-L01':{book:'FOUNDATION_BOOK_3',questions:['dollars','shares','vwap']}
});
function cfg(env){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(url)||!secret)throw deny('Crownlight Sparks service is unavailable.',503);
 return {url,secret};
}
function credentials(secret){
 const h={apikey:secret,accept:'application/json','content-type':'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
  h.authorization='Bearer '+secret;
 return h;
}
async function rpc(env,name,argumentsObject){
 const {url,secret}=cfg(env);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const r=await fetch(url+'/rest/v1/rpc/'+name,{
   method:'POST',headers:credentials(secret),cache:'no-store',signal:controller.signal,
   body:JSON.stringify(argumentsObject)
  });
  if(!r.ok)throw deny('Crownlight Sparks ledger could not be confirmed. Check your wallet before retrying.',503);
  const obj=await r.json();
  if(!obj||typeof obj!=='object'||Array.isArray(obj))
   throw deny('Crownlight Sparks ledger response is invalid.',503);
  return obj;
 }catch(error){
  if(error?.status)throw error;
  throw deny('Crownlight Sparks request status could not be confirmed. Check your wallet before retrying.',503);
 }finally{clearTimeout(timer)}
}
async function bookAuthorized(env,request,labId){
 const spec=LABS[labId];
 if(!spec)throw deny('Crownlight Sparks is not available for this Lab.',404);
 const allowed=await getBookCodeAccess(env,request,spec.book);
 if(allowed!==true)throw deny('An eligible book or Full Platform membership is required.',403);
 const {url,secret}=cfg(env);
 const h=credentials(secret);
 const response=await fetch(url+'/rest/v1/platform_labs?select=lab_id,active,registry_visible,book_code&lab_id=eq.'+
  encodeURIComponent(labId)+'&limit=1',{headers:h,cache:'no-store'});
 if(!response.ok)throw deny('Lab registry is unavailable.',503);
 const found=(await response.json())?.[0];
 if(!found||found.active!==true||found.registry_visible!==true||found.book_code!==spec.book)
  throw deny('This Lab is not currently released for Crownlight Sparks use.',404);
 return spec;
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))return reply({ok:false,error:'Method not allowed.'},405);
  const actor=await memberIdentity(env,request);
  let labId='',operation=null;
  if(request.method==='GET'){
   labId=new URL(request.url).searchParams.get('labId')||'';
  }else{
   const len=Number(request.headers.get('content-length')||0);
   if(len>2048)return reply({ok:false,error:'Invalid credit request.'},413);
   const body=await request.text();
   if(body.length>2048)return reply({ok:false,error:'Invalid credit request.'},413);
   try{operation=JSON.parse(body)}catch{return reply({ok:false,error:'Invalid credit request.'},400)}
   labId=String(operation?.labId||'');
  }
  if(request.method==='GET'){
   // The wallet is account-wide: members can view balances from any Lab.
   const {url,secret}=cfg(env),headers=credentials(secret);
   const profile=await fetch(url+'/rest/v1/profiles?select=account_kind&id=eq.'+
    encodeURIComponent(actor.userId)+'&limit=1',{headers,cache:'no-store'});
   if(!profile.ok)throw deny('Member account status cannot be verified.',503);
   if((await profile.json())?.[0]?.account_kind!=='member')
    throw deny('Crownlight Sparks is available only to eligible member accounts.',403);
   const flags=await fetch(url+'/rest/v1/admin_user_flags?select=status&user_id=eq.'+
    encodeURIComponent(actor.userId)+'&limit=1',{headers,cache:'no-store'});
   if(!flags.ok)throw deny('Account restrictions cannot be verified.',503);
   if(['restricted','suspended'].includes(
     String((await flags.json())?.[0]?.status||'').toLowerCase()))
    throw deny('Crownlight Sparks is unavailable for this account.',403);
   const balance=await rpc(env,'groundup_question_pass_summary',{p_user_id:actor.userId});
   const catalog=await fetch(url+'/rest/v1/gu_sparks_price_catalog_v1?select=sku,sparks_cost,state&sku=in.(PRACTICE_REVEAL,PRACTICE_SKIP)',{headers,cache:'no-store'});
   if(!catalog.ok)throw deny('Practice Sparks prices unavailable.',503);
   const rows=await catalog.json();
   const reveal=rows.find(x=>x.sku==='PRACTICE_REVEAL'&&x.state==='active')?.sparks_cost;
   const skip=rows.find(x=>x.sku==='PRACTICE_SKIP'&&x.state==='active')?.sparks_cost;
   if(!Number.isSafeInteger(reveal)||!Number.isSafeInteger(skip))throw deny('Practice Sparks prices unavailable.',503);
   return reply({ok:true,balance,prices:{reveal,skip},
    creditRule:'Server-priced optional Reveal or Skip; ordinary instruction and retries remain included.'});
  }
  const spec=await bookAuthorized(env,request,labId);
  const {questionId,action,attemptId,requestId,expectedCost}=operation||{};
  if(!spec.questions.includes(questionId)||!['reveal','skip'].includes(action)||
   typeof attemptId!=='string'||!UUID.test(attemptId)||
   typeof requestId!=='string'||!UUID.test(requestId)||
   !Number.isSafeInteger(expectedCost)||expectedCost<1||expectedCost>100000)
   return reply({ok:false,error:'Invalid credit request.'},400);
  const spent=await rpc(env,'groundup_question_pass_spend_v2',{
   p_user_id:actor.userId,p_attempt_id:attemptId,p_lab_id:labId,
   p_question_id:questionId,p_action:action,p_request_id:requestId,p_expected_cost:expectedCost
  });
  if(spent.ok!==true){
   return reply({ok:false,error:String(spent.error||'Crownlight Sparks unavailable.').slice(0,180),
    balance:spent.balance||null},409);
  }
  return reply({ok:true,action,spent:spent.spent,alreadyUsed:spent.alreadyUsed===true,balance:spent.balance,
   studyOnly:true,assessed:false});
 }catch(e){
  return reply({ok:false,error:e?.status===503?'Crownlight Sparks service is unavailable. Check your wallet for the current balance.':
   String(e.message||'Crownlight Sparks unavailable.').slice(0,180)},e?.status||500);
 }
}
