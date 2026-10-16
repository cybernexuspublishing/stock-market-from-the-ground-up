/* R2: OWNER-only Stripe Managed Payments SANDBOX. No production orders, grants or entitlements.
 * Stripe Managed payment sessions use Stripe's managed_payments[enabled] setting.
 * Never reuse this endpoint to grant paid membership or download access.
 */
const H={'content-type':'application/json','cache-control':'private,no-store','x-content-type-options':'nosniff'};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
const text=x=>String(x??'').trim();
const fail=(message,status=403)=>Object.assign(new Error(message),{status});
const CODES=/^[A-Z0-9_]{3,90}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function config(env){const base=text(env.SUPABASE_URL).replace(/\/$/,''),pub=text(env.SUPABASE_PUBLISHABLE_KEY),key=text(env.SUPABASE_SECRET_KEY);
 if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(base)||!pub||!key)throw fail('Database configuration missing.',503);
 if(env.STRIPE_MANAGED_TEST_CHECKOUT_ENABLED!=='true'||!text(env.STRIPE_MANAGED_SECRET_KEY).startsWith('sk_test_'))
   throw fail('Stripe Managed Payments sandbox is disabled.',503);
 return {base,pub,key,stripe:text(env.STRIPE_MANAGED_SECRET_KEY)};
}
async function json(url,opt){const r=await fetch(url,{...opt,cache:'no-store'}),p=await r.json().catch(()=>({}));if(!r.ok)throw fail('Test provider or database request failed.',503);return p}
async function admin(env,req,c){const jwt=/^Bearer\s+([^\s]+)$/i.exec(req.headers.get('authorization')||'')?.[1];if(!jwt)throw fail('Staff login required.',401);
 const user=await json(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+jwt}});
 if(!UUID.test(user.id||''))throw fail('Invalid authenticated user.',401);
 const headers={apikey:c.pub,authorization:'Bearer '+jwt,'content-type':'application/json'};
 const [role,step]=await Promise.all([
  json(c.base+'/rest/v1/rpc/gu_staff_role_v01432r1',{method:'POST',headers,body:'{}'}),
  json(c.base+'/rest/v1/rpc/gu_staff_stepup_active_v01432r1',{method:'POST',headers,body:'{}'})
 ]);
 if(role.role!=='OWNER'||step!==true)throw fail('OWNER password confirmation required.',403);
 return user;
}
async function service(env,c,path,method='GET',body){return json(c.base+'/rest/v1/'+path,{method,headers:{apikey:c.key,authorization:'Bearer '+c.key,'content-type':'application/json',prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)})}
async function item(env,c,kind,code){
 if(!['plan','tool','book'].includes(kind)||!CODES.test(code))throw fail('Unrecognized test product.',400);
 let amount=0,billing='none',currency='usd';
 if(kind==='plan'||kind==='tool'){
  const name=kind==='plan'?'platform_plans':'platform_tools',column=kind==='plan'?'plan_code':'tool_code';
  const row=(await service(env,c,name+'?select=*&'+column+'=eq.'+encodeURIComponent(code)+'&active=eq.true&limit=1'))[0];
  if(!row)throw fail('Product not in catalog.',404);
  amount=Number(kind==='plan'?row.price_cents:row.individual_price_cents);
  billing=kind==='plan'?text(row.billing_interval):'month';
  if(['lifetime','one_time','once'].includes(billing))billing='none';
  else if(billing==='monthly')billing='month';
  else if(billing==='annual'||billing==='yearly')billing='year';
  currency=text(kind==='plan'?row.currency:'usd').toLowerCase()||'usd';
 }else{
  const p=(await service(env,c,'catalog_products?select=*&product_code=eq.'+encodeURIComponent(code)+'&product_type=eq.book&limit=1'))[0];
  if(!p||p.kdp_select||!p.direct_digital_enabled)throw fail('Book not eligible for direct digital distribution.',403);
  const rights=await service(env,c,'rpc/gu_digital_offer_status_v01430','POST',{p_product_code:code});
  if(rights?.available!==true)throw fail('Book distribution rights unavailable.',403);
  amount=Number(p.metadata?.website_price_by_format_cents_v135?.digital);billing='none';
 }
 if(!Number.isSafeInteger(amount)||amount<=0||currency!=='usd')throw fail('Price not eligible for test checkout.',503);
 let prices;try{prices=JSON.parse(text(env.STRIPE_MANAGED_PRICE_MAP_JSON)||'{}')}catch{throw fail('Invalid managed price mapping.',503)}
 const price=prices[kind+':'+code];if(!/^price_[A-Za-z0-9_]{6,}$/.test(String(price||'')))throw fail('Stripe test price mapping required.',503);
 return {kind,code,amount,currency,billing,price};
}
async function verifyPrice(c,it){const r=await json('https://api.stripe.com/v1/prices/'+encodeURIComponent(it.price),{headers:{authorization:'Bearer '+c.stripe}});
 if(r.id!==it.price||r.livemode!==false||r.active!==true||r.currency!=='usd'||r.unit_amount!==it.amount)
  throw fail('Stripe price mismatches approved website price or environment.',503);
 if(it.billing==='none' && r.type!=='one_time')throw fail('One-time price required.',503);
 if(it.billing!=='none' && (!r.recurring||!['month','year'].includes(r.recurring.interval)||r.recurring.interval!==it.billing))
  throw fail('Stripe recurring interval mismatches product plan.',503);
}
export async function onRequest({request,env}){
 try{
  if(request.method!=='POST')return response({ok:false,error:'POST only'},405);
  if(Number(request.headers.get('content-length')||'0')>4096)return response({ok:false,error:'Oversize request'},413);
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw fail('Origin denied.',403);
  const c=config(env),who=await admin(env,request,c);
  const route=await service(env,c,'rpc/gu_digital_payment_route_get_v01432r2','POST',{});
  if(route.provider!=='STRIPE_MANAGED'||route.enabled!==true)throw fail('Stripe Managed provider route is disabled.',503);
  const body=await request.json().catch(()=>({}));const it=await item(env,c,text(body.type),text(body.code));
  await verifyPrice(c,it); // Owner-approved website amount must match Stripe API.
  const id=crypto.randomUUID();
  await service(env,c,'gu_stripe_managed_test_sessions_v01432r2','POST',{id,staff_user_id:who.id,sku_code:it.code,sku_type:it.kind,status:'prepared'});
  const site=text(env.PUBLIC_SITE_URL)||new URL(request.url).origin;
  const u=new URL(site);if(u.protocol!=='https:'&&u.hostname!=='localhost')throw fail('Untrusted checkout site.',503);
  const data=new URLSearchParams();data.set('managed_payments[enabled]','true');data.set('mode',it.billing==='none'?'payment':'subscription');
  data.set('line_items[0][price]',it.price);data.set('line_items[0][quantity]','1');
  data.set('client_reference_id',id);data.set('metadata[gu_test_session]',id);
  data.set('success_url',u.origin+'/admin.html#commerce-test-complete');data.set('cancel_url',u.origin+'/admin.html#commerce-test-cancelled');
  const r=await json('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{authorization:'Bearer '+c.stripe,
   'content-type':'application/x-www-form-urlencoded','Idempotency-Key':'gu-managed-test-'+id},body:data.toString()});
  if(!/^cs_test_[A-Za-z0-9_]+$/.test(String(r.id||'')))throw fail('Unexpected test checkout session.',503);
  const link=new URL(r.url);if(link.protocol!=='https:'||link.hostname!=='checkout.stripe.com')throw fail('Invalid Stripe checkout destination.',503);
  await service(env,c,'gu_stripe_managed_test_sessions_v01432r2?id=eq.'+id,'PATCH',{stripe_session_id:r.id,status:'checkout_created'});
  return response({ok:true,sandboxOnly:true,url:r.url,sessionId:id,
   warning:'Test payment only. No memberships, digital downloads or production orders are granted.'});
 }catch(err){return response({ok:false,error:err.status===401?'Sign in required.':err.status===403?err.message:'Stripe Managed sandbox unavailable.'},err.status||503)}
}
