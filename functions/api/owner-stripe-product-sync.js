/* Owner Products: link existing LIVE Stripe Product/Price to canonical Supabase catalog.
 * Cloudflare Pages reads this registry on demand; never store price IDs in
 * client script or require a dashboard environment-variable rewrite.
 * Import is NOT a checkout approval or entitlement grant.
 */
const output=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const error=(message,status=400)=>Object.assign(new Error(message),{status});
const clean=x=>String(x??'').trim();
const serviceKey=k=>({apikey:k,...(k.startsWith('sb_secret_')?{}:{authorization:'Bearer '+k})});
async function getJson(url,options={}){
 const r=await fetch(url,{...options,cache:'no-store'});const j=await r.json().catch(()=>null);
 if(!r.ok||j===null)throw error('Provider/registry response unavailable',503);return j;
}
function cfg(env){
 const base=clean(env.SUPABASE_URL).replace(/\/$/,''),pub=clean(env.SUPABASE_PUBLISHABLE_KEY),
  secret=clean(env.SUPABASE_SECRET_KEY),stripe=clean(env.GU58_STRIPE_LIVE_SECRET_KEY),account=clean(env.GU58_STRIPE_LIVE_ACCOUNT_ID);
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!pub||!secret||
 !/^sk_live_[A-Za-z0-9_]+$/.test(stripe)||!/^acct_[A-Za-z0-9_]{6,}$/.test(account))
 throw error('Server catalog integrations are not configured',503);
 return {base,pub,secret,stripe,account};
}
async function owner(request,c){
 const bearer=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!bearer)throw error('Sign in as Owner',401);
 const h={apikey:c.pub,authorization:'Bearer '+bearer};
 const user=await getJson(c.base+'/auth/v1/user',{headers:h});
 if(!/^[0-9a-f-]{36}$/i.test(user?.id||''))throw error('Owner session invalid',401);
 const rpc=async name=>getJson(c.base+'/rest/v1/rpc/'+name,{method:'POST',headers:{...h,'content-type':'application/json'},body:'{}'});
 const role=await rpc('gu_staff_role_v01432r1');
 if(role?.ok!==true||role.role!=='OWNER')throw error('Owner access required',403);
 const step=await rpc('gu_staff_stepup_active_v01432r1');
 if(step!==true)throw error('Confirm your Owner password first',403);
 return user.id;
}
function skuPattern(s){return /^(addon|book|course|feature|founding|membership|plan|tool):[A-Z0-9_-]{2,90}$/.test(s)}
function headers(c){return {...serviceKey(c.secret),accept:'application/json'}}
export async function onRequestGet({request,env}){
 try{
  const c=cfg(env);await owner(request,c);
  const rows=await getJson(c.base+'/rest/v1/gu_owner_stripe_registry_v1?select=sku,stripe_product_id,stripe_price_id,amount_cents,billing_interval,billing_interval_count,updated_at&order=updated_at.desc&limit=150',{headers:headers(c)});
  return output({ok:true,registry:'supabase_cloudflare_runtime_v1',items:rows});
 }catch(e){return output({ok:false,error:e.message||'Registry unavailable'},e.status||503)}
}
export async function onRequestPost({request,env}){
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw error('Same-origin Owner action required',403);
  const c=cfg(env),actor=await owner(request,c);
  const bodyText=await request.text();
  if(bodyText.length>1600)throw error('Oversized product input',413);
  const form=JSON.parse(bodyText);
  if(!form||Array.isArray(form)||typeof form!=='object'||Object.keys(form).some(k=>!['sku','productId','priceId'].includes(k)))throw error('Invalid product registration');
  const sku=clean(form.sku),productId=clean(form.productId),priceId=clean(form.priceId);
  if(!skuPattern(sku)||!/^prod_[A-Za-z0-9_]{6,}$/.test(productId)||!/^price_[A-Za-z0-9_]{6,}$/.test(priceId))throw error('Provide a valid SKU, Stripe Product ID and Stripe Price ID');
  const [account,p,price]=await Promise.all([
   getJson('https://api.stripe.com/v1/account',{headers:{authorization:'Bearer '+c.stripe}}),
   getJson('https://api.stripe.com/v1/products/'+encodeURIComponent(productId),{headers:{authorization:'Bearer '+c.stripe}}),
   getJson('https://api.stripe.com/v1/prices/'+encodeURIComponent(priceId),{headers:{authorization:'Bearer '+c.stripe}})
  ]);
  if(account.id!==c.account||p.id!==productId||p.livemode!==true||p.active!==true||
   price.id!==priceId||price.product!==productId||price.livemode!==true||price.active!==true||
   price.currency!=='usd'||!Number.isInteger(price.unit_amount)||price.unit_amount<0||
   price.billing_scheme!=='per_unit'||price.transform_quantity!==null)
    throw error('LIVE Stripe Product, Price, or account does not match',409);
  const interval=price.type==='one_time'?'one_time':clean(price.recurring?.interval),
   count=price.type==='one_time'?1:Number(price.recurring?.interval_count);
  if(!['one_time','day','week','month','year'].includes(interval)||!Number.isInteger(count)||count<1||count>365||
   (interval!=='one_time'&&price.recurring?.usage_type!=='licensed')||
   !p.name||p.name.length>200)throw error('Unsupported Stripe price contract',409);
  // A known platform plan/tool must match the canonical amount and cadence.
  if(sku.startsWith('plan:')||sku.startsWith('tool:')){
   const isPlan=sku.startsWith('plan:'),code=sku.split(':')[1];
   const url=c.base+'/rest/v1/'+(isPlan?'platform_plans?select=price_cents,billing_interval&plan_code=eq.':'platform_tools?select=individual_price_cents&tool_code=eq.')+encodeURIComponent(code)+'&limit=1';
   const known=await getJson(url,{headers:headers(c)});
   if(Array.isArray(known)&&known.length){
    const amount=isPlan?known[0].price_cents:known[0].individual_price_cents,
    expected=isPlan?(known[0].billing_interval==='lifetime'?'one_time':known[0].billing_interval):'month';
    if(amount!==price.unit_amount||expected!==interval||count!==1)throw error('Existing Supabase price or billing cadence differs: import refused',409);
   }
  }
  const body={p_actor:actor,p_sku:sku,p_product_id:productId,p_price_id:priceId,
   p_name:p.name,p_amount_cents:price.unit_amount,p_interval:interval,p_interval_count:count};
  const saved=await getJson(c.base+'/rest/v1/rpc/gu_owner_register_stripe_product_v1',{method:'POST',
   headers:{...headers(c),'content-type':'application/json'},body:JSON.stringify(body)});
  return output({...saved,source:'verified_stripe_live',cloudflareRegistry:'runtime_from_supabase',
    notice:'The website and Cloudflare runtime registry updated without redeployment. Existing paid checkout/fulfillment controls are unchanged.'});
 }catch(e){return output({ok:false,error:e.message||'Product registration failed'},e.status||503)}
}
