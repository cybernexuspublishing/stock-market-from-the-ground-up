/* v0.14.0.123 | Cloudflare Pages INTERNAL scheduled billing notices.
 * No customer data in logs; never called from a public browser.
 * Requires separate configured Cloudflare Cron Worker to invoke this endpoint.
 */
const send=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{
 'content-type':'application/json','cache-control':'private, no-store',
 'x-content-type-options':'nosniff'}});
const fail=x=>Object.assign(new Error(x),{status:503});
const jwt=k=>/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(k);
async function equal(a,b){
 const digest=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const [left,right]=await Promise.all([digest(a),digest(b)]);
 let v=0;for(let i=0;i<left.length;i++)v|=left[i]^right[i];
 return v===0;
}
function cfg(e){
 const base=String(e.SUPABASE_URL||'').replace(/\/$/,''),
  pub=String(e.SUPABASE_PUBLISHABLE_KEY||''),db=String(e.SUPABASE_SECRET_KEY||''),
  secret=String(e.GU_BILLING_TASK_SECRET||''),
  resend=String(e.GU_BILLING_RESEND_API_KEY||''),
  from=String(e.GU_BILLING_FROM_EMAIL||''),
  origin=String(e.PUBLIC_SITE_URL||e.GU_BILLING_SITE_ORIGIN||'');
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!db||!pub||
  secret.length<32||!/^re_[A-Za-z0-9_-]{12,}$/.test(resend)||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)||!/^https:\/\/[a-z0-9.-]+(?::443)?$/.test(origin))
  throw fail('Transactional billing sender not configured.');
 return {base,pub,db,secret,resend,from,origin};
}
async function json(url,opt){
 const r=await fetch(url,{...opt,cache:'no-store'}),out=await r.json().catch(()=>null);
 if(!r.ok||!out||out.error)throw fail('Private billing delivery dependency unavailable.');
 return out;
}
const headers=c=>({apikey:c.db,...(jwt(c.db)?{authorization:'Bearer '+c.db}:{}),'content-type':'application/json'});
async function rpc(c,name,input){return json(c.base+'/rest/v1/rpc/'+name,
 {method:'POST',headers:headers(c),body:JSON.stringify(input)});}
const messages={
 activated:['Your learning subscription is active','Your website subscription is now active. Review current access and billing information in My Purchases.'],
 renewed:['Your subscription renewal is recorded','A renewal was confirmed for an existing subscription. Check My Purchases for the verified current billing period.'],
 payment_failed:['Payment needs your attention','A subscription payment was not confirmed. Access may be restricted until the payment issue is resolved. Review billing through My Purchases.'],
 cancellation_scheduled:['Your subscription is scheduled to end','Cancellation has been scheduled. Check My Purchases for the end of the current billing period.'],
 cancellation_reversed:['Your subscription cancellation was reversed','An existing cancellation schedule was removed. Confirm your subscription status through My Purchases.'],
 canceled:['Your subscription has ended','Stripe reports that your subscription has ended. Review available access and billing history in My Purchases.'],
 access_paused:['Your subscription access is paused','Your subscription access has been paused. Review billing status through My Purchases or contact support.']
};
function compose(item,c){
 const m=messages[item.notice_kind];
 if(!m)throw fail('Unsupported billing notification');
 const until=item.current_period_end?new Date(item.current_period_end):null;
 const date=until&&Number.isFinite(until.getTime())?until.toISOString().slice(0,10):null;
 const label=item.source_kind==='tool'?'tool subscription':'platform membership';
 return {subject:m[0],text:m[1]+'\n\nType: '+label+
  (date?'\nCurrent billing period ends (UTC): '+date:'')+
  '\n\nManage billing: '+c.origin+'/my-purchases.html'+
  '\n\nEducational platform notice; no trading advice or payment-card details.'};
}
export async function onRequestPost({request,env}){
 let c;
 try{c=cfg(env)}catch{return send({ok:false,error:'Billing sender configuration unavailable'},503)}
 const token=/^Bearer\s+([^\s]+)$/.exec(request.headers.get('authorization')||'')?.[1]||'';
 if(!token||!await equal(token,c.secret))return send({ok:false,error:'Forbidden'},403);
 if(Number(request.headers.get('content-length')||0)>128)return send({ok:false,error:'Payload too large'},413);
 const work=await rpc(c,'gu_v014123_claim_notices',{p_limit:10}).catch(()=>null);
 if(!Array.isArray(work))return send({ok:false,error:'Billing queue unavailable'},503);
 let attempted=0,sent=0,failed=0;
 for(const item of work){
  attempted++;
  let success=false,messageId=null;
  try{
   if(!/^[0-9a-f-]{36}$/i.test(item.id||'')||!item.lease_token||
       !/^[0-9a-f-]{36}$/i.test(item.user_id||''))throw fail('Queue integrity');
   const member=await json(c.base+'/auth/v1/admin/users/'+encodeURIComponent(item.user_id),
    {headers:headers(c)});
   if(member.id!==item.user_id||!member.email_confirmed_at||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email||''))
     throw fail('Verified recipient unavailable');
   const message=compose(item,c);
   const result=await json('https://api.resend.com/emails',{
    method:'POST',headers:{authorization:'Bearer '+c.resend,
      'content-type':'application/json','Idempotency-Key':item.id},
    body:JSON.stringify({from:c.from,to:[member.email],subject:message.subject,
     text:message.text})});
   if(typeof result.id!=='string'||result.id.length<6)
      throw fail('Email provider did not acknowledge accepted message');
   success=true;messageId=result.id;
  }catch{failed++}
  try{
   const ack=await rpc(c,'gu_v014123_ack_notice',{p_id:item.id,
     p_token:item.lease_token,p_sent:success,p_provider_message_id:messageId});
   if(ack===true&&success)sent++;
   else if(ack!==true&&success)failed++;
  }catch{failed++}
 }
 return send({ok:failed===0,attempted,sent,failed,
  notice:failed?'Some notices remain retryable or require review':'No pending delivery errors'},
  failed?207:200);
}
export function onRequestGet(){return send({ok:false,error:'POST required'},405)}
