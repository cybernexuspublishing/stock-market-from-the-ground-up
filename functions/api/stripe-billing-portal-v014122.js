/* v0.14.0.122 | Self-service billing portal for an EXISTING, signed LIVE
 * GU58 subscription. Portal access must remain available even when NEW
 * checkouts are disabled. Never grant entitlements from redirect URLs.
 */
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store, max-age=0',
 'vary':'Authorization','x-content-type-options':'nosniff'};
const answer=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:HEADERS});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const stripeId=(s,type)=>new RegExp('^'+type+'_[A-Za-z0-9_]{6,150}$').test(String(s||''));
function config(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),
 pub=String(env.SUPABASE_PUBLISHABLE_KEY||''),
 secret=String(env.SUPABASE_SECRET_KEY||''),
 stripe=String((env.STRIPE_LIVE_SECRET_KEY || env.GU58_STRIPE_LIVE_SECRET_KEY)||''),
 acct=String((env.STRIPE_LIVE_ACCOUNT_ID || env.GU58_STRIPE_LIVE_ACCOUNT_ID)||'');
 // Checkout feature flags MUST NOT prevent already-paid members from
 // canceling, changing payment details, or downloading provider invoices.
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||
    !pub||!secret||!/^sk_live_[A-Za-z0-9_]+$/.test(stripe)||
    !stripeId(acct,'acct'))throw fail('Self-service billing is temporarily unavailable. Contact support.',503);
 return{base,pub,secret,stripe,acct};
}
async function jsonFetch(url,init){
 const r=await fetch(url,{...init,cache:'no-store'});
 const body=await r.json().catch(()=>null);
 if(!r.ok||!body||body.error)throw fail('Billing provider verification unavailable. Please contact support.',503);
 return body;
}
const dbHeaders=c=>({apikey:c.secret,accept:'application/json',
 ...(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(c.secret)?
 {authorization:'Bearer '+c.secret}:{})});
async function db(c,path){
 return jsonFetch(c.base+'/rest/v1/'+path,{headers:dbHeaders(c)});
}
/* Bound actual request bytes, even when content-length is missing or spoofed.
 * A rejected body must not trigger a Stripe or Supabase request. */
async function boundedPortalBody(request){
 const header=request.headers.get('content-length');
 if(header!==null&&(!/^[0-9]+$/.test(header)||Number(header)>1024))
  throw fail('Request too large.',413);
 if(!request.body||typeof request.body.getReader!=='function')
  throw fail('JSON request body required.',400);
 const reader=request.body.getReader(),pieces=[];let total=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   if(!(value instanceof Uint8Array))throw fail('Invalid request body.',400);
   total+=value.byteLength;
   if(total>1024)throw fail('Request too large.',413);
   pieces.push(value);
  }
 }catch(error){
  try{await reader.cancel()}catch{}
  throw error;
 }finally{
  try{reader.releaseLock()}catch{}
 }
 const bytes=new Uint8Array(total);let pos=0;
 for(const part of pieces){bytes.set(part,pos);pos+=part.byteLength}
 try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}
 catch{throw fail('Invalid UTF-8 request body.',400)}
}
export async function onRequestPost({request,env}){
 try{
  const here=new URL(request.url),origin=request.headers.get('origin');
  if(origin!==here.origin)throw fail('Cross-origin billing request rejected.',403);
  const input=await boundedPortalBody(request);
  let form;try{form=JSON.parse(input)}catch{throw fail('Invalid request.')}
  if(!form||Array.isArray(form)||typeof form!=='object'||
      Object.keys(form).some(k=>!['kind','recordId'].includes(k))||
      !['plan','tool'].includes(form.kind)||!Number.isSafeInteger(form.recordId)||
      form.recordId<1)throw fail('Choose a valid subscription record.');
  const c=config(env);
  const token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')||'')?.[1];
  if(!token)throw fail('Sign in before managing billing.',401);
  const user=await jsonFetch(c.base+'/auth/v1/user',{headers:{
    apikey:c.pub,authorization:'Bearer '+token}});
  if(!idPattern.test(user.id||''))throw fail('Account session not verified.',401);
  const profile=await db(c,'profiles?select=account_kind&id=eq.'+encodeURIComponent(user.id)+'&limit=1');
  if(!Array.isArray(profile)||profile[0]?.account_kind!=='member')
   throw fail('Member account required.',403);
  // Do not deny cancellation to a suspended or restricted paying member.
  const table=form.kind==='plan'?'site_subscriptions':'user_tool_passes';
  const rows=await db(c,table+'?select=id,provider,provider_subscription_id,metadata'+
   '&id=eq.'+form.recordId+'&user_id=eq.'+encodeURIComponent(user.id)+'&limit=1');
  const rec=Array.isArray(rows)?rows[0]:null;
  if(!rec||rec.provider!=='STRIPE_MANAGED'||
     rec.metadata?.source!=='gu58_live_signed_stripe'||
     !stripeId(rec.provider_subscription_id,'sub'))
   throw fail('A signed LIVE Stripe subscription is not linked to this member record.',404);
  const account=await jsonFetch('https://api.stripe.com/v1/account',{headers:{
   authorization:'Bearer '+c.stripe}});
  if(account.id!==c.acct)throw fail('Billing merchant account mismatch.',503);
  // Resolve Stripe Customer ONLY through the subscription stored against
  // this member. Never accept a client-supplied Stripe customer ID.
  const subscription=await jsonFetch('https://api.stripe.com/v1/subscriptions/'+
    encodeURIComponent(rec.provider_subscription_id),{headers:{authorization:'Bearer '+c.stripe}});
  if(subscription.id!==rec.provider_subscription_id||subscription.livemode!==true)
   throw fail('LIVE subscription verification failed.',503);
  const customer=typeof subscription.customer==='string'?subscription.customer:subscription.customer?.id;
  if(!stripeId(customer,'cus'))throw fail('Verified customer reference unavailable.',503);
  const params=new URLSearchParams({customer,return_url:here.origin+'/my-purchases.html#subscriptions'});
  const stripe=await jsonFetch('https://api.stripe.com/v1/billing_portal/sessions',{
   method:'POST',headers:{authorization:'Bearer '+c.stripe,
    'content-type':'application/x-www-form-urlencoded',
    'Idempotency-Key':'gu122-'+rec.provider_subscription_id+'-'+Math.floor(Date.now()/30000)},
   body:params.toString()});
  let target;try{target=new URL(stripe.url)}catch{throw fail('Invalid billing portal response.',503)}
  if(target.protocol!=='https:'||target.hostname!=='billing.stripe.com')
   throw fail('Unexpected billing portal domain.',503);
  return answer({ok:true,url:target.toString(),
   notice:'Manage an existing paid Stripe subscription. Changes to your access follow verified Stripe webhook fulfillment.'});
 }catch(e){
  const status=[400,401,403,404,413].includes(e.status)?e.status:503;
  return answer({ok:false,error:status===503?'Billing portal unavailable. Contact support for assistance.':
   e.message||'Billing request failed.'},status);
 }
}
