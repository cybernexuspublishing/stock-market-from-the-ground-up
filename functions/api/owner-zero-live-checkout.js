/* Cyber Nexus v0.14.0.71 — Owner-only, separate ZERO-dollar LIVE Checkout QA.
 * This does not use GU58, Managed Payments, Supabase intents, subscriptions or
 * member grants. The eight approved LIVE SKUs/prices are never modified.
 * Creating a Stripe-hosted Checkout Session is a deliberate explicit Owner POST.
 * OFF by default; not a test of paid charges or GU58 fulfillment.
 */
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
 'x-content-type-options':'nosniff'}});
const fail=(code,status=503)=>Object.assign(new Error(code),{code,status});
const val=x=>String(x??'').trim();
const id=(kind,x)=>new RegExp('^'+kind+'_[A-Za-z0-9_]{6,}$').test(val(x));
const keyOK=x=>/^sk_live_[A-Za-z0-9_]+$/.test(val(x));
function site(env){
 const value=val(env.PUBLIC_SITE_URL)||'https://stock-market-from-the-ground-up.pages.dev';
 const u=new URL(value);if(u.protocol!=='https:'||u.search||u.hash||u.username||u.password||
 (u.pathname!=='/'&&u.pathname!==''))throw fail('INVALID_SITE_ORIGIN');
 return u.origin;
}
async function getJson(url,options={},code='REMOTE_UNAVAILABLE'){
 let response,object;try{
  response=await fetch(url,{...options,cache:'no-store'});
  object=await response.json().catch(()=>null);
 }catch{throw fail(code)}
 if(!response.ok||object===null||object?.error)throw fail(code);
 return object;
}
async function authorize(request,env){
 const base=val(env.SUPABASE_URL).replace(/\/$/,'');
 const pub=val(env.SUPABASE_PUBLISHABLE_KEY);
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!pub)throw fail('OWNER_AUTH_UNAVAILABLE');
 const token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!token)throw fail('SIGN_IN_REQUIRED',401);
 const headers={apikey:pub,authorization:'Bearer '+token};
 const user=await getJson(base+'/auth/v1/user',{headers},'OWNER_AUTH_UNAVAILABLE');
 if(!/^[0-9a-f-]{36}$/i.test(user.id||''))throw fail('INVALID_SESSION',401);
 const role=await getJson(base+'/rest/v1/rpc/gu_staff_role_v01432r1',
  {method:'POST',headers:{...headers,'content-type':'application/json'},body:'{}'},'OWNER_ROLE_UNAVAILABLE');
 if(role?.ok!==true||role.role!=='OWNER')throw fail('OWNER_ONLY',403);
 const step=await getJson(base+'/rest/v1/rpc/gu_staff_stepup_active_v01432r1',
  {method:'POST',headers:{...headers,'content-type':'application/json'},body:'{}'},'OWNER_STEPUP_UNAVAILABLE');
 if(step!==true)throw fail('PASSWORD_RECONFIRM_REQUIRED',403);
 return user.id;
}
function setup(request,env){
 const origin=site(env);
 if(new URL(request.url).origin!==origin)throw fail('PRODUCTION_ORIGIN_ONLY',403);
 if(env.GU71_ZERO_LIVE_QA_ENABLED!=='true')throw fail('ZERO_QA_DISABLED',403);
 const product=val(env.GU71_ZERO_LIVE_PRODUCT_ID);
 const price=val(env.GU71_ZERO_LIVE_PRICE_ID);
 const account=val(env.GU58_STRIPE_LIVE_ACCOUNT_ID),key=val(env.GU58_STRIPE_LIVE_SECRET_KEY);
 if(!id('prod',product)||!id('price',price)||!id('acct',account)||!keyOK(key))
  throw fail('ZERO_QA_CONFIGURATION_MISSING');
 let main;try{main=JSON.parse(val(env.GU58_STRIPE_LIVE_CATALOG_JSON))}catch{}
 if(Object.values(main||{}).some(p=>p?.price_id===price||p?.product_id===product))
  throw fail('ZERO_QA_MUST_NOT_USE_PAID_CATALOG');
 return {origin,product,price,account,key};
}
async function verify(c){
 const h={authorization:'Bearer '+c.key};
 const account=await getJson('https://api.stripe.com/v1/account',{headers:h},'LIVE_ACCOUNT_UNAVAILABLE');
 if(account.id!==c.account)throw fail('WRONG_LIVE_ACCOUNT');
 const product=await getJson('https://api.stripe.com/v1/products/'+encodeURIComponent(c.product),
  {headers:h},'ZERO_PRODUCT_UNAVAILABLE');
 // A deliberately designated separate Owner QA Product; no paid SKU or future
 // default-price change can silently turn this into a paid transaction.
 if(product.id!==c.product||product.livemode!==true||product.active!==true||
    product.metadata?.gu71_zero_qa!=='true')throw fail('ZERO_PRODUCT_NOT_QA_MARKED');
 const price=await getJson('https://api.stripe.com/v1/prices/'+encodeURIComponent(c.price),
  {headers:h},'ZERO_PRICE_UNAVAILABLE');
 if(price.id!==c.price||price.product!==c.product||price.livemode!==true||
  price.active!==true||price.currency!=='usd'||price.unit_amount!==0||
  price.billing_scheme!=='per_unit'||price.transform_quantity!==null||
  price.type!=='one_time'||price.recurring!=null)
  throw fail('NOT_AN_EXACT_ZERO_DOLLAR_ONE_TIME_PRICE');
 return true;
}
// Target a canonical product identity, including a beta/unreleased listing.
 // No permission to fulfill, discount, grant access or create a paid Price.
async function verifyDiagnosticTarget(env,sku){
 if(!/^(addon|book|course|feature|founding|membership|plan|tool):[A-Z0-9_-]{2,90}$/.test(sku||''))
  throw fail('INVALID_QA_TARGET_SKU',400);
 const base=val(env.SUPABASE_URL).replace(/\\/$/,'');
 const secret=val(env.SUPABASE_SECRET_KEY);
 if(!/^https:\\/\\/[a-z0-9]{20}\\.supabase\\.co$/.test(base)||!secret)throw fail('CATALOG_UNAVAILABLE');
 const headers=secret.startsWith('sb_secret_')?{apikey:secret}:{apikey:secret,authorization:'Bearer '+secret};
 const r=await getJson(base+'/rest/v1/gu_storefront_items_v014174?select=sku&sku=eq.'+encodeURIComponent(sku)+'&limit=1',
  {headers},'CATALOG_UNAVAILABLE');
 if(!Array.isArray(r)||r.length!==1||r[0].sku!==sku)throw fail('QA_TARGET_NOT_IN_CANONICAL_STORE',404);
 return sku;
}

async function stripeSession(c,params,idempotencyKey){
 const response=await getJson('https://api.stripe.com/v1/checkout/sessions',{
  method:'POST',headers:{authorization:'Bearer '+c.key,
   'content-type':'application/x-www-form-urlencoded','Idempotency-Key':idempotencyKey},
  body:params.toString()},'ZERO_CHECKOUT_NOT_SUPPORTED');
 // The Owner never receives a link that could lead to any money/card/subscription.
 if(!/^cs_live_[A-Za-z0-9_]+$/.test(val(response.id))||response.livemode!==true||
  response.amount_total!==0||response.amount_subtotal!==0||response.mode!=='payment'||
  response.payment_intent!=null||response.subscription!=null||
  response.payment_method_collection!=='if_required')
  throw fail('ZERO_SESSION_FAIL_CLOSED');
 let uri;try{uri=new URL(response.url)}catch{throw fail('INVALID_PROVIDER_URL')}
 if(uri.protocol!=='https:'||uri.hostname!=='checkout.stripe.com')throw fail('INVALID_PROVIDER_URL');
 return {id:response.id,url:response.url};
}
export async function onRequestGet({request,env}){
 try{
  const user=await authorize(request,env),c=setup(request,env);
  const query=new URL(request.url).searchParams;
  if(query.has('session_id')){
   const sid=val(query.get('session_id'));
   if(!/^cs_live_[A-Za-z0-9_]{6,}$/.test(sid))throw fail('INVALID_SESSION_ID',400);
   const response=await getJson('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(sid),
    {headers:{authorization:'Bearer '+c.key}},'ZERO_SESSION_UNAVAILABLE');
   if(response.id!==sid||response.livemode!==true||response.mode!=='payment'||
    response.client_reference_id!==user||response.metadata?.gu71_zero_qa!=='true'||
    response.metadata?.gu71_owner!==user||response.metadata?.gu71_price_id!==c.price)
    throw fail('NOT_THIS_OWNER_QA_SESSION',403);
   const safe=response.amount_total===0&&response.amount_subtotal===0&&
    response.payment_intent==null&&response.subscription==null;
   return json({ok:true,readOnly:true,checkoutComplete:response.status==='complete',
    noCharge:safe,orderTotalCents:response.amount_total,
    paymentStatus:response.payment_status,status:response.status,
    verifiedSafe:safe&&response.status==='complete',
    memberEntitlementGranted:false,
    targetSku:response.metadata?.gu71_target_sku||null,
    notice:'Stripe-hosted zero-amount Checkout only. Not a GU58 membership, Managed Payments or paid-charge verification.'});
  }
  await verify(c);
  return json({ok:true,readOnly:true,ownerOnly:true,configuredZeroPrice:true,
   liveCustomerPaymentsApproved:false,oneTime:true,amountCents:0,
   notice:'Strictly Owner-only $0 one-time LIVE checkout, separate from all paid memberships.'});
 }catch(e){return json({ok:false,error:e.code||'ZERO_QA_UNAVAILABLE'},e.status||503)}
}
export async function onRequestPost({request,env}){
 try{
  if(request.headers.get('origin')!==site(env))throw fail('CROSS_SITE_POST_BLOCKED',403);
  if(Number(request.headers.get('content-length')||0)>512)throw fail('REQUEST_TOO_LARGE',413);
  const user=await authorize(request,env),c=setup(request,env);
  const input=await request.json().catch(()=>null);
  if(input?.confirm!=='CREATE_ZERO_DOLLAR_LIVE_QA'||!input||typeof input!=='object'||
     Object.keys(input).some(k=>!['confirm','sku'].includes(k))||
     Object.keys(input).length>2)
   throw fail('EXPLICIT_OWNER_CONFIRMATION_REQUIRED',400);
  const sku=input.sku===undefined?'':val(input.sku);
  if(input.sku!==undefined)await verifyDiagnosticTarget(env,sku);
  await verify(c);
  const p=new URLSearchParams();
  p.set('mode','payment');p.set('line_items[0][price]',c.price);
  p.set('line_items[0][quantity]','1');
  p.set('payment_method_collection','if_required');p.set('customer_creation','if_required');
  p.set('automatic_tax[enabled]','false');
  p.set('client_reference_id',user);
  p.set('metadata[gu71_zero_qa]','true');p.set('metadata[gu71_owner]',user);
  p.set('metadata[gu71_price_id]',c.price);
  if(sku)p.set('metadata[gu71_target_sku]',sku);
  p.set('success_url',c.origin+'/admin.html?gu71=complete&session_id={CHECKOUT_SESSION_ID}');
  p.set('cancel_url',c.origin+'/admin.html?gu71=cancelled');
  const day=new Date().toISOString().slice(0,10);
  const session=await stripeSession(c,p,'gu71-zero-'+user+'-'+day+'-'+(sku||'general'));
  return json({ok:true,live:true,zeroDollar:true,targetSku:sku||null,sessionUrl:session.url,
   notice:'Owner zero-dollar one-time Stripe Checkout only. NO membership or tool entitlements.'});
 }catch(e){return json({ok:false,error:e.code||'ZERO_QA_UNAVAILABLE'},e.status||503)}
}
