/* v0.14.0.38: STAGING-ONLY, member-bound Stripe Managed Checkout candidate.
 * No production live payments. Requires dedicated staging Supabase ref, sk_test_ and flags.
 */
const respond=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const err=(message,status=403)=>Object.assign(new Error(message),{status});
const val=x=>String(x??'').trim();
const products={
 'plan:FULL_MONTHLY':'prod_VRvuGwLKI16MXU','plan:FULL_ANNUAL':'prod_VRvyBNhWk9jshb',
 'plan:LIFETIME':'prod_VRwgISspL5mhls','plan:ONDEMAND_MONTHLY':'prod_VRwjus5sQLtTad',
 'tool:INTERACTIVE_LEARNING':'prod_VRwmmu4zATdHAb','tool:JOURNAL_ANALYTICS':'prod_VRwoX4hTg8fRCm',
 'tool:MARKET_SIMULATOR':'prod_VRwrsEpvfw60Xh','tool:MARKET_TUTOR':'prod_VRwuiqDt8qHayI'
};
function environment(env){const ref=val(env.GU_STRIPE_V38_STAGING_PROJECT_REF);
 const base=val(env.SUPABASE_URL).replace(/\/$/,'');const secret=val(env.SUPABASE_SECRET_KEY),pub=val(env.SUPABASE_PUBLISHABLE_KEY),stripe=val(env.STRIPE_MANAGED_SECRET_KEY);
 if(env.GU_STRIPE_V38_STAGING!=='true'||env.GU_STRIPE_V38_FULFILLMENT!=='true'||
  !/^[a-z0-9]{20}$/.test(ref)||ref==='oxihglyfgzywsupnyicb'||base!==`https://${ref}.supabase.co`||
  !secret||!pub||!stripe.startsWith('sk_test_'))throw err('Stripe customer testing requires a separate staging database.',503);
 return {base,secret,pub,stripe};}
async function request(url,options){const r=await fetch(url,{...options,cache:'no-store'});const d=await r.json().catch(()=>null);
 if(!r.ok||!d)throw err('Stripe testing service unavailable.',503);return d;}
const h=c=>({apikey:c.secret,...(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(c.secret)?{authorization:'Bearer '+c.secret}:{}),'content-type':'application/json'});
async function db(c,path,method='GET',body,prefer='return=representation'){
 return request(c.base+'/rest/v1/'+path,{method,headers:{...h(c),prefer},body:body===undefined?undefined:JSON.stringify(body)});
}
async function validateUser(c,req){const token=/^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')||'')?.[1];if(!token)throw err('Sign in before testing checkout.',401);
 const user=await request(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token}});
 if(!/^[0-9a-f-]{36}$/i.test(user.id||''))throw err('Account validation failed.',401);
 const ps=await db(c,`profiles?select=id,account_kind&id=eq.${user.id}&limit=1`);
 const fs=await db(c,`admin_user_flags?select=status&user_id=eq.${user.id}&limit=1`);
 const roles=await db(c,`admin_user_roles?select=role_code&user_id=eq.${user.id}&role_code=eq.SHOWCASE_VIEWER&limit=1`);
 if(ps[0]?.account_kind!=='member'||['suspended','restricted'].includes(fs[0]?.status)||roles.length)throw err('Account not eligible for checkout.',403);
 return user;
}
function mappedPrice(env,key){let m;try{m=JSON.parse(val(env.STRIPE_MANAGED_PRICE_MAP_JSON)||'{}')}catch{throw err('Price mapping invalid.',503)}
 if(!m||Array.isArray(m)||typeof m!=='object'||!/^price_[A-Za-z0-9_]{6,}$/.test(val(m[key])))throw err('Stripe test Price ID is not connected.',503);
 return val(m[key]);}
async function product(c,kind,code){const key=kind+':'+code;if(!Object.hasOwn(products,key))throw err('Product not included in this test.',403);
 const isPlan=kind==='plan', path=isPlan?`platform_plans?select=*&plan_code=eq.${code}&limit=1`:`platform_tools?select=*&tool_code=eq.${code}&limit=1`;
 const r=(await db(c,path))[0];if(!r||r.active!==true||r.public_visible!==true||r.checkout_enabled!==true||(!isPlan&&r.status!=='live'))throw err('This product is not enabled for checkout.',403);
 const amount=Number(isPlan?r.price_cents:r.individual_price_cents),bill=isPlan?r.billing_interval:'month';
 if(!Number.isSafeInteger(amount)||amount<1||!['month','year','lifetime'].includes(bill))throw err('Invalid catalog price.',503);
 return {key,amount,bill,productId:products[key]};
}
async function verifyPrice(c,price,p){const q=await request('https://api.stripe.com/v1/prices/'+encodeURIComponent(price),{headers:{authorization:'Bearer '+c.stripe}});
 if(q.id!==price||q.livemode!==false||q.active!==true||q.product!==p.productId||q.currency!=='usd'||q.unit_amount!==p.amount||
  (p.bill==='lifetime'?q.type!=='one_time':q.type!=='recurring'||q.recurring?.interval!==p.bill))throw err('Stripe Price ID does not match the approved product and amount.',503);
}
export async function onRequestPost({request:req,env}){
 try{if(Number(req.headers.get('content-length')||0)>2048)throw err('Request too large.',413);
  const origin=req.headers.get('origin'),here=new URL(req.url);if(origin&&origin!==here.origin)throw err('Cross-site checkout denied.',403);
  const c=environment(env),u=await validateUser(c,req),input=await req.json().catch(()=>({}));
  const type=val(input.type),code=val(input.code);
  if(!['plan','tool'].includes(type)||!/^[A-Z0-9_]{3,90}$/.test(code))throw err('Unsupported product.',400);
  const p=await product(c,type,code),price=mappedPrice(env,p.key);await verifyPrice(c,price,p);
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
  const id=crypto.randomUUID();await db(c,'gu_stripe_checkout_intents_v01438','POST',{id,user_id:u.id,sku_kind:type,sku_code:code,price_id:price,quoted_amount_cents:p.amount,status:'prepared'});
  const params=new URLSearchParams();params.set('managed_payments[enabled]','true');params.set('mode',p.bill==='lifetime'?'payment':'subscription');params.set('line_items[0][price]',price);params.set('line_items[0][quantity]','1');
  params.set('client_reference_id',id);params.set('metadata[gu_intent]',id);
  params.set('success_url',here.origin+'/checkout-status.html?session_id={CHECKOUT_SESSION_ID}');params.set('cancel_url',here.origin+'/checkout.html?cancelled=1');
  if(p.bill!=='lifetime')params.set('subscription_data[metadata][gu_intent]',id);
  const session=await request('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{authorization:'Bearer '+c.stripe,'content-type':'application/x-www-form-urlencoded','Idempotency-Key':'gu38-checkout-'+id},body:params.toString()});
  if(!/^cs_test_[A-Za-z0-9_]+$/.test(session.id||''))throw err('Unexpected Stripe test session.',503);
  const target=new URL(session.url);if(target.protocol!=='https:'||target.hostname!=='checkout.stripe.com')throw err('Invalid Stripe destination.',503);
  await db(c,`gu_stripe_checkout_intents_v01438?id=eq.${id}`,'PATCH',{stripe_session_id:session.id,status:'checkout_created'},'return=minimal');
  return respond({ok:true,sandboxOnly:true,url:session.url,notice:'Test checkout only. Staging member account and database are required.'});
 }catch(e){return respond({ok:false,error:[400,403,409].includes(e.status)?e.message:'Stripe customer testing unavailable.'},e.status||503)}
}
// Public readiness: returns only a boolean; never leaks private credentials, prices or account details.
export function onRequestGet({env}){
 try{environment(env);return respond({ok:true,sandboxReady:true,livePayments:false})}
 catch{return respond({ok:true,sandboxReady:false,livePayments:false})}
}
