/* Private signed-in member Crownlight Sparks wallet; READ ONLY.
 * Reads the existing transactionally maintained credits summary under
 * service-role authority, never a client-supplied user ID or grant.
 */
import {memberIdentity} from './member-tool-access.js';
const H={'content-type':'application/json; charset=utf-8',
 'cache-control':'private, no-store','x-content-type-options':'nosniff'};
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:H});
const fail=(message,status)=>Object.assign(new Error(message),{status});
const secretHeaders=key=>{
 const h={apikey:key,accept:'application/json','content-type':'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key))h.authorization='Bearer '+key;
 return h;
};
async function get(base,key,path,opts={}){
 const r=await fetch(base+'/rest/v1/'+path,{...opts,headers:{...secretHeaders(key),...opts.headers},cache:'no-store'});
 if(!r.ok)throw fail('Wallet data could not be verified.',503);
 return r.json();
}
const unsigned=value=>Number.isSafeInteger(value)&&value>=0&&value<=1000000000;
export async function onRequest({request,env}){
 if(request.method!=='GET')return json({ok:false,error:'Method not allowed.'},405);
 try{
  const {userId,config}=await memberIdentity(env,request);
  const {base,secret}=config;
  const [profiles,flags]=await Promise.all([
   get(base,secret,'profiles?select=account_kind&id=eq.'+encodeURIComponent(userId)+'&limit=1'),
   get(base,secret,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(userId)+'&limit=1')
  ]);
  if(profiles?.[0]?.account_kind!=='member'||
     ['restricted','suspended'].includes(String(flags?.[0]?.status||'').toLowerCase()))
   throw fail('Wallet unavailable for this account.',403);
  const freeGrant=await get(base,secret,'rpc/groundup_free_sparks_ensure',{
   method:'POST',body:JSON.stringify({p_user_id:userId})});
  if(freeGrant?.ok!==true)throw fail('Free credit eligibility could not be verified.',503);
  const summary=await get(base,secret,'rpc/groundup_question_pass_summary',{
   method:'POST',body:JSON.stringify({p_user_id:userId})});
  if(!summary||!['included','purchased','manual','available'].every(k=>unsigned(summary[k]))||
   summary.included+summary.purchased+summary.manual!==summary.available)
   throw fail('Wallet ledger could not be reconciled.',503);
  return json({ok:true,wallet:{available:summary.available,included:summary.included,
   purchased:summary.purchased,manual:summary.manual,nextExpiry:summary.nextExpiry||null},
   freeCredits:{allowance:5,expiryPolicy:'Lumens never expire.',
    nextGrantAt:freeGrant.nextGrantAt||null,issuedThisRequest:freeGrant.issued||0,
    applies:freeGrant.reason!=='paid_account_excluded'},
   howToUse:'Crownlight Lumens (formerly Sparks) are used for optional marketplace benefits, including server-priced ungraded Reveal or Skip actions and temporary ad-free passes for eligible plans. All ordinary instruction and practice retries remain available. Reveals and skips never award official assessment mastery.',
   purchaseEnabled:false});
 }catch(e){
  return json({ok:false,error:e.status===401?'Please sign in to view your Lumens.':
   e.status===403?'Wallet unavailable for this account.':'Wallet temporarily unavailable.'},
   [401,403].includes(e.status)?e.status:503);
 }
}
