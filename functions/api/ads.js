const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
const clean=v=>String(v??'').trim();
function cfg(env){const url=clean(env.SUPABASE_URL).replace(/\/$/,'');const pub=clean(env.SUPABASE_PUBLISHABLE_KEY),secret=clean(env.SUPABASE_SECRET_KEY);if(!url||!pub||!secret)throw new Error('Supabase environment incomplete.');return{url,pub,secret}}
async function raw(url,opts={}){const r=await fetch(url,opts),t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={raw:t}}if(!r.ok)throw Object.assign(new Error(d.message||d.error||t||`HTTP ${r.status}`),{status:r.status});return d}
async function rest(env,path,{method='GET',body,prefer}={}){const {url,secret}=cfg(env),headers={apikey:secret,authorization:`Bearer ${secret}`,accept:'application/json'};if(body!==undefined)headers['content-type']='application/json';if(prefer)headers.prefer=prefer;return raw(`${url}/rest/v1/${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)})}
async function maybeUser(env,req){const h=req.headers.get('authorization')||'';if(!h.startsWith('Bearer '))return null;const {url,pub}=cfg(env);try{return await raw(`${url}/auth/v1/user`,{headers:{apikey:pub,authorization:h}})}catch{return null}}
const active=(status,end)=>['active','trialing'].includes(String(status||''))&&(!end||new Date(end)>new Date());
async function accessCode(env,uid){
  if(!uid)return 'SIGNED_OUT';
  // Use the canonical entitlement resolver first so ad frequency always follows the
  // same effective membership shown in Profile, even when grants/subscriptions overlap.
  try{
    const resolved=await rest(env,'rpc/my_platform_access_for_user',{method:'POST',body:{target_user:uid}});
    const obj=Array.isArray(resolved)?resolved[0]:resolved;
    const code=clean(obj?.planCode||obj?.plan_code);
    if(code)return code;
  }catch{}
  // Conservative fallback for schema-cache/transient RPC failures.
  try{const roles=await rest(env,`admin_user_roles?select=role_code,expires_at&user_id=eq.${encodeURIComponent(uid)}`);if((roles||[]).some(r=>r.role_code==='OWNER'&&(!r.expires_at||new Date(r.expires_at)>new Date())))return 'OWNER'}catch{}
  try{const grants=await rest(env,`user_plan_grants?select=plan_code,status,ends_at&user_id=eq.${encodeURIComponent(uid)}&status=in.(active,trialing)`);for(const code of ['LIFETIME','FULL_ANNUAL','FULL_MONTHLY'])if((grants||[]).some(g=>g.plan_code===code&&active(g.status,g.ends_at)))return code}catch{}
  try{const subs=await rest(env,`site_subscriptions?select=plan_code,status,current_period_end&user_id=eq.${encodeURIComponent(uid)}&status=in.(active,trialing)`);for(const code of ['LIFETIME','FULL_ANNUAL','FULL_MONTHLY'])if((subs||[]).some(s=>s.plan_code===code&&active(s.status,s.current_period_end)))return code}catch{}
  try{const ent=await rest(env,`entitlements?select=product_key,status,ends_at&user_id=eq.${encodeURIComponent(uid)}&status=in.(active,trialing)`);if((ent||[]).some(e=>e.product_key==='full_learning_access'&&active(e.status,e.ends_at)))return 'BOOK_TRIAL'}catch{}
  try{const passes=await rest(env,`user_tool_passes?select=id,status,ends_at,current_period_end&user_id=eq.${encodeURIComponent(uid)}&status=in.(active,trialing)&limit=1`);if((passes||[]).some(p=>active(p.status,p.ends_at||p.current_period_end)))return 'PICK_WHAT_YOU_WANT'}catch{}
  return 'FREE';
}
async function policy(env,code){try{return (await rest(env,`plan_ad_policies?select=*&access_code=eq.${encodeURIComponent(code)}&limit=1`))?.[0]||null}catch{return null}}
async function event(env,campaign,creative,slot,type,userId,page,sessionToken,code){try{await rest(env,'ad_events',{method:'POST',prefer:'return=minimal',body:{campaign_id:campaign||null,creative_id:creative||null,placement_code:slot||null,event_type:type,user_id:userId||null,page_path:page||null,session_token:sessionToken||null,access_code:code||null}})}catch{}}
async function countExact(env,filters){const {url,secret}=cfg(env);const r=await fetch(`${url}/rest/v1/ad_events?select=id&${filters}`,{headers:{apikey:secret,authorization:`Bearer ${secret}`,prefer:'count=exact',range:'0-0'}});if(!r.ok)return 0;const m=(r.headers.get('content-range')||'').match(/\/(\d+)$/);return m?Number(m[1]):0}
async function latestImpression(env,identityFilter){try{return (await rest(env,`ad_events?select=created_at&event_type=eq.impression&${identityFilter}&order=created_at.desc&limit=1`))?.[0]?.created_at||null}catch{return null}}
async function withinFrequency(env,p,userId,sid){
  if(!p?.ads_enabled)return false;
  const maxDay=Number(p.max_impressions_per_24h||0),maxSession=Number(p.max_impressions_per_session||0),gap=Number(p.minimum_minutes_between_ads||0);
  if(maxDay<=0||maxSession<=0)return false;
  const identity=userId?`user_id=eq.${encodeURIComponent(userId)}`:`session_token=eq.${encodeURIComponent(sid||'none')}`;
  const since=new Date(Date.now()-86400000).toISOString();
  if(await countExact(env,`event_type=eq.impression&${identity}&created_at=gte.${encodeURIComponent(since)}`)>=maxDay)return false;
  if(sid&&await countExact(env,`event_type=eq.impression&session_token=eq.${encodeURIComponent(sid)}`)>=maxSession)return false;
  if(gap>0){const last=await latestImpression(env,identity);if(last&&Date.now()-new Date(last).getTime()<gap*60000)return false}
  return true;
}
async function countCampaign(env,campaign,type){return countExact(env,`campaign_id=eq.${Number(campaign)}&event_type=eq.${encodeURIComponent(type)}`)}
function audienceAllows(aud,code,signed){aud=aud||{};if(!signed)return aud.signed_out!==false;if(code==='FREE'||code==='BOOK_TRIAL')return aud.free!==false;if(code==='A_LA_CARTE'||code==='PICK_WHAT_YOU_WANT')return aud.tool_pass!==false;if(['FULL_MONTHLY','FULL_ANNUAL'].includes(code))return aud.full!==false;return false}
export async function onRequest(context){
  const {request,env}=context,u=new URL(request.url),action=clean(u.searchParams.get('action'));
  try{
    const usr=await maybeUser(env,request),code=await accessCode(env,usr?.id);
    if(action==='serve'){
      const p=await policy(env,code);if(!p?.ads_enabled)return json({ok:true,creative:null,adFree:true,accessCode:code});
      const slot=clean(u.searchParams.get('slot')),sid=clean(u.searchParams.get('sid')).slice(0,100),page=clean(u.searchParams.get('page'));
      if(!(p.allowed_slots||[]).includes(slot))return json({ok:true,creative:null,accessCode:code});
      if(!(await withinFrequency(env,p,usr?.id,sid)))return json({ok:true,creative:null,limited:true,accessCode:code});
      const now=new Date().toISOString();
      const placement=(await rest(env,`ad_placements?select=placement_code,active&placement_code=eq.${encodeURIComponent(slot)}&limit=1`))?.[0];if(!placement?.active)return json({ok:true,creative:null});
      const camps=await rest(env,`ad_campaigns?select=id,audience,status,starts_at,ends_at,impression_limit,click_limit&status=eq.active&or=(starts_at.is.null,starts_at.lte.${encodeURIComponent(now)})&or=(ends_at.is.null,ends_at.gt.${encodeURIComponent(now)})&order=created_at.asc`);
      for(const c of camps||[]){
        if(!audienceAllows(c.audience,code,!!usr))continue;
        if(c.impression_limit&&await countCampaign(env,c.id,'impression')>=Number(c.impression_limit))continue;
        if(c.click_limit&&await countCampaign(env,c.id,'click')>=Number(c.click_limit))continue;
        const cr=await rest(env,`ad_creatives?select=id,campaign_id,placement_code,headline,body,image_url,destination_url,disclosure_label,alt_text&campaign_id=eq.${c.id}&placement_code=eq.${encodeURIComponent(slot)}&status=in.(approved,active)&limit=1`);
        if(cr?.[0]){await event(env,c.id,cr[0].id,slot,'impression',usr?.id,page,sid,code);return json({ok:true,creative:cr[0],accessCode:code,policy:{maxPerSession:p.max_impressions_per_session,maxPer24h:p.max_impressions_per_24h}})}
      }
      return json({ok:true,creative:null,accessCode:code});
    }
    if(action==='click'){
      const id=Number(u.searchParams.get('creative')),sid=clean(u.searchParams.get('sid')).slice(0,100);if(!id)return new Response('Not found',{status:404});
      const cr=await rest(env,`ad_creatives?select=id,campaign_id,placement_code,destination_url&id=eq.${id}&status=in.(approved,active)&limit=1`);const c=cr?.[0];if(!c||!/^https:\/\//i.test(c.destination_url||''))return new Response('Not found',{status:404});
      await event(env,c.campaign_id,c.id,c.placement_code,'click',usr?.id,u.pathname,sid,code);return Response.redirect(c.destination_url,302);
    }
    return json({error:'Unknown action'},404);
  }catch(e){return json({error:e.message||'Ad request failed.'},e.status||500)}
}
