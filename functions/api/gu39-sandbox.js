/* Cyber Nexus v0.14.0.45 | Owner-only Stripe TEST checkout and read-only catalog audit.
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
 String(e.GU39_STRIPE_TEST_WEBHOOK_SECRET||'').startsWith('whsec_');}
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
async function ownerStepup(c,a){if(a.role!=='OWNER')throw Error('OWNER_REQUIRED');const step=await getJson(c.base+'/rest/v1/rpc/gu_staff_stepup_active_v01432r1',{method:'POST',headers:a.head,body:'{}'});if(step!==true)throw Error('PASSWORD_RECONFIRM_REQUIRED');}
async function rpc(c,a,name,params){return getJson(c.base+'/rest/v1/rpc/'+name,{method:'POST',headers:a.head,body:JSON.stringify(params||{})});}
function serviceHeaders(secret){
 if(String(secret).startsWith('sb_secret_'))return {apikey:secret};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(secret)))return {apikey:secret,authorization:'Bearer '+secret};
 throw Error('SUPABASE_SECRET_FORMAT_UNSUPPORTED');
}
async function service(c,path,method='GET',data,prefer='return=representation'){const r=await fetch(c.base+'/rest/v1/'+path,{method,headers:{...serviceHeaders(c.secret),'content-type':'application/json',prefer},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store'});if(!r.ok)throw Error('SHADOW_DB_UNAVAILABLE');if(r.status===204)return [];const j=await r.json().catch(()=>null);if(j===null)throw Error('SHADOW_DB_UNAVAILABLE');return j;}
async function stripe(e,path,method='GET',data,idempotency){const h={authorization:'Bearer '+e.GU39_STRIPE_TEST_SECRET_KEY};if(method==='POST')h['content-type']='application/x-www-form-urlencoded';if(idempotency)h['Idempotency-Key']=idempotency;
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
 return !!p&&p.livemode===false&&p.active===true&&p.product===product&&p.currency==='usd'&&p.unit_amount===cents&&
  (interval==='one_time'?p.type==='one_time':p.type==='recurring'&&p.recurring?.interval===interval);
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
 return {ok:true,version:'0.14.0.45',accountVerified:true,accountId:account,readOnly:true,productsExpected:8,
  productsVerified:verifiedProducts,pricesVerified:verifiedPrices,priceIdsConfigured:mappedIds.length,
  allVerified:verifiedProducts===8&&verifiedPrices===8&&!duplicates,
  taxClassificationReviewRequired:tax.length===2&&tax[0]!==tax[1],
  rows,liveCheckout:false,notice:'Read-only Stripe TEST catalog verification; no payments or real member entitlements changed.'};
}

async function status(c,a,env){const r=await rpc(c,a,'gu39_sandbox_owner_read');return {...r,cloudflareGate:sandboxEnabled(env),liveCheckout:false,priceIdsConfigured:(()=>{try{let m=JSON.parse(env.GU39_STRIPE_TEST_PRICE_MAP_JSON||'{}');return Object.keys(prices).filter(k=>known(m[k],'price')).length}catch{return 0}})(),recordType:'SHADOW_ONLY'};}
export async function onRequestGet({request,env}){try{const c=envCheck(env),a=await actor(request,c);
 if(new URL(request.url).searchParams.get('view')==='catalog')return json(await inspectCatalog(env));
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
  'STAFF_REQUIRED':[403,'STAFF_REQUIRED']};
 const [status,code]=errors[e.message]||[503,'SANDBOX_VERIFICATION_UNAVAILABLE'];
 return json({ok:false,error:code,liveCheckout:false},status);
 }}
export async function onRequestPost({request,env}){
 try{
  const origin=request.headers.get('origin');const location=new URL(request.url);if(origin!==location.origin)throw Error('SAME_ORIGIN_REQUIRED');
  if(Number(request.headers.get('content-length')||0)>2048)throw Error('INVALID_REQUEST');
  const data=await request.json().catch(()=>null);if(!data||typeof data!=='object'||Array.isArray(data))throw Error('INVALID_REQUEST');
  const c=envCheck(env),a=await actor(request,c);await ownerStepup(c,a);
  if(data.action==='toggle'){
   if(typeof data.enabled!=='boolean'||!data.updatedAt)throw Error('INVALID_REQUEST');
   if(data.enabled===true&&!sandboxEnabled(env))throw Error('SANDBOX_SECRETS_NOT_CONFIGURED');
   const out=await rpc(c,a,'gu39_sandbox_owner_toggle',{p_enabled:data.enabled,p_expected_updated_at:data.updatedAt});
   return json({...out,liveCheckout:false});
  }
  if(data.action!=='checkout'||!Object.hasOwn(prices,data.sku))throw Error('INVALID_SKU');
  if(!sandboxEnabled(env))throw Error('SANDBOX_DISABLED');
  await checkStripeAccount(env);
  const live=await status(c,a,env);if(live.enabled!==true)throw Error('OWNER_HAS_DISABLED_SANDBOX');
  const [product,amount,interval]=prices[data.sku];const mapping=priceMap(env);
  const priceId=mapping?.[data.sku];if(Object.keys(prices).some(k=>!known(mapping[k],'price'))||new Set(Object.keys(prices).map(k=>mapping[k])).size!==8)throw Error('INCOMPLETE_PRICE_MAP');
  if(!known(priceId,'price'))throw Error('MISSING_TEST_PRICE_ID');
  const price=await stripe(env,'prices/'+encodeURIComponent(priceId));
  if(!matchesPrice(price,product,amount,interval))throw Error('PRICE_VALIDATION_FAILED');
  // Limit accidental repeated test checkouts. Untrusted customer sessions NEVER reach this Owner-only endpoint.
  const recent=await service(c,`gu39_sandbox_intents?select=id&tester_user_id=eq.${a.userId}&created_at=gt.${encodeURIComponent(new Date(Date.now()-3600000).toISOString())}&limit=12`);
  if(recent.length>=12)throw Error('TEST_RATE_LIMIT');
  const id=crypto.randomUUID();await service(c,'gu39_sandbox_intents','POST',{id,tester_user_id:a.userId,sku:data.sku,stripe_product_id:product,stripe_price_id:priceId,quoted_cents:amount,status:'prepared'});
  const v=new URLSearchParams();v.set('mode',interval==='one_time'?'payment':'subscription');v.set('line_items[0][price]',priceId);v.set('line_items[0][quantity]','1');v.set('client_reference_id',id);v.set('metadata[gu39_shadow_intent]',id);
  v.set('success_url',location.origin+'/admin.html#payments-billing');v.set('cancel_url',location.origin+'/admin.html#payments-billing');
  if(interval!=='one_time')v.set('subscription_data[metadata][gu39_shadow_intent]',id);
  // Stripe Managed Payments eligibility for the selected product must be confirmed in the account.
  v.set('managed_payments[enabled]','true');
  const session=await stripe(env,'checkout/sessions','POST',v.toString(),'gu39-sandbox-'+id);
  if(!known(session.id,'cs_test')||session.livemode!==false||!session.url)throw Error('INVALID_TEST_SESSION');
  const u=new URL(session.url);if(u.protocol!=='https:'||u.hostname!=='checkout.stripe.com')throw Error('INVALID_TEST_CHECKOUT_HOST');
  await service(c,'gu39_sandbox_intents?id=eq.'+encodeURIComponent(id),'PATCH',{session_id:session.id,status:'checkout_created'},'return=minimal');
  return json({ok:true,testOnly:true,url:u.href,liveCheckout:false});
 }catch(e){const common=['SIGN_IN_REQUIRED','INVALID_SESSION','STAFF_REQUIRED','OWNER_REQUIRED','PASSWORD_RECONFIRM_REQUIRED','SAME_ORIGIN_REQUIRED','SANDBOX_DISABLED','SANDBOX_SECRETS_NOT_CONFIGURED','OWNER_HAS_DISABLED_SANDBOX','MISSING_TEST_PRICE_ID','INCOMPLETE_PRICE_MAP','PRICE_VALIDATION_FAILED','SANDBOX_ACCOUNT_MISMATCH','TEST_RATE_LIMIT'];
   return json({ok:false,error:common.includes(e.message)?e.message:'Testing is unavailable; review the Admin sandbox configuration.'},403)}
}
