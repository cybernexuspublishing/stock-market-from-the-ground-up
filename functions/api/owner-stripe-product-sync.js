/* Owner-only Stripe LIVE Product/Price import with automatic stable SKU.
 * The website's canonical inventory + Cloudflare runtime catalog live in Supabase.
 * Import never activates paid checkout, changes an amount or grants entitlements.
 */
const output=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const error=(message,status=400)=>Object.assign(new Error(message),{status});
const clean=x=>String(x??'').trim();
const serviceKey=k=>({apikey:k,...(k.startsWith('sb_secret_')?{}:{authorization:'Bearer '+k})});
const cats=new Set(['plan','founding','tool','book','course','addon','feature']);
const skuPattern=/^(plan|founding|tool|book|course|addon|feature):[A-Z0-9_-]{2,90}$/;
const pPattern=/^prod_[A-Za-z0-9_]{6,}$/;
const pricePattern=/^price_[A-Za-z0-9_]{6,}$/;
async function getJson(url,options={}){
 const r=await fetch(url,{...options,cache:'no-store'});
 const j=await r.json().catch(()=>null);
 if(!r.ok||j===null)throw error('Stripe or catalog data could not be verified',503);
 return j;
}
function cfg(env){
 const base=clean(env.SUPABASE_URL).replace(/\/$/,''),pub=clean(env.SUPABASE_PUBLISHABLE_KEY),
  secret=clean(env.SUPABASE_SECRET_KEY),stripe=clean((env.STRIPE_LIVE_SECRET_KEY || env.GU58_STRIPE_LIVE_SECRET_KEY)),
  account=clean((env.STRIPE_LIVE_ACCOUNT_ID || env.GU58_STRIPE_LIVE_ACCOUNT_ID));
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!pub||!secret||
   !/^sk_live_[A-Za-z0-9_]+$/.test(stripe)||!/^acct_[A-Za-z0-9_]{6,}$/.test(account))
  throw error('LIVE catalog integrations are not configured',503);
 return {base,pub,secret,stripe,account};
}
async function owner(request,c,stepup=true){
 const bearer=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!bearer)throw error('Sign in as Owner',401);
 const h={apikey:c.pub,authorization:'Bearer '+bearer};
 const user=await getJson(c.base+'/auth/v1/user',{headers:h});
 if(!/^[0-9a-f-]{36}$/i.test(user?.id||''))throw error('Owner session invalid',401);
 const rpc=async name=>getJson(c.base+'/rest/v1/rpc/'+name,
  {method:'POST',headers:{...h,'content-type':'application/json'},body:'{}'});
 const role=await rpc('gu_staff_role_v01432r1');
 if(role?.ok!==true||role.role!=='OWNER')throw error('Owner access required',403);
 if(stepup&&(await rpc('gu_staff_stepup_active_v01432r1'))!==true)
  throw error('Confirm your Owner password first',403);
 return user.id;
}
const dbHeaders=c=>({...serviceKey(c.secret),accept:'application/json'});
const url=(c,path)=>c.base+'/rest/v1/'+path;
const stripeGet=(c,path)=>getJson('https://api.stripe.com/v1/'+path,
 {headers:{authorization:'Bearer '+c.stripe}});
function categoryHint(meta){
 const raw=clean(meta?.site_category||meta?.catalog_category||'').toLowerCase();
 const hints={membership:'plan',membership_plan:'plan',subscription:'plan',founding_membership:'founding',
  founding:'founding',tool:'tool',tool_candidate:'tool',book:'book',ebook:'book',
  course:'course',bootcamp:'course',boot_camp:'course',training:'course',
  sparks:'addon',addon:'addon',feature:'feature'};
 return hints[raw]||'';
}
async function details(c,productId,priceId){
 const [account,product,price]=await Promise.all([
  stripeGet(c,'account'),stripeGet(c,'products/'+encodeURIComponent(productId)),
  stripeGet(c,'prices/'+encodeURIComponent(priceId))
 ]);
 if(account.id!==c.account||product.id!==productId||product.livemode!==true||product.active!==true||
    price.id!==priceId||price.product!==productId||price.livemode!==true||price.active!==true||
    price.currency!=='usd'||!Number.isSafeInteger(price.unit_amount)||price.unit_amount<0||
    price.billing_scheme!=='per_unit'||price.transform_quantity!==null)
  throw error('The Stripe Product/Price or LIVE account does not match',409);
 const interval=price.type==='one_time'?'one_time':clean(price.recurring?.interval);
 const count=interval==='one_time'?1:Number(price.recurring?.interval_count);
 if(!['one_time','day','week','month','year'].includes(interval)||
   !Number.isInteger(count)||count<1||count>365||
   (interval!=='one_time'&&price.recurring?.usage_type!=='licensed')||
   typeof product.name!=='string'||product.name.trim().length<2)
  throw error('Unsupported LIVE Stripe Price or Product contract',409);
 return {product,price,interval,count};
}
async function catalog(c,productId){
 const [items,matches]=await Promise.all([
  getJson(url(c,'gu_storefront_items_v014174?select=sku,category&limit=150'),{headers:dbHeaders(c)}),
  getJson(url(c,'gu_owner_stripe_registry_v1?select=sku,stripe_product_id,stripe_price_id&stripe_product_id=eq.'+
    encodeURIComponent(productId)+'&limit=2'),{headers:dbHeaders(c)})
 ]);
 if(!Array.isArray(items)||items.length>150||!Array.isArray(matches)||matches.length>1)
  throw error('Store SKU registry could not be reconciled',503);
 return {items,matches};
}
function chooseSku(product,productId,priceId,category,explicit,items,matches){
 const meta=product.metadata||{},raw=clean(meta.site_sku),preferred=clean(category),hint=categoryHint(meta);
 if(preferred&&!cats.has(preferred))throw error('Select a supported Store category',400);
 const linked=matches[0];
 if(linked&&linked.stripe_price_id!==priceId)
  throw error('This Stripe Product is already mapped to a different Price; an audited price change is required',409);
 let sku='',source='',generated=false;
 if(linked){
  if(!skuPattern.test(linked.sku))throw error('Existing Stripe mapping has an unsupported SKU',409);
  sku=linked.sku;source='supabase_existing_mapping';
 }else if(raw){
  if(skuPattern.test(raw)){sku=raw;source='stripe_site_sku';}
  else if(/^[A-Z0-9_-]{2,90}$/.test(raw)){
   const found=items.filter(row=>typeof row.sku==='string'&&row.sku.endsWith(':'+raw)&&skuPattern.test(row.sku));
   if(found.length>1&&!preferred)throw error('Several Store categories use this Stripe SKU: select a category',409);
   if(preferred){
    sku=preferred+':'+raw;
    // If the code already belongs to another category, require deliberate review.
    if(found.length===1&&found[0].sku!==sku)throw error('Stripe SKU is already assigned to '+found[0].sku,409);
    source=found.length?'existing_store_item':'stripe_site_sku';
   }else if(found.length===1){sku=found[0].sku;source='existing_store_item';}
   else if(hint){sku=hint+':'+raw;source='stripe_site_sku';}
   else throw error('Select a category to resolve this Stripe site_sku',400);
  }else throw error('Stripe site_sku uses an unsupported format; update its metadata first',409);
 }else if(explicit){
  if(!skuPattern.test(explicit))throw error('Invalid Store SKU',400);
  sku=explicit;source='existing_explicit_sku';
 }else{
  const selected=preferred||hint;
  if(!cats.has(selected))throw error('Select a Store category for a new Stripe product',400);
  const id=productId.slice(5).toUpperCase();
  if(!/^[A-Z0-9_]{6,78}$/.test(id))throw error('Stripe Product ID cannot generate a supported unique SKU',409);
  sku=selected+':STRIPE_'+id;source='generated_from_stripe_product_id';generated=true;
 }
 if(!skuPattern.test(sku))throw error('Resolved Store SKU is not supported',409);
 if(preferred&&sku.split(':')[0]!==preferred)throw error('Chosen category conflicts with the existing Store SKU',409);
 if(explicit&&sku!==explicit)throw error('Manual SKU differs from the verified Stripe/Store identifier',409);
 if(linked&&sku!==linked.sku)throw error('Registered product mapping changed unexpectedly',409);
 const conflicting=items.find(row=>row.sku===sku);
 if(generated&&conflicting&&!linked)throw error('Generated SKU already exists in the Store; review this product instead of overwriting it',409);
 if(conflicting&&conflicting.category!==({
  plan:'membership',course:'bootcamp'}[sku.split(':')[0]]||sku.split(':')[0]))
  throw error('The Store SKU belongs to a different category',409);
 return {sku,source,generated,category:sku.split(':')[0],existingListing:!!conflicting,
  stripeMetadataNeedsSync:!raw};
}
async function validateSourcePrices(c,sku,price,interval,count){
 const code=sku.split(':')[1],prefix=sku.split(':')[0];
 if(!['plan','tool','book'].includes(prefix))return;
 const queries={
  plan:'platform_plans?select=price_cents,billing_interval&plan_code=eq.',
  tool:'platform_tools?select=individual_price_cents&tool_code=eq.',
  book:'catalog_products?select=metadata&product_code=eq.'
 };
 const rows=await getJson(url(c,queries[prefix]+encodeURIComponent(code)+'&limit=1'),{headers:dbHeaders(c)});
 if(!Array.isArray(rows))throw error('Canonical pricing registry is unavailable',503);
 if(!rows.length)return;
 if(prefix==='book'){
  const amount=rows[0].metadata?.website_price_by_format_cents_v135?.digital;
  if(Number.isInteger(amount)&&amount!==price.unit_amount)
   throw error('The book digital edition price differs from its approved Store price',409);
  return;
 }
 const amount=prefix==='plan'?rows[0].price_cents:rows[0].individual_price_cents,
  cadence=prefix==='tool'?'month':rows[0].billing_interval==='lifetime'?'one_time':rows[0].billing_interval;
 if(amount!==price.unit_amount||cadence!==interval||count!==1)
  throw error('Existing Supabase price or billing interval differs; import refused',409);
}
async function syncStripeMetadata(c,productId,sku,category){
 // Stripe accepts field-wise metadata updates without touching price or other
 // product keys. Only write an empty site_sku, never replace approved metadata.
 const body=new URLSearchParams();
 body.set('metadata[site_sku]',sku);
 body.set('metadata[site_category]',category);
 const r=await fetch('https://api.stripe.com/v1/products/'+encodeURIComponent(productId),
  {method:'POST',headers:{authorization:'Bearer '+c.stripe,'content-type':'application/x-www-form-urlencoded'},
   body:body.toString(),cache:'no-store'});
 const item=await r.json().catch(()=>null);
 if(!r.ok||item?.id!==productId||item.metadata?.site_sku!==sku)
  throw error('Supabase mapping saved, but Stripe SKU metadata was not confirmed. Retry this import with the same IDs.',503);
}
export async function onRequestGet({request,env}){
 try{
  const c=cfg(env);await owner(request,c,false);
  const rows=await getJson(url(c,'gu_owner_stripe_registry_v1?select=sku,stripe_product_id,stripe_price_id,amount_cents,billing_interval,billing_interval_count,updated_at&order=updated_at.desc&limit=150'),{headers:dbHeaders(c)});
  return output({ok:true,registry:'supabase_cloudflare_runtime_v1',items:rows});
 }catch(e){return output({ok:false,error:e.message||'Registry unavailable'},e.status||503)}
}
export async function onRequestPost({request,env}){
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)
   throw error('Same-origin Owner action required',403);
  const c=cfg(env),actor=await owner(request,c);
  const raw=await request.text();
  if(raw.length>1600)throw error('Oversized product input',413);
  let form;try{form=JSON.parse(raw)}catch{throw error('Invalid JSON payload',400)}
  if(!form||Array.isArray(form)||typeof form!=='object'||
     Object.keys(form).some(k=>!['operation','productId','priceId','category','sku','expectedSku'].includes(k)))
   throw error('Invalid product registration');
  const op=clean(form.operation)||'save',productId=clean(form.productId),priceId=clean(form.priceId),
   category=clean(form.category),explicit=clean(form.sku);
  if(!['save','preview'].includes(op)||!pPattern.test(productId)||!pricePattern.test(priceId))
   throw error('Provide valid Stripe Product and Price IDs',400);
  const [{product,price,interval,count},{items,matches}]=await Promise.all([
   details(c,productId,priceId),catalog(c,productId)
  ]);
  const resolved=chooseSku(product,productId,priceId,category,explicit,items,matches);
  await validateSourcePrices(c,resolved.sku,price,interval,count);
  const info={ok:true,sku:resolved.sku,source:resolved.source,generated:resolved.generated,
   existingListing:resolved.existingListing,category:resolved.category,productName:product.name,
   priceCents:price.unit_amount,currency:'usd',billingInterval:interval,billingIntervalCount:count};
  if(op==='preview')return output({...info,preview:true,checkoutEnabledByImport:false});
  if(form.expectedSku!==undefined&&clean(form.expectedSku)!==resolved.sku)
   throw error('Store SKU changed since preview; verify this Stripe product again',409);
  const saved=await getJson(url(c,'rpc/gu_owner_register_stripe_product_v1'),{method:'POST',
   headers:{...dbHeaders(c),'content-type':'application/json'},
   body:JSON.stringify({p_actor:actor,p_sku:resolved.sku,p_product_id:productId,
    p_price_id:priceId,p_name:product.name,p_amount_cents:price.unit_amount,
    p_interval:interval,p_interval_count:count})});
  if(saved?.ok!==true||saved.sku!==resolved.sku)
   throw error('Supabase did not confirm the imported product',503);
  if(resolved.stripeMetadataNeedsSync)await syncStripeMetadata(c,productId,resolved.sku,resolved.category);
  return output({...saved,...info,source:'verified_stripe_live',skuSource:resolved.source,preview:false,stripeMetadataSynchronized:true,
   cloudflareRegistry:'runtime_from_supabase',
   notice:'Stripe metadata, website catalog and Supabase registry are synchronized. The import does not activate a paid checkout.'});
 }catch(e){return output({ok:false,error:e.message||'Product synchronization failed'},e.status||503)}
}
