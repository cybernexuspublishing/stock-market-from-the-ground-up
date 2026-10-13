/* v0.13.5: username login with Cloudflare challenge and Supabase native captcha forwarding.
 * Generic login failures avoid exposing whether a username is registered.
 * Compatible with Supabase GoTrue gotrue_meta_security.captcha_token. */
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const norm=v=>String(v||'').trim().toLowerCase();
/* Do not call Cloudflare Siteverify here: Supabase Auth itself must verify this
 * one-time token when Auth CAPTCHA is enabled, otherwise we would consume it twice. */
export async function onRequestPost({request,env}){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,''),pub=env.SUPABASE_PUBLISHABLE_KEY,secret=env.SUPABASE_SECRET_KEY;if(!url||!pub||!secret)return json({error:'Sign-in service unavailable.'},503);
 const body=await request.json().catch(()=>null);if(!body||JSON.stringify(body).length>5500)return json({error:'Invalid request.'},400);
 const username=norm(body.username),password=String(body.password||''),captchaToken=String(body.captchaToken||'');if(!/^[a-z][a-z0-9_]{2,23}$/.test(username)||!password||password.length>512)return json({error:'Invalid login credentials.'},401);
 if(env.ENFORCE_AUTH_TURNSTILE_V135==='true'&&(!env.TURNSTILE_SITE_KEY||!env.TURNSTILE_SECRET_KEY||!captchaToken||captchaToken.length>2048))return json({error:'Human verification required or unavailable.'},403);
 const h={apikey:secret,Authorization:'Bearer '+secret,accept:'application/json'};
 try{const profileUrl=new URL(url+'/rest/v1/profiles');profileUrl.searchParams.set('username','ilike.'+username);profileUrl.searchParams.set('select','id');profileUrl.searchParams.set('limit','1');
 const pr=await fetch(profileUrl,{headers:h,cache:'no-store'});if(!pr.ok)return json({error:'Invalid login credentials.'},401);const uid=(await pr.json())?.[0]?.id;if(!uid)return json({error:'Invalid login credentials.'},401);
 const ur=await fetch(url+'/auth/v1/admin/users/'+encodeURIComponent(uid),{headers:h,cache:'no-store'});if(!ur.ok)return json({error:'Invalid login credentials.'},401);const email=(await ur.json())?.email;if(!email)return json({error:'Invalid login credentials.'},401);
 const tr=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:pub,'content-type':'application/json',accept:'application/json'},body:JSON.stringify({email,password,...(captchaToken?{gotrue_meta_security:{captcha_token:captchaToken}}:{})}),cache:'no-store'});if(!tr.ok)return json({error:'Invalid login credentials.'},401);const t=await tr.json();return json({access_token:t.access_token,refresh_token:t.refresh_token,expires_in:t.expires_in,token_type:t.token_type});
 }catch{return json({error:'Sign-in service temporarily unavailable.'},503)}
}
