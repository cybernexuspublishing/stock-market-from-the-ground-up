/* v0.14.0.58 | LIVE member subscription/lifetime checkout candidate.
 * DEPLOYMENT-LOCKED: no checkout until independent Owner approval, verified live
 * Stripe catalog/account, DB contract, TEST slider OFF and merchant acceptance.
 * Never touches book/KDP purchase rights. Do not enable before legal & provider review.
 */
const respond=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const err=(message,status=403)=>Object.assign(new Error(message),{status});
const val=x=>String(x??'').trim();
/* D15 v0.14.0.155 — hard byte bound independent of untrusted Content-Length.
 * Validates requests before any Stripe/DB connection or charge is possible.
 * Browser checkout sends a JSON object {type,code}; other fields are ignored
 * by the legacy request contract and never forwarded to the provider.
 */
async function boundedCheckoutInput(req){
 const claimed=req.headers.get('content-length');
 if(claimed!==null&&(!/^[0-9]+$/.test(claimed)||Number(claimed)>2048))
  throw err('Checkout request exceeds 2 KB.',413);
 if(!req.body||typeof req.body.getReader!=='function')
  throw err('Valid JSON checkout request required.',400);
 const reader=req.body.getReader(),parts=[];let total=0;
 while(true){
  const {done,value}=await reader.read();
  if(done)break;
  if(!(value instanceof Uint8Array))throw err('Invalid checkout request body.',400);
  total+=value.byteLength;
  if(total>2048){
   void reader.cancel().catch(()=>{});
   throw err('Checkout request exceeds 2 KB.',413);
  }
  parts.push(value);
 }
 const bytes=new Uint8Array(total);let offset=0;
 for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
 let decoded,body;
 try{
  decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  body=JSON.parse(decoded);
 }catch{throw err('Valid JSON checkout request required.',400)}
 if(!body||typeof body!=='object'||Array.isArray(body))
  throw err('Checkout request must be a JSON object.',400);
 return body;
}

const products=Object.freeze(new Set([
 'plan:FULL_MONTHLY','plan:FULL_ANNUAL','plan:LIFETIME','plan:ONDEMAND_MONTHLY',
 'tool:INTERACTIVE_LEARNING','tool:JOURNAL_ANALYTICS','tool:MARKET_SIMULATOR','tool:MARKET_TUTOR'
]));
const SRC_VERSION='2026-02-25.preview'; // Version pinned for Managed Payments; verify account eligibility before launch.
function environment(env){
 const base=val(env.SUPABASE_URL).replace(/\/$/,'');
 const secret=val(env.SUPABASE_SECRET_KEY),pub=val(env.SUPABASE_PUBLISHABLE_KEY);
 const stripe=val((env.STRIPE_LIVE_SECRET_KEY || env.GU58_STRIPE_LIVE_SECRET_KEY)),acct=val((env.STRIPE_LIVE_ACCOUNT_ID || env.GU58_STRIPE_LIVE_ACCOUNT_ID));
 if(env.GU_PAYMENT_LIVE_LAUNCH_APPROVED!=='true'||
    env.GU58_LIVE_CHECKOUT_ENABLED!=='true'||env.GU58_LIVE_WEBHOOK_ENABLED!=='true'||env.GU58_LIVE_FULFILLMENT_APPROVED!=='true'||
    env.GU58_LIVE_DB_CONTRACT_APPROVED!=='true'||
    !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||
    !secret||!pub||!/^sk_live_[A-Za-z0-9_]+$/.test(stripe)||
    !/^acct_[A-Za-z0-9_]{6,}$/.test(acct)||
    !/^whsec_[A-Za-z0-9_]+$/.test(val((env.STRIPE_LIVE_WEBHOOK_SECRET || env.GU58_STRIPE_LIVE_WEBHOOK_SECRET))))
  throw err('LIVE payment checkout has not received independent Owner and provider approval.',503);
 return {base,secret,pub,stripe,account:acct};
}
function liveCatalog(env){
 let obj;
 try{obj=JSON.parse(val((env.STRIPE_LIVE_CATALOG_JSON ? JSON.stringify(JSON.parse(env.STRIPE_LIVE_CATALOG_JSON).legacy) : env.GU58_STRIPE_LIVE_CATALOG_JSON))||'{}')}catch{throw err('LIVE catalog mapping invalid.',503)}
 const keys=Array.from(products);
 if(!obj||Array.isArray(obj)||Object.keys(obj).length!==keys.length||
    !keys.every(k=>/^price_[A-Za-z0-9_]{6,}$/.test(obj[k]?.price_id||'')&&
      /^prod_[A-Za-z0-9_]{6,}$/.test(obj[k]?.product_id||''))||
    new Set(keys.map(k=>obj[k].price_id)).size!==keys.length||
    new Set(keys.map(k=>obj[k].product_id)).size!==keys.length)
   throw err('All eight distinct LIVE products and prices must be independently approved.',503);
 return obj;
}
async function request(url,options){const r=await fetch(url,{...options,cache:'no-store'});
 // PostgREST "Prefer: return=minimal" PATCH legitimately returns HTTP 204.
 // A verified 204 is success, not an unknown result or reason to retry a charge.
 if(r.ok&&r.status===204)return {};
 const d=await r.json().catch(()=>null);
 if(!r.ok||!d)throw err('Stripe LIVE payment service unavailable.',503);return d;}
const h=c=>({
 apikey:c.secret,...(String(c.secret).startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.secret}),
 'content-type':'application/json'
});
async function db(c,path,method='GET',body,prefer='return=representation'){
 return request(c.base+'/rest/v1/'+path,{method,headers:{...h(c),prefer},body:body===undefined?undefined:JSON.stringify(body)});
}
async function validateUser(c,req){const token=/^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')||'')?.[1];if(!token)throw err('Sign in before checkout.',401);
 const user=await request(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token}});
 if(!/^[0-9a-f-]{36}$/i.test(user.id||''))throw err('Account validation failed.',401);
 const ps=await db(c,`profiles?select=id,account_kind&id=eq.${user.id}&limit=1`);
 const fs=await db(c,`admin_user_flags?select=status&user_id=eq.${user.id}&limit=1`);
 const roles=await db(c,`admin_user_roles?select=role_code,expires_at&user_id=eq.${user.id}&role_code=eq.SHOWCASE_VIEWER&limit=1`);
 if(ps[0]?.account_kind!=='member'||['suspended','restricted'].includes(fs[0]?.status)||
 roles.some(r=>!r.expires_at||Date.parse(r.expires_at)>Date.now()))throw err('Account not eligible for checkout.',403);
 const age=await db(c,'account_private_identity?select=age_eligible,date_of_birth&user_id=eq.'+user.id+'&limit=1');
 if(age[0]?.age_eligible!==true||!age[0]?.date_of_birth)throw err('Age eligibility must be verified before a purchase.',403);
 return user;
}
async function assertLiveAccount(c){
 const a=await request('https://api.stripe.com/v1/account',{headers:{authorization:'Bearer '+c.stripe}});
 if(a.id!==c.account)throw err('Unexpected LIVE Stripe account.',503);
}
async function testModeOff(c){
 const rows=await db(c,'gu39_sandbox_settings?select=enabled&id=eq.true&limit=1');
 if(!Array.isArray(rows)||rows.length!==1||rows[0].enabled!==false)
  throw err('Owner TESTING mode is enabled or unavailable; LIVE checkout blocked.',503);
}
async function product(c,kind,code){const key=kind+':'+code;if(!products.has(key))throw err('Product not included in this test.',403);
 const isPlan=kind==='plan', path=isPlan?`platform_plans?select=*&plan_code=eq.${code}&limit=1`:`platform_tools?select=*&tool_code=eq.${code}&limit=1`;
 const r=(await db(c,path))[0];
// Public visibility is an explicit payment authorization gate as well as a discovery gate.
// A hidden catalog item must never be purchaseable by guessing its URL.
// Plans always require checkout_enabled=true. Tools honor the new canonical
// Owner checkout_enabled flag when present; older deployments without that
// column retain their historical status='live' gate until migrated. Current
// production has the column, so a false toggle is authoritative and blocks.
if(!r||r.active!==true||r.public_visible!==true||
   (isPlan&&r.checkout_enabled!==true)||
   (!isPlan&&r.checkout_enabled!==true)||
   (!isPlan&&r.status!=='live'))throw err('This product is not enabled for checkout.',403);
 const listing=(await db(c,'gu_storefront_items_v014174?select=visible,sale_ready,status&sku=eq.'+encodeURIComponent(key)+'&limit=1'))[0];
 if(!listing||listing.visible!==true||listing.sale_ready!==true||listing.status!=='for_sale')throw err('Product is not published for checkout.',403);
 const amount=Number(isPlan?r.price_cents:r.individual_price_cents),bill=isPlan?r.billing_interval:'month';
 if(!Number.isSafeInteger(amount)||amount<1||!['month','year','lifetime'].includes(bill))throw err('Invalid catalog price.',503);
 const name=String(r.name||'').trim();
 if(!name||name.length>120||/[\x00-\x1f]/.test(name))throw err('Invalid catalog product name.',503);
 return {key,amount,bill,name};
}
// v0.14.0.268: never take a founder's full list-price payment when the
// contract promises an earned first-party purchase discount. Checkout has no
// verified founder coupon/adjusted-amount fulfillment path yet; block, do not
// guess Stripe discounts or rewrite the immutable base Price.
const FOUNDER_DISCOUNT_ITEMS=new Set([
 'plan:LIFETIME','plan:FULL_MONTHLY','plan:FULL_ANNUAL',
 'tool:INTERACTIVE_LEARNING','tool:JOURNAL_ANALYTICS','tool:MARKET_TUTOR'
]);
export async function assertFounderDiscountCheckoutSafe(c,userId,kind,code){
 if(!FOUNDER_DISCOUNT_ITEMS.has(kind+':'+code))return;
 const policy=await db(c,'rpc/gu_founder_discount_eligibility_v014221','POST',{p_user:userId});
 if(!policy||policy.ok!==true||typeof policy.eligible!=='boolean'||
  !Number.isInteger(policy.discountBps)||![0,500,1000,1500].includes(policy.discountBps)||
  policy.eligible!==(policy.discountBps>0)||
  (policy.discountBps>0&&policy.founderSubscriptionExcluded!==true))
  throw err('Founder purchase discount authorization could not be verified.',503);
 if(policy.discountBps>0)
  throw err('Your earned Founder discount is not yet supported by this checkout. No payment has been initiated.',409);
}
async function verifyPrice(c,price,p,expectedProduct){const q=await request('https://api.stripe.com/v1/prices/'+encodeURIComponent(price),{headers:{authorization:'Bearer '+c.stripe}});
 // A matching amount and interval label is insufficient: an interval_count>1
 // silently changes the billing cadence, and metered/tiered/quantity-transformed
 // prices are not approved for these fixed-price memberships or tools.
 // Stripe supplies interval_count, usage_type, billing_scheme and transform_quantity
 // on an actual LIVE Price object. Missing fields fail closed.
 const fixedPrice=q.billing_scheme==='per_unit'&&q.transform_quantity===null;
 const cadence=p.bill==='lifetime'
  ?q.type==='one_time'
  :q.type==='recurring'&&q.recurring?.interval===p.bill&&
    q.recurring?.interval_count===1&&q.recurring?.usage_type==='licensed';
 if(q.id!==price||q.livemode!==true||q.active!==true||q.product!==expectedProduct||
    q.currency!=='usd'||q.unit_amount!==p.amount||!fixedPrice||!cadence)
  throw err('Stripe Price ID does not match the approved product, amount, and billing cadence.',503);
}
/* v0.14.0.140: GU58's reviewed v58 schema ALREADY defines
 * gu58_one_unresolved_per_member_sku. Never bypass that unique reservation
 * or invent a second intent when the first Stripe response is uncertain.
 * Stripe idempotency keys survive concurrent clients, but must NOT be reused
 * after their provider retention window; recovery is limited to 15 minutes.
 * No cleanup of paid/ambiguous intents takes place in checkout requests.
 */
const RECOVERY_WINDOW_MS=15*60*1000;
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v||'');
const liveSessionId=v=>/^cs_live_[A-Za-z0-9_]+$/.test(v||'');
const pendingFields='id,user_id,sku_kind,sku_code,price_id,quoted_amount_cents,currency,stripe_session_id,status,created_at';
async function unresolved(c,user,type,code){
 const q='gu58_live_checkout_intents?select='+pendingFields+
  '&user_id=eq.'+encodeURIComponent(user)+'&sku_kind=eq.'+encodeURIComponent(type)+
  '&sku_code=eq.'+encodeURIComponent(code)+
  '&status=in.(prepared,checkout_created)&order=created_at.desc&limit=2';
 const rows=await db(c,q);
 if(!Array.isArray(rows)||rows.length>1)throw err('Unresolved checkout ledger requires Owner review.',409);
 return rows[0]||null;
}
function verifyPending(row,user,type,code,p,price){
 if(!row||!uuid(row.id)||row.user_id!==user||row.sku_kind!==type||row.sku_code!==code||
   row.price_id!==price||row.currency!=='usd'||row.quoted_amount_cents!==p.amount||
   !['prepared','checkout_created'].includes(row.status))
   throw err('Existing checkout requires support review before a new payment.',409);
 const created=Date.parse(row.created_at||'');
 if(!Number.isFinite(created)||created>Date.now()+60000||Date.now()-created>RECOVERY_WINDOW_MS)
  throw err('Existing checkout could not be safely resumed. Contact support; no new payment initiated.',409);
 if(row.status==='checkout_created'&&!liveSessionId(row.stripe_session_id))
  throw err('Existing checkout is missing verified provider binding.',409);
 if(row.status==='prepared'&&row.stripe_session_id!==null)
  throw err('Existing checkout is in an ambiguous state.',409);
 return row.id;
}
function safeCheckoutSession(session,id,user,price,p,requireOpen=true){
 if(!liveSessionId(session?.id)||session.livemode!==true||
   session.client_reference_id!==id||session.metadata?.gu58_intent!==id||
   session.metadata?.gu58_member!==user||
   session.mode!==(p.bill==='lifetime'?'payment':'subscription')||
   session.currency!=='usd'||session.amount_subtotal!==p.amount)
  throw err('Stripe checkout session proof did not match the reserved intent.',503);
 if(requireOpen&&(session.status!=='open'||session.payment_status!=='unpaid'||
   !Number.isFinite(session.expires_at)||session.expires_at*1000<=Date.now()+60000))
  throw err('Existing checkout expired or completed. Contact support; no new payment initiated.',409);
 let target;
 try{target=new URL(session.url)}catch{throw err('Stripe checkout destination unavailable.',503)}
 if(target.protocol!=='https:'||target.hostname!=='checkout.stripe.com'||
    target.username||target.password||target.port)
  throw err('Invalid Stripe destination.',503);
 return target.href;
}
async function verifyBoundLineItem(c,sessionId,price){
 // A previously recorded Session must belong to the *same approved Price*,
 // not merely have a matching amount and friendly product name.
 const lines=await request('https://api.stripe.com/v1/checkout/sessions/'+
  encodeURIComponent(sessionId)+'/line_items?limit=2',
  {headers:{authorization:'Bearer '+c.stripe}});
 if(!Array.isArray(lines.data)||lines.data.length!==1||lines.has_more===true||
    lines.data[0]?.price?.id!==price||lines.data[0]?.quantity!==1)
  throw err('Previously created Stripe Checkout line item no longer matches its approved SKU.',503);
}
async function stripeCheckout(c,id,user,p,price,origin){
 const params=new URLSearchParams();
 params.set('managed_payments[enabled]','true');
 params.set('mode',p.bill==='lifetime'?'payment':'subscription');
 params.set('line_items[0][price]',price);
 params.set('line_items[0][quantity]','1');
 params.set('client_reference_id',id);
 params.set('metadata[gu58_intent]',id);
 params.set('metadata[gu58_member]',user);
 params.set('success_url',origin+'/checkout-status.html?session_id={CHECKOUT_SESSION_ID}');
 params.set('cancel_url',origin+'/checkout.html?cancelled=1');
 if(p.bill!=='lifetime')params.set('subscription_data[metadata][gu58_intent]',id);
 return request('https://api.stripe.com/v1/checkout/sessions',{
  method:'POST',headers:{authorization:'Bearer '+c.stripe,
   'content-type':'application/x-www-form-urlencoded','Stripe-Version':SRC_VERSION,
   'Idempotency-Key':'gu58-live-'+id},body:params.toString()});
}
const checkoutReply=url=>respond({ok:true,live:true,url,
 notice:'Secure LIVE Checkout. Access activates only after signed payment verification.'});
export async function onRequestPost({request:req,env}){
 try{const origin=req.headers.get('origin'),here=new URL(req.url);if(origin!==here.origin)throw err('Cross-site checkout denied.',403);
  const input=await boundedCheckoutInput(req);
  const type=val(input.type),code=val(input.code);
  if(!['plan','tool'].includes(type)||!/^[A-Z0-9_]{3,90}$/.test(code)||
     !products.has(type+':'+code))throw err('Unsupported product.',400);
  // Reject malformed/unsupported purchase requests BEFORE any Stripe, DB,
  // service-key or member lookup; entitlement checks remain server-owned.
  const c=environment(env);await testModeOff(c);await assertLiveAccount(c);
  const catalog=liveCatalog(env),u=await validateUser(c,req);
  const p=await product(c,type,code),mapped=catalog[p.key],price=mapped.price_id;
   await assertFounderDiscountCheckoutSafe(c,u.id,type,code);
   await verifyPrice(c,price,p,mapped.product_id);
  // Protect customers against duplicate ongoing subscriptions and double Lifetime purchases.
  if(type==='plan'){
    const existing=await db(c,'site_subscriptions?select=id&user_id=eq.'+encodeURIComponent(u.id)+
      '&plan_code=eq.'+encodeURIComponent(code)+'&status=in.(active,trialing,past_due)&limit=1');
    if(existing.length)throw err('You already have this subscription; manage it in your account.',409);
    if(code==='LIFETIME'){
      const owned=await db(c,'user_plan_grants?select=id&user_id=eq.'+encodeURIComponent(u.id)+
       '&plan_code=eq.LIFETIME&status=in.(active,trialing)&limit=1');
      if(owned.length)throw err('Lifetime membership is already active.',409);
    }
  }else{
    const existing=await db(c,'user_tool_passes?select=id&user_id=eq.'+encodeURIComponent(u.id)+
      '&tool_code=eq.'+encodeURIComponent(code)+'&status=in.(active,trialing,paused)&limit=1');
    if(existing.length)throw err('You already have this tool subscription.',409);
  }
  const route=await db(c,'rpc/gu_digital_payment_route_get_v01432r2','POST',{});
  if(route.provider!=='STRIPE_MANAGED'||route.enabled!==true)throw err('Stripe Managed route is disabled.',503);
  const setting=await db(c,'site_settings?select=value&setting_key=eq.commerce.checkout_enabled&limit=1');
  if(setting[0]?.value!==true)throw err('Website checkout is disabled by the Owner.',503);
  // Existing incomplete purchase is owned by this authenticated member.
  // An active reservation may be resumed, but must never create a second intent.
  let pending=await unresolved(c,u.id,type,code);
  let id;
  if(pending){
   id=verifyPending(pending,u.id,type,code,p,price);
   if(pending.status==='checkout_created'){
    const session=await request('https://api.stripe.com/v1/checkout/sessions/'+
     encodeURIComponent(pending.stripe_session_id),
     {headers:{authorization:'Bearer '+c.stripe}});
    if(session.id!==pending.stripe_session_id)
     throw err('Stored and provider Checkout Session IDs disagree.',503);
    const existingUrl=safeCheckoutSession(session,id,u.id,price,p);
    await verifyBoundLineItem(c,session.id,price);
    return checkoutReply(existingUrl);
   }
  }else{
   id=crypto.randomUUID();
   try{
    await db(c,'gu58_live_checkout_intents','POST',{
     id,user_id:u.id,sku_kind:type,sku_code:code,price_id:price,
     quoted_amount_cents:p.amount,status:'prepared'
    });
   }catch(ex){
    // The unique database constraint is authoritative. A race winner may
    // have reserved this SKU. Never create a second Stripe session here.
    pending=await unresolved(c,u.id,type,code);
    if(!pending)throw ex;
    throw err('Checkout is already being prepared for this product. Retry shortly; no new payment initiated.',409);
   }
  }
  // Same immutable intent ID + same provider parameters + same key.
  // For a recently prepared row this replays safely inside Stripe's
  // idempotency retention window. No other checkout Session can be spawned
  // for this member/SKU while the database unique reservation is installed.
  const session=await stripeCheckout(c,id,u.id,p,price,here.origin);
  const url=safeCheckoutSession(session,id,u.id,price,p);
  // A failed bind is NOT permission to create a new intent. An atomic
  // conditional PATCH must affect exactly one prepared row before responding.
  // An empty PostgREST result is NOT successful binding.
  const bound=await db(c,`gu58_live_checkout_intents?id=eq.${id}&status=eq.prepared&stripe_session_id=is.null`,
   'PATCH',{stripe_session_id:session.id,status:'checkout_created'},'return=representation');
  if(!Array.isArray(bound)||bound.length!==1||bound[0].id!==id||
      bound[0].stripe_session_id!==session.id||bound[0].status!=='checkout_created')
   throw err('Checkout session was not durably bound; retry safely or contact support.',503);
  return checkoutReply(url);
 }catch(e){return respond({ok:false,error:[400,403,409,413].includes(e.status)?e.message:'LIVE customer checkout unavailable.'},e.status||503)}
}
// Public readiness: returns only a boolean; never leaks private credentials, prices or account details.
// Public, read-only availability check for a specific plan/tool on the existing
// production Supabase project. The Owner's TEST/LIVE switch, global checkout gate,
// active catalog and merchant price are all rechecked on the POST; this GET never
// creates a Checkout Session or customer entitlement. No staging project required.
export async function onRequestGet({env,request}){
 const unavailable=()=>respond({ok:true,liveCheckoutAvailable:false,livePayments:false,readOnly:true});
 try{
  if(!request?.url)return unavailable();
  const c=environment(env),catalog=liveCatalog(env);
  const query=new URL(request.url).searchParams;
  const type=val(query.get('type')),code=val(query.get('code'));
  if(!['plan','tool'].includes(type)||!/^[A-Z0-9_]{3,90}$/.test(code)||
     !products.has(type+':'+code))return unavailable();
  // This check is deliberately NOT a way to override the Owner's TEST mode.
  await testModeOff(c);
  const p=await product(c,type,code);
  const route=await db(c,'rpc/gu_digital_payment_route_get_v01432r2','POST',{});
  if(route.provider!=='STRIPE_MANAGED'||route.enabled!==true)return unavailable();
  const setting=await db(c,'site_settings?select=value&setting_key=eq.commerce.checkout_enabled&limit=1');
  if(setting[0]?.value!==true)return unavailable();
  await assertLiveAccount(c);
  const mapping=catalog[p.key];
  await verifyPrice(c,mapping.price_id,p,mapping.product_id);
  // v137: a public *read-only* checkout quote. Price, cadence and label
  // originate from the canonical active Supabase offer, independently matched
  // to the LIVE Stripe Price. Never trust a client-supplied amount/currency.
  // Final POST verifies the complete account/Price/eligibility contract again.
  return respond({ok:true,liveCheckoutAvailable:true,livePayments:false,readOnly:true,
   offer:{type,code,name:p.name,unitAmountCents:p.amount,currency:'USD',
    billingInterval:p.bill,intervalCount:p.bill==='lifetime'?null:1},
   notice:'Base price verified against the LIVE Stripe Price. Final checkout may add applicable taxes; no charge created.'});
 }catch{return unavailable()}
}
