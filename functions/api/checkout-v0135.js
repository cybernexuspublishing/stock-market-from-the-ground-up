/* v0.14.0.28 — format-aware book/bundle checkout.
 * Lemon Squeezy supports digital goods, NOT physical printed books.
 * The existing provider & intent contract is preserved for authorized DIGITAL orders.
 */
const respond=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const v=x=>String(x??'').trim();
const failure=(message,status=400)=>Object.assign(new Error(message),{status});
function cfg(env){const url=v(env.SUPABASE_URL).replace(/\/$/,''),secret=v(env.SUPABASE_SECRET_KEY),pub=v(env.SUPABASE_PUBLISHABLE_KEY);if(!url||!secret||!pub)throw failure('Checkout configuration missing.',503);return{url,secret,pub}}
async function query(url,options={}){const r=await fetch(url,{...options,cache:'no-store'}),s=await r.text();let j;try{j=s?JSON.parse(s):{}}catch{j={}}if(!r.ok)throw failure('Checkout provider not available.',r.status>=500?503:400);return j}
async function rest(env,path,{method='GET',body,prefer}={}){const c=cfg(env);return query(c.url+'/rest/v1/'+path,{method,headers:{apikey:c.secret,authorization:'Bearer '+c.secret,accept:'application/json',...(body!==undefined?{'content-type':'application/json'}:{}),...(prefer?{prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)})}
async function user(env,request){const t=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'')?.[1];if(!t)throw failure('Sign in to checkout.',401);const c=cfg(env),u=await query(c.url+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+t}});if(!u.id)throw failure('Authentication failed.',401);const p=(await rest(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(u.id)+'&limit=1'))[0];if(p?.account_kind!=='member')throw failure('This account is not eligible for checkout.',403);const flags=(await rest(env,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(u.id)+'&limit=1'))[0];if(['suspended','restricted'].includes(flags?.status))throw failure('This account is not eligible for new purchases.',403);const id=(await rest(env,'account_private_identity?select=age_eligible,date_of_birth&user_id=eq.'+encodeURIComponent(u.id)+'&limit=1'))[0];if(!id?.age_eligible||!id.date_of_birth)throw failure('Complete age eligibility in Account Settings.',403);return u}
async function item(env,code,format){
 // P0 protection: stop print/bundle physical payments BEFORE any intent or
 // Lemon Squeezy API request, even if legacy catalog checkout flags are enabled.
 if(format==='paperback'||format==='hardcover')throw failure('Printed books are purchased through the dedicated print checkout linked in Store.',403);
 if(format!=='digital')throw failure('Choose an available book format.');
 const p=(await rest(env,'catalog_products?select=*&product_code=eq.'+encodeURIComponent(code)+'&active=eq.true&store_visible=eq.true&limit=1'))[0];
 if(!p||!['book','bundle'].includes(p.product_type))throw failure('Book or bundle unavailable.',404);
 if(p.product_type==='bundle')throw failure('Digital bundle download rights are not active yet.',403);
 // A user-editable catalog flag is NOT sufficient: the rights ledger + private file
 // must be enabled by the OWNER before any quote or paid checkout intent.
 const rights=await rest(env,'rpc/gu_digital_offer_status_v01430',{method:'POST',body:{p_product_code:code}});
 if(rights?.available!==true)throw failure('This digital edition is not authorized for website distribution.',403);
 if(p.kdp_select===true||p.direct_digital_enabled!==true)throw failure('Direct digital sales unavailable for this title.',403);
 if(p.product_type==='bundle'){
  const rows=await rest(env,'book_bundle_components_v135?select=book_code&bundle_code=eq.'+encodeURIComponent(code));
  if(!rows.length)throw failure('Bundle contents unavailable.',503);
  const codes=rows.map(r=>r.book_code).filter(x=>/^[A-Z0-9_]{3,90}$/.test(String(x)));
  if(codes.length!==rows.length)throw failure('Bundle contents invalid.',503);
  const books=await rest(env,'catalog_products?select=product_code,kdp_select,direct_digital_enabled&product_code=in.('+codes.join(',')+')');
  if(books.length!==codes.length||books.some(b=>b.kdp_select||b.direct_digital_enabled!==true))throw failure('Not all bundle titles are eligible for direct digital distribution.',403);
 }
 const eligible=p.website_checkout_enabled===true&&p.sales_status==='published';
 const m=p.metadata||{},variant=v(m?.checkout_variants_v135?.digital),amount=Number(m?.website_price_by_format_cents_v135?.digital);
 if(!eligible||!/^\d+$/.test(variant)||!Number.isSafeInteger(amount)||amount<=0)throw failure('This edition is not available for website checkout.',503);
 return {p,code,format,variant,amount,currency:'USD',title:p.title};
}
async function checkout(env,it,u,intent){
 const key=v(env.LEMON_SQUEEZY_API_KEY),store=v(env.LEMON_SQUEEZY_STORE_ID);
 if(!key||!store)throw failure('Payment processing not configured.',503);
 const site=v(env.PUBLIC_SITE_URL)||'https://stock-market-from-the-ground-up.pages.dev';
 const data={data:{type:'checkouts',attributes:{product_options:{name:it.title+' — '+it.format,redirect_url:new URL('/checkout-success.html?intent='+encodeURIComponent(intent),site).href},checkout_data:{email:u.email,custom:{user_id:u.id,item_type:it.p.product_type,item_code:it.code,intent_id:intent,format:it.format}},test_mode:v(env.LEMON_SQUEEZY_TEST_MODE).toLowerCase()!=='false',expires_at:new Date(Date.now()+30*60*1000).toISOString()},relationships:{store:{data:{type:'stores',id:String(store)}},variant:{data:{type:'variants',id:it.variant}}}}};
 const r=await query('https://api.lemonsqueezy.com/v1/checkouts',{method:'POST',headers:{Accept:'application/vnd.api+json','Content-Type':'application/vnd.api+json',Authorization:'Bearer '+key},body:JSON.stringify(data)});
 if(!r.data?.attributes?.url||!/^https:\/\//.test(r.data.attributes.url))throw failure('Secure payment checkout is unavailable.',503);
 return{id:r.data.id,url:r.data.attributes.url};
}
export async function onRequest({request,env}){
 const url=new URL(request.url),action=url.searchParams.get('action');
 try{
  if(!['GET','POST'].includes(request.method))return respond({ok:false,error:'Unsupported method'},405);
  // Fail closed for all print forms even when the user is unsigned, before any
  // external provider call. Legitimate print checkout is Lulu Direct, not Lemon.
  if(action==='quote'&&['paperback','hardcover'].includes(v(url.searchParams.get('format'))))
   return respond({ok:false,error:'Print checkout is available via Store.'},403);
  const u=await user(env,request);
  if(action==='quote'&&request.method==='GET'){
   const qs=url.searchParams,it=await item(env,v(qs.get('code')),v(qs.get('format')));
   const setting=(await rest(env,'site_settings?select=value&setting_key=eq.commerce.checkout_enabled'))[0];
   return respond({ok:true,checkoutEnabled:env.ENABLE_PAID_CHECKOUT==='true'&&setting?.value===true,item:{type:it.p.product_type,code:it.code,name:it.title,format:it.format,amount:it.amount,currency:it.currency,enabled:true,billing:'none'}});
  }
  if(action==='create'&&request.method==='POST'){
   if(env.ENABLE_PAID_CHECKOUT!=='true')return respond({ok:false,error:'Checkout is disabled until provider and legal verification are approved.'},503);
   const b=await request.json().catch(()=>({}));
   if(!['book','bundle'].includes(b.type))throw failure('Unsupported purchase category.');
   if(['paperback','hardcover'].includes(v(b.format)))throw failure('Printed formats are not sold through Lemon Squeezy.',403);
   const it=await item(env,v(b.code),v(b.format));
   const setting=(await rest(env,'site_settings?select=value&setting_key=eq.commerce.checkout_enabled'))[0];
   if(setting?.value!==true)throw failure('Website checkout is not active yet.',503);
   const intent=crypto.randomUUID();
   await rest(env,'checkout_intents',{method:'POST',prefer:'return=minimal',body:{intent_id:intent,user_id:u.id,item_type:it.p.product_type,item_code:it.code,amount_cents:it.amount,currency:'USD',status:'created',metadata:{format:it.format,variant:it.variant}}});
   const r=await checkout(env,it,u,intent);
   await rest(env,'checkout_intents?intent_id=eq.'+encodeURIComponent(intent),{method:'PATCH',prefer:'return=minimal',body:{provider_checkout_id:r.id,status:'provider_created',updated_at:new Date().toISOString()}});
   return respond({ok:true,url:r.url,intentId:intent});
  }
  return respond({ok:false,error:'Unknown checkout request.'},404);
 }catch(e){return respond({ok:false,error:e.message||'Checkout failed.'},e.status||500)}
}
