/* v0.14.0.80: $0 Store QA is RETIRED by default. Explicit new QA reauthorization only. Existing signed webhook and grant history remain intact. */
const out=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json','cache-control':'private, no-store'}});
const fail=(code,status=503)=>Object.assign(new Error(code),{code,status});
const trim=x=>String(x??'').trim();
const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trim(x));
async function query(url,opts={}){
 const r=await fetch(url,{...opts,cache:'no-store'}),x=await r.json().catch(()=>null);
 if(!r.ok||x===null||x?.error)throw fail('VERIFICATION_UNAVAILABLE');
 return x;
}
function config(env){
 const base=trim(env.SUPABASE_URL).replace(/\/$/,''),
  allowed=trim(env.GU72_QA_ALLOWED_USER_ID),pub=trim(env.SUPABASE_PUBLISHABLE_KEY),
  secret=trim(env.SUPABASE_SECRET_KEY),key=trim((env.STRIPE_LIVE_SECRET_KEY || env.GU58_STRIPE_LIVE_SECRET_KEY)),
  account=trim((env.STRIPE_LIVE_ACCOUNT_ID || env.GU58_STRIPE_LIVE_ACCOUNT_ID)),
  price=trim(env.GU71_ZERO_LIVE_PRICE_ID),product=trim(env.GU71_ZERO_LIVE_PRODUCT_ID),
  origin=trim(env.PUBLIC_SITE_URL)||'https://stock-market-from-the-ground-up.pages.dev';
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!uuid(allowed)||!pub||!secret||
  !/^sk_live_[\w]+$/.test(key)||!/^acct_[\w]+$/.test(account)||
  !/^price_[\w]+$/.test(price)||!/^prod_[\w]+$/.test(product)||
  !/^https:\/\/[^/#?]+$/.test(origin))throw fail('QA_CONFIGURATION_MISSING');
 const paid=JSON.parse(trim(env.GU58_STRIPE_LIVE_CATALOG_JSON)||'{}');
 if(Object.values(paid).some(x=>x.price_id===price||x.product_id===product))throw fail('NOT_ISOLATED_QA_PRODUCT');
 return {base,allowed,pub,secret,key,account,price,product,origin};
}
const authHeaders=c=>({apikey:c.secret,...(c.secret.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.secret}),'content-type':'application/json'});
async function member(req,c){
 const token=/^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')||'')?.[1];
 if(!token)throw fail('SIGN_IN_REQUIRED',401);
 const u=await query(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token}});
 if(u.id!==c.allowed||!uuid(u.id)||!(u.confirmed_at||u.email_confirmed_at))throw fail('NOT_AUTHORIZED',403);
 const [a,g,p,flags,age]=await Promise.all([
  query(c.base+'/rest/v1/rpc/my_platform_access_for_user',{method:'POST',
   headers:authHeaders(c),body:JSON.stringify({target_user:u.id})}),
  query(c.base+'/rest/v1/user_plan_grants?select=ends_at,source_reference,status&user_id=eq.'+u.id+'&source=eq.stripe_zero_monthly_qa_v72&status=in.(active,trialing)&order=created_at.desc&limit=10',{headers:authHeaders(c)}),
  query(c.base+'/rest/v1/profiles?select=account_kind&id=eq.'+u.id+'&limit=1',{headers:authHeaders(c)}),
  query(c.base+'/rest/v1/admin_user_flags?select=status&user_id=eq.'+u.id+'&limit=1',{headers:authHeaders(c)}),
  query(c.base+'/rest/v1/account_private_identity?select=age_eligible,date_of_birth&user_id=eq.'+u.id+'&limit=1',{headers:authHeaders(c)})
 ]);
 if(p?.[0]?.account_kind!=='member'||!Array.isArray(flags)||
   ['suspended','restricted'].includes(flags[0]?.status)||
   age?.[0]?.age_eligible!==true||!age?.[0]?.date_of_birth)
   throw fail('NOT_ELIGIBLE',403);
 const used=Array.isArray(g)?g.find(row=>['active','trialing'].includes(row.status)&&
    (!row.ends_at||Date.parse(row.ends_at)>Date.now())):null;
 return {user:u,access:a,used:used||null};
}
async function verify(c){
 const h={authorization:'Bearer '+c.key};
 const [a,p,pr]=await Promise.all([
  query('https://api.stripe.com/v1/account',{headers:h}),
  query('https://api.stripe.com/v1/products/'+c.product,{headers:h}),
  query('https://api.stripe.com/v1/prices/'+c.price,{headers:h})
 ]);
 if(a.id!==c.account||p.id!==c.product||p.name!=='Live Test'||p.livemode!==true||p.active!==true||
   pr.id!==c.price||pr.product!==c.product||pr.livemode!==true||pr.active!==true||
   pr.currency!=='usd'||pr.unit_amount!==0||pr.type!=='one_time'||pr.recurring!=null||
   pr.billing_scheme!=='per_unit'||pr.transform_quantity!==null)
  throw fail('QA_PRICE_NOT_ZERO');
}
const enabled=e=>e.GU72_ZERO_MONTHLY_QA_ENABLED==='true'&&e.GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED==='true';
// Separate, default-OFF website-offer gate. Old GU72 switches left ON cannot
// accidentally re-open the retired $0 public Checkout REST endpoint.
// Read-only checks for an EXISTING Stripe Session remain possible.
const storefrontOff=e=>e.GU72_ZERO_MONTHLY_STORE_OFFER_ENABLED!=='true';
export async function onRequestGet({request,env}){
 try{
  // No credentials, Stripe price verification or member eligibility necessary
  // for a closed-offer status. Previously completed session lookups can still
  // reconcile if a customer returns from Stripe with their original Session ID.
  if(storefrontOff(env)&&!new URL(request.url).searchParams.has('session_id'))
   return out({ok:true,available:false,canReset:false,offerClosed:true,
     notice:'The temporary $0 LIVE Store test has ended.'});
  const c=config(env),m=await member(request,c);
  if(new URL(request.url).origin!==c.origin)throw fail('INVALID_ORIGIN',403);
  const sid=new URL(request.url).searchParams.get('session_id');
  if(sid){
   if(!/^cs_live_[\w]{6,}$/.test(sid))throw fail('INVALID_SESSION',400);
   const session=await query('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(sid),
     {headers:{authorization:'Bearer '+c.key}});
   if(session.id!==sid||session.client_reference_id!==m.user.id||
     session.metadata?.gu72_zero_monthly_qa!=='true'||session.metadata?.gu72_member_id!==m.user.id||
     session.metadata?.gu72_price_id!==c.price)throw fail('NOT_MEMBER_SESSION',403);
   const activated=m.used?.source_reference===sid&&m.access?.planCode==='FULL_MONTHLY';
   return out({ok:true,available:false,checkoutComplete:session.status==='complete',
    activated:!!activated,canReset:!!activated&&enabled(env),
    planCode:m.access?.planCode,expiresAt:activated?m.used.ends_at:null,
    awaitingSignedWebhook:session.status==='complete'&&!m.used});
  }
  if(!enabled(env)||m.access?.planCode!=='FREE'||m.used)return out({ok:true,available:false,
   planCode:m.access?.planCode,used:!!m.used,
   canReset:enabled(env)&&!!m.used&&m.access?.planCode==='FULL_MONTHLY'});
  await verify(c);
  return out({ok:true,available:true,amountCents:0,oneTime:true,neverRenews:true});
 }catch(e){return out({ok:false,available:false,error:e.code||'QA_UNAVAILABLE'},e.status||503)}
}
export async function onRequestPost({request,env}){
 try{
  // Hard stop even when older GU72 Cloudflare flags have not been turned off.
  // No Stripe checkout session, DB reset or membership mutation is attempted.
  if(storefrontOff(env))return out({ok:false,available:false,error:'QA_OFFER_CLOSED'},410);
  const c=config(env);
  if(request.headers.get('origin')!==c.origin||new URL(request.url).origin!==c.origin)throw fail('INVALID_ORIGIN',403);
  if(!enabled(env))throw fail('QA_DISABLED',403);
  const input=await request.json().catch(()=>null);
  const action=new URL(request.url).searchParams.get('action');
  if(action==='reset'){
    if(!input||Object.keys(input).length!==1||input.confirm!=='RESET_MY_ZERO_MONTHLY_QA_ACCESS')
      throw fail('EXPLICIT_RESET_CONFIRMATION_REQUIRED',400);
    const m=await member(request,c);
    if(m.access?.planCode!=='FULL_MONTHLY'||!m.used)throw fail('NO_ACTIVE_QA_GRANT_TO_RESET',409);
    const reset=await query(c.base+'/rest/v1/rpc/gu76_reset_zero_monthly_qa',{
      method:'POST',headers:authHeaders(c),body:JSON.stringify({p_user_id:m.user.id})});
    if(reset?.ok!==true||reset.resetCount<1)throw fail('QA_RESET_NOT_CONFIRMED');
    return out({ok:true,reset:true,canRetry:true,resetCount:reset.resetCount,
      notice:'Only the prior $0 QA grant was canceled. Checkout history and paid rights were preserved.'});
  }
  if(action)throw fail('INVALID_QA_ACTION',400);
  if(!input||Object.keys(input).length!==2||
     input.confirm!=='ONE_TIME_ZERO_MONTHLY_QA'||
     !uuid(input.checkoutAttemptId))throw fail('EXPLICIT_CONFIRMATION_REQUIRED',400);
  const m=await member(request,c);
  if(m.access?.planCode!=='FREE'||m.used)throw fail('QA_ALREADY_USED',409);
  await verify(c);
  const params=new URLSearchParams({mode:'payment',
   'line_items[0][price]':c.price,'line_items[0][quantity]':'1',
   'customer_creation':'if_required','automatic_tax[enabled]':'false',
   client_reference_id:m.user.id,
   'metadata[gu72_zero_monthly_qa]':'true','metadata[gu72_member_id]':m.user.id,
   'metadata[gu72_price_id]':c.price,
   success_url:c.origin+'/store.html?gu72=complete&session_id={CHECKOUT_SESSION_ID}',
   cancel_url:c.origin+'/store.html?gu72=cancelled'});
  // One deliberate click gets its own stable attempt UUID. The previous calendar-day
  // idempotency key recycled completed Checkout Sessions on a second test.
  const session=await query('https://api.stripe.com/v1/checkout/sessions',{method:'POST',
   headers:{authorization:'Bearer '+c.key,'content-type':'application/x-www-form-urlencoded',
    'Idempotency-Key':'gu72-zero-'+m.user.id+'-'+input.checkoutAttemptId},
   body:params.toString()});
  if(!/^cs_live_[\w]+$/.test(session.id||'')||session.livemode!==true||
    session.amount_total!==0||session.amount_subtotal!==0||session.mode!=='payment'||
    session.payment_intent!=null||session.subscription!=null||
    session.client_reference_id!==m.user.id||
    session.metadata?.gu72_zero_monthly_qa!=='true')throw fail('NOT_A_SAFE_ZERO_SESSION');
  const link=new URL(session.url);
  if(link.protocol!=='https:'||link.hostname!=='checkout.stripe.com')throw fail('INVALID_CHECKOUT_DESTINATION');
  return out({ok:true,amountCents:0,checkoutUrl:session.url});
 }catch(e){return out({ok:false,error:e.code||'QA_UNAVAILABLE'},e.status||503)}
}
