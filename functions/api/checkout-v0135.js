/* v0.13.5 — format-aware book/bundle checkout. Existing plan/tool checkout is unchanged.
   Disabled unless the established commerce master switch and item-specific switch are ON. */
const respond=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const v=x=>String(x??'').trim();
const failure=(message,status=400)=>Object.assign(new Error(message),{status});
function cfg(env){const url=v(env.SUPABASE_URL).replace(/\/$/,''),secret=v(env.SUPABASE_SECRET_KEY),pub=v(env.SUPABASE_PUBLISHABLE_KEY);if(!url||!secret||!pub)throw failure('Checkout configuration missing.',503);return{url,secret,pub}}
async function query(url,options={}){const r=await fetch(url,{...options,cache:'no-store'}),s=await r.text();let j;try{j=s?JSON.parse(s):{}}catch{j={}}if(!r.ok)throw failure('Checkout provider not available.',r.status>=500?503:400);return j}
async function rest(env,path,{method='GET',body,prefer}={}){const c=cfg(env);return query(c.url+'/rest/v1/'+path,{method,headers:{apikey:c.secret,authorization:'Bearer '+c.secret,accept:'application/json',...(body!==undefined?{'content-type':'application/json'}:{}),...(prefer?{prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)})}
async function user(env,request){const t=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'')?.[1];if(!t)throw failure('Sign in to checkout.',401);const c=cfg(env),u=await query(c.url+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+t}});if(!u.id)throw failure('Authentication failed.',401);const p=(await rest(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(u.id)+'&limit=1'))[0];if(p?.account_kind!=='member')throw failure('This account is not eligible for checkout.',403);const id=(await rest(env,'account_private_identity?select=age_eligible,date_of_birth&user_id=eq.'+encodeURIComponent(u.id)+'&limit=1'))[0];if(!id?.age_eligible||!id.date_of_birth)throw failure('Complete age eligibility in Account Settings.',403);return u}
async function item(env,code,format){const p=(await rest(env,'catalog_products?select=*&product_code=eq.'+encodeURIComponent(code)+'&active=eq.true&store_visible=eq.true&limit=1'))[0];if(!p||!['book','bundle'].includes(p.product_type))throw failure('Book or bundle unavailable.',404);
 const eligible= p.website_checkout_enabled===true && ['published'].includes(String(p.sales_status||''));
 const digital=format==='digital',physical=['paperback','hardcover'].includes(format);
 if(!digital&&!physical)throw failure('Choose an available book format.');
 if(digital&&(p.kdp_select===true||p.direct_digital_enabled!==true))throw failure('Direct digital sales unavailable for this title.',403);
 if(physical&&p.direct_physical_enabled!==true)throw failure('Direct physical fulfillment is not enabled.',403);
 if(p.product_type==='bundle'&&digital){const rows=await rest(env,'book_bundle_components_v135?select=book_code&bundle_code=eq.'+encodeURIComponent(code));if(!rows.length)throw failure('Bundle contents unavailable.',503);const books=await rest(env,'catalog_products?select=product_code,kdp_select&product_code=in.('+rows.map(r=>r.book_code).join(',')+')');if(books.some(b=>b.kdp_select))throw failure('Kindle Select prevents direct digital bundle sales.',403)}
 const m=p.metadata||{},variant=v(m?.checkout_variants_v135?.[format]);const amount=Number(m?.website_price_by_format_cents_v135?.[format]);
 if(!eligible||!/^\d+$/.test(variant)||!Number.isSafeInteger(amount)||amount<=0)throw failure('This edition is not available for website checkout.',503);
 return{p,code,format,variant,amount,currency:'USD',title:p.title};}
async function checkout(env,it,u,intent){const key=v(env.LEMON_SQUEEZY_API_KEY),store=v(env.LEMON_SQUEEZY_STORE_ID);if(!key||!store)throw failure('Payment processing not configured.',503);const site=v(env.PUBLIC_SITE_URL)||'https://stock-market-from-the-ground-up.pages.dev';const data={data:{type:'checkouts',attributes:{product_options:{name:it.title+' — '+it.format,redirect_url:new URL('/checkout-success.html?intent='+encodeURIComponent(intent),site).href},checkout_data:{email:u.email,custom:{user_id:u.id,item_type:it.p.product_type,item_code:it.code,intent_id:intent,format:it.format}},test_mode:v(env.LEMON_SQUEEZY_TEST_MODE).toLowerCase()!=='false',expires_at:new Date(Date.now()+30*60*1000).toISOString()},relationships:{store:{data:{type:'stores',id:String(store)}},variant:{data:{type:'variants',id:it.variant}}}}};
 const r=await query('https://api.lemonsqueezy.com/v1/checkouts',{method:'POST',headers:{Accept:'application/vnd.api+json','Content-Type':'application/vnd.api+json',Authorization:'Bearer '+key},body:JSON.stringify(data)});if(!r.data?.attributes?.url||!/^https:\/\//.test(r.data.attributes.url))throw failure('Secure payment checkout is unavailable.',503);return{id:r.data.id,url:r.data.attributes.url};}
export async function onRequest({request,env}){const action=new URL(request.url).searchParams.get('action');try{
 if(!['GET','POST'].includes(request.method))return respond({ok:false,error:'Unsupported method'},405);
 const u=await user(env,request);
 if(action==='quote'&&request.method==='GET'){
  const qs=new URL(request.url).searchParams,it=await item(env,v(qs.get('code')),v(qs.get('format')));
  const setting=(await rest(env,'site_settings?select=value&setting_key=eq.commerce.checkout_enabled'))[0];
  return respond({ok:true,checkoutEnabled:setting?.value===true,item:{type:it.p.product_type,code:it.code,name:it.title,format:it.format,amount:it.amount,currency:it.currency,enabled:true,billing:'none'}});
 }
 if(action==='create'&&request.method==='POST'){
  const b=await request.json().catch(()=>({}));if(!['book','bundle'].includes(b.type))throw failure('Unsupported purchase category.');
  const it=await item(env,v(b.code),v(b.format));const setting=(await rest(env,'site_settings?select=value&setting_key=eq.commerce.checkout_enabled'))[0];if(setting?.value!==true)throw failure('Website checkout is not active yet.',503);
  const intent=crypto.randomUUID();await rest(env,'checkout_intents',{method:'POST',prefer:'return=minimal',body:{intent_id:intent,user_id:u.id,item_type:it.p.product_type,item_code:it.code,amount_cents:it.amount,currency:'USD',status:'created',metadata:{format:it.format,variant:it.variant}}});
  const r=await checkout(env,it,u,intent);await rest(env,'checkout_intents?intent_id=eq.'+encodeURIComponent(intent),{method:'PATCH',prefer:'return=minimal',body:{provider_checkout_id:r.id,status:'provider_created',updated_at:new Date().toISOString()}});
  return respond({ok:true,url:r.url,intentId:intent});
 }
 return respond({ok:false,error:'Unknown checkout request.'},404);
 }catch(e){return respond({ok:false,error:e.message||'Checkout failed.'},e.status||500)}}
