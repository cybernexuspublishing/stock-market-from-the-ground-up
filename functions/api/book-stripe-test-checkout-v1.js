import {BOOK_CODE,TEST_PRICE,reply,config,originOK,user,db,stripe,accountOK,priceOK,uuid,fail,clientError} from '../_lib/book-stripe-test-v1.js';
export async function onRequestPost({request,env}){
 try{
  if(!originOK(request))throw fail('Origin denied.',403);
  if(Number(request.headers.get('content-length')||0)>512)throw fail('Payload too large.',413);
  const body=await request.text();if(body.length>512)throw fail('Payload too large.',413);
  let p;try{p=JSON.parse(body)}catch{throw fail('Invalid JSON.',400)}
  if(p?.code!==BOOK_CODE||p?.format!=='epub'||Object.keys(p).length!==2)throw fail('Unsupported TEST product.',400);
  const c=config(env),u=await user(c,request);
  await accountOK(c);await priceOK(c);
  const reserve=await db(c,'gu_book_test_reserve_v1',{p_user:u.id,p_code:BOOK_CODE,p_price:TEST_PRICE,p_amount:1099});
  if(!uuid(reserve.id)||reserve.ok!==true)throw fail('Could not safely reserve TEST checkout.');
  if(reserve.existing){
   if(reserve.status==='checkout_created'&&/^cs_test_[A-Za-z0-9_]+$/.test(reserve.session||'')){
    const old=await stripe(c,'checkout/sessions/'+encodeURIComponent(reserve.session));
    if(old.id===reserve.session&&old.livemode===false&&old.status==='open'&&
       old.metadata?.gu_book_test_intent===reserve.id&&old.metadata?.gu_book_test_member===u.id&&
       old.amount_subtotal===1099&&old.mode==='payment'&&old.url?.startsWith('https://checkout.stripe.com/'))
     return reply({ok:true,testing:true,url:old.url,restored:true});
   }
   throw fail('Existing incomplete TEST checkout requires review.',409);
  }
  const id=reserve.id,params=new URLSearchParams();
  params.set('mode','payment');
  params.set('payment_method_types[0]','card');
  params.set('line_items[0][price]',TEST_PRICE);
  params.set('line_items[0][quantity]','1');
  params.set('client_reference_id',id);
  params.set('metadata[gu_book_test_intent]',id);
  params.set('metadata[gu_book_test_member]',u.id);
  params.set('metadata[gu_book_test_code]',BOOK_CODE);
  params.set('payment_intent_data[metadata][gu_book_test_intent]',id);
  params.set('success_url',new URL('/my-books.html?test_epub=complete',request.url).href);
  params.set('cancel_url',new URL('/my-books.html?test_epub=canceled',request.url).href);
  const s=await stripe(c,'checkout/sessions',{method:'POST',
   headers:{'content-type':'application/x-www-form-urlencoded','Idempotency-Key':'gu-book-test-'+id},
   body:params.toString()});
  if(!/^cs_test_[A-Za-z0-9_]+$/.test(s.id||'')||s.livemode!==false||s.mode!=='payment'||
   s.client_reference_id!==id||s.amount_subtotal!==1099||s.currency!=='usd'||
   s.payment_status!=='unpaid'||s.status!=='open'||s.metadata?.gu_book_test_member!==u.id||
   !s.url?.startsWith('https://checkout.stripe.com/'))
    throw fail('TEST Checkout Session verification failed.');
  const bind=await db(c,'gu_book_test_bind_v1',{p_id:id,p_session:s.id});
  if(bind.ok!==true)throw fail('TEST session not safely linked.');
  return reply({ok:true,testing:true,url:s.url,notice:'Stripe TEST only; no real charge or LIVE book entitlement.'});
 }catch(e){return clientError(e)}
}
export async function onRequestGet({env}){try{const c=config(env);await accountOK(c);await priceOK(c);return reply({ok:true,testing:true,ready:true})}catch{return reply({ok:true,testing:true,ready:false})}}
