/* v0.14.0.72: allowlisted FREE member store QA. No paid GU58 products. */
const out=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json','cache-control':'private, no-store'}});
const fail=(code,status=503)=>Object.assign(new Error(code),{code,status});
const trim=x=>String(x??'').trim();
const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trim(x));
async function query(url,opts={}){
 const r=await fetch(url,{...opts,cache:'no-store'}),x=await r.json().catch(()=>null);
 if(!r.ok||x===null||x?.error)throw fail('VERIFICATION_UNAVAILABLE');
 return x;
}
function config(env){
 const base=trim(env.SUPABASE_URL).replace(/\/$/,''),
  allowed=trim(env.GU72_QA_ALLOWED_USER_ID),pub=trim(env.SUPABASE_PUBLISHABLE_KEY),
  secret=trim(env.SUPABASE_SECRET_KEY),key=trim(env.GU58_STRIPE_LIVE_SECRET_KEY),
  account=trim(env.GU58_STRIPE_LIVE_ACCOUNT_ID),
  price=trim(env.GU71_ZERO_LIVE_PRICE_ID),product=trim(env.GU71_ZERO_LIVE_PRODUCT_ID),
  origin=trim(env.PUBLIC_SITE_URL)||'https://stock-market-from-the-ground-up.pages.dev';
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!uuid(allowed)||!pub||!secret||
  !/^sk_live_[\w]+$/.test(key)||!/^acct_[\w]+$/.test(account)||
  !/^price_[\w]+$/.test(price)||!/^prod_[\w]+$/.test(product)||
  !/^https:\/\/[^/#?]+$/.test(origin))throw fail('QA_CONFIGURATION_MISSING');
 const paid=JSON.parse(trim(env.GU58_STRIPE_LIVE_CATALOG_JSON)||'{}');
 if(Object.values(paid).some(x=>x.price_id===price||x.product_id===product))throw fail('NOT_ISOLATED_QA_PRODUCT');
 return {base,allowed,pub,secret,key,account,price,product,origin};
}
const authHeaders=c=>({apikey:c.secret,...(c.secret.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.secret}),'content-type':'application/json'});
async function member(req,c){
 const token=/^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')||'')?.[1];
 if(!token)throw fail('SIGN_IN_REQUIRED',401);
 const u=await query(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token}});
 if(u.id!==c.allowed||!uuid(u.id)||!(u.confirmed_at||u.email_confirmed_at))throw fail('NOT_AUTHORIZED',403);
 const [a,g,p,flags]=await Promise.all([
  query(c.base+'/rest/v1/rpc/my_platform_access_for_user',{method:'POST',
   headers:authHeaders(c),body:JSON.stringify({target_user:u.id})}),
  query(c.base+'/rest/v1/user_plan_grants?select=ends_at,source_reference&user_id=eq.'+u.id+'&source=eq.stripe_zero_monthly_qa_v72&limit=1',{headers:authHeaders(c)}),
  query(c.base+'/rest/v1/profiles?select=account_kind&id=eq.'+u.id+'&limit=1',{headers:authHeaders(c)}),
  query(c.base+'/rest/v1/admin_user_flags?select=status&user_id=eq.'+u.id+'&limit=1',{headers:authHeaders(c)})
 ]);
 if(p?.[0]?.account_kind!=='member'||!Array.isArray(flags)||
   ['suspended','restricted'].includes(flags[0]?.status))throw fail('NOT_ELIGIBLE',403);
 return {user:u,access:a,used:g?.[0]||null};
}
async function verify(c){
 const h={authorization:'Bearer '+c.key};
 const [a,p,pr]=await Promise.all([
  query('https://api.stripe.com/v1/account',{headers:h}),
  query('https://api.stripe.com/v1/products/'+c.product,{headers:h}),
  query('https://api.stripe.com/v1/prices/'+c.price,{headers:h})
 ]);
 if(a.id!==c.account||p.id!==c.product||p.name!=='Live Test'||p.livemode!==true||p.active!==true||
   pr.id!==c.price||pr.product!==c.product||pr.livemode!==true||pr.active!==true||
   pr.currency!=='usd'||pr.unit_amount!==0||pr.type!=='one_time'||pr.recurring!=null||
   pr.billing_scheme!=='per_unit'||pr.transform_quantity!==null)
  throw fail('QA_PRICE_NOT_ZERO');
}
const enabled=e=>e.GU72_ZERO_MONTHLY_QA_ENABLED==='true'&&e.GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED==='true';
export async function onRequestGet({request,env}){
 try{
  const c=config(env),m=await member(request,c);
  if(new URL(request.url).origin!==c.origin)throw fail('INVALID_ORIGIN',403);
  const sid=new URL(request.url).searchParams.get('session_id');
  if(sid){
   if(!/^cs_live_[\w]{6,}$/.test(sid))throw fail('INVALID_SESSION',400);
   const session=await query('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(sid),
     {headers:{authorization:'Bearer '+c.key}});
   if(session.id!==sid||session.client_reference_id!==m.user.id||
     session.metadata?.gu72_zero_monthly_qa!=='true'||session.metadata?.gu72_member_id!==m.user.id||
     session.metadata?.gu72_price_id!==c.price)throw fail('NOT_MEMBER_SESSION',403);
   return out({ok:true,available:false,checkoutComplete:session.status==='complete',
    activated:m.used?.source_reference===sid&&m.access?.planCode==='FULL_MONTHLY',
    planCode:m.access?.planCode,expiresAt:m.used?.ends_at||null,
    awaitingSignedWebhook:session.status==='complete'&&!m.used});
  }
  if(!enabled(env)||m.access?.planCode!=='FREE'||m.used)return out({ok:true,available:false,
   planCode:m.access?.planCode,used:!!m.used});
  await verify(c);
  return out({ok:true,available:true,amountCents:0,oneTime:true,neverRenews:true});
 }catch(e){return out({ok:false,available:false,error:e.code||'QA_UNAVAILABLE'},e.status||503)}
}
export async function onRequestPost({request,env}){
 try{
  const c=config(env);
  if(request.headers.get('origin')!==c.origin||new URL(request.url).origin!==c.origin)throw fail('INVALID_ORIGIN',403);
  if(!enabled(env))throw fail('QA_DISABLED',403);
  const input=await request.json().catch(()=>null);
  if(!input||Object.keys(input).length!==1||input.confirm!=='ONE_TIME_ZERO_MONTHLY_QA')
    throw fail('EXPLICIT_CONFIRMATION_REQUIRED',400);
  const m=await member(request,c);
  if(m.access?.planCode!=='FREE'||m.used)throw fail('QA_ALREADY_USED',409);
  await verify(c);
  const params=new URLSearchParams({mode:'payment',
   'line_items[0][price]':c.price,'line_items[0][quantity]':'1',
   'customer_creation':'if_required','automatic_tax[enabled]':'false',
   client_reference_id:m.user.id,
   'metadata[gu72_zero_monthly_qa]':'true','metadata[gu72_member_id]':m.user.id,
   'metadata[gu72_price_id]':c.price,
   success_url:c.origin+'/store.html?gu72=complete&session_id={CHECKOUT_SESSION_ID}',
   cancel_url:c.origin+'/store.html?gu72=cancelled'});
  const day=new Date().toISOString().slice(0,10);
  const session=await query('https://api.stripe.com/v1/checkout/sessions',{method:'POST',
   headers:{authorization:'Bearer '+c.key,'content-type':'application/x-www-form-urlencoded',
    'Idempotency-Key':'gu72-zero-'+m.user.id+'-'+day},body:params.toString()});
  if(!/^cs_live_[\w]+$/.test(session.id||'')||session.livemode!==true||
    session.amount_total!==0||session.amount_subtotal!==0||session.mode!=='payment'||
    session.payment_intent!=null||session.subscription!=null||
    session.client_reference_id!==m.user.id||
    session.metadata?.gu72_zero_monthly_qa!=='true')throw fail('NOT_A_SAFE_ZERO_SESSION');
  const link=new URL(session.url);
  if(link.protocol!=='https:'||link.hostname!=='checkout.stripe.com')throw fail('INVALID_CHECKOUT_DESTINATION');
  return out({ok:true,amountCents:0,checkoutUrl:session.url});
 }catch(e){return out({ok:false,error:e.code||'QA_UNAVAILABLE'},e.status||503)}
}
