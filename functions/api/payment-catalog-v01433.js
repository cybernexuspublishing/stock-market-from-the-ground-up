/* v0.14.0.33 — read-only authorized admin Stripe digital SKU mapping evidence.
 * Never modifies billing, never queries customer records or returns provider secrets.
 * Stripe Price IDs in this report are represented as mapped/unmapped only.
 */
const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const answer=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEAD});
const validAmount=x=>x!==null&&x!==undefined&&x!==''&&Number.isSafeInteger(Number(x))&&Number(x)>=0;
async function get(url,headers){const r=await fetch(url,{headers,cache:'no-store'});if(!r.ok)throw new Error('Database catalog currently unavailable.');return r.json()}
export async function onRequestGet({request,env}){
 const jwt=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];if(!jwt)return answer({ok:false,error:'Authorized staff session required.'},401);
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');const pub=String(env.SUPABASE_PUBLISHABLE_KEY||'');const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(base)||!pub||!secret)return answer({ok:false,error:'Catalog service is not configured.'},503);
 const authHeaders={apikey:pub,authorization:'Bearer '+jwt,'content-type':'application/json'};
 try{
  const role=await fetch(base+'/rest/v1/rpc/gu_owner_digital_payment_route_read_v01432r2',{method:'POST',body:'{}',headers:authHeaders,cache:'no-store'});
  if(!role.ok)return answer({ok:false,error:'OWNER/ADMIN permissions or database routing unavailable.'},role.status===401?401:role.status===403?403:503);
  const staff=await role.json().catch(()=>null);if(!staff?.ok||!['OWNER','ADMIN'].includes(staff.role))return answer({ok:false,error:'OWNER/ADMIN access required.'},403);
  const headers={apikey:secret,authorization:'Bearer '+secret};
  const [plans,tools,books,store]=await Promise.all([
   get(base+'/rest/v1/platform_plans?select=plan_code,name,price_cents,billing_interval,active,public_visible,checkout_enabled&order=sort_order.asc&limit=200',headers),
   get(base+'/rest/v1/platform_tools?select=tool_code,name,individual_price_cents,status,active,public_visible,checkout_enabled&order=sort_order.asc&limit=200',headers),
   get(base+'/rest/v1/catalog_products?select=product_code,title,product_type,kdp_select,direct_digital_enabled,website_checkout_enabled,metadata,active,store_visible,sales_status&product_type=eq.book&order=product_code.asc&limit=200',headers),
   get(base+'/rest/v1/gu_storefront_items_v014174?select=sku,category,display_name,status,visible,sale_ready,price_label,version&order=category.asc,sku.asc&limit=150',headers)
  ]);
  let map={};try{const v=JSON.parse(String(env.STRIPE_MANAGED_PRICE_MAP_JSON||'{}'));if(v&&typeof v==='object'&&!Array.isArray(v))map=v}catch{/* Invalid map -> mark all unmapped, do not suggest ready. */}
  const rows=[];
  for(const p of Array.isArray(plans)?plans:[]){const amount=Number(p.price_cents);const free=amount===0;
   rows.push({key:'plan:'+String(p.plan_code||''),name:String(p.name||p.plan_code||''),type:'membership',amountCents:validAmount(amount)?amount:null,currency:'USD',billing:String(p.billing_interval||''),visible:p.public_visible===true,checkoutEnabled:p.checkout_enabled===true,eligible:!free&&p.active===true&&p.checkout_enabled===true,reason:free?'Free — no Stripe product':(!p.active?'Inactive':!p.checkout_enabled?'Owner checkout disabled':'Verify Stripe eligibility')})}
  for(const p of Array.isArray(tools)?tools:[]){const amount=Number(p.individual_price_cents);
   rows.push({key:'tool:'+String(p.tool_code||''),name:String(p.name||p.tool_code||''),type:'tool',amountCents:validAmount(amount)?amount:null,currency:'USD',billing:'month',visible:p.public_visible===true,checkoutEnabled:p.checkout_enabled===true,eligible:p.active===true&&p.checkout_enabled===true&&p.status==='live',reason:p.status!=='live'?'Not released for paid enrollment':(!p.active?'Inactive':!p.checkout_enabled?'Owner checkout disabled':'Verify product qualification')})}
  for(const p of Array.isArray(books)?books:[]){const amount=p.metadata?.website_price_by_format_cents_v135?.digital;
   rows.push({key:'book:'+String(p.product_code||''),name:String(p.title||p.product_code||''),type:'ebook',amountCents:validAmount(amount)?Number(amount):null,currency:'USD',billing:'one_time',visible:p.store_visible===true,checkoutEnabled:p.website_checkout_enabled===true,eligible:p.active===true&&p.website_checkout_enabled===true&&p.sales_status==='published'&&p.kdp_select===false&&p.direct_digital_enabled===true,reason:p.kdp_select?'KDP Select — no direct distribution':(!p.direct_digital_enabled?'Direct digital sale disabled':'Verify publishing and download rights')})}
  const result=rows.filter(x=>/^(plan|tool|book):[A-Z0-9_]{3,90}$/.test(x.key)).map(x=>({...x,mapped:/^price_[A-Za-z0-9_]{6,}$/.test(String(map[x.key]||'')),priceIdPresent:Boolean(map[x.key])}));
  // Extend the existing authorized Owner catalog report to ALL 60 canonical
  // Store faces. This is evidence only; never turns on checkout or grants access.
  // Store-facing visibility is a presentation flag, not a purchase entitlement.
  let gu58={},founding={};
  try{gu58=JSON.parse(String(env.GU58_STRIPE_LIVE_CATALOG_JSON||'{}'))}catch{}
  try{founding=JSON.parse(String(env.GU_F600_LIVE_CATALOG_JSON||'{}'))}catch{}
  const validPair=o=>Boolean(o&&typeof o==='object'&&
   /^prod_[A-Za-z0-9_]{6,}$/.test(String(o.product_id||o.productId||''))&&
   /^price_[A-Za-z0-9_]{6,}$/.test(String(o.price_id||o.priceId||'')));
  const coreByKey=new Map(result.map(x=>[x.key,x]));
  const inventory=(Array.isArray(store)?store:[]).map(p=>{
   const sku=String(p.sku||'');const cat=String(p.category||'');
   const core=coreByKey.get(sku);
   const providerMap=cat==='founding'?founding[sku.replace(/^founding:/,'')]:gu58[sku];
   const excluded=cat==='feature'||sku==='plan:FREE';
   const independentlyAuthorized=core?.eligible===true;
   return {sku,category:cat,name:String(p.display_name||''),
    storeVisible:p.visible===true,displayStatus:String(p.status||''),
    saleReady:p.sale_ready===true,version:Number(p.version||0),
    priceLabel:String(p.price_label||''),stripeMappingPresent:validPair(providerMap),
    canonicalCheckoutEnabled:core?.checkoutEnabled===true,
    // A display-ready row, Stripe mapping, or client-visible switch NEVER
    // certifies licensed content, active Price, webhook and entitlement proof.
    liveSaleVerified:false,
    blocker:excluded?'INCLUDED_OR_FREE_NOT_SEPARATELY_SOLD':
      p.sale_ready!==true?'FULFILLMENT_NOT_ACCEPTED':
      !validPair(providerMap)?'NO_REVIEWED_LIVE_PRICE_MAPPING':
      !independentlyAuthorized&&cat!=='founding'?'OWNER_CHECKOUT_NOT_AUTHORIZED':
      'REQUIRES_SERVER_PAYMENT_AND_ENTITLEMENT_ACCEPTANCE'};
  });
  return answer({ok:true,route:staff.provider,routeEnabled:staff.enabled===true,
   catalogCount:result.length,mappedCount:result.filter(x=>x.mapped).length,
   inventoryCount:inventory.length,inventory,products:result,
   warning:'Read-only inventory. Stripe product activation and Store visibility never authorize checkout. No payment, entitlement or setting changed.'});
 }catch{return answer({ok:false,error:'Unable to inspect the private payment catalog.'},503)}
}
export async function onRequestPost(){return answer({ok:false,error:'GET required.'},405)}
