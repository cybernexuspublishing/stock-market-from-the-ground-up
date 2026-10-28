const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};const out=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});const clean=v=>String(v??'').trim();
function cfg(env){const url=clean(env.SUPABASE_URL).replace(/\/$/,'');const pub=clean(env.SUPABASE_PUBLISHABLE_KEY),secret=clean(env.SUPABASE_SECRET_KEY);if(!url||!pub||!secret)throw new Error('Supabase environment incomplete.');return{url,pub,secret}}
async function jf(url,opt={}){const r=await fetch(url,opt),t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={raw:t}}if(!r.ok)throw Object.assign(new Error(d.message||d.error||t||`HTTP ${r.status}`),{status:r.status});return d}
async function caller(env,req){const h=req.headers.get('authorization')||'',tok=h.startsWith('Bearer ')?h.slice(7):'';if(!tok)throw Object.assign(new Error('Authentication required.'),{status:401});const{url,pub}=cfg(env);return jf(`${url}/auth/v1/user`,{headers:{apikey:pub,authorization:`Bearer ${tok}`}})}
async function rest(env,path,{method='GET',body,prefer}={}){const{url,secret}=cfg(env),headers={apikey:secret,accept:'application/json'};if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))headers.authorization=`Bearer ${secret}`;if(body!==undefined)headers['content-type']='application/json';if(prefer)headers.prefer=prefer;return jf(`${url}/rest/v1/${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)})}
function b64(bytes){return btoa(String.fromCharCode(...bytes))}function unb64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function key(env){const raw=clean(env.MARKET_DATA_ENCRYPTION_KEY);if(raw.length<16)throw Object.assign(new Error('Credential encryption key is not configured.'),{status:503});const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt'])}
async function encrypt(env,text){const k=await key(env),iv=crypto.getRandomValues(new Uint8Array(12)),buf=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(text));return{cipher:b64(new Uint8Array(buf)),iv:b64(iv)}}
async function alpacaMarketDataTest(values){
 const id=clean(values?.apiKey),secret=clean(values?.apiSecret);
 if(!/^[A-Za-z0-9_-]{8,256}$/.test(id)||!/^[A-Za-z0-9_-]{8,256}$/.test(secret))
  throw Object.assign(new Error('Enter a valid Alpaca API Key ID and Secret.'),{status:400});
 const end=new Date(Date.now()-86400000).toISOString(),start=new Date(Date.now()-21*86400000).toISOString();
 const url=new URL('https://data.alpaca.markets/v2/stocks/AAPL/bars');
 url.search=new URLSearchParams({start,end,timeframe:'1Day',feed:'iex',limit:'1',adjustment:'raw'}).toString();
 const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),10000);
 try{
  const r=await fetch(url.toString(),{headers:{'APCA-API-KEY-ID':id,'APCA-API-SECRET-KEY':secret,Accept:'application/json'},cache:'no-store',signal:ctl.signal});
  if(r.status===401||r.status===403)throw Object.assign(new Error('Alpaca rejected the API keys or IEX market-data entitlement.'),{status:403});
  if(!r.ok)throw Object.assign(new Error('Alpaca market-data verification is temporarily unavailable.'),{status:503});
  const j=await r.json();const bar=j?.bars?.[0];
  if(!Array.isArray(j?.bars)||!bar||typeof bar.t!=='string'||![bar.o,bar.h,bar.l,bar.c,bar.v].every(Number.isFinite))
   throw Object.assign(new Error('No verifiable Alpaca IEX historical bars were returned.'),{status:503});
  return {feed:'iex',verifiedAt:new Date().toISOString(),scope:'market_data_only'};
 }catch(e){if(e.status)throw e;throw Object.assign(new Error('Could not verify Alpaca market data. No credentials were changed.'),{status:503})}
 finally{clearTimeout(timeout)}
}
async function decrypt(env,cipher,iv){const k=await key(env),buf=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},k,unb64(cipher));return new TextDecoder().decode(buf)}
async function tiingoTest(token){const r=await fetch('https://api.tiingo.com/tiingo/equity/intraday/AAPL',{headers:{Authorization:`Token ${token}`,Accept:'application/json'}});if(!r.ok)throw Object.assign(new Error('Tiingo rejected this token.'),{status:400})}function mask(obj){const values=Object.values(obj||{}).map(clean).filter(Boolean);if(!values.length)return 'saved';const x=values[0];return x.length>4?`••••${x.slice(-4)}`:'••••'}
async function productionMember(env,id){
 const [profile,flags]=await Promise.all([
 rest(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(id)+'&limit=1'),
 rest(env,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(id)+'&limit=1')]);
 return profile[0]?.account_kind==='member'&&!['suspended','restricted'].includes(flags[0]?.status);
}
export async function onRequest({request,env}){const u=new URL(request.url),action=clean(u.searchParams.get('action'));try{
 if(!['GET','POST'].includes(request.method))return out({error:'Method not allowed.'},405);
 if(request.method==='POST'){
  const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
  if((origin&&origin!==u.origin)||(site&&!['same-origin','none'].includes(site)))return out({error:'Cross-site credential mutation refused.'},403);
 }
 const usr=await caller(env,request);
 if(!await productionMember(env,usr.id))return out({ok:false,error:'Only eligible production members can manage live market-data connections.'},403);
 if(Number(request.headers.get('content-length')||0)>16000)return out({ok:false,error:'Request too large.'},413);if(action==='list'&&request.method==='GET'){const rows=await rest(env,`user_secure_credentials?select=service_code,display_label,masked_hint,status,last_tested_at,last_error,updated_at,metadata&user_id=eq.${encodeURIComponent(usr.id)}`);return out({ok:true,connections:rows||[]})}if(action==='save'&&request.method==='POST'){const b=await request.json(),service=clean(b.serviceCode).toUpperCase();if(!['TIINGO_BYO','ALPACA_BYO'].includes(service))return out({error:'Unsupported connection type.'},400);const values=b.values&&typeof b.values==='object'&&!Array.isArray(b.values)?b.values:{};const accountType=service==='ALPACA_BYO'?clean(b.accountType||'unspecified').toLowerCase():null;if(service==='ALPACA_BYO'&&!['paper','live','unspecified'].includes(accountType))return out({error:'Choose a supported Alpaca account type.'},400);
 if(Object.keys(values).length>5||Object.keys(values).some(k=>!/^[A-Za-z0-9_]{1,35}$/.test(k))||Object.values(values).some(v=>typeof v!=='string'||v.length>4096))return out({ok:false,error:'Invalid credential fields.'},400);
 if(!Object.values(values).some(v=>clean(v)))return out({error:'Credential value required.'},400);
 let verified=null;
 if(service==='TIINGO_BYO'){
  if(Object.keys(values).join(',')!=='token')return out({error:'Tiingo token required.'},400);
  await tiingoTest(clean(values.token));
 }else{
  if(Object.keys(values).sort().join(',')!=='apiKey,apiSecret')return out({error:'Alpaca Key ID and Secret required.'},400);
  verified=await alpacaMarketDataTest(values);
 }
 const enc=await encrypt(env,JSON.stringify(values));const label=service==='TIINGO_BYO'?'Tiingo':'Alpaca Market Data',tested=verified?.verifiedAt||new Date().toISOString();await rest(env,'user_secure_credentials?on_conflict=user_id,service_code',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:usr.id,service_code:service,display_label:label,credential_ciphertext:enc.cipher,credential_iv:enc.iv,masked_hint:mask(values),status:'connected',last_tested_at:tested,last_error:null,updated_at:new Date().toISOString(),metadata:{version:2,providerVerification:service==='ALPACA_BYO'?'alpaca_iex_historical_bar':'tiingo_auth',marketDataOnly:true,feed:verified?.feed||null,...(service==='ALPACA_BYO'?{accountType,accountTypeSource:accountType==='unspecified'?'unspecified':'member_selected'}:{})}}});if(service==='TIINGO_BYO'){const legacy=await encrypt(env,clean(values.token));await rest(env,'user_market_data_connections?on_conflict=user_id,provider_code',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:usr.id,provider_code:'TIINGO_BYO',display_label:'Tiingo',credential_ciphertext:legacy.cipher,credential_iv:legacy.iv,status:'connected',last_tested_at:tested,last_error:null,updated_at:new Date().toISOString()}})}return out({ok:true,verified:true,serviceCode:service,feed:verified?.feed||null})}
 if(action==='verify'&&request.method==='POST'){
  const body=await request.json(),service=clean(body?.serviceCode).toUpperCase();
  if(service!=='ALPACA_BYO')return out({error:'Unsupported verification provider.'},400);
  const rows=await rest(env,`user_secure_credentials?select=credential_ciphertext,credential_iv,metadata&user_id=eq.${encodeURIComponent(usr.id)}&service_code=eq.ALPACA_BYO&limit=1`);
  if(!rows?.[0])return out({error:'Save an Alpaca connection first.'},404);
  const values=JSON.parse(await decrypt(env,rows[0].credential_ciphertext,rows[0].credential_iv));
  let verified;
  try{verified=await alpacaMarketDataTest(values)}
  catch(e){
   await rest(env,`user_secure_credentials?user_id=eq.${encodeURIComponent(usr.id)}&service_code=eq.ALPACA_BYO`,{method:'PATCH',prefer:'return=minimal',body:{status:'verification_failed',last_error:'Market-data verification failed.',updated_at:new Date().toISOString()}});
   throw e;
  }
  await rest(env,`user_secure_credentials?user_id=eq.${encodeURIComponent(usr.id)}&service_code=eq.ALPACA_BYO`,{method:'PATCH',prefer:'return=minimal',body:{status:'connected',last_tested_at:verified.verifiedAt,last_error:null,updated_at:new Date().toISOString(),metadata:{...(rows[0].metadata||{}),version:2,providerVerification:'alpaca_iex_historical_bar',marketDataOnly:!(rows[0].metadata?.accountType==='paper'&&rows[0].metadata?.paperAccountVerifiedAt),feed:'iex'}}});
  return out({ok:true,verified:true,serviceCode:service,feed:'iex'});
 }
 if(action==='verify-paper'&&request.method==='POST'){
  const body=await request.json().catch(()=>({}));
  if(clean(body?.serviceCode).toUpperCase()!=='ALPACA_BYO')
   return out({ok:false,error:'Only a saved personal Alpaca account can be verified.'},400);
  const path='user_secure_credentials?user_id=eq.'+encodeURIComponent(usr.id)+'&service_code=eq.ALPACA_BYO';
  const rows=await rest(env,path+'&select=credential_ciphertext,credential_iv,status,metadata&limit=1');
  const stored=rows?.[0];
  if(!stored||stored.status!=='connected')
   return out({ok:false,error:'Save and verify your Alpaca market-data credentials first.'},403);
  const values=JSON.parse(await decrypt(env,stored.credential_ciphertext,stored.credential_iv));
  if(!values||typeof values.apiKey!=='string'||typeof values.apiSecret!=='string')
   return out({ok:false,error:'Saved Alpaca credentials are incomplete.'},503);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
  let account;
  try{
   // Fixed paper endpoint; never accept a provider URL or account ID from browser.
   const response=await fetch('https://paper-api.alpaca.markets/v2/account',{
    method:'GET',headers:{'APCA-API-KEY-ID':values.apiKey,'APCA-API-SECRET-KEY':values.apiSecret,
     accept:'application/json'},signal:controller.signal,cache:'no-store'});
   if(response.status===401||response.status===403)
    return out({ok:false,error:'These saved credentials were not accepted by Alpaca Paper Trading. Existing market-data access is unchanged.'},403);
   if(!response.ok)return out({ok:false,error:'Alpaca Paper Trading account verification is unavailable. Existing credentials were not changed.'},503);
   account=await response.json();
  }catch{return out({ok:false,error:'The paper account could not be reached. Existing credentials were not changed.'},503)}
  finally{clearTimeout(timer)}
  if(typeof account?.id!=='string'||!account.id||typeof account?.status!=='string')
   return out({ok:false,error:'Paper account identity could not be verified.'},503);
  const now=new Date().toISOString();
  await rest(env,path,{method:'PATCH',prefer:'return=minimal',body:{
   display_label:'Alpaca Paper + Market Data',last_tested_at:now,last_error:null,updated_at:now,
   metadata:{...(stored.metadata||{}),version:3,accountType:'paper',
    accountTypeSource:'provider_verified_paper',paperAccountVerifiedAt:now,
    marketDataOnly:false,paperOrdersEnabled:true}
  }});
  return out({ok:true,verified:true,paperVerified:true,accountStatus:account.status,
   serviceCode:'ALPACA_BYO',message:'Saved Alpaca keys verified against the actual Paper Trading account. No orders were placed.'});
 }
 if(action==='delete'&&request.method==='POST'){const b=await request.json(),service=clean(b.serviceCode).toUpperCase();if(!['TIINGO_BYO','ALPACA_BYO'].includes(service))return out({error:'Unsupported connection type.'},400);await rest(env,`user_secure_credentials?user_id=eq.${encodeURIComponent(usr.id)}&service_code=eq.${encodeURIComponent(service)}`,{method:'DELETE',prefer:'return=minimal'});if(service==='TIINGO_BYO')await rest(env,`user_market_data_connections?user_id=eq.${encodeURIComponent(usr.id)}&provider_code=eq.TIINGO_BYO`,{method:'DELETE',prefer:'return=minimal'});return out({ok:true})}return out({error:'Unknown action.'},404)}catch(e){return out({error:e.message||'Credential operation failed.'},e.status||500)}}