export const OFFERS=Object.freeze({
 CHART_ADVANCED_30D:Object.freeze({tier:'ADVANCED',amountCents:999,durationDays:30,label:'Crownlight Chart Studio Advanced — 30 Days'}),
 CHART_PROFESSIONAL_30D:Object.freeze({tier:'PROFESSIONAL',amountCents:1999,durationDays:30,label:'Crownlight Chart Studio Professional — 30 Days'})
});
export const rank={STANDARD:0,ADVANCED:1,PROFESSIONAL:2};
export const validId=(value,prefix)=>new RegExp('^'+prefix+'_[A-Za-z0-9_]{6,}$').test(String(value||''));
export function config(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)||!key)throw Error('CHART_DB_UNAVAILABLE');
 return {base,key};
}
export async function db(c,path,options={}){
 const headers={apikey:c.key,accept:'application/json',
  ...(c.key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.key}),
  ...options.headers};
 const response=await fetch(c.base+'/rest/v1/'+path,{...options,headers,cache:'no-store'});
 if(!response.ok)throw Error('CHART_DB_UNAVAILABLE');
 return response.status===204?null:response.json();
}
export async function stripe(env,path,options={}){
 const key=String(env.STRIPE_TEST_SECRET_KEY||env.GU39_STRIPE_TEST_SECRET_KEY||'');
 if(!key.startsWith('sk_test_'))throw Error('CHART_TEST_STRIPE_UNAVAILABLE');
 const response=await fetch('https://api.stripe.com/v1/'+path,{...options,
  headers:{authorization:'Bearer '+key,...options.headers},cache:'no-store'});
 if(!response.ok)throw Error('CHART_TEST_STRIPE_UNAVAILABLE');
 const value=await response.json();
 if(value?.livemode===true||value?.error)throw Error('CHART_TEST_STRIPE_MODE');
 return value;
}
export function catalog(env){
 let obj;try{obj=JSON.parse(String(env.CHART_STUDIO_TEST_CATALOG_JSON||''))}catch{throw Error('CHART_TEST_CATALOG_UNAVAILABLE')}
 if(!obj||Array.isArray(obj)||Object.keys(obj).length!==2||
  Object.keys(OFFERS).some(sku=>!validId(obj[sku]?.price_id,'price')||
   !validId(obj[sku]?.product_id,'prod'))||
  new Set(Object.values(obj).map(x=>x.price_id)).size!==2||
  new Set(Object.values(obj).map(x=>x.product_id)).size!==2)
  throw Error('CHART_TEST_CATALOG_UNAVAILABLE');
 return obj;
}
export async function verifyPrice(env,sku){
 const item=catalog(env)[sku],offer=OFFERS[sku];
 if(!item||!offer)throw Error('UNKNOWN_CHART_SKU');
 const price=await stripe(env,'prices/'+encodeURIComponent(item.price_id));
 if(price.id!==item.price_id||price.product!==item.product_id||
  price.livemode!==false||price.active!==true||price.type!=='one_time'||
  price.currency!=='usd'||price.unit_amount!==offer.amountCents||
  price.billing_scheme!=='per_unit'||price.transform_quantity!==null)
  throw Error('CHART_TEST_PRICE_MISMATCH');
 return item;
}
export async function rows(c,userId){
 return db(c,'crownlight_chart_cash_upgrades_v1?select=id,sku,tier,state,starts_at,expires_at,revoked_at,stripe_session_id,stripe_payment_intent_id,stripe_price_id,amount_cents&user_id=eq.'+
  encodeURIComponent(userId)+'&order=created_at.desc&limit=30');
}
