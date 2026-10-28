/* v0.14.0.197 Founding 600 LIVE checkout, fail-closed unless specifically launched.
 * Reserve the seat BEFORE creating Stripe Checkout; signed webhooks fulfill.
 * This never shares payment secrets with a browser or supports test subscriptions.
 */
import {foundingOfferState} from '../_lib/founder-offer-gate-v1.js';
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const fail=(msg,status=503)=>Object.assign(new Error(msg),{status});
const uuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s||'');
const plans={FOUNDING_14:{amount:2299,days:14},FOUNDING_30:{amount:4999,days:30},FOUNDING_60:{amount:5999,days:60}};
export function foundingProductReadyForCheckout(product,plan,expectedId){
 return product?.id===expectedId&&product.livemode===true&&product.active===true&&
   product.metadata?.site_sku===plan&&product.metadata?.site_checkout_enabled==='true'&&
   product.metadata?.fulfillment_verified==='true'&&product.metadata?.payment_launch_approved==='true';
}

function cfg(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const stripe=String(env.GU58_STRIPE_LIVE_SECRET_KEY||'');
 const pub=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 const key=String(env.SUPABASE_SECRET_KEY||'');
 const acct=String(env.GU58_STRIPE_LIVE_ACCOUNT_ID||'');
 if(env.GU_F600_LIVE_CHECKOUT_ENABLED!=='true'||env.GU_F600_LIVE_FULFILLMENT_APPROVED!=='true'
 ||!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)
 ||!stripe.startsWith('sk_live_')||!key||!pub||!/^acct_[A-Za-z0-9_]{6,}$/.test(acct))
 throw fail('Founding enrollment is not yet open.');
 let map;try{map=JSON.parse(String(env.GU_F600_LIVE_CATALOG_JSON||''))}catch{throw fail('Founding pricing is unavailable.')}
 if(!map||!['FOUNDING_30','FOUNDING_60'].every(k=>!!map[k])
 ||Object.keys(map).some(k=>!Object.hasOwn(plans,k))
 ||Object.entries(map).some(([p,m])=>!/^price_[A-Za-z0-9_]{6,}$/.test(m?.priceId||'')
 ||!/^prod_[A-Za-z0-9_]{6,}$/.test(m?.productId||'')))
 throw fail('Founding catalog is not authorized.');
 return {base,stripe,pub,key,acct,map};
}
function serviceHeaders(c){
 return {apikey:c.key,...(c.key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.key}),'content-type':'application/json'};
}
async function rest(c,path,method='GET',data){
 const r=await fetch(c.base+'/rest/v1/'+path,{method,headers:serviceHeaders(c),
 body:data===undefined?undefined:JSON.stringify(data),cache:'no-store'});
 if(!r.ok)throw fail('Member enrollment could not be verified.');
 return r.status===204?{}:r.json();
}
async function stripe(c,path,method='GET',form,idem){
 const r=await fetch('https://api.stripe.com/v1/'+path,{method,headers:{
 authorization:'Bearer '+c.stripe,...(form?{'content-type':'application/x-www-form-urlencoded'}:{}),
 ...(idem?{'Idempotency-Key':idem}:{})},body:form?.toString(),cache:'no-store'});
 const d=await r.json().catch(()=>null);if(!r.ok||!d||d.error)throw fail('Payment provider confirmation unavailable.');
 return d;
}
async function ageAndOwner(c,req){
 const token=/^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')||'')?.[1];
 if(!token)throw fail('Member sign-in is required.',401);
 const r=await fetch(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token},cache:'no-store'});
 if(!r.ok)throw fail('Member sign-in could not be confirmed.',401);
 const user=await r.json();
 if(!uuid(user.id))throw fail('Invalid member.',403);
 const [profile,age,flags,roles]=await Promise.all([
 rest(c,'profiles?select=account_kind,deleted_at&id=eq.'+user.id+'&limit=1'),
 rest(c,'account_private_identity?select=age_eligible,date_of_birth&user_id=eq.'+user.id+'&limit=1'),
 rest(c,'admin_user_flags?select=status&user_id=eq.'+user.id+'&limit=1'),
 rest(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+user.id)
 ]);
 if(profile?.[0]?.account_kind!=='member'||profile?.[0]?.deleted_at
 ||age?.[0]?.age_eligible!==true||!age?.[0]?.date_of_birth
 ||(flags||[]).some(x=>['suspended','restricted'].includes(x.status))
 ||(roles||[]).some(x=>x.role_code==='SHOWCASE_VIEWER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())))
 throw fail('This account is not eligible to enroll.',403);
 return user;
}
async function postBody(req){
 const len=Number(req.headers.get('content-length')||0);
 if(len>1024)throw fail('Request too large.',413);
 const stream=req.body?.getReader();if(!stream)throw fail('JSON required.',400);
 let bytes=0,parts=[];while(true){const x=await stream.read();if(x.done)break;bytes+=x.value.byteLength;if(bytes>1024)throw fail('Request too large.',413);parts.push(x.value)}
 const all=new Uint8Array(bytes);let offset=0;for(const p of parts){all.set(p,offset);offset+=p.byteLength}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all))}catch{throw fail('Invalid JSON.',400)}
}
export async function onRequestGet({env}){
 let enabled=false,offer,starterReady=false,published=()=>false;
 try{offer=await foundingOfferState(env)}catch{offer={offersVisible:false,enrollmentEnabled:false,phase:'unverified',remaining:0}}
 try{
  const c=cfg(env),state=await rest(c,'gu_founder_release_v014173?select=enrollment_enabled,billing_enabled,fulfillment_enabled&singleton=eq.true&limit=1');
  const tiers=await rest(c,'gu_founder_plans_v014173?select=plan_code,checkout_enabled');
  const [publicPlans,storeRows]=await Promise.all([
   rest(c,'platform_plans?select=plan_code,active,public_visible,checkout_enabled&plan_code=in.(FOUNDING_14,FOUNDING_30,FOUNDING_60)'),
   rest(c,'gu_storefront_items_v014174?select=sku,visible,sale_ready,status&category=eq.founding')
  ]);
  const published=plan=>{
   const p=publicPlans.find(x=>x.plan_code===plan);
   const item=storeRows.find(x=>x.sku==='founding:'+plan);
   return p?.active===true&&p.public_visible===true&&p.checkout_enabled===true
     &&item?.visible===true&&item.sale_ready===true&&item.status==='for_sale';
  };
  const originalTiers=tiers.filter(t=>t.plan_code==='FOUNDING_30'||t.plan_code==='FOUNDING_60');
  const starter=tiers.find(t=>t.plan_code==='FOUNDING_14');
  enabled=offer.enrollmentEnabled===true&&state?.length===1&&state[0].enrollment_enabled&&state[0].billing_enabled&&state[0].fulfillment_enabled
   &&originalTiers.length===2&&originalTiers.every(t=>t.checkout_enabled===true)
   &&originalTiers.every(t=>published(t.plan_code));
  starterReady=!!(enabled&&c.map.FOUNDING_14?.priceId&&starter?.checkout_enabled===true&&published('FOUNDING_14'));
 }catch{enabled=false}
 return json({ok:true,checkoutEnabled:enabled,offersVisible:offer.offersVisible===true,phase:offer.phase,remaining:offer.remaining,plans:[
  {code:'FOUNDING_14',priceCents:2299,billingDays:14,checkoutEnabled:starterReady},
  {code:'FOUNDING_30',priceCents:4999,billingDays:30,checkoutEnabled:enabled&&published('FOUNDING_30')},
  {code:'FOUNDING_60',priceCents:5999,billingDays:60,checkoutEnabled:enabled&&published('FOUNDING_60')}
 ]});
}
export async function onRequestPost({request,env}){
 try{
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin)throw fail('Invalid checkout origin.',403);
  const input=await postBody(request),plan=String(input?.plan||'');
  if(!Object.hasOwn(plans,plan)||input?.autoRenewConsent!==true||input?.founderTermsConsent!==true)
   throw fail('Select a plan and accept its recurring payment and founding terms.',400);
  // Before any Stripe or reservation interaction, enforce founder lifecycle.
  let offer;try{offer=await foundingOfferState(env)}catch{throw fail('Founding admission could not be verified.',503)}
  if(!offer.offersVisible||!offer.enrollmentEnabled)throw fail('Founding enrollment is closed.',409);
  const c=cfg(env),user=await ageAndOwner(c,request);
  const row=await rest(c,'gu_founder_plans_v014173?select=plan_code,checkout_enabled,price_cents,term_days&plan_code=eq.'+plan+'&limit=1');
  if(row.length!==1||row[0].checkout_enabled!==true||row[0].price_cents!==plans[plan].amount||row[0].term_days!==plans[plan].days||!c.map[plan])
   throw fail('This founding plan is not accepting payments.',409);
  // Explicit Admin publication is independent from a catalogue price or a
  // LIVE provider flag. Hidden and not-for-sale entries fail before Stripe.
  const [publicPlanRows,storeRows,overrides]=await Promise.all([
    rest(c,'platform_plans?select=active,public_visible,checkout_enabled&plan_code=eq.'+plan+'&limit=1'),
    rest(c,'gu_storefront_items_v014174?select=visible,sale_ready,status&sku=eq.'+encodeURIComponent('founding:'+plan)+'&limit=1'),
    rest(c,'store_product_overrides_v014175?select=store_visible,lifecycle&sku=eq.'+plan+'&limit=1')
  ]);
  if(publicPlanRows[0]?.active!==true||publicPlanRows[0]?.public_visible!==true
    ||publicPlanRows[0]?.checkout_enabled!==true
    ||storeRows[0]?.visible!==true||storeRows[0]?.sale_ready!==true||storeRows[0]?.status!=='for_sale'
    ||overrides[0]?.store_visible!==true||overrides[0]?.lifecycle!=='release_ready')
   throw fail('This founding plan is hidden or not released for purchase.',409);
  const account=await stripe(c,'account');if(account.id!==c.acct)throw fail('Payment account mismatch.');
  const pm=c.map[plan],price=await stripe(c,'prices/'+encodeURIComponent(pm.priceId)),expected=plans[plan];
  if(price.id!==pm.priceId||price.product!==pm.productId||price.livemode!==true||price.active!==true
  ||price.unit_amount!==expected.amount||price.currency!=='usd'
  ||price.type!=='recurring'||price.recurring?.interval!=='day'
  ||price.recurring?.interval_count!==expected.days||price.recurring?.usage_type!=='licensed'
  ||price.billing_scheme!=='per_unit'||price.transform_quantity!==null)
   throw fail('Stripe pricing does not match approved founding terms.');
  // Do not reserve a founder seat before checking that its LIVE product is
  // genuinely activated, fulfills promised benefits, and is Owner-approved.
  const product=await stripe(c,'products/'+encodeURIComponent(pm.productId));
  if(!foundingProductReadyForCheckout(product,plan,pm.productId))
   throw fail('Founding benefits or Stripe product have not passed final launch acceptance.',503);
  const intent=crypto.randomUUID(),expires=new Date(Date.now()+30*60*1000).toISOString();
  const reserved=await rest(c,'rpc/gu_founder_reserve_with_consent_v014198','POST',{
   p_user_id:user.id,p_plan_code:plan,p_intent_key:intent,p_expires_at:expires,p_terms_version:'F600-2026-10-24'
  });
  if(!reserved?.ok||!uuid(reserved.reservationId))
   return json({ok:false,error:reserved?.error||'Founding enrollment is unavailable.'},409);
  const params=new URLSearchParams({
   expires_at:String(Math.floor(Date.now()/1000)+30*60),
   mode:'subscription','line_items[0][price]':pm.priceId,'line_items[0][quantity]':'1',
   client_reference_id:reserved.reservationId,
   'metadata[f600_reservation]':reserved.reservationId,'metadata[f600_user]':user.id,'metadata[f600_plan]':plan,
   'subscription_data[metadata][f600_reservation]':reserved.reservationId,
   success_url:origin+'/checkout-status.html?session_id={CHECKOUT_SESSION_ID}',
   cancel_url:origin+'/founders-commons.html?checkout_cancelled=1'
  });
  const session=await stripe(c,'checkout/sessions','POST',params,'F600-live-'+reserved.reservationId);
  const url=new URL(session.url||'https://invalid.local/');
  if(session.livemode!==true||session.mode!=='subscription'||session.id?.startsWith('cs_live_')!==true
  ||session.client_reference_id!==reserved.reservationId||session.status!=='open'
  ||url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')
   throw fail('Checkout session could not be verified.');
  const bound=await rest(c,'rpc/gu_founder_bind_checkout_v014193','POST',{
   p_reservation:reserved.reservationId,p_user:user.id,p_session_id:session.id,p_price_id:pm.priceId
  });
  if(!bound?.ok){
   try{await stripe(c,'checkout/sessions/'+encodeURIComponent(session.id)+'/expire','POST',new URLSearchParams())}catch{}
   throw fail('Reserved seat was not safely bound to checkout; no payment permitted.');
  }
  return json({ok:true,checkoutUrl:url.href,founderNumber:reserved.seat,
   recurringCents:expected.amount,billingEveryDays:expected.days});
 }catch(e){return json({ok:false,error:e.status===400||e.status===403||e.status===409?e.message:'Founding checkout is not active or cannot be safely verified.'},[400,401,403,409,413].includes(e.status)?e.status:503)}
}
