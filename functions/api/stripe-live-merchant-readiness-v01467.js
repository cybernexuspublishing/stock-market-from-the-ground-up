/* Cyber Nexus v0.14.0.67 — Owner-only LIVE merchant and eight-SKU READ-ONLY review.
 * Never creates sessions, customers, prices, events, migrations, subscriptions or grants.
 * Runs in the existing Cloudflare Pages + Supabase project even while TEST mode is ON.
 * No approval flag is modified or inferred from a successful diagnostic.
 */
const codes=Object.freeze([
 ['plan','FULL_MONTHLY'],['plan','FULL_ANNUAL'],['plan','LIFETIME'],
 ['plan','ONDEMAND_MONTHLY'],['tool','INTERACTIVE_LEARNING'],
 ['tool','JOURNAL_ANALYTICS'],['tool','MARKET_SIMULATOR'],['tool','MARKET_TUTOR']
]);
const requiredEvents=Object.freeze([
 'checkout.session.completed','checkout.session.async_payment_succeeded',
 'invoice.paid','invoice.payment_failed',
 'customer.subscription.updated','customer.subscription.deleted',
 'charge.refunded','charge.dispute.created'
]);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'
}});
const clean=x=>String(x??'').trim();
const error=(code,status)=>Object.assign(new Error(code),{code,status});
const isAccount=x=>/^acct_[A-Za-z0-9_]{6,}$/.test(x);
const isPrice=x=>/^price_[A-Za-z0-9_]{6,}$/.test(x);
const isProduct=x=>/^prod_[A-Za-z0-9_]{6,}$/.test(x);
const isLiveSecret=x=>/^sk_live_[A-Za-z0-9_]+$/.test(x);
const reportRow=(group,check,status,detail)=>({group,check,status,detail});
async function remote(url,options={},code='REMOTE_UNAVAILABLE'){
 let res,payload;
 try{res=await fetch(url,{...options,cache:'no-store'});payload=await res.json().catch(()=>null)}
 catch{throw error(code,503)}
 if(!res.ok||payload===null||payload?.error)throw error(code,503);
 return payload;
}
async function owner(request,env){
 const base=clean(env.SUPABASE_URL).replace(/\/$/,'');
 const pub=clean(env.SUPABASE_PUBLISHABLE_KEY);
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!pub)throw error('AUTH_SERVICE_UNAVAILABLE',503);
 const token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!token)throw error('SIGN_IN_REQUIRED',401);
 const h={apikey:pub,authorization:'Bearer '+token};
 const user=await remote(base+'/auth/v1/user',{headers:h},'AUTH_SERVICE_UNAVAILABLE');
 if(!/^[0-9a-f-]{36}$/i.test(user?.id||''))throw error('INVALID_SESSION',401);
 const role=await remote(base+'/rest/v1/rpc/gu_staff_role_v01432r1',
  {method:'POST',headers:{...h,'content-type':'application/json'},body:'{}'},'OWNER_ROLE_UNAVAILABLE');
 if(role?.ok!==true||role.role!=='OWNER')throw error('OWNER_ONLY',403);
 const step=await remote(base+'/rest/v1/rpc/gu_staff_stepup_active_v01432r1',
  {method:'POST',headers:{...h,'content-type':'application/json'},body:'{}'},'OWNER_STEPUP_UNAVAILABLE');
 if(step!==true)throw error('PASSWORD_RECONFIRM_REQUIRED',403);
 return base;
}
function serviceHeaders(secret){
 if(secret.startsWith('sb_secret_'))return {apikey:secret};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
  return {apikey:secret,authorization:'Bearer '+secret};
 throw error('DB_SERVICE_UNAVAILABLE',503);
}
async function table(base,env,path){
 return remote(base+'/rest/v1/'+path,{headers:{...serviceHeaders(clean(env.SUPABASE_SECRET_KEY)),accept:'application/json'}},'DATABASE_CATALOG_UNAVAILABLE');
}
function catalogMap(raw){
 let map=null;
 try{map=JSON.parse(clean(raw)||'{}')}catch{}
 if(!map||Array.isArray(map)||typeof map!=='object')return null;
 const ks=codes.map(c=>c.join(':'));
 if(Object.keys(map).length!==8||!ks.every(k=>isPrice(map[k]?.price_id)&&isProduct(map[k]?.product_id))||
  new Set(ks.map(k=>map[k].price_id)).size!==8||
  new Set(ks.map(k=>map[k].product_id)).size!==8)return null;
 return map;
}
function expectedBase(env){
 const s=clean(env.PUBLIC_SITE_URL)||'https://stock-market-from-the-ground-up.pages.dev';
 try{const u=new URL(s);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&
    (u.pathname==='/'||u.pathname===''))return u.origin}
 catch{}
 return null;
}
function stripeGet(key,path){
 return remote('https://api.stripe.com/v1/'+path,{headers:{authorization:'Bearer '+key,accept:'application/json'}},'STRIPE_READ_UNAVAILABLE');
}
const safeStatus=(value)=>value===true?'PASS':value===false?'ACTION_REQUIRED':'UNVERIFIED';
function priceApproved(p,product,priceId,amount,interval){
 return p?.id===priceId&&p.livemode===true&&p.active===true&&p.product===product&&
  p.currency==='usd'&&p.unit_amount===amount&&p.billing_scheme==='per_unit'&&
  p.transform_quantity===null&&(interval==='lifetime'?p.type==='one_time':
  p.type==='recurring'&&p.recurring?.interval===interval&&
  p.recurring?.interval_count===1&&p.recurring?.usage_type==='licensed');
}
export async function onRequestGet({request,env}){
 try{
  // Always authenticate and confirm fresh Owner step-up BEFORE inspecting any
  // Stripe credential, account, price, webhook, or privileged database row.
  const base=await owner(request,env);
  const rows=[],add=(group,check,status,detail)=>rows.push(reportRow(group,check,status,detail));
  const key=clean(env.GU58_STRIPE_LIVE_SECRET_KEY),accountId=clean(env.GU58_STRIPE_LIVE_ACCOUNT_ID);
  const secretOk=isLiveSecret(key),idOk=isAccount(accountId),mapping=catalogMap(env.GU58_STRIPE_LIVE_CATALOG_JSON);
  const hookSecret=/^whsec_[A-Za-z0-9_]+$/.test(clean(env.GU58_STRIPE_LIVE_WEBHOOK_SECRET));
  const origin=expectedBase(env),canRead=secretOk&&idOk;
  add('CONFIG','LIVE Stripe API credential',secretOk?'PRESENT_NOT_DISCLOSED':'ACTION_REQUIRED',
    secretOk?'Key format recognized; authenticated LIVE account verification follows.':'Set the LIVE secret in Cloudflare encrypted Variables/Secrets only.');
  add('CONFIG','Expected LIVE account ID',idOk?'PRESENT_NOT_DISCLOSED':'ACTION_REQUIRED',
    idOk?'Account ID format recognized; Stripe identity must match.':'Set the matching LIVE account ID in Cloudflare only.');
  add('CONFIG','Eight distinct LIVE product/price mappings',mapping?'STRUCTURALLY_VALID':'ACTION_REQUIRED',
    mapping?'All eight distinct mapping keys have Product and Price IDs; Stripe verification follows.':'Add all eight LIVE product/price pairs in GU58_STRIPE_LIVE_CATALOG_JSON; do not copy TEST IDs.');
  add('CONFIG','LIVE webhook signing secret',hookSecret?'PRESENT_UNTESTED':'ACTION_REQUIRED',
    hookSecret?'Configured-format only; actual signature pairing and delivery are NOT verified.':'Configure Stripe LIVE endpoint signing secret securely; never paste it into chat.');
  add('CONFIG','Canonical production URL',origin?'PASS':'ACTION_REQUIRED',
    origin?'HTTPS origin configured; provider webhook URL is checked separately.':'PUBLIC_SITE_URL must be a canonical HTTPS origin with no path/query.');
  let mode='UNVERIFIED';
  try{
   const m=await table(base,env,'gu39_sandbox_settings?select=enabled&id=eq.true&limit=1');
   mode=m?.length===1?(m[0].enabled===true?'TESTING_ACTIVE':m[0].enabled===false?'TESTING_OFF':'UNVERIFIED'):'UNVERIFIED';
  }catch{}
  add('SAFETY','Owner payment-mode control',mode==='UNVERIFIED'?'REVIEW':'OBSERVED',
    mode==='TESTING_ACTIVE'?'TESTING is ON. This LIVE read-only review remains permitted; customer LIVE checkout remains blocked.':
     mode==='TESTING_OFF'?'TESTING is OFF; this alone does not authorize real charges.':'Mode could not be read; LIVE checkout must remain disabled.');
  add('SAFETY','Independent LIVE launch approvals','NOT_AUTHORIZED_BY_AUDIT',
    'This review never enables GU_PAYMENT_LIVE_LAUNCH_APPROVED, GU58_LIVE_CHECKOUT_ENABLED or fulfillment/webhook approval switches.');
  let accountVerified=false;
  if(canRead){
   try{
    const acct=await stripeGet(key,'account');
    accountVerified=acct.id===accountId;
    add('MERCHANT','Stripe LIVE account identity',accountVerified?'PASS':'BLOCKED',
      accountVerified?'Stripe API account matches configured LIVE account ID.':'Authenticated Stripe account does not match the configured account.');
    if(accountVerified){
     add('MERCHANT','LIVE charges enabled',safeStatus(acct.charges_enabled),
        'Stripe account charges_enabled='+(typeof acct.charges_enabled==='boolean'?String(acct.charges_enabled):'not returned')+'.');
     add('MERCHANT','LIVE payouts enabled',safeStatus(acct.payouts_enabled),
        'Stripe account payouts_enabled='+(typeof acct.payouts_enabled==='boolean'?String(acct.payouts_enabled):'not returned')+'.');
     add('MERCHANT','Business details submitted',safeStatus(acct.details_submitted),
        'Stripe account details_submitted='+(typeof acct.details_submitted==='boolean'?String(acct.details_submitted):'not returned')+'.');
     const requirement=acct.requirements||{};
     const due=Array.isArray(requirement.currently_due)?requirement.currently_due.length:null;
     const overdue=Array.isArray(requirement.past_due)?requirement.past_due.length:null;
     add('MERCHANT','Required onboarding information',
      due===null||overdue===null?'UNVERIFIED':due===0&&overdue===0&&!requirement.disabled_reason?'PASS':'ACTION_REQUIRED',
      due===null?'Requirements were not included in the Stripe response; review Dashboard.':
       due+' currently due / '+overdue+' past due; merchant-only details are not disclosed.');
     add('MERCHANT','Card payments capability',
      acct.capabilities?.card_payments==='active'?'PASS':acct.capabilities?.card_payments?'REVIEW':'UNVERIFIED',
      acct.capabilities?.card_payments?'Capability status: '+acct.capabilities.card_payments+'.':'Capability not returned; confirm in Stripe Dashboard.');
    }
   }catch{add('MERCHANT','Stripe LIVE account identity','UNVERIFIED','Stripe LIVE account cannot be retrieved with this key or request permission.');}
  }else add('MERCHANT','Stripe LIVE account identity','NOT_CHECKED','Configure LIVE key and expected account ID first; no TEST key fallback.');
  let verified=0,verifiedProducts=0;
  for(const [kind,code] of codes){
   const sku=kind+':'+code,lookup=kind==='plan'?
    'platform_plans?select=price_cents,billing_interval,active,public_visible,checkout_enabled&plan_code=eq.'+code+'&limit=1':
    'platform_tools?select=individual_price_cents,active,public_visible,status&tool_code=eq.'+code+'&limit=1';
   let data=null;
   try{const out=await table(base,env,lookup);data=out?.length===1?out[0]:null}catch{}
   const amount=kind==='plan'?data?.price_cents:data?.individual_price_cents;
   const interval=kind==='plan'?data?.billing_interval:'month';
   const eligible=!!data&&data.active===true&&data.public_visible===true&&
    Number.isSafeInteger(amount)&&amount>0&&['month','year','lifetime'].includes(interval)&&
    (kind==='plan'||data.status==='live');
   if(!eligible){add('SKU',sku,'REVIEW','Canonical existing database offer missing, inactive, or invalid; no payment or catalog write performed.');continue}
   if(!mapping||!accountVerified){add('SKU',sku,'NOT_CHECKED','LIVE Stripe account and complete LIVE mapping must be verified first.');continue}
   try{
    const mapped=mapping[sku];
    const p=await stripeGet(key,'products/'+encodeURIComponent(mapped.product_id));
    if(p?.id!==mapped.product_id||p.active!==true||p.livemode!==true){
     add('SKU',sku,'BLOCKED','LIVE Stripe Product is missing/inactive or has the wrong mode.');continue}
    verifiedProducts++;
    const price=await stripeGet(key,'prices/'+encodeURIComponent(mapped.price_id));
    if(!priceApproved(price,mapped.product_id,mapped.price_id,amount,interval)){
     add('SKU',sku,'BLOCKED','LIVE Price differs from canonical database amount, currency, product, billing cadence, or fixed-price conditions.');continue}
    verified++;
    add('SKU',sku,'PASS_PRICE_ONLY',
     amount+' USD cents and '+interval+' cadence verified in the configured LIVE Stripe account; this does NOT enable customer checkout.');
   }catch{add('SKU',sku,'UNVERIFIED','LIVE Stripe Product/Price retrieval failed or was restricted; no charge attempted.');}
  }
  let webhookReady=false;
  if(accountVerified&&origin){
   try{
    const e=await stripeGet(key,'webhook_endpoints?limit=100');
    const expected=origin+'/api/stripe-live-webhook';
    const matching=Array.isArray(e.data)?e.data.filter(x=>x.url===expected&&x.livemode===true&&x.status==='enabled'):[];
    const exact=matching.length===1&&e.has_more===false;
    add('WEBHOOK','LIVE production webhook destination',exact?'PASS':'REVIEW',
      e.has_more?'Stripe webhook endpoint listing was paginated; review the full list.':
       matching.length===1?'Exactly one enabled LIVE endpoint matches the production site.':
        'Expected exactly one enabled LIVE endpoint on the canonical production origin.');
    const declared=exact&&requiredEvents.every(x=>matching[0].enabled_events?.includes(x));
    // Wildcard cannot prove selection-required events; fail closed on ambiguous subscriptions.
    webhookReady=!!declared;
    add('WEBHOOK','Eight exact lifecycle event subscriptions',declared?'PASS':'REVIEW',
      declared?'All eight explicitly required lifecycle event types are subscribed.':
       'An enabled endpoint is missing, unreadable, ambiguous, or relies on wildcard coverage.');
   }catch{
    add('WEBHOOK','LIVE production webhook destination','UNVERIFIED','Stripe webhook endpoint listing unavailable or access restricted.');
    add('WEBHOOK','Eight exact lifecycle event subscriptions','UNVERIFIED','Cannot confirm live event subscriptions without endpoint details.');
   }
  }else{
   add('WEBHOOK','LIVE production webhook destination','NOT_CHECKED','Configure matching account and canonical site URL first.');
   add('WEBHOOK','Eight exact lifecycle event subscriptions','NOT_CHECKED','Requires matching LIVE webhook destination.');
  }
  add('ACCEPTANCE','Managed Payments provider eligibility','NOT_VERIFIABLE_BY_READ_ONLY_API',
   'Stripe Managed Payments preview access is not certified by account/price GET calls.');
  add('ACCEPTANCE','Signed LIVE webhook delivery and membership grant','NOT_TESTED',
   'A real signed delivery, installed SQL definition comparison, and Owner-approved lifecycle acceptance remain pending.');
  add('ACCEPTANCE','LIVE billing launch','NOT_APPROVED',
   'The Owner TEST/LIVE selector, this report, and any PASS rows do not approve customer billing.');
  return json({ok:true,version:'0.14.0.68',readOnly:true,noCharge:true,
   ownerOnly:true,mode,verifiedLiveProducts:verifiedProducts,verifiedLivePrices:verified,
   totalSkus:codes.length,webhookConfigurationChecked:webhookReady,
   liveCheckoutApproved:false,readyForLiveCheckout:false,
   rows});
 }catch(e){return json({ok:false,error:e.code||'LIVE_MERCHANT_READINESS_UNAVAILABLE'},e.status||503)}
}
export function onRequestPost(){return json({ok:false,error:'READ_ONLY_GET_ONLY'},405)}
