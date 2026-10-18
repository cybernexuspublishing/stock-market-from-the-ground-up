/* v0.14.0.61 | STAGING TEST member subscription/lifetime checkout candidate.
 * DEPLOYMENT-LOCKED: no checkout until independent Owner approval, verified TEST
 * Stripe catalog/account, staging DB contract, TEST slider ON and merchant acceptance.
 * Never touches book/KDP purchase rights. Do not enable before legal & provider review.
 */
const STAGING_PRODUCTION_REF='oxihglyfgzywsupnyicb';
function stagingBoundary(e,req){
 try{
  const host=new URL(req.url).hostname.toLowerCase();
  const expected=String(e.GU61_STAGING_HOSTNAME||'').trim().toLowerCase();
  const ref=String(e.GU61_STAGING_PROJECT_REF||'').trim();
  const base=String(e.SUPABASE_URL||'').trim().replace(/\/$/,'');
  return e.GU61_STAGING_ENABLED==='true' && e.GU61_STAGING_APPROVED==='true' &&
    /^[a-z0-9]{20}$/.test(ref) && ref!==STAGING_PRODUCTION_REF &&
    base==='https://'+ref+'.supabase.co' && host===expected &&
    /^[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev$/.test(host);
 }catch{return false}
}
const respond=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const err=(message,status=403)=>Object.assign(new Error(message),{status});
const val=x=>String(x??'').trim();
const products=Object.freeze(new Set([
 'plan:FULL_MONTHLY','plan:FULL_ANNUAL','plan:LIFETIME','plan:ONDEMAND_MONTHLY',
 'tool:INTERACTIVE_LEARNING','tool:JOURNAL_ANALYTICS','tool:MARKET_SIMULATOR','tool:MARKET_TUTOR'
]));
const SRC_VERSION='2026-02-25.preview'; // Version pinned for Managed Payments; verify account eligibility before launch.
function environment(env,req){
 if(!stagingBoundary(env,req))throw err('Dedicated preview and staging project required.',503);
 const base=val(env.SUPABASE_URL).replace(/\/$/,'');
 const secret=val(env.SUPABASE_SECRET_KEY),pub=val(env.SUPABASE_PUBLISHABLE_KEY);
 const stripe=val(env.GU61_STRIPE_TEST_SECRET_KEY),acct=val(env.GU61_STRIPE_TEST_ACCOUNT_ID);
 if(env.GU61_STAGING_APPROVED!=='true'||
    env.GU61_STAGING_CHECKOUT_ENABLED!=='true'||env.GU61_STAGING_FULFILLMENT_APPROVED!=='true'||
    env.GU61_STAGING_DB_CONTRACT_APPROVED!=='true'||
    !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||
    !secret||!pub||!/^sk_test_[A-Za-z0-9_]+$/.test(stripe)||
    !/^acct_[A-Za-z0-9_]{6,}$/.test(acct)||
    !/^whsec_[A-Za-z0-9_]+$/.test(val(env.GU61_STRIPE_TEST_WEBHOOK_SECRET)))
  throw err('Staging TEST checkout requires a separately approved staging configuration.',503);
 return {base,secret,pub,stripe,account:acct};
}
function stagingCatalog(env){
 let obj;
 try{obj=JSON.parse(val(env.GU61_STRIPE_TEST_CATALOG_JSON)||'{}')}catch{throw err('Staging TEST catalog mapping invalid.',503)}
 const keys=Array.from(products);
 if(!obj||Array.isArray(obj)||Object.keys(obj).length!==keys.length||
    !keys.every(k=>/^price_[A-Za-z0-9_]{6,}$/.test(obj[k]?.price_id||'')&&
      /^prod_[A-Za-z0-9_]{6,}$/.test(obj[k]?.product_id||''))||
    new Set(keys.map(k=>obj[k].price_id)).size!==keys.length||
    new Set(keys.map(k=>obj[k].product_id)).size!==keys.length)
   throw err('All eight distinct Stripe TEST products and prices must be configured.',503);
 return obj;
}
async function request(url,options){const r=await fetch(url,{...options,cache:'no-store'});
 // PostgREST "Prefer: return=minimal" PATCH legitimately returns HTTP 204.
 // A verified 204 is success, not an unknown result or reason to retry a charge.
 if(r.ok&&r.status===204)return {};
 const d=await r.json().catch(()=>null);
 if(!r.ok||!d)throw err('Stripe TEST STAGING payment service unavailable.',503);return d;}
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
async function assertTestAccount(c){
 const a=await request('https://api.stripe.com/v1/account',{headers:{authorization:'Bearer '+c.stripe}});
 if(a.id!==c.account)throw err('Unexpected TEST staging Stripe account.',503);
}
async function testModeOn(c){
 const rows=await db(c,'gu39_sandbox_settings?select=enabled&id=eq.true&limit=1');
 if(!Array.isArray(rows)||rows.length!==1||rows[0].enabled!==true)
  throw err('Staging Owner TESTING mode must be enabled before a TEST purchase.',503);
}
async function product(c,kind,code){const key=kind+':'+code;if(!products.has(key))throw err('Product not included in this test.',403);
 const isPlan=kind==='plan', path=isPlan?`platform_plans?select=*&plan_code=eq.${code}&limit=1`:`platform_tools?select=*&tool_code=eq.${code}&limit=1`;
 const r=(await db(c,path))[0];
// platform_plans has checkout_enabled; platform_tools has NO such column.
// For individual tools the approved existing gates are active/public_visible,
// status='live' and the sitewide commerce checkout flag checked below.
if(!r||r.active!==true||r.public_visible!==true||
   (isPlan&&r.checkout_enabled!==true)||
   (!isPlan&&r.status!=='live'))throw err('This product is not enabled for checkout.',403);
 const amount=Number(isPlan?r.price_cents:r.individual_price_cents),bill=isPlan?r.billing_interval:'month';
 if(!Number.isSafeInteger(amount)||amount<1||!['month','year','lifetime'].includes(bill))throw err('Invalid catalog price.',503);
 return {key,amount,bill};
}
async function verifyPrice(c,price,p,expectedProduct){const q=await request('https://api.stripe.com/v1/prices/'+encodeURIComponent(price),{headers:{authorization:'Bearer '+c.stripe}});
 if(q.id!==price||q.livemode!==false||q.active!==true||q.product!==expectedProduct||q.currency!=='usd'||q.unit_amount!==p.amount||
  (p.bill==='lifetime'?q.type!=='one_time':q.type!=='recurring'||q.recurring?.interval!==p.bill))throw err('Stripe Price ID does not match the approved product and amount.',503);
}
export async function onRequestPost({request:req,env}){
 try{if(Number(req.headers.get('content-length')||0)>2048)throw err('Request too large.',413);
  const origin=req.headers.get('origin'),here=new URL(req.url);if(origin!==here.origin)throw err('Cross-site checkout denied.',403);
  const c=environment(env,req);await testModeOn(c);await assertTestAccount(c);
  const catalog=stagingCatalog(env),u=await validateUser(c,req),input=await req.json().catch(()=>({}));
  const type=val(input.type),code=val(input.code);
  if(!['plan','tool'].includes(type)||!/^[A-Z0-9_]{3,90}$/.test(code))throw err('Unsupported product.',400);
  const p=await product(c,type,code),mapped=catalog[p.key],price=mapped.price_id;await verifyPrice(c,price,p,mapped.product_id);
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
  const id=crypto.randomUUID();await db(c,'gu61_staging_checkout_intents','POST',{
 id,user_id:u.id,sku_kind:type,sku_code:code,price_id:price,
 quoted_amount_cents:p.amount,status:'prepared'
 });
  const params=new URLSearchParams();params.set('managed_payments[enabled]','true');params.set('mode',p.bill==='lifetime'?'payment':'subscription');params.set('line_items[0][price]',price);params.set('line_items[0][quantity]','1');
  params.set('client_reference_id',id);params.set('metadata[gu61_intent]',id);params.set('metadata[gu61_member]',u.id);
  params.set('success_url',here.origin+'/checkout-status.html?session_id={CHECKOUT_SESSION_ID}');params.set('cancel_url',here.origin+'/checkout.html?cancelled=1');
  if(p.bill!=='lifetime')params.set('subscription_data[metadata][gu61_intent]',id);
  const session=await request('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{
 authorization:'Bearer '+c.stripe,'content-type':'application/x-www-form-urlencoded',
 'Stripe-Version':SRC_VERSION,'Idempotency-Key':'gu61-staging-'+id
 },body:params.toString()});
  if(!/^cs_test_[A-Za-z0-9_]+$/.test(session.id||'')||session.livemode!==false)throw err('Unexpected Stripe TEST STAGING session.',503);
  const target=new URL(session.url);if(target.protocol!=='https:'||target.hostname!=='checkout.stripe.com')throw err('Invalid Stripe destination.',503);
  await db(c,`gu61_staging_checkout_intents?id=eq.${id}`,'PATCH',{stripe_session_id:session.id,status:'checkout_created'},'return=minimal');
  return respond({ok:true,sandboxOnly:true,live:false,url:session.url,notice:'Stripe TEST Checkout. Staging member access activates only after verified TEST payment.'});
 }catch(e){return respond({ok:false,error:[400,403,409].includes(e.status)?e.message:'Staging TEST checkout unavailable.'},e.status||503)}
}
// Public readiness: returns only a boolean; never leaks private credentials, prices or account details.
export function onRequestGet({env,request}){
 try{environment(env,request);stagingCatalog(env);return respond({ok:true,stagingConfigured:true,livePayments:false,requiresIndependentLaunchReview:true})}
 catch{return respond({ok:true,stagingConfigured:false,livePayments:false})}
}
