/* v0.14.0.175 public, read-only and strictly redacted upcoming Store metadata.
 * Service key never leaves the Worker. No payment/entitlement route.
 */
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
export async function onRequestGet({env}){
 try{
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
  const secret=String(env.SUPABASE_SECRET_KEY||'');
  if(!base||!secret)return new Response(JSON.stringify({ok:false,error:'Catalog unavailable'}),{status:503,headers});
  const h=secret.startsWith('sb_secret_')?{apikey:secret}:{apikey:secret,authorization:'Bearer '+secret};
  const r=await fetch(base+'/rest/v1/store_product_overrides_v014175?select=sku,title,description,store_visible,lifecycle,version&order=sku.asc',{headers:h});
  if(!r.ok)return new Response(JSON.stringify({ok:false,error:'Catalog unavailable'}),{status:503,headers});
  const rows=await r.json();
  const items=Array.isArray(rows)?rows.filter(x=>x.store_visible===true&&['coming_soon','release_ready'].includes(x.lifecycle))
   .map(x=>({sku:x.sku,title:x.title,description:x.description,lifecycle:x.lifecycle})).slice(0,250):[];
  const hidden=Array.isArray(rows)?rows.filter(x=>x.store_visible===false||['draft','paused'].includes(x.lifecycle)).map(x=>x.sku):[];
  return new Response(JSON.stringify({ok:true,items,hidden}),{headers});
 }catch{return new Response(JSON.stringify({ok:false,error:'Catalog unavailable'}),{status:503,headers})}
}
