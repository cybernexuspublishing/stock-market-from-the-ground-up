/* Crownlight Lumens — QA-ONLY genuine Stripe TEST Checkout, shadow-credit ledger.
 * This endpoint NEVER grants, adjusts, or exposes purchased credits in the real wallet.
 * Customer LIVE purchase of Lumens remains disabled until a separate audited release.
 */
import {config,user,stripe,db,accountOK,reply,uuid,fail} from '../_lib/book-stripe-test-v1.js';
const TEST_OFFERS=Object.freeze({
 SPARKS_25:{qty:25,cents:500,product:'prod_VXW1AUogeZzMa9',price:'price_1UWQzYJY9FI7byHBEuMNO2lI'},
 SPARKS_55:{qty:55,cents:1000,product:'prod_VXW1BkITJCOrt8',price:'price_1UWQzrJY9FI7byHBGqJqnVVb'},
 SPARKS_90:{qty:90,cents:1500,product:'prod_VXW25lKgvrFTfx',price:'price_1UWR0AJY9FI7byHBBUc0L3uw'},
 SPARKS_125:{qty:125,cents:2000,product:'prod_VXW2QcSQp1cohT',price:'price_1UWR0SJY9FI7byHBqmNHBTyt'},
 SPARKS_275:{qty:275,cents:4000,product:'prod_VXW2gOD0aFjAL7',price:'price_1UWR0lJY9FI7byHBhETFtRi0'}
});
export {TEST_OFFERS};
const error=(message,status=503)=>Object.assign(Error(message),{status});
const origin=req=>req.headers.get('origin')===new URL(req.url).origin;
function gate(env){
 if(env.LUMEN_BUNDLE_TEST_CHECKOUT_ENABLED!=='true'||env.GU39_SANDBOX_SHADOW_GATE!=='true')
  throw error('Isolated Lumen TEST checkout disabled.',423);
}
async function verify(c,offer){
 await accountOK(c);
 const [price,product]=await Promise.all([
  stripe(c,'prices/'+offer.price),stripe(c,'products/'+offer.product)
 ]);
 if(price.id!==offer.price||price.product!==offer.product||price.livemode!==false||
  price.active!==true||price.unit_amount!==offer.cents||price.currency!=='usd'||price.type!=='one_time'||
  product.id!==offer.product||product.active!==true||product.livemode!==false||
  product.metadata?.qa_only!=='true'||product.metadata?.site_checkout_enabled!=='false')
  throw error('QA-only Stripe TEST price/product mismatch.');
}
export async function onRequestGet({env}){
 try{
  gate(env);const c=config(env,{requireEnabled:false});
  await Promise.all(Object.values(TEST_OFFERS).map(x=>verify(c,x)));
  return reply({ok:true,testOnly:true,shadowOnly:true,checkoutEnabled:true,
   offers:Object.entries(TEST_OFFERS).map(([sku,o])=>({sku,quantity:o.qty,amountCents:o.cents}))});
 }catch(e){return reply({ok:true,testOnly:true,shadowOnly:true,checkoutEnabled:false,offers:[],qaDiagnostic:String(e?.message||'TEST_PRECHECK_FAILED').slice(0,120)})}
}
export async function onRequestPost({request,env}){
 try{
  gate(env);
  if(!origin(request))throw error('Same-origin TEST checkout required.',403);
  const c=config(env,{requireEnabled:false}),u=await user(c,request);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).length>1200)throw error('Invalid TEST request.',413);
  let data;try{data=JSON.parse(raw)}catch{throw error('Invalid TEST JSON.',400)}
  if(!data||Array.isArray(data)||Object.keys(data).sort().join(',')!=='confirm,requestId,sku'||
   data.confirm!=='STRIPE_TEST_ONLY'||!uuid(data.requestId)||!Object.hasOwn(TEST_OFFERS,data.sku))
    throw error('Invalid TEST package selection.',400);
  const offer=TEST_OFFERS[data.sku];await verify(c,offer);
  const reserved=await db(c,'gu_lumen_bundle_test_reserve_v1',
   {p_user:u.id,p_sku:data.sku,p_request:data.requestId});
  if(reserved?.ok!==true||!uuid(reserved.id)||reserved.amountCents!==offer.cents||
     reserved.quantity!==offer.qty||reserved.priceId!==offer.price)
   throw error('TEST package authorization/reservation failed.',403);
  if(reserved.existing){
   if(reserved.status==='bound'&&/^cs_test_[A-Za-z0-9_]+$/.test(reserved.session||'')){
    const existing=await stripe(c,'checkout/sessions/'+encodeURIComponent(reserved.session));
    if(existing.status==='open'&&existing.livemode===false&&
       existing.metadata?.gu_lumen_bundle_qa_id===reserved.id)
      return reply({ok:true,testOnly:true,shadowOnly:true,restored:true,url:existing.url});
   }
   throw error('Existing isolated TEST order is not freely replayable.',409);
  }
  const params=new URLSearchParams();
  params.set('mode','payment');params.set('payment_method_types[0]','card');
  params.set('line_items[0][price]',offer.price);params.set('line_items[0][quantity]','1');
  params.set('client_reference_id',reserved.id);
  params.set('metadata[gu_lumen_bundle_qa_id]',reserved.id);
  params.set('metadata[gu_lumen_bundle_qa_user]',u.id);
  params.set('metadata[gu_lumen_bundle_qa_sku]',data.sku);
  for(const [name,value] of [['gu_lumen_bundle_qa_id',reserved.id],['gu_lumen_bundle_qa_user',u.id],
    ['gu_lumen_bundle_qa_sku',data.sku]])
   params.set('payment_intent_data[metadata]['+name+']',value);
  params.set('success_url',new URL('/store-sparks.html?lumen_test=complete',request.url).href);
  params.set('cancel_url',new URL('/store-sparks.html?lumen_test=canceled',request.url).href);
  const session=await stripe(c,'checkout/sessions',{method:'POST',
    headers:{'content-type':'application/x-www-form-urlencoded','Idempotency-Key':'qa-lumen-bundle-'+reserved.id},
    body:params.toString()});
  if(!/^cs_test_[A-Za-z0-9_]+$/.test(session.id||'')||session.livemode!==false||
    session.status!=='open'||session.payment_status!=='unpaid'||session.mode!=='payment'||
    session.amount_subtotal!==offer.cents||session.currency!=='usd'||
    session.metadata?.gu_lumen_bundle_qa_id!==reserved.id||
    session.client_reference_id!==reserved.id||!session.url?.startsWith('https://checkout.stripe.com/'))
    throw error('Isolated TEST Checkout provider mismatch.');
  const bound=await db(c,'gu_lumen_bundle_test_bind_v1',
   {p_id:reserved.id,p_user:u.id,p_session:session.id});
  if(bound?.ok!==true)throw error('TEST Session could not be bound.');
  return reply({ok:true,testOnly:true,shadowOnly:true,url:session.url,quantity:offer.qty,
    amountCents:offer.cents,notice:'Stripe TEST only; no real member credits or money.'});
 }catch(e){
  const status=[400,401,403,409,413,423].includes(e?.status)?e.status:503;
  return reply({ok:false,testOnly:true,error:status===403?'QA member not eligible.':
   status===423?'TEST package checkout is disabled.':
   status===409?'Existing TEST order requires reconciliation.':
   status===401?'Member sign-in required.':status===400?'Invalid TEST package request.':
   'Isolated TEST checkout unavailable.'},status);
 }
}
