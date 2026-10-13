/* v0.13.5.5: authenticated, no-store administrative rendering data for a read-only
 * member-style Historical Lab preview. Does NOT access member progress, grant
 * entitlements, modify historical Labs or fetch private student answers. */
const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const reply=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers:HEAD});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const clean=v=>String(v??'').trim();
async function fetchJson(url,opts){const r=await fetch(url,{...opts,cache:'no-store'});let data;try{data=await r.json()}catch{data=null}if(!r.ok)throw fail('Administrative preview could not be verified.',r.status===401?401:r.status===403?403:503);return data}
export async function onRequest({request,env}){try{
 if(request.method!=='GET')return reply({ok:false,error:'Read-only preview.'},405);
 const id=clean(new URL(request.url).searchParams.get('lab'));
 if(!/^[A-Za-z0-9._-]{2,90}$/.test(id))throw fail('A valid Lab ID is required.',400);
 const base=clean(env.SUPABASE_URL).replace(/\/$/,'');const pub=clean(env.SUPABASE_PUBLISHABLE_KEY),secret=clean(env.SUPABASE_SECRET_KEY);
 if(!/^https:\/\//i.test(base)||!pub||!secret)throw fail('Administrative service not configured.',503);
 const token=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'')?.[1];if(!token)throw fail('Sign in to preview this Lab.',401);
 const who=await fetchJson(base+'/auth/v1/user',{headers:{apikey:pub,authorization:'Bearer '+token}});
 if(!who?.id)throw fail('Invalid session.',401);
 const headers={apikey:secret,authorization:'Bearer '+secret,accept:'application/json'};
 const [profile,roles]=await Promise.all([
  fetchJson(base+'/rest/v1/profiles?select=account_kind&id=eq.'+encodeURIComponent(who.id)+'&limit=1',{headers}),
  fetchJson(base+'/rest/v1/admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(who.id),{headers})
 ]);
 const live=(roles||[]).filter(x=>!x.expires_at||Date.parse(x.expires_at)>Date.now()).map(x=>x.role_code);
 const isShowcase=(profile||[]).some(x=>x.account_kind==='showcase')||live.includes('SHOWCASE_VIEWER');
 if(isShowcase){return reply({ok:true,synthetic:true,lab:{lab_id:'DEMO-LAB-01',title:'Synthetic chart-reading exercise',book_code:'SITE_EXCLUSIVE',chapter_number:1,active:true,registry_visible:true,public_sample:true,metadata:{what:'Identify support and resistance levels in a synthetic example.',why:'Practice evidence-based decision-making.',when:'During guided historical practice.',objective:'Explain a decision without hindsight.',questions:['What evidence can you identify?'],how:['Inspect only the information available at the decision point.']}}});}
 if(!live.some(r=>['OWNER','ADMIN','LEARNING_MANAGER','CONTENT_MANAGER'].includes(r)))throw fail('Administrative learning access required.',403);
 const labs=await fetchJson(base+'/rest/v1/platform_labs?select=*&lab_id=eq.'+encodeURIComponent(id)+'&limit=1',{headers});
 if(!labs?.[0])throw fail('Historical Lab does not exist.',404);
 const l=labs[0];return reply({ok:true,synthetic:false,lab:l,memberVisible:l.active===true&&l.registry_visible===true,warning:!(l.active&&l.registry_visible)?'This Lab is hidden or inactive and cannot currently be opened by an ordinary member.':''});
 }catch(e){return reply({ok:false,error:e.message||'Preview failed.'},e.status||500)}}
