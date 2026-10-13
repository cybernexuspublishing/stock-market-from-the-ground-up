/* v0.13.5.3: Owner-only book sales labels and website-reference price controls.
 * Never modifies KDP retail prices, activates payments or grants digital book access.
 */
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'};
const reply=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
const fail=(msg,status=400)=>Object.assign(new Error(msg),{status});
const clean=x=>String(x??'').trim();
function cfg(env){const base=clean(env.SUPABASE_URL).replace(/\/$/,''),pub=clean(env.SUPABASE_PUBLISHABLE_KEY),secret=clean(env.SUPABASE_SECRET_KEY);if(!base||!pub||!secret)throw fail('Book management is not configured.',503);return{base,pub,secret}}
async function fetchJson(url,options){const r=await fetch(url,{...options,cache:'no-store'});const raw=await r.text();let data=null;try{data=JSON.parse(raw)}catch{}if(!r.ok)throw fail('Catalog operation rejected.',r.status>=500?503:r.status);return data}
async function db(env,path,method='GET',body){const c=cfg(env);return fetchJson(c.base+'/rest/v1/'+path,{method,headers:{apikey:c.secret,authorization:'Bearer '+c.secret,accept:'application/json',...(body!==undefined?{'content-type':'application/json',prefer:'return=minimal'}:{})},body:body===undefined?undefined:JSON.stringify(body)})}
async function actor(env,req){const token=/^Bearer\s+(.+)$/i.exec(req.headers.get('authorization')||'')?.[1];if(!token)throw fail('Sign in as Owner.',401);const c=cfg(env),u=await fetchJson(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token}});
 if(!u?.id)throw fail('Invalid session.',401);
 const [profiles,rs]=await Promise.all([db(env,'profiles?select=account_kind&id=eq.'+u.id+'&limit=1'),db(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+u.id)]);
 if(profiles?.[0]?.account_kind==='showcase')return{showcase:true,id:u.id};
 if(profiles?.[0]?.account_kind==='test')throw fail('Test accounts cannot change the production book catalog.',403);
 if(!rs.some(x=>x.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())))throw fail('OWNER permission required.',403);
 return{showcase:false,id:u.id};}
const statuses=new Set(['coming_soon','selling','on_sale','paused','retired']);
function cents(value,label){const n=Number(value);if(!Number.isSafeInteger(n)||n<0||n>10000000)throw fail(label+' must be a valid nonnegative amount in cents.');return n}
async function listing(env){return db(env,'catalog_products?select=product_code,title,short_title,product_type,active,store_visible,sales_status,kdp_select,website_checkout_enabled,amazon_kindle_url,amazon_paperback_url,amazon_hardcover_url,amazon_kindle_enabled,amazon_paperback_enabled,amazon_hardcover_enabled,metadata&product_type=eq.book&order=sort_order.asc');}
export async function onRequest({request,env}){try{const a=await actor(env,request),url=new URL(request.url),act=clean(url.searchParams.get('action'))||'list';if(request.method==='GET'&&act==='list'){
 if(a.showcase)return reply({ok:true,synthetic:true,books:[{product_code:'FOUNDATION_BOOK_1',short_title:'Synthetic Book I',sales_status:'selling',active:true,store_visible:true,metadata:{list_price_cents:1099,website_price_cents:1099}}]});return reply({ok:true,books:await listing(env)})}
 if(request.method!=='POST'||act!=='save')return reply({ok:false,error:'Unsupported operation.'},405);
 if(a.showcase)throw fail('SHOWCASE accounts are read-only.',403);
 const b=await request.json().catch(()=>null);if(!b||JSON.stringify(b).length>6000)throw fail('Invalid book payload.');
 const code=clean(b.productCode).toUpperCase();if(!/^[A-Z0-9_]{4,80}$/.test(code))throw fail('Invalid book code.');
 const rows=await db(env,'catalog_products?select=product_code,metadata,kdp_select,website_checkout_enabled,product_type,lemon_variant_id&product_code=eq.'+encodeURIComponent(code)+'&limit=1');const row=rows?.[0];if(!row||row.product_type!=='book')throw fail('Book record not found.',404);
 const state=clean(b.salesStatus);if(!statuses.has(state))throw fail('Choose a valid sales status.');
 const metadata={...(row.metadata||{})};const base=cents(b.listPriceCents,'Regular price');let final=base;
 if(state==='on_sale'){
  if(!base)throw fail('Enter the regular price before creating a promotion.');
  const method=clean(b.discountMode);
  if(method==='percent'){
    const pct=Number(b.discountPercent);if(!Number.isFinite(pct)||pct<=0||pct>=100||Math.round(pct*100)!==pct*100)throw fail('Discount percentage must be greater than 0 and less than 100 (up to 2 decimals).');
    final=Math.round(base*(1-pct/100));metadata.sale_discount_percent=pct;metadata.sale_price_cents=final;
  }else if(method==='price'){
    final=cents(b.salePriceCents,'Promotional price');if(!final||final>=base)throw fail('Promotional price must be greater than $0 and below regular price.');
    metadata.sale_price_cents=final;metadata.sale_discount_percent=Number(((base-final)*100/base).toFixed(2));
  }else throw fail('Choose sale price or percent discount.');
  metadata.sale_discount_mode=method;
 }else{delete metadata.sale_price_cents;delete metadata.sale_discount_percent;delete metadata.sale_discount_mode;}
 metadata.list_price_cents=base;
 // This field is used by the first-party checkout quote when enabled in the future.
 // Never interpret it as an Amazon/KDP price update.
 metadata.website_price_cents=final;
 metadata.price_ownership='first_party_website_only';metadata.price_last_set_by=a.id;
 const patch={sales_status:state,store_visible:b.storeVisible!==false,metadata,updated_at:new Date().toISOString(),updated_by:a.id};
 for(const [input,field] of [['amazonKindleEnabled','amazon_kindle_enabled'],['amazonPaperbackEnabled','amazon_paperback_enabled'],['amazonHardcoverEnabled','amazon_hardcover_enabled']])if(typeof b[input]==='boolean')patch[field]=b[input];
 if(b.lemonVariantId!==undefined)patch.lemon_variant_id=clean(b.lemonVariantId)||null;
 if(b.websiteCheckoutEnabled===false)patch.website_checkout_enabled=false;
 if(b.websiteCheckoutEnabled===true&&!row.website_checkout_enabled)throw fail('Paid website checkout activation remains disabled until separate production acceptance.',403);

 await db(env,'catalog_products?product_code=eq.'+encodeURIComponent(code),'PATCH',patch);
 await db(env,'admin_audit_log','POST',{actor_user_id:a.id,action:'v1353.book.sales_price.save',target_type:'book',target_id:code,details:{salesStatus:state,listPriceCents:base,websitePriceCents:final,amazonNotUpdated:true}});
 return reply({ok:true,salesStatus:state,listPriceCents:base,websitePriceCents:final,amazonNotUpdated:true,notice:'Website catalog status and reference price saved. Amazon KDP pricing and external availability were NOT changed.'});
}catch(err){return reply({ok:false,error:err.message||'Book settings unavailable.'},err.status||500)}}
