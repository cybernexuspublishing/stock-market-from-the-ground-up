/* Cyber Nexus v0.14.0.57 | Owner-only Stripe TEST checkout and read-only catalog audit.
 * Uses existing production Supabase only as a SHADOW event ledger. Never issues live grants.
 */
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
const prices={
 'plan:FULL_MONTHLY':['prod_VRvuGwLKI16MXU',6999,'month'],
 'plan:FULL_ANNUAL':['prod_VRvyBNhWk9jshb',69900,'year'],
 'plan:LIFETIME':['prod_VRwgISspL5mhls',249900,'one_time'],
 'plan:ONDEMAND_MONTHLY':['prod_VRwjus5sQLtTad',1999,'month'],
 'tool:INTERACTIVE_LEARNING':['prod_VRwmmu4zATdHAb',2999,'month'],
 'tool:JOURNAL_ANALYTICS':['prod_VRwoX4hTg8fRCm',2999,'month'],
 'tool:MARKET_SIMULATOR':['prod_VRwrsEpvfw60Xh',2999,'month'],
 'tool:MARKET_TUTOR':['prod_VRwuiqDt8qHayI',2999,'month']
};
function envCheck(e){const base=String(e.SUPABASE_URL||'').replace(/\/$/,'');
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)|| !e.SUPABASE_PUBLISHABLE_KEY||!e.SUPABASE_SECRET_KEY)
  throw Error('SUPABASE_NOT_CONFIGURED');
 return {base,pub:e.SUPABASE_PUBLISHABLE_KEY,secret:e.SUPABASE_SECRET_KEY};
}
function sandboxEnabled(e){return e.GU39_SANDBOX_SHADOW_GATE==='true'&&String(e.GU39_STRIPE_TEST_SECRET_KEY||'').startsWith('sk_test_')&&
 String((e.STRIPE_TEST_WEBHOOK_SECRET || e.GU39_STRIPE_TEST_WEBHOOK_SECRET)||'').startsWith('whsec_');}
async function getJson(url,options){const r=await fetch(url,{...options,cache:'no-store'});const d=await r.json().catch(()=>null);if(!r.ok||!d)throw Error('REMOTE_UNAVAILABLE');return d;}
async function actor(req,c){
 const jwt=/^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')||'')?.[1];
 if(!jwt)throw Error('SIGN_IN_REQUIRED');
 const tokenHeaders={apikey:c.pub,authorization:'Bearer '+jwt};
 let userResult;
 try{userResult=await fetch(c.base+'/auth/v1/user',{headers:tokenHeaders,cache:'no-store'})}
 catch{throw Error('SUPABASE_AUTH_UNAVAILABLE')}
 if(userResult.status===401||userResult.status===403)throw Error('INVALID_SESSION');
 if(!userResult.ok)throw Error('SUPABASE_AUTH_UNAVAILABLE');
 const user=await userResult.json().catch(()=>null);
 if(!/^[0-9a-f-]{36}$/i.test(user?.id||''))throw Error('INVALID_SESSION');
 const head={...tokenHeaders,'content-type':'application/json'};
 // Internal gu_staff_identity_v01431r1 has authenticated EXECUTE revoked by
 // v0.14.0.31R1; call public, role-checked v0.14.0.32R1 facade instead.
 let roleResult;
 try{roleResult=await fetch(c.base+'/rest/v1/rpc/gu_staff_role_v01432r1',
  {method:'POST',headers:head,body:'{}',cache:'no-store'})}
 catch{throw Error('STAFF_ROLE_RPC_UNAVAILABLE')}
 if(roleResult.status===404)throw Error('STAFF_ROLE_RPC_MISSING');
 if(roleResult.status===401||roleResult.status===403)throw Error('STAFF_ROLE_AUTHORIZATION_FAILED');
 if(!roleResult.ok)throw Error('STAFF_ROLE_RPC_UNAVAILABLE');
 const roleBody=await roleResult.json().catch(()=>null);
 if(roleBody?.ok!==true)throw Error('STAFF_ROLE_RPC_UNAVAILABLE');
 if(roleBody.role!=='OWNER'&&roleBody.role!=='ADMIN')throw Error('STAFF_REQUIRED');
 return {userId:user.id,role:roleBody.role,jwt,head};
}
async function ownerStepup(c,a){
 if(a.role!=='OWNER')throw Error('OWNER_REQUIRED');
 // PostgreSQL returns JSON boolean FALSE for an Owner who has not recently
 // confirmed their password. The legacy getJson() helper treats false as a
 // transport error (!d), masking PASSWORD_RECONFIRM_REQUIRED as a generic 503.
 let response,step;
 try{
  response=await fetch(c.base+'/rest/v1/rpc/gu_staff_stepup_active_v01432r1',{
   method:'POST',headers:a.head,body:'{}',cache:'no-store'
  });
  step=await response.json().catch(()=>null);
 }catch{throw Error('STAFF_STEPUP_CHECK_UNAVAILABLE')}
 if(!response.ok||step===null)throw Error('STAFF_STEPUP_CHECK_UNAVAILABLE');
 if(step!==true)throw Error('PASSWORD_RECONFIRM_REQUIRED');
}
async function rpc(c,a,name,params){return getJson(c.base+'/rest/v1/rpc/'+name,{method:'POST',headers:a.head,body:JSON.stringify(params||{})});}
// Translate only enumerated PostgREST/database RPC error codes. Never disclose raw
// SQL exceptions, tokens, member data or stack traces in client-facing responses.
const OWNER_TOGGLE_ERRORS=new Set([
 'PASSWORD_RECONFIRM_REQUIRED','SETTINGS_STALE_REFRESH','OWNER_REQUIRED',
 'STAFF_REQUIRED','INVALID_SETTINGS'
]);
async function guardedToggleRpc(c,a,enabled,updatedAt){
 let response,data;
 try{
  response=await fetch(c.base+'/rest/v1/rpc/gu39_sandbox_owner_toggle',{
   method:'POST',headers:a.head,
   body:JSON.stringify({p_enabled:enabled,p_expected_updated_at:updatedAt}),
   cache:'no-store'
  });
  data=await response.json().catch(()=>null);
 }catch{throw Error('SHADOW_TOGGLE_RPC_UNAVAILABLE')}
 if(!response.ok||data?.ok!==true){
  const message=String(data?.message||'').trim();
  if(OWNER_TOGGLE_ERRORS.has(message))throw Error(message);
  if(response.status===401)throw Error('INVALID_SESSION');
  if(response.status===403)throw Error('SHADOW_TOGGLE_AUTH_REJECTED');
  if(data?.code==='PGRST202'||response.status===404)throw Error('SHADOW_TOGGLE_RPC_UNAVAILABLE');
  throw Error('SHADOW_TOGGLE_DATABASE_REJECTED');
 }
 return data;
}
function serviceHeaders(secret){
 if(String(secret).startsWith('sb_secret_'))return {apikey:secret};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(secret)))return {apikey:secret,authorization:'Bearer '+secret};
 throw Error('SUPABASE_SECRET_FORMAT_UNSUPPORTED');
}
async function service(c,path,method='GET',data,prefer='return=representation'){const r=await fetch(c.base+'/rest/v1/'+path,{method,headers:{...serviceHeaders(c.secret),'content-type':'application/json',prefer},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store'});if(!r.ok)throw Error('SHADOW_DB_UNAVAILABLE');if(r.status===204)return [];const j=await r.json().catch(()=>null);if(j===null)throw Error('SHADOW_DB_UNAVAILABLE');return j;}
// Stripe Managed Payments is exposed in an API preview. The website's original
// default Stripe version was too old to recognize managed_payments[enabled].
// Explicitly pin the provider-documented preview version for Checkout CREATE;
// do not change webhook delivery's configured API version as part of this patch.
const MANAGED_PAYMENTS_CHECKOUT_API_VERSION='2026-02-25.preview';
async function stripe(e,path,method='GET',data,idempotency){
 const h={authorization:'Bearer '+e.GU39_STRIPE_TEST_SECRET_KEY};
 if(method==='POST')h['content-type']='application/x-www-form-urlencoded';
 if(method==='POST'&&path==='checkout/sessions')h['Stripe-Version']=MANAGED_PAYMENTS_CHECKOUT_API_VERSION;
 if(idempotency)h['Idempotency-Key']=idempotency;
 return getJson('https://api.stripe.com/v1/'+path,{method,headers:h,body:data});}
const known=(s,prefix)=>new RegExp('^'+prefix+'_[A-Za-z0-9_]{6,}$').test(String(s||''));

// Owner's sandbox_import_results.json reports this account. Never reconcile with any other Stripe account.
const EXPECTED_SANDBOX_ACCOUNT='acct_1URGkDJY9FI7byHB';
function priceMap(e){try{
 const m=JSON.parse(e.GU39_STRIPE_TEST_PRICE_MAP_JSON||'{}');
 if(!m||Array.isArray(m)||typeof m!=='object')throw Error('PRICE_MAP_INVALID');
 return m;
 }catch{throw Error('PRICE_MAP_INVALID')}
}
function testKeyConfigured(e){return /^sk_test_[A-Za-z0-9_]+$/.test(String(e.GU39_STRIPE_TEST_SECRET_KEY||''))}
async function checkStripeAccount(env){
 if(!testKeyConfigured(env))throw Error('SANDBOX_TEST_KEY_MISSING');
 const acct=await stripe(env,'account');
 if(acct.id!==EXPECTED_SANDBOX_ACCOUNT)throw Error('SANDBOX_ACCOUNT_MISMATCH');
 return acct.id;
}
function matchesPrice(p,product,cents,interval){
 // GU39 TEST catalog requires the same fixed-price checks as GU58 LIVE.
 // Do not certify multi-period, metered, tiered or quantity-transformed Prices.
 return !!p&&p.livemode===false&&p.active===true&&p.product===product&&
  p.currency==='usd'&&p.unit_amount===cents&&p.billing_scheme==='per_unit'&&
  p.transform_quantity===null&&
  (interval==='one_time'?p.type==='one_time':
   p.type==='recurring'&&p.recurring?.interval===interval&&
   p.recurring?.interval_count===1&&p.recurring?.usage_type==='licensed');
}
async function stripeInspection(env,route){
 const r=await fetch('https://api.stripe.com/v1/'+route,{headers:{authorization:'Bearer '+env.GU39_STRIPE_TEST_SECRET_KEY},cache:'no-store'});
 const d=await r.json().catch(()=>null);
 if(r.status===404)return {missing:true};
 if(!r.ok||!d||d.error)throw Error('STRIPE_CATALOG_API_UNAVAILABLE');
 return {data:d};
}
async function inspectCatalog(env){
 // The ONLY authoritative Stripe Sandbox catalog verification.
 // READ ONLY, independent of shadow payment checkout gate.
 const account=await checkStripeAccount(env),map=priceMap(env),rows=[];
 const keys=Object.keys(prices),mappedIds=keys.map(x=>map[x]).filter(x=>known(x,'price'));
 const duplicates=new Set(mappedIds).size!==mappedIds.length;
 for(const [sku,[productId,cents,interval]] of Object.entries(prices)){
  const priceId=map[sku],row={sku,productId,priceId:known(priceId,'price')?priceId:null,amountCents:cents,interval,
   productVerified:false,priceVerified:false,reason:'',status:'NOT_VERIFIED'};
  const product=await stripeInspection(env,'products/'+encodeURIComponent(productId));
  if(product.missing){row.status='PRODUCT_MISSING';row.reason='Missing in connected Stripe test account.';rows.push(row);continue}
  row.productName=String(product.data.name||'');
  row.stripeTaxCode=typeof product.data.tax_code==='string'?product.data.tax_code:product.data.tax_code?.id||null;
  row.productVerified=product.data.id===productId&&product.data.livemode===false&&product.data.active===true;
  if(!row.productVerified){row.status='PRODUCT_INVALID';row.reason='Inactive, live-mode, or unexpected product.';rows.push(row);continue}
  if(!row.priceId){row.status='PRICE_MAP_MISSING';row.reason='Missing GU39_STRIPE_TEST_PRICE_MAP_JSON entry in Cloudflare.';rows.push(row);continue}
  if(duplicates){row.status='PRICE_MAP_DUPLICATE';row.reason='Duplicate Stripe test Price ID; each SKU requires its own price.';rows.push(row);continue}
  const price=await stripeInspection(env,'prices/'+encodeURIComponent(row.priceId));
  if(price.missing){row.status='PRICE_MISSING';row.reason='Price does not exist in the connected sandbox.';rows.push(row);continue}
  row.priceVerified=matchesPrice(price.data,productId,cents,interval);
  row.status=row.priceVerified?'VERIFIED':'PRICE_MISMATCH';
  if(!row.priceVerified)row.reason='Price product, active flag, test mode, currency, amount, or recurrence mismatch.';
  rows.push(row);
 }
 const verifiedProducts=rows.filter(x=>x.productVerified).length;
 const verifiedPrices=rows.filter(x=>x.priceVerified).length;
 const tax=rows.filter(x=>['plan:FULL_MONTHLY','plan:FULL_ANNUAL'].includes(x.sku)).map(x=>x.stripeTaxCode).filter(Boolean);
 return {ok:true,version:'0.14.0.47',accountVerified:true,accountId:account,readOnly:true,productsExpected:8,
  productsVerified:verifiedProducts,pricesVerified:verifiedPrices,priceIdsConfigured:mappedIds.length,
  allVerified:verifiedProducts===8&&verifiedPrices===8&&!duplicates,
  taxClassificationReviewRequired:tax.length===2&&tax[0]!==tax[1],
  rows,liveCheckout:false,notice:'Read-only Stripe TEST catalog verification; no payments or real member entitlements changed.'};
}


const SHADOW_TEST_EVENTS=Object.freeze([
 'checkout.session.completed','checkout.session.async_payment_succeeded',
 'invoice.paid','invoice.payment_failed',
 'customer.subscription.updated','customer.subscription.deleted',
 'charge.refunded','charge.dispute.created'
]);
// Strictly read-only, Owner-authorized preflight: never returns a secret or grants access.
// The gate and Owner DB switch are intentionally NOT enabled by a preflight.
async function inspectTestReadiness(request,env,c,a){
 if(a.role!=='OWNER')throw Error('OWNER_REQUIRED');
 const checks=[];
 const add=(check,passed,detail)=>checks.push({check,status:passed?'PASS':'BLOCKED',detail});
 const testSecretOk=testKeyConfigured(env);
 add('Stripe test secret in Cloudflare',testSecretOk,testSecretOk?'Valid test-key format':'Missing or invalid GU39_STRIPE_TEST_SECRET_KEY');
 const webhookSecretOk=/^whsec_[A-Za-z0-9_]+$/.test(String((env.STRIPE_TEST_WEBHOOK_SECRET || env.GU39_STRIPE_TEST_WEBHOOK_SECRET)||''));
 add('Stripe test webhook signing secret',webhookSecretOk,webhookSecretOk?'Encrypted binding format recognized; actual signature delivery untested':'Configure GU39_STRIPE_TEST_WEBHOOK_SECRET as encrypted Production secret');
 let accountOk=false;
 if(testSecretOk){
  try{await checkStripeAccount(env);accountOk=true}catch{}
 }
 add('Expected Stripe TEST account',accountOk,accountOk?'Connected account matches approved test catalog':'Cannot authenticate or account does not match');
 let mapOk=false;
 try{
  const mapping=priceMap(env),ids=Object.keys(prices).map(k=>mapping[k]);
  mapOk=ids.length===8&&ids.every(x=>known(x,'price'))&&new Set(ids).size===8;
 }catch{}
 add('Eight distinct Stripe test Price ID mappings',mapOk,mapOk?'All eight Price IDs are configured':'Check GU39_STRIPE_TEST_PRICE_MAP_JSON without replacing products');
 let databaseOk=false,ownerMode=false;
 try{
  const rows=await service(c,'gu39_sandbox_settings?select=enabled&id=eq.true&limit=1');
  databaseOk=Array.isArray(rows)&&rows.length===1&&typeof rows[0].enabled==='boolean';
  ownerMode=databaseOk&&rows[0].enabled===true;
 }catch{}
 add('Supabase shadow testing controls',databaseOk,databaseOk?'Owner TEST switch exists and is readable':'Cannot read isolated shadow settings from server-only key');
 let webhookOk=false,eventsOk=false,webhookStatus='not checked',matched=0;
 if(accountOk){
  try{
   const list=await stripe(env,'webhook_endpoints?limit=100');
   const expectedUrl=new URL('/api/gu39-stripe-webhook',request.url).href;
   const matching=(Array.isArray(list.data)?list.data:[]).filter(x=>x.url===expectedUrl&&x.livemode===false&&x.status==='enabled');
   matched=matching.length;
   webhookOk=matching.length===1&&list.has_more!==true; // Do not certify a partial 100-endpoint list.
   eventsOk=webhookOk&&SHADOW_TEST_EVENTS.every(event=>
      Array.isArray(matching[0].enabled_events)&&
      (matching[0].enabled_events.includes('*')||matching[0].enabled_events.includes(event)));
   webhookStatus=list.has_more?'One or more pages beyond initial 100 entries':matched===0?'No enabled TEST webhook destination matched the current site':
     matched>1?'Multiple enabled TEST destinations matched the site':'Enabled TEST webhook destination found';
  }catch{webhookStatus='Stripe webhook endpoint list unavailable or permission denied';}
 }
 add('Stripe TEST webhook destination',webhookOk,webhookStatus);
 add('Eight required webhook event subscriptions',eventsOk,eventsOk?'All eight event types are configured':
     webhookOk?'Required checkout/subscription/refund/dispute events are missing':'Requires an enabled Stripe TEST webhook destination');
 const ready=checks.every(x=>x.status==='PASS');
 return {ok:true,version:'0.14.0.57',readOnly:true,testOnly:true,liveCheckout:false,
    checks,passed:checks.filter(x=>x.status==='PASS').length,total:checks.length,
    configurationReady:ready,cloudflareGate:sandboxEnabled(env),ownerMode,
    webhookPath:'/api/gu39-stripe-webhook',
    pendingProviderAcceptance:ready?'Run controlled signed TEST checkout and verify shadow event ledger':'Resolve BLOCKED items before enabling shadow testing',
    note:'This verifies configuration only. It cannot prove webhook signing-secret pairing, Stripe Managed Payments eligibility, or checkout/renewal/refund behavior.'};
}


// Second-tier, comprehensive TEST checkout guard. ALL calls are GET/read-only;
// no checkout session, shadow intent, membership, or billing entry is created.
// Provider Managed Payments approval cannot be proven by an API catalog GET.
async function inspectCheckoutSafety(request,env,c,a){
 if(a.role!=='OWNER')throw Error('OWNER_REQUIRED');
 const sku=new URL(request.url).searchParams.get('sku');
 if(!Object.hasOwn(prices,sku))throw Error('INVALID_SKU');
 const checks=[];
 const add=(name,passed,detail)=>checks.push({name,status:passed?'PASS':'BLOCKED',detail});
 const conf=await inspectTestReadiness(request,env,c,a);
 add('Seven Stripe/Supabase configuration checks',conf.configurationReady===true,
  conf.configurationReady?'Original seven checks passed':'Run Payment Test Preflight and resolve configuration issues');
 const gate=sandboxEnabled(env);
 add('Cloudflare TEST-only sandbox gate',gate,gate?'Enabled only for isolated shadow tests':'Cloudflare GU39 sandbox gate is OFF');
 let ownerStatus=false;
 try{const s=await status(c,a,env);ownerStatus=s.enabled===true}catch{}
 add('Owner TEST mode',ownerStatus,ownerStatus?'Enabled in Supabase':'Owner-controlled TEST switch is OFF or unavailable');
 let passwordOk=false;
 try{await ownerStepup(c,a);passwordOk=true}catch{}
 add('Recent Owner password confirmation',passwordOk,passwordOk?'Fresh Owner step-up exists':'Use the Owner password and Turnstile confirmation workflow');
 let mappingOk=false,priceOk=false,productOk=false;
 let selectedPrice=null;
 try{
  const map=priceMap(env),ids=Object.keys(prices).map(x=>map[x]);
  mappingOk=ids.length===8&&ids.every(x=>known(x,'price'))&&new Set(ids).size===8;
  if(mappingOk){
   selectedPrice=await stripe(env,'prices/'+encodeURIComponent(map[sku]));
   const [product,cents,interval]=prices[sku];
   priceOk=matchesPrice(selectedPrice,product,cents,interval);
   if(priceOk){
    const p=await stripe(env,'products/'+encodeURIComponent(product));
    productOk=p.id===product&&p.livemode===false&&p.active===true;
   }
  }
 }catch{}
 add('All eight unique TEST Price IDs',mappingOk,mappingOk?'Mapped to eight different prices':'Missing or duplicate TEST Price ID');
 add('Selected Stripe TEST price and product',priceOk&&productOk,
  priceOk&&productOk?'Actual Stripe TEST Price and Product verified for selected SKU':'Stripe price/product is unavailable or does not match the selected SKU');
 let shadowRead=false,limitOk=false;
 try{
  const recent=await safeStage('SHADOW_INTENT_READ_FAILED',()=>service(c,`gu39_sandbox_intents?select=id&tester_user_id=eq.${a.userId}&created_at=gt.${encodeURIComponent(new Date(Date.now()-3600000).toISOString())}&limit=12`));
  shadowRead=Array.isArray(recent);
  limitOk=shadowRead&&recent.length<12;
 }catch{}
 add('Isolated Supabase intent query using server credentials',shadowRead,shadowRead?'Read-only isolated intent query succeeded':'Server-side shadow intent read was rejected');
 add('Owner checkout anti-repeat limit',limitOk,limitOk?'Fewer than 12 prepared checkouts in the past hour':'Too many attempted checkouts or Supabase intent query unavailable');
 // A previous Stripe POST may have succeeded while its Supabase binding failed.
 // Do not create a second Checkout until such an indeterminate intent is reviewed.
 let noUnreconciled=false;
 try{
  const unfinished=await service(c,`gu39_sandbox_intents?select=id&tester_user_id=eq.${a.userId}&status=eq.prepared&session_id=is.null&limit=1`);
  noUnreconciled=Array.isArray(unfinished)&&unfinished.length===0;
 }catch{}
 add('No recent unreconciled Stripe TEST intents',noUnreconciled,
  noUnreconciled?'No unbound PREPARED TEST intent remains':'An earlier TEST intent is unbound. Complete the single combined Payment Readiness Review; do not retry Stripe Checkout');
 const passed=checks.filter(x=>x.status==='PASS').length;
 return {ok:true,version:'0.14.0.54',readOnly:true,testOnly:true,liveCheckout:false,
  sku,checks,passed,total:checks.length,safeToAttemptTest:passed===checks.length,
  managedPaymentsApiVersion:MANAGED_PAYMENTS_CHECKOUT_API_VERSION,
  stripeManagedPaymentsProviderAcceptance:'NOT_VERIFIED_BY_READ_ONLY_API',
  testPaymentPerformed:false,shadowWritesPerformed:false,
  note:'A successful read-only audit does not certify Stripe Managed Payments enrollment, signing-secret pairing or a completed TEST payment.'};
}


// One comprehensive, no-payment Owner diagnostic: Stripe configuration, selected
// checkout safeguards, LIVE gate, and any unbound TEST attempts in one response.
// Stripe /v1/checkout/sessions list does not support client_reference_id filtering;
// examine paginated sessions in a bounded creation window instead. Incomplete
// pagination or any mismatch NEVER authorizes clearing a record.
const MAX_STRIPE_RECONCILIATION_PAGES=10;
const RECONCILE_BEFORE_SECONDS=5*60;
const RECONCILE_AFTER_SECONDS=30*60;
async function inspectUnboundTestIntents(c,env,a){
 const intents=await service(c,
  'gu39_sandbox_intents?select=id,sku,stripe_price_id,quoted_cents,created_at,status,session_id'+
  '&tester_user_id=eq.'+encodeURIComponent(a.userId)+
  '&status=eq.prepared&session_id=is.null&order=created_at.asc&limit=26');
 if(!Array.isArray(intents))throw Error('SHADOW_INTENT_READ_FAILED');
 const results=[];
 for(const intent of intents.slice(0,25)){
  let status='STRIPE_SCAN_INCOMPLETE',found=null,matching=0;
  const created=Date.parse(intent.created_at);
  if(!Number.isFinite(created)){results.push({status:'INTENT_TIMESTAMP_INVALID',createdAt:null});continue}
  const start=Math.floor(created/1000)-RECONCILE_BEFORE_SECONDS;
  const end=Math.floor(created/1000)+RECONCILE_AFTER_SECONDS;
  let cursor='',scanComplete=false,pages=0;
  try{
   await checkStripeAccount(env);
   while(pages<MAX_STRIPE_RECONCILIATION_PAGES){
    const params=new URLSearchParams({limit:'100','created[gte]':String(start),'created[lte]':String(end)});
    if(cursor)params.set('starting_after',cursor);
    const listing=await stripe(env,'checkout/sessions?'+params);
    if(!Array.isArray(listing?.data)||typeof listing.has_more!=='boolean')break;
    for(const session of listing.data){
     if(session.client_reference_id!==intent.id&&session.metadata?.gu39_shadow_intent!==intent.id)continue;
     matching++;
     if(matching===1)found=session;
    }
    pages++;
    if(!listing.has_more){scanComplete=true;break}
    if(!listing.data.length||!known(listing.data.at(-1)?.id,'cs_test'))break;
    cursor=listing.data.at(-1).id;
   }
   if(scanComplete&&matching===0)status='NO_MATCH_FOUND';
   else if(scanComplete&&matching===1)status='MATCHED_PROVIDER_SESSION';
   else if(matching>1)status='AMBIGUOUS_MULTIPLE_SESSIONS';
   else status='STRIPE_SCAN_INCOMPLETE';
  }catch{status='STRIPE_SCAN_UNAVAILABLE'}
  const result={intentId:intent.id,sku:intent.sku,createdAt:intent.created_at,
   status,allPagesChecked:scanComplete,matchedSessions:matching,details:'Provider-only, read-only reconciliation'};
  if(status==='MATCHED_PROVIDER_SESSION'&&found){
    let verified=false;
    try{
     // Reject sessions not created for THIS exact intent, TEST Price or SKU.
     const lines=await stripe(env,'checkout/sessions/'+encodeURIComponent(found.id)+'/line_items?limit=5');
     const items=Array.isArray(lines.data)?lines.data:[];
     const actualPrice=items.length===1?(typeof items[0]?.price==='string'?items[0].price:items[0]?.price?.id):null;
     verified=found.livemode===false&&known(found.id,'cs_test')&&
       found.client_reference_id===intent.id&&
       found.metadata?.gu39_shadow_intent===intent.id&&
       actualPrice===intent.stripe_price_id&&items[0]?.quantity===1&&
       found.currency==='usd'&&found.amount_subtotal===intent.quoted_cents&&
       ['open','complete','expired'].includes(found.status);
    }catch{}
    result.status=verified?'MATCHED_VERIFIED_SESSION':'MATCHED_SESSION_NEEDS_REVIEW';
    if(verified)result.providerSessionId=found.id; // Owner-only, no customer PII.
   }
   results.push(result);
 }
 return {totalUnbound:intents.length,results,
  truncated:intents.length>25,
  safeToReconcile:results.length===1&&intents.length<=25&&
   ['NO_MATCH_FOUND','MATCHED_VERIFIED_SESSION'].includes(results[0].status),
  testCheckoutBlocked:intents.length>0,
  note:'No provider writes or Supabase mutations were performed; absence in a bounded Stripe listing requires explicit Owner confirmation.'};
}
// v0.14.0.57: One Owner-only READ-ONLY acceptance evidence view. It is
// deliberately independent from the 17 pre-transaction configuration checks.
// A stored webhook event is not fabricated by a "verification" button.
async function inspectSandboxAcceptance(env,c,a){
 const steps=[
  {key:'stripe_checkout',label:'Provider TEST Checkout Session',status:'NOT_TESTED'},
  {key:'paid_transaction',label:'Stripe TEST payment accepted',status:'NOT_TESTED'},
  {key:'signed_webhook',label:'Stripe webhook event processed',status:'NOT_TESTED'},
  {key:'isolated_access',label:'Supabase isolated access synchronized',status:'NOT_TESTED'}
 ];
 const result={status:'NOT_TESTED',readOnly:true,scope:'ISOLATED_TEST_ONLY',
  attemptsChecked:0,steps,lifeCycle:{
   renewal:'NOT_TESTED',failedPayment:'NOT_TESTED',cancellation:'NOT_TESTED',
   refund:'NOT_TESTED',dispute:'NOT_TESTED'
  },realMemberEntitlementsVerified:false,
  note:'The configuration review does not initiate or certify a completed payment. Real member entitlements remain unchanged.'};
 const fail=(code)=>{result.status='EVIDENCE_UNAVAILABLE';result.error=code;return result};
 let rows;
 try{
  rows=await service(c,'gu39_sandbox_intents?select=id,sku,status,session_id,stripe_price_id,quoted_cents,created_at'+
   '&tester_user_id=eq.'+encodeURIComponent(a.userId)+
   '&session_id=not.is.null&order=created_at.desc&limit=1');
 }catch{return fail('SHADOW_INTENT_READ_UNAVAILABLE')}
 if(!Array.isArray(rows))return fail('SHADOW_INTENT_READ_INVALID');
 if(rows.length===0)return result;
 const intent=rows[0];result.attemptsChecked=1;result.attemptCreatedAt=intent.created_at;
 result.testRecordStatus=intent.status;
 if(!known(intent.session_id,'cs_test')||!known(intent.stripe_price_id,'price')||
    !Object.hasOwn(prices,intent.sku))return fail('BOUND_INTENT_INVALID');
 let session,items;
 try{
  await checkStripeAccount(env);
  session=await stripe(env,'checkout/sessions/'+encodeURIComponent(intent.session_id));
  items=await stripe(env,'checkout/sessions/'+encodeURIComponent(intent.session_id)+'/line_items?limit=2');
 }catch{return fail('STRIPE_SESSION_READ_UNAVAILABLE')}
 const line=Array.isArray(items?.data)&&items.data.length===1?items.data[0]:null;
 const priceId=typeof line?.price==='string'?line.price:line?.price?.id;
 const verified=session?.id===intent.session_id&&session.livemode===false&&
  session.client_reference_id===intent.id&&session.metadata?.gu39_shadow_intent===intent.id&&
  session.currency==='usd'&&session.amount_subtotal===intent.quoted_cents&&
  priceId===intent.stripe_price_id&&line?.quantity===1;
 if(!verified)return fail('STRIPE_SESSION_BINDING_MISMATCH');
 steps[0].status='PASS';
 steps[0].detail='TEST session, account, original intent, exact Price, quantity and quoted subtotal verified.';
 const paid=session.status==='complete'&&session.payment_status==='paid';
 steps[1].status=paid?'PASS':'PENDING';
 steps[1].detail=paid?'Stripe confirms completed paid TEST session.':'Stripe has not confirmed a completed paid TEST session.';
 let events,access;
 try{
  events=await service(c,'gu39_sandbox_events?select=event_id,action,outcome,occurred_at'+
   '&intent_id=eq.'+encodeURIComponent(intent.id)+'&order=handled_at.desc&limit=100');
  access=await service(c,'gu39_sandbox_access?select=shadow_access,access_until'+
   '&intent_id=eq.'+encodeURIComponent(intent.id)+'&limit=1');
 }catch{return fail('SHADOW_EVIDENCE_READ_UNAVAILABLE')}
 if(!Array.isArray(events)||!Array.isArray(access))return fail('SHADOW_EVIDENCE_INVALID');
 const accepted=events.filter(e=>e.outcome==='shadow_applied');
 const paidEvent=accepted.find(e=>['paid','renewed'].includes(e.action)&&known(e.event_id,'evt'));
 let providerEventVerified=false;
 if(paidEvent){
  try{
   const verifiedEvent=await stripe(env,'events/'+encodeURIComponent(paidEvent.event_id));
   providerEventVerified=verifiedEvent?.id===paidEvent.event_id&&verifiedEvent?.livemode===false&&
    ['checkout.session.completed','checkout.session.async_payment_succeeded','invoice.paid','customer.subscription.updated'].includes(verifiedEvent.type);
  }catch{return fail('STRIPE_EVENT_READ_UNAVAILABLE')}
 }
 steps[2].status=paidEvent?(providerEventVerified?'PASS':'BLOCKED'):'PENDING';
 steps[2].detail=providerEventVerified?'Stripe TEST event ID independently corroborates the applied Supabase webhook record.':
  paidEvent?'Supabase event ID does not match the Stripe TEST event.':'No successful payment webhook has been applied to the isolated ledger.';
 const grant=access.length===1&&access[0].shadow_access===true&&
  (access[0].access_until==null||Date.parse(access[0].access_until)>Date.now());
 steps[3].status=paid&&providerEventVerified&&grant&&intent.status==='test_active'?'PASS':'PENDING';
 steps[3].detail=steps[3].status==='PASS'?'Isolated shadow access ACTIVE; production entitlements were not modified.':
  'Isolated access is not currently active. Check payment, webhook and ledger status.';
 const observed=(actions)=>accepted.some(e=>actions.includes(e.action))?'OBSERVED':'NOT_TESTED';
 result.lifeCycle={
  renewal:observed(['renewed']),failedPayment:observed(['failed']),
  cancellation:observed(['canceled','cancel_scheduled']),
  refund:observed(['refunded']),dispute:observed(['disputed'])
 };
 result.passed=steps.filter(x=>x.status==='PASS').length;
 result.total=steps.length;
 result.status=result.passed===steps.length?'PASS':'PENDING';
 return result;
}

async function completePaymentReview(request,env,c,a){
 if(a.role!=='OWNER')throw Error('OWNER_REQUIRED');
 const sku=new URL(request.url).searchParams.get('sku')||'plan:FULL_MONTHLY';
 if(!Object.hasOwn(prices,sku))throw Error('INVALID_SKU');
 // Each diagnostic is read-only; absence of provider permissions is surfaced
 // as a BLOCKED component rather than silently approved.
 const config=await inspectTestReadiness(request,env,c,a);
 const checkout=await inspectCheckoutSafety(
  new Request(new URL('?view=checkout-safety&sku='+encodeURIComponent(sku),request.url)),env,c,a);
 let pending={totalUnbound:null,results:[],truncated:false,safeToReconcile:false,
   testCheckoutBlocked:true,note:'Could not query Stripe and isolated TEST intent ledger'};
 try{pending=await inspectUnboundTestIntents(c,env,a)}
 catch{pending.error='PROVIDER_RECONCILIATION_UNAVAILABLE'}
 let catalog={allVerified:false,productsVerified:0,pricesVerified:0};
 try{
  const verified=await inspectCatalog(env);
  catalog={allVerified:verified.allVerified,productsVerified:verified.productsVerified,pricesVerified:verified.pricesVerified};
 }catch{catalog.error='CATALOG_VERIFICATION_UNAVAILABLE'}
 // Real TEST acceptance is independently reported, never counted as one of the
 // 17 configuration checks. A diagnostic does not create a payment or entitlement.
 const acceptance=await inspectSandboxAcceptance(env,c,a);
 const launchApproved=env.GU_PAYMENT_LIVE_LAUNCH_APPROVED==='true';
 // Production v58 has its own approval gates. The historical launch flag alone
 // never authorizes a paid customer checkout or the membership grant backend.
 const fulfillmentApproved=env.GU58_LIVE_FULFILLMENT_APPROVED==='true'&&
  env.GU58_LIVE_DB_CONTRACT_APPROVED==='true';
 const liveCandidateEnabled=env.GU58_LIVE_CHECKOUT_ENABLED==='true'&&fulfillmentApproved;
 const mode=checkout.checks.some(x=>x.name==='Owner TEST mode'&&x.status==='PASS')?'TESTING':'LIVE_SELECTED';
 const complete=checkout.safeToAttemptTest&&catalog.allVerified&&!pending.testCheckoutBlocked&&!pending.error;
 return {ok:true,version:'0.14.0.57',readOnly:true,testOnly:true,liveCheckout:false,
  selectedSku:sku,mode,config,checkout,catalog,pending,acceptance,
  production:{liveCheckoutApproved:launchApproved,
    liveCheckoutAvailable:mode!=='TESTING'&&launchApproved&&liveCandidateEnabled,
    liveMembershipConnector:'v0.14.0.58',liveMembershipFulfillmentApproved:fulfillmentApproved,
    liveCheckoutProviderSwitchEnabled:env.GU58_LIVE_CHECKOUT_ENABLED==='true',
    liveWebhookProviderSwitchEnabled:env.GU58_LIVE_WEBHOOK_ENABLED==='true',
    requiresReviewedDatabaseMigration:true,
    mustCompleteSeparateProviderAcceptance:true},
  checksPassed:config.passed+checkout.passed+(catalog.allVerified?1:0),
  totalChecks:config.total+checkout.total+1,
  readyForSingleSandboxCheckout:complete,
  nextAction:pending.totalUnbound>0?'RECONCILE_EXISTING_TEST_INTENT_FIRST':
    complete?'OWNER_MAY_AUTHORIZE_ONE_TEST_TRANSACTION':'RESOLVE_BLOCKED_AUDIT_ITEMS',
  writesPerformed:false,providerCheckoutCreated:false,
  note:'Combined, read-only review: does not charge a card, create subscriptions, grant entitlements, or independently activate LIVE checkout.'};
}
async function recordShadowReconciliationAudit(c,a,intentId,outcome){
 try{
  await service(c,'admin_audit_log','POST',{
   actor_user_id:a.userId,action:'commerce.stripe.shadow.reconcile.v014056',
   target_type:'gu39_sandbox_intent',target_id:intentId,
   details:{outcome,scope:'ISOLATED_STRIPE_TEST_ONLY',liveCheckout:false}
  });
  return true;
 }catch{return false}
}
async function reconcileSingleTestIntent(c,env,a,intentId){
 if(a.role!=='OWNER')throw Error('OWNER_REQUIRED');
 if(!/^[0-9a-f-]{36}$/i.test(String(intentId)))throw Error('INVALID_REQUEST');
 // Re-run provider account verification and full read-only reconciliation
 // immediately before the one-row, Owner-authorized isolated ledger update.
 const detail=await inspectUnboundTestIntents(c,env,a);
 if(detail.totalUnbound!==1||detail.truncated||detail.results.length!==1||
    detail.results[0].intentId!==intentId)throw Error('RECONCILIATION_MANUAL_REVIEW_REQUIRED');
 const row=detail.results[0];
 if(row.status==='NO_MATCH_FOUND'){
  const current=await service(c,'gu39_sandbox_intents?select=id,created_at&' +
    'id=eq.'+encodeURIComponent(intentId)+'&tester_user_id=eq.'+encodeURIComponent(a.userId)+
    '&status=eq.prepared&session_id=is.null&limit=1');
  if(!Array.isArray(current)||current.length!==1)throw Error('RECONCILIATION_STALE');
  if(Date.now()-Date.parse(current[0].created_at)<RECONCILE_AFTER_SECONDS*1000+5*60*1000)
   throw Error('RECONCILIATION_TOO_RECENT');
  const change=await service(c,'gu39_sandbox_intents?id=eq.'+encodeURIComponent(intentId)+
    '&tester_user_id=eq.'+encodeURIComponent(a.userId)+
    '&status=eq.prepared&session_id=is.null','PATCH',
    {status:'test_failed',updated_at:new Date().toISOString()});
  if(!Array.isArray(change)||change.length!==1)throw Error('RECONCILIATION_STALE');
  const auditRecorded=await recordShadowReconciliationAudit(c,a,intentId,'MARKED_UNBOUND_TEST_FAILED');
  return {ok:true,action:'MARKED_UNBOUND_TEST_FAILED',testOnly:true,
   noStripeSessionMatched:true,auditRecorded,liveCheckout:false};
 }
 if(row.status==='MATCHED_VERIFIED_SESSION'){
  const change=await service(c,'gu39_sandbox_intents?id=eq.'+encodeURIComponent(intentId)+
    '&tester_user_id=eq.'+encodeURIComponent(a.userId)+
    '&status=eq.prepared&session_id=is.null','PATCH',
    {session_id:row.providerSessionId,status:'checkout_created',updated_at:new Date().toISOString()});
  if(!Array.isArray(change)||change.length!==1)throw Error('RECONCILIATION_STALE');
  const auditRecorded=await recordShadowReconciliationAudit(c,a,intentId,'BOUND_VERIFIED_TEST_SESSION');
  return {ok:true,action:'BOUND_VERIFIED_TEST_SESSION',testOnly:true,
   auditRecorded,paymentAcceptanceStillPending:true,liveCheckout:false};
 }
 throw Error('RECONCILIATION_MANUAL_REVIEW_REQUIRED');
}

async function status(c,a,env){const r=await rpc(c,a,'gu39_sandbox_owner_read');return {...r,paymentMode:r.enabled===true?'TESTING':'LIVE',liveRouteGateOpen:r.enabled!==true&&env.GU_PAYMENT_LIVE_LAUNCH_APPROVED==='true',liveLaunchApproved:env.GU_PAYMENT_LIVE_LAUNCH_APPROVED==='true',cloudflareGate:sandboxEnabled(env),liveCheckout:false,priceIdsConfigured:(()=>{try{let m=JSON.parse(env.GU39_STRIPE_TEST_PRICE_MAP_JSON||'{}');return Object.keys(prices).filter(k=>known(m[k],'price')).length}catch{return 0}})(),recordType:'SHADOW_ONLY'};}
export async function onRequestGet({request,env}){try{const c=envCheck(env),a=await actor(request,c);
 const view=new URL(request.url).searchParams.get('view');
 if(view==='readiness')return json(await inspectTestReadiness(request,env,c,a));
 if(view==='checkout-safety')return json(await inspectCheckoutSafety(request,env,c,a));
 if(view==='complete-review')return json(await completePaymentReview(request,env,c,a));
 if(view==='acceptance'){if(a.role!=='OWNER')throw Error('OWNER_REQUIRED');return json({ok:true,version:'0.14.0.57',...await inspectSandboxAcceptance(env,c,a)});}
 if(view==='catalog')return json(await inspectCatalog(env));
 return json(await status(c,a,env));}
 catch(e){
 const errors={'SANDBOX_ACCOUNT_MISMATCH':[503,'SANDBOX_ACCOUNT_MISMATCH'],
  'SANDBOX_TEST_KEY_MISSING':[503,'SANDBOX_TEST_KEY_MISSING'],
  'PRICE_MAP_INVALID':[503,'PRICE_MAP_INVALID'],
  'STRIPE_CATALOG_API_UNAVAILABLE':[503,'STRIPE_CATALOG_API_UNAVAILABLE'],
  'SUPABASE_NOT_CONFIGURED':[503,'SUPABASE_NOT_CONFIGURED'],
  'SUPABASE_AUTH_UNAVAILABLE':[503,'SUPABASE_AUTH_UNAVAILABLE'],
  'STAFF_ROLE_RPC_MISSING':[503,'STAFF_ROLE_RPC_MISSING'],
  'STAFF_ROLE_RPC_UNAVAILABLE':[503,'STAFF_ROLE_RPC_UNAVAILABLE'],
  'STAFF_ROLE_AUTHORIZATION_FAILED':[403,'STAFF_ROLE_AUTHORIZATION_FAILED'],
  'SIGN_IN_REQUIRED':[401,'SIGN_IN_REQUIRED'],
  'INVALID_SESSION':[401,'INVALID_SESSION'],
  'STAFF_REQUIRED':[403,'STAFF_REQUIRED'],
  'OWNER_REQUIRED':[403,'OWNER_REQUIRED'],
  'INVALID_SKU':[400,'INVALID_SKU']};
 const [status,code]=errors[e.message]||[503,'SANDBOX_VERIFICATION_UNAVAILABLE'];
 return json({ok:false,error:code,liveCheckout:false},status);
 }}
// Safe exception boundaries: preserve only curated server status codes and
// execution phases. Never return raw Stripe or Postgres errors to browsers.
async function safeStage(code,operation){
 try{return await operation()}
 catch(error){
  if(error?.message&&[
   'SANDBOX_ACCOUNT_MISMATCH','PRICE_VALIDATION_FAILED','INCOMPLETE_PRICE_MAP',
   'TEST_RATE_LIMIT','SHADOW_TEST_CHECKLIST_BLOCKED'].includes(error.message))throw error;
  throw Error(code);
 }
}
async function managedCheckout(env,form,intentId){
 const headers={
  authorization:'Bearer '+env.GU39_STRIPE_TEST_SECRET_KEY,
  'content-type':'application/x-www-form-urlencoded',
  'Stripe-Version':MANAGED_PAYMENTS_CHECKOUT_API_VERSION,
  'Idempotency-Key':'gu39-sandbox-'+intentId
 };
 let response,payload;
 try{
  response=await fetch('https://api.stripe.com/v1/checkout/sessions',{
   method:'POST',headers,body:form,cache:'no-store'
  });
  payload=await response.json().catch(()=>null);
 }catch{throw Error('STRIPE_CHECKOUT_NETWORK_UNAVAILABLE')}
 if(!response.ok||!payload||payload.error){
  const code=String(payload?.error?.code||''),param=String(payload?.error?.param||'');
  if(response.status===401||response.status===403)throw Error('STRIPE_CHECKOUT_API_AUTH_REJECTED');
  if(response.status===429||response.status>=500)throw Error('STRIPE_CHECKOUT_PROVIDER_RETRY');
  if(param==='managed_payments'||param.startsWith('managed_payments[')||
     (code==='parameter_unknown'&&MANAGED_PAYMENTS_CHECKOUT_API_VERSION.includes('preview')))
   throw Error('STRIPE_MANAGED_PAYMENTS_NOT_AVAILABLE');
  if(code==='resource_missing'&&param.includes('price'))throw Error('STRIPE_TEST_PRICE_NOT_FOUND');
  throw Error('STRIPE_CHECKOUT_PROVIDER_REJECTED');
 }
 return payload;
}

export async function onRequestPost({request,env}){
 try{
  const origin=request.headers.get('origin');const location=new URL(request.url);if(origin!==location.origin)throw Error('SAME_ORIGIN_REQUIRED');
  if(Number(request.headers.get('content-length')||0)>2048)throw Error('INVALID_REQUEST');
  const data=await request.json().catch(()=>null);if(!data||typeof data!=='object'||Array.isArray(data))throw Error('INVALID_REQUEST');
  const c=envCheck(env),a=await actor(request,c);await ownerStepup(c,a);
  if(data.action==='reconcile'){
   if(!sandboxEnabled(env))throw Error('SANDBOX_SECRETS_NOT_CONFIGURED');
   return json(await reconcileSingleTestIntent(c,env,a,data.intentId));
  }
  if(data.action==='toggle'){
   if(typeof data.enabled!=='boolean'||!data.updatedAt)throw Error('INVALID_REQUEST');
   if(data.enabled===true&&!sandboxEnabled(env))throw Error('SANDBOX_SECRETS_NOT_CONFIGURED');
   const out=await guardedToggleRpc(c,a,data.enabled,data.updatedAt);
   return json({...out,paymentMode:out.enabled===true?'TESTING':'LIVE',liveRouteGateOpen:out.enabled!==true&&env.GU_PAYMENT_LIVE_LAUNCH_APPROVED==='true',liveLaunchApproved:env.GU_PAYMENT_LIVE_LAUNCH_APPROVED==='true',liveCheckout:false});
  }
  if(data.action!=='checkout'||!Object.hasOwn(prices,data.sku))throw Error('INVALID_SKU');
  if(!sandboxEnabled(env))throw Error('SANDBOX_DISABLED');
  // Perform the same complete read-only safety audit BEFORE any Stripe or
  // shadow DB write. Prevent a partial intent/session on a known missing guard.
  const auditUrl=new URL(request.url);auditUrl.searchParams.set('sku',data.sku);
  const audit=await inspectCheckoutSafety(new Request(auditUrl.href),env,c,a);
  if(!audit.safeToAttemptTest)throw Error('SHADOW_TEST_CHECKLIST_BLOCKED');
  await safeStage('STRIPE_ACCOUNT_LOOKUP_FAILED',()=>checkStripeAccount(env));
  const live=await safeStage('SHADOW_STATUS_READ_FAILED',()=>status(c,a,env));
  if(live.enabled!==true)throw Error('OWNER_HAS_DISABLED_SANDBOX');
  const [product,amount,interval]=prices[data.sku];const mapping=priceMap(env);
  const priceId=mapping?.[data.sku];if(Object.keys(prices).some(k=>!known(mapping[k],'price'))||new Set(Object.keys(prices).map(k=>mapping[k])).size!==8)throw Error('INCOMPLETE_PRICE_MAP');
  if(!known(priceId,'price'))throw Error('MISSING_TEST_PRICE_ID');
  const price=await safeStage('STRIPE_PRICE_LOOKUP_FAILED',()=>stripe(env,'prices/'+encodeURIComponent(priceId)));
  if(!matchesPrice(price,product,amount,interval))throw Error('PRICE_VALIDATION_FAILED');
  // Limit accidental repeated test checkouts. Untrusted customer sessions NEVER reach this Owner-only endpoint.
  const recent=await service(c,`gu39_sandbox_intents?select=id&tester_user_id=eq.${a.userId}&created_at=gt.${encodeURIComponent(new Date(Date.now()-3600000).toISOString())}&limit=12`);
  if(recent.length>=12)throw Error('TEST_RATE_LIMIT');
  const id=crypto.randomUUID();await safeStage('SHADOW_INTENT_CREATE_FAILED',()=>service(c,'gu39_sandbox_intents','POST',{id,tester_user_id:a.userId,sku:data.sku,stripe_product_id:product,stripe_price_id:priceId,quoted_cents:amount,status:'prepared'}));
  const v=new URLSearchParams();v.set('mode',interval==='one_time'?'payment':'subscription');v.set('line_items[0][price]',priceId);v.set('line_items[0][quantity]','1');v.set('client_reference_id',id);v.set('metadata[gu39_shadow_intent]',id);
  v.set('success_url',location.origin+'/admin.html#payments-billing');v.set('cancel_url',location.origin+'/admin.html#payments-billing');
  if(interval!=='one_time')v.set('subscription_data[metadata][gu39_shadow_intent]',id);
  // Stripe Managed Payments eligibility for the selected product must be confirmed in the account.
  v.set('managed_payments[enabled]','true');
  let session;
  try{session=await managedCheckout(env,v.toString(),id)}
  catch(e){
   // Stripe explicitly rejected session CREATE; a hosted session was not
   // produced. Record failure in the isolated shadow intent (no real grants).
   // A timeout/rate-limit/5xx has an unknown outcome, so preserve PREPARED
   // for reconciliation instead of treating it as a definite rejection.
   if(['STRIPE_CHECKOUT_API_AUTH_REJECTED','STRIPE_MANAGED_PAYMENTS_NOT_AVAILABLE',
      'STRIPE_TEST_PRICE_NOT_FOUND','STRIPE_CHECKOUT_PROVIDER_REJECTED'].includes(e.message)){
    try{await safeStage('SHADOW_INTENT_CLEANUP_FAILED',()=>service(c,'gu39_sandbox_intents?id=eq.'+encodeURIComponent(id),'PATCH',{status:'test_failed'},'return=minimal'))}
    catch{throw Error('SHADOW_INTENT_CLEANUP_FAILED')}
   }
   throw e;
  }
  if(!known(session.id,'cs_test')||session.livemode!==false||!session.url)throw Error('INVALID_TEST_SESSION');
  const u=new URL(session.url);if(u.protocol!=='https:'||u.hostname!=='checkout.stripe.com')throw Error('INVALID_TEST_CHECKOUT_HOST');
  await safeStage('SHADOW_CHECKOUT_BIND_FAILED',()=>service(c,'gu39_sandbox_intents?id=eq.'+encodeURIComponent(id),'PATCH',{session_id:session.id,status:'checkout_created'},'return=minimal'));
  return json({ok:true,testOnly:true,url:u.href,liveCheckout:false});
 }catch(e){const common=['SIGN_IN_REQUIRED','INVALID_SESSION','STAFF_REQUIRED','OWNER_REQUIRED','PASSWORD_RECONFIRM_REQUIRED','SAME_ORIGIN_REQUIRED','SANDBOX_DISABLED','SANDBOX_SECRETS_NOT_CONFIGURED','OWNER_HAS_DISABLED_SANDBOX','SETTINGS_STALE_REFRESH','INVALID_SETTINGS','STAFF_STEPUP_CHECK_UNAVAILABLE','SHADOW_TOGGLE_AUTH_REJECTED','SHADOW_TOGGLE_RPC_UNAVAILABLE','SHADOW_TOGGLE_DATABASE_REJECTED','RECONCILIATION_MANUAL_REVIEW_REQUIRED','RECONCILIATION_TOO_RECENT','RECONCILIATION_STALE','SHADOW_TEST_CHECKLIST_BLOCKED','STRIPE_ACCOUNT_LOOKUP_FAILED','SHADOW_STATUS_READ_FAILED','STRIPE_PRICE_LOOKUP_FAILED','SHADOW_INTENT_READ_FAILED','SHADOW_INTENT_CREATE_FAILED','SHADOW_INTENT_CLEANUP_FAILED','STRIPE_CHECKOUT_NETWORK_UNAVAILABLE','STRIPE_CHECKOUT_API_AUTH_REJECTED','STRIPE_CHECKOUT_PROVIDER_RETRY','STRIPE_MANAGED_PAYMENTS_NOT_AVAILABLE','STRIPE_TEST_PRICE_NOT_FOUND','STRIPE_CHECKOUT_PROVIDER_REJECTED','SHADOW_CHECKOUT_BIND_FAILED','MISSING_TEST_PRICE_ID','INCOMPLETE_PRICE_MAP','PRICE_VALIDATION_FAILED','SANDBOX_ACCOUNT_MISMATCH','TEST_RATE_LIMIT'];
   const code=common.includes(e.message)?e.message:'SHADOW_TEST_ACTION_UNAVAILABLE';
   const status=code==='INVALID_SESSION'?401:code==='SETTINGS_STALE_REFRESH'?409:
     ['STAFF_STEPUP_CHECK_UNAVAILABLE','SHADOW_TOGGLE_RPC_UNAVAILABLE','SHADOW_TOGGLE_DATABASE_REJECTED','SHADOW_TEST_ACTION_UNAVAILABLE', 'STRIPE_ACCOUNT_LOOKUP_FAILED','SHADOW_STATUS_READ_FAILED','STRIPE_PRICE_LOOKUP_FAILED','SHADOW_INTENT_READ_FAILED','SHADOW_INTENT_CREATE_FAILED','SHADOW_INTENT_CLEANUP_FAILED','STRIPE_CHECKOUT_NETWORK_UNAVAILABLE','STRIPE_CHECKOUT_API_AUTH_REJECTED','STRIPE_CHECKOUT_PROVIDER_RETRY','STRIPE_MANAGED_PAYMENTS_NOT_AVAILABLE','STRIPE_TEST_PRICE_NOT_FOUND','STRIPE_CHECKOUT_PROVIDER_REJECTED','SHADOW_CHECKOUT_BIND_FAILED'].includes(code)?503:403;
   return json({ok:false,error:code,liveCheckout:false},status)}
}
