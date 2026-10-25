/* Advertising-only Stripe TEST webhook adapter.
 * Existing GU39 edge webhook performs raw-body HMAC verification,
 * exact TEST account match and Owner TEST-mode checks FIRST.
 * This module never reads or writes production advertisers, campaigns,
 * customer subscription data or LIVE order evidence.
 */
const val=x=>typeof x==='string'?x:x?.id||null;
const okId=(x,p)=>new RegExp('^'+p+'_[A-Za-z0-9_]{6,}$').test(String(x||''));
const validUUID=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(x||''));
function headers(secret){
 if(String(secret).startsWith('sb_secret_'))return {apikey:secret};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(secret)))
 return {apikey:secret,authorization:'Bearer '+secret};
 throw Error('AD_SANDBOX_DB_CREDENTIALS_INVALID');
}
async function db(env,path,body){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,'')+'/rest/v1/'+path;
 const r=await fetch(url,{method:body?'POST':'GET',headers:{...headers(env.SUPABASE_SECRET_KEY),
 'content-type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 if(!r.ok)throw Error('AD_SANDBOX_DB_RETRY');
 return r.json();
}
async function stripe(env,path){
 if(!/^sk_test_/.test(env.GU39_STRIPE_TEST_SECRET_KEY||''))throw Error('TEST_KEY_REQUIRED');
 const r=await fetch('https://api.stripe.com/v1/'+path,{headers:{
 authorization:'Bearer '+env.GU39_STRIPE_TEST_SECRET_KEY},cache:'no-store'});
 if(!r.ok)throw Error('AD_SANDBOX_STRIPE_RETRY');
 const v=await r.json();if(!v||v.error)return null;
 return v;
}
async function verifiedCheckout(env,id){
 if(!okId(id,'cs_test'))throw Error('AD_SANDBOX_SESSION_INVALID');
 const s=await stripe(env,'checkout/sessions/'+encodeURIComponent(id));
 if(!s||s.id!==id||s.livemode!==false||s.mode!=='payment'||s.currency!=='usd')
 throw Error('AD_SANDBOX_SESSION_MODE_INVALID');
 const marker=s.metadata?.gu_ad_sandbox_intent,tag=s.metadata?.gu_ad_sandbox_tag;
 if(!marker&&!tag)return null;
 if(!validUUID(marker)||tag!=='AD_SANDBOX_2026'||marker!==s.client_reference_id)
 throw Error('AD_SANDBOX_SESSION_METADATA_INVALID');
 const data=await db(env,'gu_ad_sandbox_intents_v014240?select=*&id=eq.'+encodeURIComponent(marker)+'&limit=2');
 if(!Array.isArray(data)||data.length!==1||data[0].checkout_session!==s.id)
 throw Error('AD_SANDBOX_INTENT_NOT_BOUND');
 const i=data[0];
 const pricing=await db(env,'gu_ad_sandbox_prices_v014240?select=*&package_code=eq.'+encodeURIComponent(i.package_code)+'&limit=2');
 const p=pricing?.[0];if(pricing?.length!==1||p.test_amount_cents!==100)throw Error('AD_SANDBOX_PRICE_MAP_MISSING');
 const lines=await stripe(env,'checkout/sessions/'+encodeURIComponent(id)+'/line_items?limit=2');
 if(lines?.has_more||lines?.data?.length!==1||lines.data[0]?.quantity!==1
 ||val(lines.data[0].price)!==p.test_price_id
 ||val(lines.data[0].price?.product)!==p.test_product_id
 ||lines.data[0].amount_total!==100
 ||s.amount_total!==100||s.amount_subtotal!==100
 ||s.metadata?.gu_ad_sandbox_package!==i.package_code
 ||s.payment_intent_data!==undefined)
 throw Error('AD_SANDBOX_LINE_PRICE_MISMATCH');
 return {session:s,intent:i,pricing:p};
}
async function getPayment(env,session){
 const ref=val(session.payment_intent);
 if(!okId(ref,'pi'))throw Error('AD_SANDBOX_PAYMENT_INTENT_NOT_BOUND');
 const p=await stripe(env,'payment_intents/'+encodeURIComponent(ref));
 if(!p||p.id!==ref||p.livemode!==false||p.currency!=='usd'||
 p.amount!==100||p.amount_received!==100||p.status!=='succeeded'
 ||p.metadata?.gu_ad_sandbox_intent!==session.client_reference_id
 ||p.metadata?.gu_ad_sandbox_tag!=='AD_SANDBOX_2026')
 throw Error('AD_SANDBOX_PAYMENT_NOT_SETTLED');
 return p;
}
async function apply(env,e,ctx,kind,pi=null){
 const res=await db(env,'rpc/gu_ad_sandbox_apply_v014240',{
 p_intent:ctx.intent.id,p_event:e.id,p_session:ctx.session.id,p_kind:kind,
 p_payment_intent:pi?.id||null,p_customer:val(ctx.session.customer)||null,
 p_amount:kind==='paid'?100:null
 });
 if(!res?.ok||res.mode!=='SANDBOX')throw Error('AD_SANDBOX_EVENT_NOT_RECORDED');
 return {status:200,body:res.replayed?'AD_TEST_EVENT_REPLAY':'AD_TEST_'+kind.toUpperCase()};
}
async function fromPaymentIntent(env,ref){
 if(!okId(ref,'pi'))return null;
 const p=await stripe(env,'payment_intents/'+encodeURIComponent(ref));
 if(p?.livemode!==false)return null;
 const marker=p.metadata?.gu_ad_sandbox_intent,tag=p.metadata?.gu_ad_sandbox_tag;
 if(!marker&&!tag)return null;
 if(!validUUID(marker)||tag!=='AD_SANDBOX_2026')throw Error('AD_SANDBOX_PAYMENT_METADATA_INVALID');
 const ss=await stripe(env,'checkout/sessions?payment_intent='+encodeURIComponent(ref)+'&limit=2');
 if(ss?.has_more||ss?.data?.length!==1)throw Error('AD_SANDBOX_PAYMENT_CHECKOUT_NOT_UNIQUE');
 const ctx=await verifiedCheckout(env,ss.data[0].id);
 if(!ctx||ctx.session.payment_intent!==ref||ctx.intent.id!==marker)
 throw Error('AD_SANDBOX_REFUND_NOT_BOUND');
 return {ctx,p};
}
export async function handleAdSandbox(event,env){
 const type=event?.type;
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded',
 'checkout.session.async_payment_failed','charge.refunded','charge.dispute.created'].includes(type))
 return null;
 if(type.startsWith('checkout.session.')){
  const id=event.data?.object?.id;
  if(!okId(id,'cs_test'))return null;
  const ctx=await verifiedCheckout(env,id);
  if(!ctx)return null; // existing non-ad Stripe TEST transactions
  if(type==='checkout.session.async_payment_failed')
   return apply(env,event,ctx,'failed');
  if(ctx.session.payment_status!=='paid')return {status:200,body:'AD_TEST_AWAITING_PAYMENT'};
  const pi=await getPayment(env,ctx.session);
  return apply(env,event,ctx,'paid',pi);
 }
 const chargeRef=type==='charge.refunded'?event.data?.object?.id:val(event.data?.object?.charge);
 if(!okId(chargeRef,'ch'))return null;
 const charge=await stripe(env,'charges/'+encodeURIComponent(chargeRef));
 if(!charge||charge.livemode!==false||!okId(val(charge.payment_intent),'pi'))return null;
 const pair=await fromPaymentIntent(env,val(charge.payment_intent));
 if(!pair)return null;
 if(charge.customer!==val(pair.ctx.session.customer)||charge.payment_intent!==pair.p.id
 ||charge.amount!==100||charge.paid!==true)
 throw Error('AD_SANDBOX_CHARGE_BINDING_INVALID');
 if(type==='charge.refunded'){
  if(charge.amount_refunded!==100)return {status:200,body:'AD_TEST_PARTIAL_REFUND_NEEDS_REVIEW'};
  return apply(env,event,pair.ctx,'refunded',pair.p);
 }
 if(charge.disputed!==true)throw Error('AD_SANDBOX_DISPUTE_UNVERIFIED');
 return apply(env,event,pair.ctx,'disputed',pair.p);
}
