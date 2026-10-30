/* v0.14.0.124 | Scheduled signed-LIVE reconciliation. Read Stripe
 * provider status and compare to member-owned existing GU58 ledger; record
 * a PRIVATE discrepancy only. Never grant, charge, refund or change access.
 */
const send=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{
 'content-type':'application/json','cache-control':'private, no-store'}});
const jwt=k=>/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(k);
const sid=(s,p)=>new RegExp('^'+p+'_[A-Za-z0-9_]{6,150}$').test(String(s||''));
async function safeEq(a,b){const digest=async x=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)));
 const [x,y]=await Promise.all([digest(a),digest(b)]);let diff=0;
 for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
function cfg(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),
  key=String(env.SUPABASE_SECRET_KEY||''),
  stripe=String((env.STRIPE_LIVE_SECRET_KEY || env.GU58_STRIPE_LIVE_SECRET_KEY)||''),
  account=String((env.STRIPE_LIVE_ACCOUNT_ID || env.GU58_STRIPE_LIVE_ACCOUNT_ID)||''),
  task=String(env.GU_BILLING_TASK_SECRET||'');
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!key||
 !/^sk_live_[A-Za-z0-9_]+$/.test(stripe)||!sid(account,'acct')||task.length<32)
 return null;
 return{base,key,stripe,account,task};
}
async function get(url,init){
 const r=await fetch(url,{...init,cache:'no-store'}),j=await r.json().catch(()=>null);
 if(!r.ok||!j||j.error)throw new Error('Verified provider/dependency unavailable');
 return j;
}
async function rpc(c,name,body){return get(c.base+'/rest/v1/rpc/'+name,{
 method:'POST',headers:{apikey:c.key,'content-type':'application/json',
 ...(jwt(c.key)?{authorization:'Bearer '+c.key}:{})},
 body:JSON.stringify(body)});
}
async function stripe(c,path){return get('https://api.stripe.com/v1/'+path,{
 headers:{authorization:'Bearer '+c.stripe}});}
function expectedState(kind,sub,invoice){
 let state;
 if(['canceled','incomplete_expired'].includes(sub.status))state='canceled';
 else if(sub.status==='trialing')state='trialing';
 else if(sub.status==='active'&&invoice?.status==='paid')state='active';
 else state=kind==='plan'?'past_due':'paused';
 return state;
}
function period(sub){const value=sub.items?.data?.[0]?.current_period_end||sub.current_period_end;
 return Number.isSafeInteger(value)?value:null;}
async function compare(c,kind,row){
 if(!Number.isSafeInteger(row.id)||row.id<1||!sid(row.provider_subscription_id,'sub'))
  return{issue:'intent_mismatch',provider:null};
 if(!row.intent_id||!sid(row.price_id,'price'))return{issue:'intent_mismatch',provider:null};
 let sub;
 try{sub=await stripe(c,'subscriptions/'+encodeURIComponent(row.provider_subscription_id))}
 catch{return{issue:'provider_unavailable',provider:null}}
 if(sub.id!==row.provider_subscription_id||sub.livemode!==true)
  return{issue:'provider_missing',provider:String(sub.status||'unknown').slice(0,40)};
 if(sub.metadata?.gu58_intent!==row.intent_id||
    sub.items?.data?.length!==1||sub.items.data[0]?.price?.id!==row.price_id)
  return{issue:'price_mismatch',provider:String(sub.status||'unknown').slice(0,40)};
 const invoiceId=typeof sub.latest_invoice==='string'?sub.latest_invoice:sub.latest_invoice?.id;
 let invoice=null;
 if(sid(invoiceId,'in')){
  try{invoice=await stripe(c,'invoices/'+encodeURIComponent(invoiceId))}
  catch{return{issue:'provider_unavailable',provider:String(sub.status||'unknown').slice(0,40)}}
  if(invoice.id!==invoiceId||invoice.livemode!==true)
   return{issue:'provider_unavailable',provider:String(sub.status||'unknown').slice(0,40)};
 }
 const status=expectedState(kind,sub,invoice);
 if(status!==row.status)return{issue:'state_mismatch',provider:String(sub.status||'unknown').slice(0,40)};
 const ends=period(sub),local=Date.parse(row.current_period_end);
 if(ends===null||!Number.isFinite(local)||Math.abs(ends*1000-local)>60000)
  return{issue:'period_mismatch',provider:String(sub.status||'unknown').slice(0,40)};
 return{issue:'ok',provider:String(sub.status||'unknown').slice(0,40)};
}
export async function onRequestPost({request,env}){
 const c=cfg(env);
 if(!c)return send({ok:false,error:'Reconciliation not configured'},503);
 const token=/^Bearer\s+([^\s]+)$/.exec(request.headers.get('authorization')||'')?.[1]||'';
 if(!token||!await safeEq(token,c.task))return send({ok:false,error:'Forbidden'},403);
 try{
  const account=await stripe(c,'account');
  if(account.id!==c.account)throw Error('LIVE merchant does not match configured account');
  let checked=0,open=0,errors=0,wrapped=0;
  for(const kind of ['plan','tool']){
   const batch=await rpc(c,'gu_v014124_next_reconcile_batch',{p_kind:kind,p_limit:20});
   if(batch.kind!==kind||!Array.isArray(batch.rows)||batch.rows.length>20)
    throw Error('Invalid reconciliation batch');
   if(batch.wrapped)wrapped++;
   for(const row of batch.rows){
    const outcome=await compare(c,kind,row);
    const accepted=await rpc(c,'gu_v014124_record_reconcile_result',{
     p_kind:kind,p_local_id:row.id,p_issue:outcome.issue,
     p_provider_status:outcome.provider});
    if(accepted!==true)errors++;
    if(outcome.issue!=='ok')open++;
    checked++;
   }
  }
  return send({ok:errors===0,checked,discrepancies:open,errors,wrapped,
   note:'Review private reconciliation alerts. No customer entitlements were changed.'},
   errors?503:200);
 }catch{
  return send({ok:false,error:'Verified subscription reconciliation unavailable. Retry.'},503);
 }
}
export function onRequestGet(){return send({ok:false,error:'POST required'},405)}
