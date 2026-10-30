/* Owner-only read-only LIVE payment release preflight.
 * Never creates a Checkout Session, charges a customer or modifies entitlements.
 * Not a substitute for signed webhook and authenticated member acceptance.
 */
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
const neededStandard=['checkout.session.completed','checkout.session.async_payment_succeeded','invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted','charge.refunded','charge.dispute.created'];
const neededFounder=['invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted','charge.refunded','charge.dispute.created'];
const setting=e=>String(e??'').trim();
const productID=x=>setting(x?.product_id||x?.productId);
const priceID=x=>setting(x?.price_id||x?.priceId);
const validateMapValue=x=>x&&typeof x==='object'&&/^prod_[A-Za-z0-9_]{6,}$/.test(productID(x))&&/^price_[A-Za-z0-9_]{6,}$/.test(priceID(x));
const readJSON=async(url,opts={})=>{
 const response=await fetch(url,{cache:'no-store',...opts});
 if(!response.ok)throw Error('READ_FAILED');
 const obj=await response.json().catch(()=>null);
 if(obj===null||obj?.error)throw Error('INVALID_RESPONSE');
 return obj;
};
const allowedHeaders=k=>({apikey:k,...(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(k)?{authorization:'Bearer '+k}:{})});
function parseMap(raw,expectedKeys){
 let map;try{map=JSON.parse(setting(raw)||'{}')}catch{throw Error('BAD_CATALOG_MAP')}
 if(!map||typeof map!=='object'||Array.isArray(map)||Object.keys(map).length!==expectedKeys.length||
 !expectedKeys.every(k=>validateMapValue(map[k]))||
 new Set(expectedKeys.map(k=>productID(map[k]))).size!==expectedKeys.length||
 new Set(expectedKeys.map(k=>priceID(map[k]))).size!==expectedKeys.length)throw Error('BAD_CATALOG_MAP');
 return Object.fromEntries(expectedKeys.map(k=>[k,{product_id:productID(map[k]),price_id:priceID(map[k])}]));
}
// Existing 30/60 LIVE Founder mapping remains valid; 14-Day is an optional
// independently launched offer. Keep the preflight fail-closed for an active
// 14-Day storefront SKU if the corresponding LIVE catalog entry is absent.
function parseFounderMap(raw){
 let m;try{m=JSON.parse(setting(raw)||'{}')}catch{throw Error('BAD_FOUNDER_CATALOG')}
 const required=['FOUNDING_30','FOUNDING_60'],allowed=['FOUNDING_14',...required];
 const keys=m&&typeof m==='object'&&!Array.isArray(m)?Object.keys(m):[];
 if(!required.every(k=>keys.includes(k))||keys.some(k=>!allowed.includes(k))||
   !keys.every(k=>validateMapValue(m[k]))||
   new Set(keys.map(k=>productID(m[k]))).size!==keys.length||
   new Set(keys.map(k=>priceID(m[k]))).size!==keys.length)
  throw Error('BAD_FOUNDER_CATALOG');
 return Object.fromEntries(keys.map(k=>[k,{product_id:productID(m[k]),price_id:priceID(m[k])}]));
}
export async function onRequestGet({request,env}){
 const token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!token)return json({ok:false,error:'Owner sign-in required.'},401);
 const base=setting(env.SUPABASE_URL).replace(/\/$/,'');
 const pub=setting(env.SUPABASE_PUBLISHABLE_KEY),secret=setting(env.SUPABASE_SECRET_KEY);
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!pub||!secret)
  return json({ok:false,error:'Read-only catalog unavailable.'},503);
 try{
  const staff=await readJSON(base+'/rest/v1/rpc/gu_owner_digital_payment_route_read_v01432r2',{
   method:'POST',headers:{apikey:pub,authorization:'Bearer '+token,'content-type':'application/json'},body:'{}'});
  if(staff?.role!=='OWNER'||staff?.ok!==true)return json({ok:false,error:'Owner authorization required.'},403);
  const live=setting((env.STRIPE_LIVE_SECRET_KEY || env.GU58_STRIPE_LIVE_SECRET_KEY)),accountID=setting((env.STRIPE_LIVE_ACCOUNT_ID || env.GU58_STRIPE_LIVE_ACCOUNT_ID));
  const host=setting(env.PUBLIC_SITE_URL);
  if(!/^sk_live_[A-Za-z0-9_]+$/.test(live)||!/^acct_[A-Za-z0-9_]{6,}$/.test(accountID)||
   !/^https:\/\/[a-z0-9-]+\.pages\.dev$/.test(host))throw Error('PROVIDER_NOT_CONFIGURED');
  const h=allowedHeaders(secret),api='https://api.stripe.com/v1/';
  const [store,books,founder,planRows,toolRows,founderRows,account,prices,products,hooks]=await Promise.all([
    readJSON(base+'/rest/v1/gu_storefront_items_v014174?select=sku,category,sale_ready,visible,status&limit=150',{headers:h}),
    readJSON(base+'/rest/v1/gu_digital_books_v01430?select=product_code&limit=1',{headers:h}),
    readJSON(base+'/rest/v1/gu_founder_release_v014173?select=enrollment_enabled,billing_enabled,fulfillment_enabled&limit=1',{headers:h}),
    readJSON(base+'/rest/v1/platform_plans?select=plan_code,price_cents,billing_interval,active,checkout_enabled&limit=30',{headers:h}),
    readJSON(base+'/rest/v1/platform_tools?select=tool_code,individual_price_cents,active,status,checkout_enabled&limit=50',{headers:h}),
    readJSON(base+'/rest/v1/gu_founder_plans_v014173?select=plan_code,price_cents,term_days,checkout_enabled&limit=10',{headers:h}),
    readJSON(api+'account',{headers:{authorization:'Bearer '+live}}),
    readJSON(api+'prices?limit=100',{headers:{authorization:'Bearer '+live}}),
    readJSON(api+'products?limit=100',{headers:{authorization:'Bearer '+live}}),
    readJSON(api+'webhook_endpoints?limit=100',{headers:{authorization:'Bearer '+live}})
  ]);
  if(!Array.isArray(store)||!Array.isArray(books)||!Array.isArray(founder)||
     !Array.isArray(planRows)||!Array.isArray(toolRows)||!Array.isArray(founderRows)||
     !Array.isArray(prices.data)||!Array.isArray(products.data)||!Array.isArray(hooks.data)||account.id!==accountID||
     store.length<11||store.length>150||
     new Set(store.map(x=>x.sku)).size!==store.length||
     prices.has_more===true||products.has_more===true||hooks.has_more===true)throw Error('CATALOG_INCOMPLETE');
  const expected=['plan:FULL_MONTHLY','plan:FULL_ANNUAL','plan:LIFETIME','plan:ONDEMAND_MONTHLY',
   'tool:INTERACTIVE_LEARNING','tool:JOURNAL_ANALYTICS','tool:MARKET_SIMULATOR','tool:MARKET_TUTOR'];
  const m=parseMap((env.STRIPE_LIVE_CATALOG_JSON ? JSON.stringify(JSON.parse(env.STRIPE_LIVE_CATALOG_JSON).legacy) : env.GU58_STRIPE_LIVE_CATALOG_JSON),expected);
  const f=parseFounderMap((env.STRIPE_LIVE_CATALOG_JSON ? JSON.stringify(JSON.parse(env.STRIPE_LIVE_CATALOG_JSON).founding) : env.GU_F600_LIVE_CATALOG_JSON));
  if(![...expected,'founding:FOUNDING_14','founding:FOUNDING_30','founding:FOUNDING_60']
     .every(k=>store.some(s=>s.sku===k)))throw Error('REQUIRED_SKU_MISSING');
  const lookup=new Map(prices.data.map(x=>[x.id,x]));
  const productByID=new Map(products.data.map(x=>[x.id,x]));
  const mapped=[...Object.entries(m),...Object.entries(f)];
  const byPlan=new Map(planRows.map(x=>[x.plan_code,x]));
  const byTool=new Map(toolRows.map(x=>[x.tool_code,x]));
  const byFounder=new Map(founderRows.map(x=>[x.plan_code,x]));
  const pricesVerified=mapped.every(([,x])=>{const p=lookup.get(x.price_id);return p&&p.active===true&&
   p.livemode===true&&p.product===x.product_id&&productByID.get(x.product_id)?.active===true&&p.currency==='usd'&&
   Number.isSafeInteger(p.unit_amount)&&p.unit_amount>0});
  // Validate the OWNER-APPROVED monetary contract and renewal cadence, not
  // simply an active Stripe Price. This catches $/interval drift even when
  // the Price ID still points to a valid and active Product.
  const expectedPrice=sku=>{
   if(sku.startsWith('plan:')){
    const a=byPlan.get(sku.slice(5));if(!a||a.active!==true)return null;
    if(a.billing_interval==='lifetime')return {amount:a.price_cents,type:'one_time'};
    if(!['month','year'].includes(a.billing_interval))return null;
    return {amount:a.price_cents,type:'recurring',interval:a.billing_interval,count:1};
   }
   if(sku.startsWith('tool:')){
    const a=byTool.get(sku.slice(5));if(!a||a.active!==true||a.status!=='live')return null;
    return {amount:a.individual_price_cents,type:'recurring',interval:'month',count:1};
   }
   const a=byFounder.get(sku);if(!a||![14,30,60].includes(a.term_days))return null;
   return {amount:a.price_cents,type:'recurring',interval:'day',count:a.term_days};
  };
  const priceContractVerified=mapped.every(([sku,x])=>{
   const e=expectedPrice(sku),p=lookup.get(x.price_id);
   return e&&p&&Number.isSafeInteger(e.amount)&&e.amount>0&&
    p.unit_amount===e.amount&&p.type===e.type&&
    (e.type==='one_time'?p.recurring==null:
     p.recurring?.interval===e.interval&&p.recurring?.interval_count===e.count);
  });
  const saleAuthorized=store.filter(x=>x.sale_ready===true).every(x=>{
   const sku=String(x.sku||'');
   // Store Founding SKUs have a category prefix; the Stripe Founder map does not.
   const mappedName=sku.startsWith('founding:')?sku.slice(9):sku;
   const authorizedMapping=sku.startsWith('founding:')
    ?Object.prototype.hasOwnProperty.call(f,mappedName)
    :Object.prototype.hasOwnProperty.call(m,mappedName);
   if(!authorizedMapping)return false;
   if(sku.startsWith('plan:'))return byPlan.get(sku.slice(5))?.checkout_enabled===true;
   if(sku.startsWith('tool:'))return byTool.get(sku.slice(5))?.checkout_enabled===true;
   if(sku.startsWith('founding:'))return byFounder.get(sku.slice(9))?.checkout_enabled===true;
   return false;
  });
  const hookOK=(suffix,events)=>{
   const url=host+'/api/'+suffix;
   const candidates=hooks.data.filter(x=>x.url===url&&x.status==='enabled'&&x.livemode===true);
   return candidates.length===1&&events.every(e=>candidates[0].enabled_events.includes(e));
  };
  const flags=['GU_PAYMENT_LIVE_LAUNCH_APPROVED','GU58_LIVE_CHECKOUT_ENABLED','GU58_LIVE_WEBHOOK_ENABLED',
   'GU58_LIVE_FULFILLMENT_APPROVED','GU58_LIVE_DB_CONTRACT_APPROVED',
   'GU_F600_LIVE_CHECKOUT_ENABLED','GU_F600_LIVE_WEBHOOK_ENABLED',
   'GU_F600_LIVE_FULFILLMENT_APPROVED','GU_LIVE_FINAL_OWNER_PAYMENT_TEST_ACCEPTED'];
  const gates=Object.fromEntries(flags.map(k=>[k,env[k]==='true']));
  const counts={};for(const x of store){const k=String(x.category||'unknown');const c=counts[k]||(counts[k]={total:0,ready:0,hidden:0});c.total++;if(x.sale_ready===true)c.ready++;if(x.visible===false)c.hidden++;}
  const safe=[],blocked=[];
  const test=(ok,id)=>{(ok?safe:blocked).push(id)};
  test(Object.values(gates).every(Boolean),'ALL_OWNER_LIVE_APPROVALS');
  test(pricesVerified,'MAPPED_PRICE_PROVIDER_PARITY');
  test(priceContractVerified,'MAPPED_PRICE_AMOUNT_AND_CADENCE');
  test(saleAuthorized,'SALE_READY_OWNER_SKU_AUTHORIZATION');
  test(hookOK('stripe-live-webhook',neededStandard),'STANDARD_WEBHOOK_LIFECYCLE');
  test(hookOK('founding600-webhook',neededFounder),'FOUNDING_WEBHOOK_LIFECYCLE');
  test(founder.length===1&&founder[0].enrollment_enabled===true&&founder[0].billing_enabled===true&&founder[0].fulfillment_enabled===true,'FOUNDING_DATABASE_RELEASE');
  test(store.some(x=>x.sale_ready===true),'AT_LEAST_ONE_VERIFIED_SALE_READY_OFFER');
  // Never treat a book cover, product.active or public_visible as proof of downloadable files.
  test(books.length>0||!store.some(x=>x.category==='book'&&x.sale_ready===true),'DIRECT_BOOK_DELIVERY_IF_OFFERED');
  // Distinguish actual Owner-enabled paid checkout from completed post-launch
  // transaction acceptance. A pending first paid lifecycle must not be called
  // 'checkout disabled' when the production flags, mappings and webhook agree.
  const operatingFlags=flags.filter(k=>k!=='GU_LIVE_FINAL_OWNER_PAYMENT_TEST_ACCEPTED');
  const operationalCheckoutConfigured=operatingFlags.every(k=>gates[k]===true)&&
    pricesVerified&&priceContractVerified&&saleAuthorized&&
    hookOK('stripe-live-webhook',neededStandard)&&hookOK('founding600-webhook',neededFounder)&&
    founder.length===1&&founder[0].enrollment_enabled===true&&
    founder[0].billing_enabled===true&&founder[0].fulfillment_enabled===true&&
    store.some(x=>x.sale_ready===true);
  return json({ok:true,go:blocked.length===0,operationalCheckoutConfigured,firstPaidTransactionAccepted:gates.GU_LIVE_FINAL_OWNER_PAYMENT_TEST_ACCEPTED===true,readOnly:true,host,accountMatched:true,
    mappedSKUs:mapped.length,verifiedMappedPrices:pricesVerified,
    verifiedAmountAndCadence:priceContractVerified,storeCount:store.length,
    activePriceCount:prices.data.filter(x=>x.active).length,activeProductCount:products.data.filter(x=>x.active).length,categoryCounts:counts,
    verified:safe,blockers:blocked,
    explanation:'Source evidence only. A green preflight does not replace member-browser, signed-event idempotency, cancellation, refunds, digital-rights or final Owner payment acceptance.'});
 }catch{return json({ok:false,go:false,error:'LIVE release evidence unavailable; checkout remains closed.'},503)}
}
export function onRequestPost(){return json({ok:false,error:'Read-only acceptance endpoint.'},405)}
