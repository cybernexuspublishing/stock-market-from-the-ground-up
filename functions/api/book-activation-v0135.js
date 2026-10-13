/* v0.13.5: Book POSSESSION verification, never Amazon order/purchase verification.
   Server holds the answer HMAC pepper; no browser writes to activation tables. */
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const norm=s=>String(s??'').trim().normalize('NFKC').replace(/\s+/g,' ').toLocaleLowerCase('en-US');
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function sha(s){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))}
async function mac(secret,answer){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(norm(answer))))}
function cfg(env){const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),secret=String(env.SUPABASE_SECRET_KEY||''),pub=String(env.SUPABASE_PUBLISHABLE_KEY||'');if(!base||!secret||!pub)throw Object.assign(new Error('Book activation is not configured.'),{status:503});return{base,secret,pub}}
async function sf(url,options={}){const r=await fetch(url,{...options,cache:'no-store'});const t=await r.text();let j;try{j=t?JSON.parse(t):null}catch{j=null}if(!r.ok)throw Object.assign(new Error('Book activation service unavailable.'),{status:503});return j}
async function db(env,path,options={}){const {base,secret}=cfg(env);return sf(base+'/rest/v1/'+path,{...options,headers:{apikey:secret,authorization:'Bearer '+secret,accept:'application/json',...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})},body:options.body===undefined?undefined:JSON.stringify(options.body)})}
async function me(env,request){const h=request.headers.get('authorization')||'',token=/^Bearer\s+(.+)$/i.exec(h)?.[1];if(!token)throw Object.assign(new Error('Sign in is required.'),{status:401});const {base,pub}=cfg(env);const u=await sf(base+'/auth/v1/user',{headers:{apikey:pub,authorization:'Bearer '+token}});if(!u?.id)throw Object.assign(new Error('Invalid session.'),{status:401});const p=(await db(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(u.id)+'&limit=1'))?.[0];if(p?.account_kind!=='member')throw Object.assign(new Error('This account cannot activate production book access.'),{status:403});return u}
async function turnstile(env,request,token){const secret=String(env.TURNSTILE_SECRET_KEY||'');if(!secret||!token||token.length>2048)throw Object.assign(new Error('Human verification unavailable or missing.'),{status:503});const form=new URLSearchParams({secret,response:token});const ip=request.headers.get('CF-Connecting-IP');if(ip)form.set('remoteip',ip);const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),7000);let result;try{const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form,signal:ctl.signal});result=await response.json();}catch{throw Object.assign(new Error('Human verification could not be completed.'),{status:503})}finally{clearTimeout(timeout)}const host=new URL(request.url).hostname;if(!result.success||(result.hostname&&result.hostname!==host)||(result.action&&result.action!=='book_activation'))throw Object.assign(new Error('Human verification failed. Try again.'),{status:403});}
async function campaign(env,code){if(!/^[A-Z0-9_-]{3,80}$/.test(code))return null;const c=(await db(env,`book_activation_campaigns_v135?select=campaign_code,label,edition_code,active&campaign_code=eq.${encodeURIComponent(code)}&limit=1`))?.[0];if(!c||!c.active)return null;const e=(await db(env,`book_editions_v135?select=edition_code,edition_label,format,channel,product_code,active&edition_code=eq.${encodeURIComponent(c.edition_code)}&limit=1`))?.[0];if(!e?.active)return null;return{...c,edition:e};}
export async function onRequest({request,env}){const url=new URL(request.url),action=url.searchParams.get('action')||'campaign';try{
 if(request.method==='GET'&&action==='config')return json({ok:true,sitekey:env.TURNSTILE_SITE_KEY||null,enabled:!!(env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET_KEY)});
 if(request.method==='GET'&&action==='campaign'){const code=String(url.searchParams.get('campaign')||'').toUpperCase(),c=await campaign(env,code);return c?json({ok:true,campaign:c.campaign_code,label:c.label,edition:c.edition.edition_label,format:c.edition.format,channel:c.edition.channel,verification:'book_possession_not_amazon_purchase'}):json({ok:false,error:'This book activation campaign is not available.'},404)}
 if(request.method!=='POST')return json({ok:false,error:'Unsupported method.'},405);
 const user=await me(env,request),data=await request.json().catch(()=>({}));
 if(action==='start'){
   const code=String(data.campaign||'').toUpperCase(),c=await campaign(env,code);
   if(!c)return json({ok:false,error:'This book activation campaign is not active.'},404);
   await turnstile(env,request,String(data.turnstileToken||''));
   const prior=await db(env,`book_activation_sessions_v135?select=token_hash&user_id=eq.${encodeURIComponent(user.id)}&created_at=gte.${encodeURIComponent(new Date(Date.now()-3600000).toISOString())}&limit=6`);
   if((prior||[]).length>=5)return json({ok:false,error:'Too many attempts. Please try later.'},429);
   const qs=await db(env,`book_activation_challenges_v135?select=id,prompt&edition_code=eq.${encodeURIComponent(c.edition.edition_code)}&active=eq.true&limit=80`);
   if(!qs?.length)return json({ok:false,error:'This book edition is not yet ready for activation.'},503);
   const idx=crypto.getRandomValues(new Uint32Array(1))[0]%qs.length,challenge=qs[idx];
   const raw=hex(crypto.getRandomValues(new Uint8Array(32))),tokenHash=await sha(raw);
   await db(env,'book_activation_sessions_v135',{method:'POST',headers:{prefer:'return=minimal'},body:{token_hash:tokenHash,user_id:user.id,campaign_code:code,challenge_id:challenge.id,expires_at:new Date(Date.now()+900000).toISOString()}});
   await db(env,'book_activation_events_v135',{method:'POST',headers:{prefer:'return=minimal'},body:{event_type:'started',campaign_code:code,user_id:user.id}});
   return json({ok:true,activationToken:raw,question:challenge.prompt,expiresInSeconds:900,description:'Proof of book possession, not verified Amazon purchase.'});
 }
 if(action==='redeem'){
   const raw=String(data.activationToken||''),answer=String(data.answer||'');
   if(!/^[a-f0-9]{64}$/.test(raw)||!answer||answer.length>160)return json({ok:false,error:'Invalid activation response.'},400);
   const pepper=String(env.BOOK_ACTIVATION_HASH_PEPPER||'');if(pepper.length<32)return json({ok:false,error:'Activation has not been configured by the owner.'},503);
   const {base,secret}=cfg(env),r=await sf(base+'/rest/v1/rpc/complete_book_possession_v135',{method:'POST',headers:{apikey:secret,authorization:'Bearer '+secret,'content-type':'application/json'},body:JSON.stringify({p_hash:await sha(raw),p_user:user.id,p_mac:await mac(pepper,answer)})});
   return json(r,r?.ok?200:400);
 }
 return json({ok:false,error:'Unknown action.'},404)
}catch(e){return json({ok:false,error:e.status===503?'Activation service unavailable or incomplete.':e.message||'Activation failed.'},e.status||500)}}
