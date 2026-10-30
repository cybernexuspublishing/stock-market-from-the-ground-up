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
 const account=val((env.STRIPE_LIVE_ACCOUNT_ID || env.GU58_STRIPE_LIVE_ACCOUNT_ID)),key=val((env.STRIPE_LIVE_SECRET_KEY || env.GU58_STRIPE_LIVE_SECRET_KEY));
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
 const base=val(env.SUPABASE_URL).replace(/\/$/,'');
 const secret=val(env.SUPABASE_SECRET_KEY);
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!secret)throw fail('CATALOG_UNAVAILABLE');
 const headers=secret.startsWith('sb_secret_')?{apikey:secret}:{apikey:secret,authorization:'Bearer '+secret};
 // The 14-day Founder SKU is in the canonical founding-plan registry but is
 // deliberately NOT a customer-sellable Store item. This exception is diagnostic
 // only: the separate GU71 price is $0 one-time; no paid Founder enrollment.
 if(sku==='founding:FOUNDING_14'){
  const rows=await getJson(base+'/rest/v1/gu_founder_plans_v014173?select=plan_code,price_cents,term_days,checkout_enabled&plan_code=eq.FOUNDING_14&limit=1',
   {headers},'CATALOG_UNAVAILABLE');
  if(!Array.isArray(rows)||rows.length!==1||rows[0].plan_code!=='FOUNDING_14'||
   rows[0].price_cents!==2299||rows[0].term_days!==14||
   rows[0].checkout_enabled!==false)throw fail('FOUNDER_14_PAID_QA_GATE_MUST_REMAIN_CLOSED',409);
  return sku;
 }
 const r=await getJson(base+'/rest/v1/gu_storefront_items_v014174?select=sku&sku=eq.'+encodeURIComponent(sku)+'&limit=1',
  {headers},'CATALOG_UNAVAILABLE');
 if(!Array.isArray(r)||r.length!==1||r[0].sku!==sku)throw fail('QA_TARGET_NOT_IN_CANONICAL_STORE',404);
 return sku;
}

async function diagnosticSelection(env,input){
 const base=val(env.SUPABASE_URL).replace(/\/$/,''),secret=val(env.SUPABASE_SECRET_KEY);
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!secret)throw fail('CATALOG_UNAVAILABLE');
 const h={apikey:secret,...(secret.startsWith('sb_secret_')?{}:{authorization:'Bearer '+secret})};
 const all=await getJson(base+'/rest/v1/gu_storefront_items_v014174?select=sku,category,visible&visible=eq.true&limit=150',
  {headers:h},'CATALOG_UNAVAILABLE');
 if(!Array.isArray(all)||all.length>150)throw fail('CATALOG_UNAVAILABLE');
 const available=new Map(all.map(x=>[x.sku,x]));
 let skus,selector;
 if(input?.selection==='category'){
  if(!['membership','book','bootcamp','tool','addon','feature','founding'].includes(input.category))throw fail('INVALID_QA_CATEGORY',400);
  skus=all.filter(x=>x.category===input.category).map(x=>x.sku);selector='category:'+input.category;
 }else if(input?.selection==='selected'){
  if(!Array.isArray(input.skus)||input.skus.length<1||input.skus.length>100)throw fail('INVALID_QA_SELECTION',400);
  skus=input.skus;selector='selected';
 }else if(input?.selection==='all'){skus=all.map(x=>x.sku);selector='all';}
 else throw fail('INVALID_QA_SELECTION',400);
 if(!skus.length||skus.length>100||skus.some(x=>typeof x!=='string'||!available.has(x))||
  new Set(skus).size!==skus.length)throw fail('QA_SELECTION_NOT_PUBLISHED',400);
 return {skus,selector,headers:{...h,'content-type':'application/json'},base};
}
async function batchSave(c,user,selection){
 const r=await getJson(selection.base+'/rest/v1/gu_owner_zero_live_batches_v1',
 {method:'POST',headers:{...selection.headers,prefer:'return=representation'},
 body:JSON.stringify({owner_id:user,selected_skus:selection.skus,selector:selection.selector})},'QA_BATCH_SAVE_FAILED');
 if(!Array.isArray(r)||r.length!==1||!/^[0-9a-f-]{36}$/i.test(r[0].id))throw fail('QA_BATCH_SAVE_FAILED');
 return r[0].id;
}
async function batchBind(selection,batchId,sessionId){
 const r=await fetch(selection.base+'/rest/v1/gu_owner_zero_live_batches_v1?id=eq.'+batchId,
 {method:'PATCH',headers:{...selection.headers,prefer:'return=representation'},
 body:JSON.stringify({stripe_session_id:sessionId}),cache:'no-store'});
 if(!r.ok)throw fail('QA_BATCH_BIND_FAILED');
 const j=await r.json().catch(()=>null);
 if(!Array.isArray(j)||j.length!==1||j[0].stripe_session_id!==sessionId)throw fail('QA_BATCH_BIND_FAILED');
}

async function stripeSession(c,params,idempotencyKey){
 // Keep the provider's safe machine-readable rejection for Owner diagnostics.
 // Never return Stripe's raw error message, credentials, request body, or PII.
 let http,response;
 try{
  http=await fetch('https://api.stripe.com/v1/checkout/sessions',{
   method:'POST',headers:{authorization:'Bearer '+c.key,
    'content-type':'application/x-www-form-urlencoded','Idempotency-Key':idempotencyKey},
   body:params.toString(),cache:'no-store'});
  response=await http.json().catch(()=>null);
 }catch{throw fail('ZERO_CHECKOUT_NOT_SUPPORTED')}
 if(!http.ok||!response||response.error){
  const err=fail('ZERO_CHECKOUT_NOT_SUPPORTED');
  const detail={},provider=response?.error||{};
  if(/^[a-z0-9_]{2,72}$/.test(val(provider.code)))detail.code=provider.code;
  if(/^[a-z0-9_]{2,72}$/.test(val(provider.type)))detail.type=provider.type;
  const param=val(provider.param);if(param.length>=1&&param.length<=90&&[...param].every(ch=>'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_[].'.includes(ch)))detail.param=param;
  const reqId=val(http.headers.get('request-id'));
  if(/^req_[A-Za-z0-9_]{6,100}$/.test(reqId))detail.requestId=reqId;
  if(http.status>=400&&http.status<=599)detail.httpStatus=http.status;
  err.stripeDiagnostic=detail;
  throw err;
 }
 // The Owner never receives a link that could lead to any money/card/subscription.
 if(!/^cs_live_[A-Za-z0-9_]+$/.test(val(response.id))||response.livemode!==true||
  response.amount_total!==0||response.amount_subtotal!==0||response.mode!=='payment'||
  response.payment_intent!=null||response.subscription!=null||
  !['always','auto','if_required'].includes(response.payment_method_collection))
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
   let batchEvidence=null;
   if(response.metadata?.gu71_batch_id){
    const batch=response.metadata.gu71_batch_id,base=val(env.SUPABASE_URL).replace(/\/$/,''),
      key=val(env.SUPABASE_SECRET_KEY);
    if(!/^[0-9a-f-]{36}$/i.test(batch)||!key)throw fail('QA_BATCH_UNAVAILABLE',503);
    const h={apikey:key,...(key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+key})};
    const rows=await getJson(base+'/rest/v1/gu_owner_zero_live_batches_v1?select=id,selected_skus,selector,stripe_session_id,signed_webhook_verified_at&owner_id=eq.'+
     encodeURIComponent(user)+'&id=eq.'+encodeURIComponent(batch)+'&limit=1',{headers:h},'QA_BATCH_UNAVAILABLE');
    if(!Array.isArray(rows)||rows.length!==1||rows[0].stripe_session_id!==sid)throw fail('QA_BATCH_UNAVAILABLE',503);
    batchEvidence={id:batch,selectedCount:rows[0].selected_skus?.length||0,scope:rows[0].selector,
     signedWebhookVerified:!!rows[0].signed_webhook_verified_at};
   }
   return json({ok:true,readOnly:true,checkoutComplete:response.status==='complete',
    noCharge:safe,orderTotalCents:response.amount_total,
    paymentStatus:response.payment_status,status:response.status,
    verifiedSafe:safe&&response.status==='complete',
    memberEntitlementGranted:false,
    targetSku:response.metadata?.gu71_target_sku||null,
    batchEvidence,
    notice:'Stripe-hosted zero-amount Checkout only. Not a GU58 membership, Managed Payments or paid-charge verification.'});
  }
  await verify(c);
  return json({ok:true,readOnly:true,ownerOnly:true,configuredZeroPrice:true,
   liveCustomerPaymentsApproved:false,oneTime:true,amountCents:0,
   notice:'Strictly Owner-only $0 one-time LIVE checkout, separate from all paid memberships.'});
 }catch(e){return json({ok:false,error:e.code||'ZERO_QA_UNAVAILABLE',...(e.stripeDiagnostic?{stripeDiagnostic:e.stripeDiagnostic}:{})},e.status||503)}
}
export async function onRequestPost({request,env}){
 try{
  if(request.headers.get('origin')!==site(env))throw fail('CROSS_SITE_POST_BLOCKED',403);
  if(Number(request.headers.get('content-length')||0)>4500)throw fail('REQUEST_TOO_LARGE',413);
  const user=await authorize(request,env),c=setup(request,env);
  const raw=await request.text();if(raw.length>4500)throw fail('REQUEST_TOO_LARGE',413);
  let input;try{input=JSON.parse(raw)}catch{throw fail('INVALID_QA_SELECTION',400)}
  if(!input||typeof input!=='object'||Array.isArray(input)||input.confirm!=='CREATE_ZERO_DOLLAR_LIVE_QA')
   throw fail('EXPLICIT_OWNER_CONFIRMATION_REQUIRED',400);
  const batch=['category','selected','all'].includes(input.selection);
  const allowed=batch?['confirm','selection','category','skus']:['confirm','sku'];
  if(Object.keys(input).some(k=>!allowed.includes(k)))throw fail('INVALID_QA_SELECTION',400);
  const sku=batch?'':input.sku===undefined?'':val(input.sku);
  const selection=batch?await diagnosticSelection(env,input):null;
  if(!batch&&input.sku!==undefined)await verifyDiagnosticTarget(env,sku);
  await verify(c);
  const p=new URLSearchParams();
  p.set('mode','payment');p.set('line_items[0][price]',c.price);
  p.set('line_items[0][quantity]','1');
  // The $0 payment-mode Checkout automatically omits card collection. Stripe's
  // payment_method_collection=if_required is supported only in subscription mode.
  // Create a Customer for the zero-cost order without setting up a subscription.
  p.set('customer_creation','always');
  p.set('automatic_tax[enabled]','false');
  p.set('client_reference_id',user);
  p.set('metadata[gu71_zero_qa]','true');p.set('metadata[gu71_owner]',user);
  p.set('metadata[gu71_price_id]',c.price);
  if(sku)p.set('metadata[gu71_target_sku]',sku);
  const batchId=selection?await batchSave(c,user,selection):null;
  if(selection){p.set('metadata[gu71_batch_id]',batchId);
   p.set('metadata[gu71_target_count]',String(selection.skus.length));
   p.set('metadata[gu71_selector]',selection.selector);
  }
  p.set('success_url',c.origin+'/admin.html?gu71=complete&session_id={CHECKOUT_SESSION_ID}');
  p.set('cancel_url',c.origin+'/admin.html?gu71=cancelled');
  // A distinct explicit Owner click must not collide with an earlier session's
  // Stripe idempotency key, especially when metadata or catalog state changes.
  const session=await stripeSession(c,p,'gu71-zero-'+crypto.randomUUID());
  if(batchId)await batchBind(selection,batchId,session.id);
  return json({ok:true,live:true,zeroDollar:true,targetSku:sku||null,diagnosticBatch:batchId||null,selectedCount:selection?.skus.length||null,sessionUrl:session.url,
   notice:'Owner zero-dollar one-time Stripe Checkout only. NO membership or tool entitlements.'});
 }catch(e){return json({ok:false,error:e.code||'ZERO_QA_UNAVAILABLE',...(e.stripeDiagnostic?{stripeDiagnostic:e.stripeDiagnostic}:{})},e.status||503)}
}
