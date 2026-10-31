/* Google AdSense public configuration; never exposes service credentials.
 * Fail closed for signed-in members to protect all ad-free entitlements.
 * No ad unit IDs have been provided, so this does not create ad slots.
 */
export async function onRequestGet({request,env}){
 const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
 const disabled={enabled:false,publisherId:'ca-pub-6531971840615114',pageEnabled:false};
 try{
  const url=new URL(request.url);
  const page=url.searchParams.get('page')||'';
  const allowed=['/index.html','/knowledge-database.html','/store.html','/advertise.html'];
  if(!allowed.includes(page))return json(disabled);
  const credential=request.headers.get('authorization')||'';
  if(credential)return json(disabled); // Never show third-party ads to members by default.
  const base=String(env.SUPABASE_URL||'').replace(/\\/$/,'');
  const key=String(env.SUPABASE_SECRET_KEY||'');
  if(!base||!key)return json(disabled);
  const headers={apikey:key,...(key.startsWith('eyJ')?{authorization:'Bearer '+key}:{})};
  const response=await fetch(base+'/rest/v1/gu_adsense_controls_v1?select=approved,enabled,pages&singleton=eq.true',{headers,cache:'no-store'});
  if(!response.ok)return json(disabled);
  const rows=await response.json(),control=rows?.[0]||{};
  const enabled=control.approved===true&&control.enabled===true&&control.pages?.[page]===true;
  return json({...disabled,enabled,pageEnabled:control.pages?.[page]===true});
 }catch{return json(disabled)}
}
