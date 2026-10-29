/* Public, read-only Studio dropdown visibility. No access or pricing decisions. */
const KEY='feature.crownlight_chart_studio_menu_v1';
const ALL=['STANDARD','ADVANCED','PROFESSIONAL'];
const H={'content-type':'application/json; charset=utf-8','cache-control':'public, no-store','x-content-type-options':'nosniff'};
const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
export async function onRequestGet({env}){
 try{
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
  const secret=String(env.SUPABASE_SECRET_KEY||'');
  if(!base||!secret)throw Error('No private configuration');
  const headers={apikey:secret,accept:'application/json'};
  if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
   headers.authorization='Bearer '+secret;
  const r=await fetch(base+'/rest/v1/site_settings?select=value&setting_key=eq.'+
   encodeURIComponent(KEY)+'&limit=1',{headers,cache:'no-store'});
  if(!r.ok)throw Error('Setting unavailable');
  const rows=await r.json();
  if(!Array.isArray(rows))throw Error('Bad settings response');
  const visible=rows.length===0?ALL:rows[0]?.value?.visible;
  if(!Array.isArray(visible)||visible.length<1||visible.length>ALL.length||
     new Set(visible).size!==visible.length||visible.some(t=>!ALL.includes(t)))
   throw Error('Invalid approved visibility setting');
  return send({ok:true,visible:ALL.filter(t=>visible.includes(t))});
 }catch{
  // Fail safe for visibility only. Real tier authorization remains server-side.
  return send({ok:true,visible:ALL,usingDefaults:true});
 }
}
