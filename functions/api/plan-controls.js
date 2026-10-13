/* OWNER-only membership catalog controls. Never activates payment processing.
 * Disabled/hidden plans are not offered for new purchases; existing subscribers
 * retain their contractual rights until provider/entitlement state changes.
 */
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'};
const out=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
const bad=(msg,s=400)=>Object.assign(new Error(msg),{status:s});
const str=x=>String(x??'').trim();
function config(env){const base=str(env.SUPABASE_URL).replace(/\/$/,''),secret=str(env.SUPABASE_SECRET_KEY),pub=str(env.SUPABASE_PUBLISHABLE_KEY);if(!base||!secret||!pub)throw bad('Member administration unavailable.',503);return{base,secret,pub}}
async function json(url,opts){const r=await fetch(url,{...opts,cache:'no-store'}),t=await r.text();if(!r.ok)throw bad('Member administration database request failed.',503);try{return t?JSON.parse(t):[]}catch{throw bad('Malformed backend response.',503)}}
async function db(env,path,method='GET',body){const c=config(env);return json(c.base+'/rest/v1/'+path,{method,headers:{apikey:c.secret,authorization:'Bearer '+c.secret,accept:'application/json',...(body===undefined?{}:{'content-type':'application/json',prefer:'return=representation'})},body:body===undefined?undefined:JSON.stringify(body)})}
async function owner(env,req){const token=/^Bearer\s+(.+)$/i.exec(req.headers.get('authorization')||'')?.[1];if(!token)throw bad('Sign in required.',401);const c=config(env),u=await json(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token}});if(!u?.id)throw bad('Invalid session.',401);const [p,roles]=await Promise.all([db(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(u.id)+'&limit=1'),db(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(u.id))]);if(p[0]?.account_kind!=='member'||!roles.some(x=>x.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())))throw bad('OWNER authority required; Showcase and test accounts are read-only.',403);if(env.REQUIRE_STAFF_AAL2_V135==='true'){let aal='';try{aal=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).aal}catch{}if(aal!=='aal2')throw bad('Staff MFA verification required.',403)}return u.id}
export async function onRequest({request,env}){try{const actor=await owner(env,request);if(request.method==='GET'){const plans=await db(env,'platform_plans?select=plan_code,name,description,price_cents,billing_interval,active,public_visible,checkout_enabled,lemon_variant_id,sort_order,metadata&order=sort_order.asc');return out({ok:true,plans,checkoutRolloutEnabled:env.ENABLE_PAID_CHECKOUT==='true'});}if(request.method!=='POST')return out({ok:false,error:'Method not allowed.'},405);
 const body=await request.json().catch(()=>null);if(!body||JSON.stringify(body).length>3000)throw bad('Invalid request.');const code=str(body.planCode).toUpperCase();if(!/^[A-Z][A-Z0-9_]{1,63}$/.test(code))throw bad('Invalid membership plan code.');
 const plans=await db(env,'platform_plans?select=plan_code,active,public_visible,checkout_enabled,price_cents&plan_code=eq.'+encodeURIComponent(code)+'&limit=1'),old=plans[0];if(!old)throw bad('Unknown plan.',404);
 const patch={updated_at:new Date().toISOString()};
 for(const [inp,col] of [['active','active'],['publicVisible','public_visible']])if(typeof body[inp]==='boolean')patch[col]=body[inp];
 if(typeof body.checkoutEnabled==='boolean'){
  if(body.checkoutEnabled)throw bad('Enabling checkout requires a separate audited payment rollout, not this interface.',403);
  patch.checkout_enabled=false;
 }
 if(Object.keys(patch).length===1&&body.pauseCheckout!==true)throw bad('Nothing to change.');
 if(code==='FREE'&&patch.active===false)throw bad('The FREE account fallback cannot be disabled. You may hide it from public pricing.',409);
 // Atomic SQL transaction is mandatory: update + audit must succeed together.
 const changed=await db(env,'rpc/v014_owner_plan_visibility','POST',{p_actor:actor,p_code:code,p_active:patch.active===undefined?old.active:patch.active,p_visible:patch.public_visible===undefined?old.public_visible:patch.public_visible,p_pause_checkout:body.pauseCheckout===true||body.checkoutEnabled===false});
 if(!changed?.ok)throw bad('Membership update was not confirmed.',503);
 return out({...changed,notice:'Membership availability updated and audited. Existing subscriptions/entitlements are unaffected.'});
}catch(e){return out({ok:false,error:e.message||'Plan request failed.'},e.status||500)}}
