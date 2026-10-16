/* The Stock Market: From the Ground Up - v0.14.0.37
 * Read-only, authenticated Stripe Product/Price verification.
 * Product IDs are owner-observed from Dashboard screenshot; Stripe API data is authoritative.
 * No subscription, checkout, order, private buyer data, or entitlement changes.
 */
const ITEMS=[{"sku":"tool:MARKET_TUTOR","display_name":"Market Tutor","stripe_product_id":"prod_VRwuiqDt8qHayI","price_cents":2999,"billing_interval":"month","tax_code_from_screenshot":"txcd_10000000"},{"sku":"tool:MARKET_SIMULATOR","display_name":"Advanced Market Simulator & Replay","stripe_product_id":"prod_VRwrsEpvfw60Xh","price_cents":2999,"billing_interval":"month","tax_code_from_screenshot":"txcd_10000000"},{"sku":"tool:JOURNAL_ANALYTICS","display_name":"Trading Journal & Performance Analytics","stripe_product_id":"prod_VRwoX4hTg8fRCm","price_cents":2999,"billing_interval":"month","tax_code_from_screenshot":"txcd_10000000"},{"sku":"tool:INTERACTIVE_LEARNING","display_name":"Interactive Learning & Historical Labs","stripe_product_id":"prod_VRwmmu4zATdHAb","price_cents":2999,"billing_interval":"month","tax_code_from_screenshot":"txcd_10000000"},{"sku":"plan:ONDEMAND_MONTHLY","display_name":"Historical Replay Learning","stripe_product_id":"prod_VRwjus5sQLtTad","price_cents":1999,"billing_interval":"month","tax_code_from_screenshot":"txcd_10000000"},{"sku":"plan:LIFETIME","display_name":"Lifetime Platform Access","stripe_product_id":"prod_VRwgISspL5mhls","price_cents":249900,"billing_interval":"one_time","tax_code_from_screenshot":"txcd_10000000"},{"sku":"plan:FULL_ANNUAL","display_name":"Full Platform Membership \u2014 Annual","stripe_product_id":"prod_VRvyBNhWk9jshb","price_cents":69900,"billing_interval":"year","tax_code_from_screenshot":"txcd_20060058"},{"sku":"plan:FULL_MONTHLY","display_name":"Full Platform Membership \u2014 Monthly","stripe_product_id":"prod_VRvuGwLKI16MXU","price_cents":6999,"billing_interval":"month","tax_code_from_screenshot":"txcd_10000000"}];
const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const answer=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:HEAD});
const safe=async(r)=>{try{return await r.json()}catch{return null}};
const creds=e=>({url:String(e.SUPABASE_URL||'').replace(/\/$/,''),publicKey:String(e.SUPABASE_PUBLISHABLE_KEY||''),secret:String(e.SUPABASE_SECRET_KEY||'')});
async function authorized(request,env){
 const token=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];if(!token)return false;
 const c=creds(env);if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(c.url)||!c.publicKey)return false;
 const result=await fetch(c.url+'/rest/v1/rpc/gu_owner_digital_payment_route_read_v01432r2',{
  method:'POST',headers:{apikey:c.publicKey,authorization:'Bearer '+token,'content-type':'application/json'},body:'{}',cache:'no-store'});
 if(!result.ok)return false;
 const role=await safe(result);return role?.ok===true&&['OWNER','ADMIN'].includes(role?.role);
}
async function stripeGet(key,type,id){
 const r=await fetch('https://api.stripe.com/v1/'+type+'/'+encodeURIComponent(id),{
  method:'GET',headers:{authorization:'Bearer '+key},cache:'no-store'});
 if(!r.ok)return {error:r.status===404?'Not found in connected Stripe account':'Stripe API verification unavailable'};
 return await safe(r)||{error:'Stripe returned invalid data'};
}
const validId=(prefix,v)=>new RegExp('^'+prefix+'_[A-Za-z0-9_]{6,}$').test(String(v||''));
const planPeriod=p=>p?.type==='one_time'?'one_time':p?.recurring?.interval;
export async function onRequestGet({request,env}){
 try{
  if(!await authorized(request,env))return answer({ok:false,error:'OWNER or ADMIN authorization required.'},403);
  const key=String(env.STRIPE_MANAGED_SECRET_KEY||'').trim();
  const sandbox=key.startsWith('sk_test_');
  let mapping={};let mappingValid=true;
  try{const m=JSON.parse(String(env.STRIPE_MANAGED_PRICE_MAP_JSON||'{}'));if(!m||typeof m!=='object'||Array.isArray(m))throw Error();mapping=m}catch{mappingValid=false}
  const rows=[];
  for(const i of ITEMS){
   const priceId=mapping[i.sku];const mapped=validId('price',priceId);
   let productVerified=false, priceVerified=false, active=false,providerTaxCode=null,providerProductName=null,reason='';
   if(!mappingValid){reason='Stripe Price ID mapping is invalid.'}
   else if(!sandbox){reason='Sandbox Stripe secret key is not configured. No live key is used by this check.'}
   else {
    const product=await stripeGet(key,'products',i.stripe_product_id);
    if(product.error){reason=product.error}
    else{productVerified=product.id===i.stripe_product_id&&product.livemode===false&&product.active===true;
      active=product.active===true;providerTaxCode=typeof product.tax_code==='string'?product.tax_code:product.tax_code?.id||null;
      providerProductName=typeof product.name==='string'?product.name:null;
      if(!productVerified)reason='Product not active in connected Stripe sandbox.';}
    if(productVerified&&mapped){
      const price=await stripeGet(key,'prices',priceId);
      if(price.error){reason=price.error}
      else {priceVerified=price.id===priceId&&price.active===true&&price.livemode===false&&
       price.product===i.stripe_product_id&&price.currency==='usd'&&
       price.unit_amount===i.price_cents&&planPeriod(price)===i.billing_interval;
       if(!priceVerified)reason='Price mismatch: product, amount, billing cycle, currency or sandbox environment.';}
    }else if(productVerified&&!mapped){reason='Missing Stripe Price ID (price_) in secure Cloudflare mapping.'}
   }
   rows.push({sku:i.sku,productId:i.stripe_product_id,displayName:i.display_name,expectedAmountCents:i.price_cents,
     billing:i.billing_interval,observedTaxCode:i.tax_code_from_screenshot,stripeTaxCode:providerTaxCode,
     stripeName:providerProductName,priceMapped:mapped,productVerified,priceVerified,productActive:active,reason});
  }
  const fullMemberships=rows.filter(x=>x.sku.startsWith('plan:FULL_'));
  const differentTaxCodes=[...new Set(fullMemberships.map(x=>x.stripeTaxCode||x.observedTaxCode))].length>1 ||
    [...new Set(fullMemberships.map(x=>x.observedTaxCode))].length>1;
  return answer({ok:true,version:'0.14.0.37',environment:sandbox?'Stripe sandbox configured':'Stripe sandbox unavailable',
    ownerReportedProductCount:ITEMS.length,verifiedProductCount:rows.filter(x=>x.productVerified).length,
    verifiedPriceCount:rows.filter(x=>x.priceVerified).length,priceMappedCount:rows.filter(x=>x.priceMapped).length,
    taxClassificationReviewRequired:differentTaxCodes,products:rows,
    customerCheckoutEnabledByThisRelease:false,
    warning:'This report is read-only. Even all prices verified does not mean webhooks, member entitlements, refunds, KDP digital rights, or live checkout have passed acceptance.'});
 }catch{return answer({ok:false,error:'Unable to verify connected Stripe sandbox. No changes made.'},503)}
}
export function onRequestPost(){return answer({ok:false,error:'GET required.'},405)}
