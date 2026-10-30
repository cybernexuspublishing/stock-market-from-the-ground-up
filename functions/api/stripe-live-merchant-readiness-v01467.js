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
// Do not suppress materially different Stripe failures. The authenticated Owner
// needs to distinguish a TEST/wrong-account ID (404) from insufficient API scope.
async function stripePriceProbe(key,path){
 let r;
 try{r=await fetch('https://api.stripe.com/v1/'+path,{
  headers:{authorization:'Bearer '+key,accept:'application/json'},cache:'no-store'})}
 catch{return {status:'TRANSPORT_UNAVAILABLE'}}
 if(r.status===404)return {status:'NOT_FOUND_IN_LIVE_ACCOUNT'};
 if(r.status===403)return {status:'READ_PERMISSION_DENIED'};
 if(r.status===401)return {status:'API_KEY_REJECTED'};
 if(!r.ok)return {status:'STRIPE_READ_UNAVAILABLE'};
 const value=await r.json().catch(()=>null);
 if(!value||value.error)return {status:'STRIPE_READ_UNAVAILABLE'};
 return {status:'OK',value};
}
const aliases=Object.freeze({
 'plan:FULL_MONTHLY':['Full Platform Membership Monthly','Full Platform Monthly'],
 'plan:FULL_ANNUAL':['Full Platform Membership Annual','Full Platform Annual'],
 'plan:LIFETIME':['Lifetime Platform Access','Lifetime Membership'],
 'plan:ONDEMAND_MONTHLY':['Historical Replay Learning','OnDemand Monthly'],
 'tool:INTERACTIVE_LEARNING':['Interactive Learning & Historical Labs','Interactive Learning'],
 'tool:JOURNAL_ANALYTICS':['Trading Journal & Performance Analytics','Journal Analytics'],
 'tool:MARKET_SIMULATOR':['Advanced Market Simulator & Replay','Market Simulator'],
 'tool:MARKET_TUTOR':['Market Tutor']
});
const normalized=x=>String(x??'').normalize('NFKD').toLowerCase()
 .replace(/[^a-z0-9]+/g,' ').trim();
const nameMatches=(sku,name)=>aliases[sku]?.some(n=>normalized(n)===normalized(name))===true;
// This is read-only discovery of existing LIVE Stripe prices. It never writes
// the suggested mapping to Cloudflare or changes launch permissions. A mapping
// is displayed only if all eight independently meet fixed-price/unique-name
// criteria and pagination completed, otherwise each ambiguous SKU stays blocked.
async function discoverLiveMapping(key,offers){
 const prices=[];let after='',complete=false;
 for(let page=0;page<5;page++){
  const path='prices?limit=100&active=true&expand%5B%5D=data.product'+(after?'&starting_after='+encodeURIComponent(after):'');
  const response=await stripePriceProbe(key,path);
  if(response.status!=='OK')return {status:response.status,rows:[],json:null};
  const batch=response.value;
  if(!Array.isArray(batch.data))return {status:'INVALID_LIST_RESPONSE',rows:[],json:null};
  prices.push(...batch.data);
  if(batch.has_more!==true){complete=true;break}
  after=batch.data.at(-1)?.id;
  if(!isPrice(after))return {status:'INCOMPLETE_LIST',rows:[],json:null};
 }
 if(!complete)return {status:'INCOMPLETE_LIST',rows:[],json:null};
 const proposals={},rows=[];let correct=0;
 for(const [kind,code] of codes){
  const sku=kind+':'+code,o=offers.get(sku);
  if(!o){rows.push(reportRow('RECOVERY',sku,'DATABASE_NOT_VERIFIED','No valid canonical database offer.'));continue}
  const matches=prices.filter(p=>p?.livemode===true&&p.active===true&&isPrice(p.id)&&
   typeof p.product==='object'&&isProduct(p.product?.id)&&p.product?.active===true&&
   p.product?.livemode===true&&nameMatches(sku,p.product.name)&&
   priceApproved({...p,product:p.product.id},p.product.id,p.id,o.amount,o.interval));
  if(matches.length===1){
   const p=matches[0];
   proposals[sku]={product_id:p.product.id,price_id:p.id};
   rows.push(reportRow('RECOVERY',sku,'EXACT_LIVE_CANDIDATE',
    'Existing Stripe LIVE Product '+p.product.id+' and Price '+p.id+
    ' match the name, fixed amount and billing cadence. Not applied.'));
   correct++;
  }else rows.push(reportRow('RECOVERY',sku,matches.length>1?'AMBIGUOUS_MULTIPLE_PRICES':'NO_EXACT_LIVE_MATCH',
    matches.length>1?'Multiple matching LIVE prices exist; choose the intended current retail Price in Stripe.':
    'No exact active LIVE Product name plus fixed-price/cadence combination found; review Stripe LIVE catalog.'));
 }
 const ids=Object.values(proposals),uniqueProducts=new Set(ids.map(v=>v.product_id)).size===8,
       uniquePrices=new Set(ids.map(v=>v.price_id)).size===8;
 const ready=correct===8&&uniqueProducts&&uniquePrices;
 return {status:ready?'COMPLETE_CANDIDATES':correct?'PARTIAL_CANDIDATES':'NO_EXACT_CANDIDATES',
   rows,json:ready?JSON.stringify(proposals,null,2):null};
}
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
  const key=clean((env.STRIPE_LIVE_SECRET_KEY || env.GU58_STRIPE_LIVE_SECRET_KEY)),accountId=clean((env.STRIPE_LIVE_ACCOUNT_ID || env.GU58_STRIPE_LIVE_ACCOUNT_ID));
  const secretOk=isLiveSecret(key),idOk=isAccount(accountId),mapping=catalogMap(env.GU58_STRIPE_LIVE_CATALOG_JSON);
  const hookSecret=/^whsec_[A-Za-z0-9_]+$/.test(clean((env.STRIPE_LIVE_WEBHOOK_SECRET || env.GU58_STRIPE_LIVE_WEBHOOK_SECRET)));
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
  const offers=new Map();
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
   offers.set(sku,{amount,interval});
   if(!mapping||!accountVerified){add('SKU',sku,'NOT_CHECKED','LIVE Stripe account and complete LIVE mapping must be verified first.');continue}
   const mapped=mapping[sku];
   // Price first: the configured prod_ may be a TEST identifier even if the
   // existing price_ belongs to the correct LIVE account.
   const priceResult=await stripePriceProbe(key,'prices/'+encodeURIComponent(mapped.price_id));
   if(priceResult.status!=='OK'){
    add('SKU',sku,priceResult.status,
     priceResult.status==='NOT_FOUND_IN_LIVE_ACCOUNT'?
       'Configured Price ID does not exist in this LIVE Stripe account (often copied from TEST or another account).':
       priceResult.status==='READ_PERMISSION_DENIED'?'LIVE Stripe key cannot read Price objects (Stripe key permissions).':
       'Stripe Price retrieval cannot be verified: '+priceResult.status+'.');
    continue;
   }
   const price=priceResult.value;
   if(price.product!==mapped.product_id){
    add('SKU',sku,'PRODUCT_ID_MISMATCH',
     isProduct(price.product)?
       'LIVE Price belongs to Product '+price.product+', not the mapped Product. Fix the product_id in Cloudflare after checking Stripe.':
       'Price product association could not be confirmed.');
    continue;
   }
   if(!priceApproved(price,mapped.product_id,mapped.price_id,amount,interval)){
    add('SKU',sku,'PRICE_CONTRACT_MISMATCH',
      'Configured LIVE Price is not an active fixed USD offer with the approved amount and exact billing cadence.');
    continue;
   }
   const productResult=await stripePriceProbe(key,'products/'+encodeURIComponent(mapped.product_id));
   if(productResult.status!=='OK'){
    add('SKU',sku,'PRODUCT_'+productResult.status,
     'Configured LIVE Product could not be read: '+productResult.status+'.');continue;
   }
   const p=productResult.value;
   if(p.id!==mapped.product_id||p.active!==true||p.livemode!==true){
    add('SKU',sku,'PRODUCT_INACTIVE_OR_WRONG_MODE',
      'Configured product is not an active LIVE Stripe Product.');continue}
   verifiedProducts++;verified++;
   add('SKU',sku,'PASS_PRICE_ONLY',
    amount+' USD cents and '+interval+' cadence verified in the configured LIVE Stripe account; this does NOT enable customer checkout.');
  }
  let discoveryStatus='NOT_REQUIRED',suggestedLiveCatalogJson=null;
  if(accountVerified&&mapping&&verified!==8){
   try{
    const discovered=await discoverLiveMapping(key,offers);
    discoveryStatus=discovered.status;
    for(const r of discovered.rows)rows.push(r);
    suggestedLiveCatalogJson=discovered.json;
    add('RECOVERY','LIVE catalog mapping proposal',suggestedLiveCatalogJson?'COPY_READY_REVIEW_REQUIRED':discoveryStatus,
     suggestedLiveCatalogJson?
      'Eight exact existing LIVE candidates found. Copy the proposed JSON into Cloudflare only after Owner review; no write/launch was performed.':
      'Read-only discovery did not produce eight uniquely matched LIVE offers. Check individual RECOVERY rows or LIVE Stripe Product titles.');
   }catch{
    discoveryStatus='UNAVAILABLE';
    add('RECOVERY','LIVE catalog mapping proposal','UNAVAILABLE',
       'LIVE Stripe product/price listing could not be completed; manual Stripe Dashboard verification is needed.');
   }
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
  return json({ok:true,version:'0.14.0.69',readOnly:true,noCharge:true,
   ownerOnly:true,mode,verifiedLiveProducts:verifiedProducts,verifiedLivePrices:verified,
   totalSkus:codes.length,webhookConfigurationChecked:webhookReady,
   discoveryStatus,suggestedLiveCatalogJson,
   liveCheckoutApproved:false,readyForLiveCheckout:false,
   rows});
 }catch(e){return json({ok:false,error:e.code||'LIVE_MERCHANT_READINESS_UNAVAILABLE'},e.status||503)}
}
export function onRequestPost(){return json({ok:false,error:'READ_ONLY_GET_ONLY'},405)}
