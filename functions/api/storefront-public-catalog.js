/* Public, read-only, first-party storefront presentation (2026-10-27).
 * All purchase authorization remains in the original, server-only checkout.
 * No Stripe, sensitive metadata, member identity, or entitlements are returned.
 */
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const limited=(v,n)=>String(v??'').slice(0,n);
const statuses=new Set(['listed','coming_soon','release_ready','published','selling','unavailable']);
const allowedCats=new Set(['membership','tool','book','bootcamp','founding','addon','feature']);
export async function onRequestGet({env}){
 try{
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=String(env.SUPABASE_SECRET_KEY||'');
  if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!key)
   return json({ok:false,error:'Store catalog is temporarily unavailable.'},503);
  const headers=key.startsWith('sb_secret_')?{apikey:key}:{apikey:key,authorization:'Bearer '+key};
  const query='gu_storefront_items_v014174?select=sku,category,display_name,description,price_label,duration_label,product_page,status,visible,sale_ready,display_order&visible=eq.true&order=display_order.asc&limit=150';
  const r=await fetch(base+'/rest/v1/'+query,{headers,cache:'no-store'});
  if(!r.ok)return json({ok:false,error:'Store catalog is temporarily unavailable.'},503);
  const rows=await r.json();
  if(!Array.isArray(rows)||rows.length>150)throw Error('Invalid catalog');
  const items=rows.filter(x=>x?.visible===true&&allowedCats.has(x.category)&&
   /^[a-z]+:[A-Z0-9_\-]+$/.test(String(x.sku||''))).map(x=>({
   sku:limited(x.sku,90),category:x.category,name:limited(x.display_name,220),
   description:limited(x.description,1600),price:limited(x.price_label,100),
   duration:limited(x.duration_label,100),status:statuses.has(x.status)?x.status:'unavailable',
   saleReady:x.sale_ready===true,
   // Only local, rootless .html product destinations may be exposed.
   page:/^[a-z0-9-]+\.html$/.test(String(x.product_page||''))?x.product_page:null
  }));
  return json({ok:true,source:'verified_storefront',items,count:items.length});
 }catch{return json({ok:false,error:'Store catalog is temporarily unavailable.'},503)}
}
