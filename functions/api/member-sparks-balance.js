/* Fast, read-only Crownlight Sparks balance, suitable for a five-second
 * navigation heartbeat. Never creates a grant or spends any Sparks.
 */
import {memberIdentity} from './member-tool-access.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
const valid=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000;
export async function onRequest({request,env}){
 if(request.method!=='GET')return reply({ok:false,error:'Method not allowed'},405);
 try{
  const actor=await memberIdentity(env,request);
  const c=actor.config,headers={apikey:c.secret,accept:'application/json'};
  if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(c.secret))
   headers.authorization='Bearer '+c.secret;
  const uid=encodeURIComponent(actor.userId);
  const [profileResponse,flagsResponse]=await Promise.all([
   fetch(c.base+'/rest/v1/profiles?select=account_kind,deleted_at&id=eq.'+uid+'&limit=1',{headers,cache:'no-store'}),
   fetch(c.base+'/rest/v1/admin_user_flags?select=status&user_id=eq.'+uid+'&limit=20',{headers,cache:'no-store'})
  ]);
  if(!profileResponse.ok||!flagsResponse.ok)throw Error('Eligibility unavailable');
  const profile=await profileResponse.json(),flags=await flagsResponse.json();
  if(!Array.isArray(profile)||profile[0]?.account_kind!=='member'||profile[0]?.deleted_at!=null||
      !Array.isArray(flags)||flags.some(r=>['restricted','suspended'].includes(String(r.status||'').toLowerCase())))
   return reply({ok:false,error:'Wallet unavailable for this account'},403);
  const r=await fetch(c.base+'/rest/v1/rpc/groundup_question_pass_summary',{
   method:'POST',headers:{...headers,'content-type':'application/json'},
   body:JSON.stringify({p_user_id:actor.userId}),cache:'no-store'});
  if(!r.ok)throw Error('Summary unavailable');
  const w=await r.json();
  if(!w||!['available','included','purchased','manual'].every(k=>valid(w[k]))||
     w.included+w.purchased+w.manual!==w.available)throw Error('Unreconciled wallet');
  return reply({ok:true,wallet:{
   available:w.available,included:w.included,purchased:w.purchased,manual:w.manual,
   nextExpiry:w.nextExpiry||null
  }});
 }catch(e){return reply({ok:false,error:e?.status===401?'Sign in to view your Sparks':'Wallet temporarily unavailable'},
  e?.status===401?401:503)}
}
