/* v0.14.0.31: Stripe-hosted signed KDP author-copy checkout; no credit-card or address handling on our website. */
const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'no-store, private','x-content-type-options':'nosniff'};
const respond=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:HEAD});
const text=x=>String(x??'').trim();
const bad=(message,status=400)=>Object.assign(new Error(message),{status});
function config(env){
 const url=text(env.SUPABASE_URL).replace(/\/$/,'');const pub=text(env.SUPABASE_PUBLISHABLE_KEY),key=text(env.SUPABASE_SECRET_KEY);
 if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(url)||!pub||!key)throw bad('Service unavailable.',503);
 return {url,pub,key};
}
async function getJSON(url,opt={}){
 const r=await fetch(url,{...opt,cache:'no-store'});const j=await r.json().catch(()=>({}));
 if(!r.ok)throw bad('Service unavailable.',r.status===401?401:503);return j;
}
async function rpc(env,name,args,token){
 const c=config(env);return getJSON(c.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:token?c.pub:c.key,authorization:'Bearer '+(token||c.key),'content-type':'application/json'},body:JSON.stringify(args||{})});
}
async function currentUser(env,req){
 const jwt=/^Bearer\s+([^\s]+)$/i.exec(req.headers.get('authorization')||'')?.[1];
 if(!jwt)throw bad('Please sign in.',401);
 const c=config(env),u=await getJSON(c.url+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+jwt}});
 if(!u?.id||!u?.email)throw bad('Please sign in.',401);
 return {jwt,user:u};
}
function siteOrigin(request,env){const s=text(env.PUBLIC_SITE_URL);const u=new URL(s||request.url);if(u.protocol!=='https:' && u.hostname!=='localhost')throw bad('Checkout origin unavailable.',503);return u.origin}
function isEnabled(env){return text(env.ENABLE_SIGNED_BOOK_STRIPE)==='true' && text(env.STRIPE_SIGNED_TAX_ENABLED)==='true'}
async function createStripe(env,price,orderId,email,site){
 const key=text(env.STRIPE_SECRET_KEY);
 if(!key.startsWith('sk_test_')&&!key.startsWith('sk_live_'))throw bad('Stripe is not configured.',503);
 const testMode=text(env.STRIPE_SIGNED_TEST_MODE).toLowerCase()!=='false';
 if((testMode&&!key.startsWith('sk_test_'))||(!testMode&&!key.startsWith('sk_live_')))
  throw bad('Stripe payment environment mismatch.',503);
 // Use Stripe Tax for books; legal registration obligations remain with merchant.
 const data=new URLSearchParams();
 const put=(k,v)=>data.append(k,String(v));
 put('mode','payment');put('payment_method_types[0]','card');
 put('client_reference_id',orderId);put('customer_email',email);
 put('line_items[0][price_data][currency]','usd');
 put('line_items[0][price_data][unit_amount]',price.priceCents);
 put('line_items[0][price_data][product_data][name]',price.title+' — Author-Signed '+price.edition);
 put('line_items[0][quantity]','1');
 put('shipping_address_collection[allowed_countries][0]','US');
 put('shipping_options[0][shipping_rate_data][type]','fixed_amount');
 put('shipping_options[0][shipping_rate_data][fixed_amount][amount]',price.shippingCents);
 put('shipping_options[0][shipping_rate_data][fixed_amount][currency]','usd');
 put('shipping_options[0][shipping_rate_data][display_name]','Author signing, packing & US shipping');
 put('automatic_tax[enabled]','true');
 put('consent_collection[terms_of_service]','required');
 put('metadata[gu_order_id]',orderId);put('metadata[book_code]',price.code);put('metadata[edition]',price.edition);
 put('payment_intent_data[metadata][gu_order_id]',orderId);put('payment_intent_data[metadata][signed_book_v01431]','true');
 put('success_url',site+'/my-purchases.html?signed_order='+encodeURIComponent(orderId));
 put('cancel_url',site+'/store.html?signed_canceled=1');
 const r=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+key,'content-type':'application/x-www-form-urlencoded','Idempotency-Key':'gu-signed-'+orderId},body:data,cache:'no-store'});
 const j=await r.json().catch(()=>({}));
 if(!r.ok||!/^cs_(test|live)_[A-Za-z0-9_]+$/.test(j?.id||'')||typeof j.url!=='string')throw bad('Secure checkout is temporarily unavailable.',503);
 const u=new URL(j.url);if(u.protocol!=='https:'||u.hostname!=='checkout.stripe.com')throw bad('Unexpected payment provider address.',503);
 return {id:j.id,url:j.url};
}
export async function onRequest({request,env}){
 const uri=new URL(request.url),action=uri.searchParams.get('action');
 try{
  if(action==='quote'&&request.method==='GET'){
   const code=uri.searchParams.get('code'),edition=uri.searchParams.get('edition');
   if(!/^[A-Z0-9_]{3,90}$/.test(code||'')||!['paperback','hardcover'].includes(edition))return respond({ok:false,error:'Unknown edition.'},400);
   const q=await rpc(env,'gu_signed_quote_v01431',{p_code:code,p_edition:edition});
   return respond({ok:true,available:q?.available===true && isEnabled(env),quote:q?.available===true?q:null});
  }
  if(action==='create'&&request.method==='POST'){
   if(!isEnabled(env))throw bad('Signed-book checkout is not enabled.',503);
   if(Number(request.headers.get('content-length')||0)>4096)throw bad('Request too large.',413);
   const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw bad('Origin denied.',403);
   const {jwt,user}=await currentUser(env,request);
   const body=await request.json().catch(()=>({}));const {code,edition}=body;
   if(!/^[A-Z0-9_]{3,90}$/.test(code||'')||!['paperback','hardcover'].includes(edition))throw bad('Unknown edition.',400);
   const intent=await rpc(env,'gu_signed_order_start_v01431',{p_code:code,p_edition:edition},jwt);
   if(!intent?.ok||!/^[a-f0-9-]{36}$/i.test(intent.id||''))throw bad('Unable to create an order.',503);
   const quote={title:intent.title,code,edition,priceCents:Number(intent.priceCents),shippingCents:Number(intent.shippingCents)};
   if(!Number.isSafeInteger(quote.priceCents)||quote.priceCents<100||!Number.isSafeInteger(quote.shippingCents)||quote.shippingCents<0)throw bad('Invalid edition pricing.',503);
   const session=await createStripe(env,quote,intent.id,user.email,siteOrigin(request,env));
   const attached=await rpc(env,'gu_signed_order_attach_v01431',{p_id:intent.id,p_session:session.id});
   if(attached!==true)throw bad('Unable to reconcile provider checkout.',503);
   return respond({ok:true,url:session.url,orderId:intent.id});
  }
  return respond({ok:false,error:'Unsupported method or action.'},405);
 }catch(e){return respond({ok:false,error:e.status && e.status<500?e.message:'Signed-book checkout is temporarily unavailable.'},e.status||503)}
}
