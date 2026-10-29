/* LIVE Stripe-managed one-time Book I purchase. All paid switches default OFF. */
import {BOOK_CODE,BOOK_PRICE,BOOK_AMOUNT,reply,fail,uuid,config,user,db,stripe,
 accountAndPrice,bookRights} from '../_lib/book-stripe-live-v1.js';
const sameOrigin=req=>req.headers.get('origin')===new URL(req.url).origin;
async function launch(c,env){
 if(env.GU_BOOK_LIVE_CHECKOUT_ENABLED!=='true')throw fail('Digital Book LIVE checkout has not been activated.');
 const mode=await fetch(c.base+'/rest/v1/gu39_sandbox_settings?select=enabled&id=eq.true&limit=1',{
  cache:'no-store',headers:{apikey:c.service,...(c.service.startsWith('eyJ')?{authorization:'Bearer '+c.service}:{})}});
 const v=await mode.json().catch(()=>null);
 if(!mode.ok||v?.length!==1||v[0]?.enabled!==false)throw fail('TESTING mode must be off before LIVE checkout.');
 if(!await bookRights(c))throw fail('Book edition rights, private asset or selling controls are incomplete.');
 await accountAndPrice(c);
}
async function bodyInput(request){
 const declared=request.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>1024))
  throw fail('Book checkout payload too large.',413);
 const s=await request.text();
 if(s.length>1024)throw fail('Book checkout payload too large.',413);
 let data;try{data=JSON.parse(s)}catch{throw fail('Valid book checkout JSON required.',400)}
 if(!data||Array.isArray(data)||Object.keys(data).sort().join(',')!=='code,format'||
  data.code!==BOOK_CODE||data.format!=='epub')throw fail('Unsupported eBook edition.',400);
 return data;
}
export async function onRequestGet({request,env}){
 const url=new URL(request.url),code=url.searchParams.get('code'),format=url.searchParams.get('format');
 if(code!==BOOK_CODE||format!=='epub')
  return reply({ok:false,error:'This book edition has not been configured.'},404);
 try{
  const c=config(env,{checkout:true});await launch(c,env);
  return reply({ok:true,readOnly:true,livePayments:false,liveCheckoutAvailable:true,
   offer:{type:'book',code:BOOK_CODE,format:'epub',currency:'USD',unitAmountCents:BOOK_AMOUNT,
    billingInterval:'one_time',name:'Stock Market Foundations — Book I'}});
 }catch{
  return reply({ok:true,readOnly:true,livePayments:false,liveCheckoutAvailable:false,
   reason:'Publishing rights or secure Stripe eBook checkout are not yet activated.'});
 }
}
export async function onRequestPost({request,env}){
 try{
  if(!sameOrigin(request))throw fail('Same-origin checkout required.',403);
  await bodyInput(request);
  const c=config(env,{checkout:true});
  const u=await user(c,request);
  await launch(c,env);
  const reserve=await db(c,'gu_book_live_reserve_v1',{
   p_user:u.id,p_code:BOOK_CODE,p_price:BOOK_PRICE,p_amount:BOOK_AMOUNT});
  if(reserve.ok!==true||!uuid(reserve.id))throw fail('Could not reserve a verified book checkout.');
  if(reserve.existing){
   if(reserve.status==='checkout_created'&&/^cs_live_[A-Za-z0-9_]+$/.test(reserve.session||'')){
    const old=await stripe(c,'checkout/sessions/'+encodeURIComponent(reserve.session));
    if(old.id===reserve.session&&old.livemode===true&&old.status==='open'&&
     old.mode==='payment'&&old.amount_subtotal===BOOK_AMOUNT&&
     old.metadata?.gu_book_live_intent===reserve.id&&
     old.metadata?.gu_book_live_member===u.id&&old.metadata?.gu_book_live_code===BOOK_CODE&&
     old.url?.startsWith('https://checkout.stripe.com/'))
     return reply({ok:true,url:old.url,restored:true});
   }
   throw fail('An earlier book checkout is still pending. Contact Support before retrying.',409);
  }
  const p=new URLSearchParams();
  p.set('mode','payment');p.set('payment_method_types[0]','card');
  p.set('line_items[0][price]',BOOK_PRICE);p.set('line_items[0][quantity]','1');
  p.set('client_reference_id',reserve.id);
  p.set('metadata[gu_book_live_intent]',reserve.id);
  p.set('metadata[gu_book_live_member]',u.id);
  p.set('metadata[gu_book_live_code]',BOOK_CODE);
  p.set('payment_intent_data[metadata][gu_book_live_intent]',reserve.id);
  p.set('payment_intent_data[metadata][gu_book_live_member]',u.id);
  p.set('payment_intent_data[metadata][gu_book_live_code]',BOOK_CODE);
  p.set('success_url',new URL('/my-books.html?book_epub=complete',request.url).href);
  p.set('cancel_url',new URL('/my-books.html?book_epub=canceled',request.url).href);
  const s=await stripe(c,'checkout/sessions',{method:'POST',
   headers:{'content-type':'application/x-www-form-urlencoded','Idempotency-Key':'gu-book-live-'+reserve.id},
   body:p.toString()});
  if(!/^cs_live_[A-Za-z0-9_]+$/.test(s.id||'')||s.livemode!==true||s.mode!=='payment'||
   s.payment_status!=='unpaid'||s.amount_subtotal!==BOOK_AMOUNT||s.currency!=='usd'||
   s.status!=='open'||s.metadata?.gu_book_live_intent!==reserve.id||
   s.metadata?.gu_book_live_member!==u.id||s.metadata?.gu_book_live_code!==BOOK_CODE||
   s.client_reference_id!==reserve.id||!s.url?.startsWith('https://checkout.stripe.com/'))
   throw fail('Stripe book Checkout Session did not match the approved request.');
  const bind=await db(c,'gu_book_live_bind_v1',{p_id:reserve.id,p_session:s.id});
  if(bind.ok!==true)throw fail('Book checkout could not be recorded.');
  return reply({ok:true,url:s.url,notice:'Your eBook is delivered only after Stripe confirms payment by signed webhook.'});
 }catch(e){
  const status=[400,401,403,409,413].includes(e?.status)?e.status:503;
  return reply({ok:false,error:
   status===401?'Sign in to purchase this eBook.':
   status===403?'You are not eligible to begin this purchase.':
   status===409?'An earlier book checkout is still pending or this title is already owned.':
   status===400?'Invalid book checkout request.':
   'Book purchases are not yet activated or safely configured.'},status);
 }
}
