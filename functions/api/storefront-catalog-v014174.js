/* v0.14.0.174 Public Store faces: display only. No checkout, auth token,
 * secret/Price ID, entitlement grant, or owner-only metadata is returned. */
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const send=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers});
const columns='sku,category,display_name,description,price_label,duration_label,product_page,status,visible,display_order';
export async function onRequestGet({env,request}){
 try{
  if(!request||new URL(request.url).searchParams.has('debug'))return send({ok:false,error:'Unsupported query.'},400);
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=String(env.SUPABASE_SECRET_KEY||'');
  if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!(key.startsWith('sb_secret_')||key.startsWith('eyJ')))return send({ok:false,error:'Catalog unavailable.'},503);
  const h={apikey:key,accept:'application/json'};
  if(key.startsWith('eyJ'))h.authorization='Bearer '+key;
  const url=base+'/rest/v1/gu_storefront_items_v014174?select='+columns+'&visible=eq.true&order=display_order.asc,sku.asc&limit=500';
  const r=await fetch(url,{headers:h,cache:'no-store'});
  if(!r.ok)return send({ok:false,error:'Catalog currently unavailable.'},503);
  const data=await r.json();
  if(!Array.isArray(data)||data.length>500)return send({ok:false,error:'Invalid catalog response.'},503);
  return send({ok:true,version:'0.14.0.174',items:data});
 }catch{return send({ok:false,error:'Catalog currently unavailable.'},503)}
}
export async function onRequest({request,env}){
 if(request.method!=='GET')return send({ok:false,error:'Method not allowed.'},405);
 return onRequestGet({request,env});
}
