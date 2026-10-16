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
  const [plans,tools,books]=await Promise.all([
   get(base+'/rest/v1/platform_plans?select=plan_code,name,price_cents,billing_interval,active,public_visible&order=sort_order.asc&limit=200',headers),
   get(base+'/rest/v1/platform_tools?select=tool_code,name,individual_price_cents,status,active,public_visible&order=sort_order.asc&limit=200',headers),
   get(base+'/rest/v1/catalog_products?select=product_code,title,product_type,kdp_select,direct_digital_enabled,metadata,active,store_visible,sales_status&product_type=eq.book&order=product_code.asc&limit=200',headers)
  ]);
  let map={};try{const v=JSON.parse(String(env.STRIPE_MANAGED_PRICE_MAP_JSON||'{}'));if(v&&typeof v==='object'&&!Array.isArray(v))map=v}catch{/* Invalid map -> mark all unmapped, do not suggest ready. */}
  const rows=[];
  for(const p of Array.isArray(plans)?plans:[]){const amount=Number(p.price_cents);const free=amount===0;
   rows.push({key:'plan:'+String(p.plan_code||''),name:String(p.name||p.plan_code||''),type:'membership',amountCents:validAmount(amount)?amount:null,currency:'USD',billing:String(p.billing_interval||''),eligible:!free&&p.active===true&&p.public_visible===true,reason:free?'Free — no Stripe product':(!p.active||!p.public_visible?'Not publicly offered':'Verify Stripe eligibility')})}
  for(const p of Array.isArray(tools)?tools:[]){const amount=Number(p.individual_price_cents);
   rows.push({key:'tool:'+String(p.tool_code||''),name:String(p.name||p.tool_code||''),type:'tool',amountCents:validAmount(amount)?amount:null,currency:'USD',billing:'month',eligible:p.active===true&&p.public_visible===true&&p.status==='live',reason:p.status!=='live'?'Not released for paid enrollment':(!p.active||!p.public_visible?'Hidden or inactive':'Verify product qualification')})}
  for(const p of Array.isArray(books)?books:[]){const amount=p.metadata?.website_price_by_format_cents_v135?.digital;
   rows.push({key:'book:'+String(p.product_code||''),name:String(p.title||p.product_code||''),type:'ebook',amountCents:validAmount(amount)?Number(amount):null,currency:'USD',billing:'one_time',eligible:p.active===true&&p.store_visible===true&&p.sales_status==='published'&&p.kdp_select===false&&p.direct_digital_enabled===true,reason:p.kdp_select?'KDP Select — no direct distribution':(!p.direct_digital_enabled?'Direct digital sale disabled':'Verify publishing and download rights')})}
  const result=rows.filter(x=>/^(plan|tool|book):[A-Z0-9_]{3,90}$/.test(x.key)).map(x=>({...x,mapped:/^price_[A-Za-z0-9_]{6,}$/.test(String(map[x.key]||'')),priceIdPresent:Boolean(map[x.key])}));
  return answer({ok:true,route:staff.provider,routeEnabled:staff.enabled===true,catalogCount:result.length,mappedCount:result.filter(x=>x.mapped).length,products:result,
   warning:'Mapping is a Cloudflare server-side test configuration. A mapped Price ID does NOT establish Stripe product/amount validity or live checkout readiness. No settings changed.'});
 }catch{return answer({ok:false,error:'Unable to inspect the private payment catalog.'},503)}
}
export async function onRequestPost(){return answer({ok:false,error:'GET required.'},405)}
