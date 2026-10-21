import {toolAccess} from './member-tool-access.js';
const J={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};const out=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:J});const clean=v=>String(v??'').trim();
function cfg(env){const url=clean(env.SUPABASE_URL).replace(/\/$/,'');const pub=clean(env.SUPABASE_PUBLISHABLE_KEY),secret=clean(env.SUPABASE_SECRET_KEY);if(!url||!pub||!secret)throw new Error('Supabase server environment is incomplete.');return{url,pub,secret}}
async function jsonFetch(url,opts={}){const r=await fetch(url,opts),t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={raw:t}}if(!r.ok)throw Object.assign(new Error(d.message||d.detail||d.error||t||`HTTP ${r.status}`),{status:r.status});return d}
function bearer(req){const h=req.headers.get('authorization')||'';return h.startsWith('Bearer ')?h.slice(7):''}
async function user(env,req){
 const token=bearer(req);if(!token)throw Object.assign(new Error('Authentication required.'),{status:401});
 const {url,pub}=cfg(env),u=await jsonFetch(`${url}/auth/v1/user`,{headers:{apikey:pub,authorization:`Bearer ${token}`},cache:'no-store'});
 if(!u?.id)throw Object.assign(new Error('Invalid authentication session.'),{status:401});
 // This route previously bypassed /api/credentials production-member checks.
 // Prevent TEST/SHOWCASE and suspended accounts from writing real encrypted credentials.
 const [profiles,flags]=await Promise.all([
   rest(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(u.id)+'&limit=1'),
   rest(env,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(u.id)+'&limit=1')]);
 if(profiles?.[0]?.account_kind!=='member'||['suspended','restricted'].includes(flags?.[0]?.status))
   throw Object.assign(new Error('Only eligible production members can use market-data connections.'),{status:403});
 return{token,user:u};
}
async function rest(env,path,{method='GET',body,prefer}={}){const {url,secret}=cfg(env),h={apikey:secret,accept:'application/json'};if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))h.authorization='Bearer '+secret;if(body!==undefined)h['content-type']='application/json';if(prefer)h.prefer=prefer;return jsonFetch(`${url}/rest/v1/${path}`,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)})}
function b64(bytes){return btoa(String.fromCharCode(...bytes))}function unb64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function key(env){const raw=clean(env.MARKET_DATA_ENCRYPTION_KEY);if(raw.length<16)throw Object.assign(new Error('MARKET_DATA_ENCRYPTION_KEY is not configured in Cloudflare. Add a strong Secret before saving provider tokens.'),{status:503});const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));return crypto.subtle.importKey('raw',hash,{name:'AES-GCM'},false,['encrypt','decrypt'])}
async function encrypt(env,text){const k=await key(env),iv=crypto.getRandomValues(new Uint8Array(12)),buf=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(text));return{cipher:b64(new Uint8Array(buf)),iv:b64(iv)}}
async function decrypt(env,cipher,iv){const k=await key(env),buf=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},k,unb64(cipher));return new TextDecoder().decode(buf)}
async function tiingoTest(token){
 const controller=new AbortController(),t=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch('https://api.tiingo.com/tiingo/equity/intraday/AAPL',
   {headers:{Authorization:'Token '+token,Accept:'application/json'},signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw Object.assign(new Error('Tiingo rejected this token or the account does not have intraday rights.'),{status:403});
  const rows=await response.json();
  if(!rows||typeof rows!=='object')throw Object.assign(new Error('Tiingo returned an invalid result.'),{status:503});
  return true;
 }catch(e){if(e.status===403)throw e;throw Object.assign(new Error('Tiingo could not be verified. No token was saved.'),{status:503})}
 finally{clearTimeout(t)}
}
async function getConn(env,uid,provider){const rows=await rest(env,`user_market_data_connections?select=*&user_id=eq.${encodeURIComponent(uid)}&provider_code=eq.${encodeURIComponent(provider)}`);return rows?.[0]||null}
async function tiingoBars(token,q){const ticker=clean(q.ticker).toUpperCase();if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(ticker))throw Object.assign(new Error('A valid ticker is required.'),{status:400});const start=clean(q.start),end=clean(q.end),freq=clean(q.freq||'1min');if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))throw new Error('Start and end dates must be YYYY-MM-DD.');const t0=Date.parse(start+'T00:00:00Z'),t1=Date.parse(end+'T00:00:00Z');if(!Number.isFinite(t0)||!Number.isFinite(t1)||t1<t0||t1-t0>31*86400000)throw Object.assign(new Error('Market-data requests must be an inclusive historical window of no more than 32 days.'),{status:400});if(!['1min','2min','3min','5min','10min','15min','30min','1hour'].includes(freq))throw Object.assign(new Error('Unsupported resample frequency.'),{status:400});const base=`https://api.tiingo.com/tiingo/equity/intraday/${encodeURIComponent(ticker)}/prices`;const params=new URLSearchParams({startDate:start,endDate:end,resampleFreq:freq,columns:'open,high,low,close,volume',afterHours:'true'});let rows;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const r=await fetch(base+'?'+params,{headers:{Authorization:'Token '+token,Accept:'application/json'},
   signal:controller.signal,cache:'no-store'});
  if(!r.ok)throw Object.assign(new Error('BYO provider unavailable, quota exhausted, or account lacks market-data access.'),{status:503});
  rows=await r.json();
 }catch(e){
  if(e.status===503)throw e;
  throw Object.assign(new Error('BYO provider response could not be verified.'),{status:503});
 }finally{clearTimeout(timer)}if(!Array.isArray(rows)||rows.length>20000)throw Object.assign(new Error('Provider returned too much or invalid market data.'),{status:413});return rows.map(x=>{
 const values=[x.open,x.high,x.low,x.close,x.volume??0].map(Number);
 const ts=Date.parse(x.date);
 if(!Number.isFinite(ts)||values.some(z=>!Number.isFinite(z))||
  values.slice(0,4).some(z=>z<=0)||values[4]<0||
  values[1]<Math.max(values[0],values[3])||
  values[2]>Math.min(values[0],values[3])||values[2]>values[1])
   throw Object.assign(new Error('Provider OHLCV is invalid. No historical values have been accepted.'),{status:503});
 return {timestamp:new Date(ts).toISOString(),open:values[0],high:values[1],low:values[2],close:values[3],volume:values[4]};
 })}
export async function onRequest(context){const {request,env}=context,u=new URL(request.url),action=clean(u.searchParams.get('action'));try{
 if(!['GET','POST'].includes(request.method))return out({error:'Method not allowed.'},405);
 if(request.method==='POST'){
  const origin=request.headers.get('origin');
  if(origin&&origin!==u.origin)return out({error:'Cross-site credential mutation refused.'},403);
  const site=request.headers.get('sec-fetch-site');
  if(site&&!['same-origin','none'].includes(site))return out({error:'Cross-site request refused.'},403);
  const size=Number(request.headers.get('content-length')||0);
  if(!Number.isFinite(size)||size<0||size>8192)return out({error:'Credential request too large.'},413);
 }
 const c=await user(env,request);
 if(action==='list'&&request.method==='GET'){const rows=await rest(env,`user_market_data_connections?select=provider_code,status,last_tested_at,last_error,updated_at&user_id=eq.${encodeURIComponent(c.user.id)}`);return out({ok:true,connections:rows||[]})}if(action==='connect'&&request.method==='POST'){if(Number(request.headers.get('content-length')||0)>8192)return out({error:'Credential request too large.'},413);let b;
 try{const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>8192)throw Object.assign(new Error('Credential request too large.'),{status:413});b=JSON.parse(raw)}catch(e){throw Object.assign(new Error('Invalid or excessive credential request.'),{status:e.status===413?413:400})}
 const provider=clean(b?.provider);
 if(provider!=='TIINGO_BYO')return out({error:'This connection adapter is not active yet.'},400);const tok=clean(b.token);if(!/^[A-Za-z0-9_-]{8,512}$/.test(tok))return out({error:'A valid provider token is required.'},400);await tiingoTest(tok);const enc=await encrypt(env,tok);await rest(env,'user_market_data_connections?on_conflict=user_id,provider_code',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:c.user.id,provider_code:provider,display_label:'Tiingo',credential_ciphertext:enc.cipher,credential_iv:enc.iv,status:'connected',last_tested_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()}});return out({ok:true,message:'Tiingo connection verified and encrypted.'})}if(action==='disconnect'&&request.method==='POST'){let b;try{const raw=await request.text();if(raw.length>8192)throw Error('size');b=JSON.parse(raw)}catch{throw Object.assign(new Error('Invalid provider disconnect request.'),{status:400})}
 const provider=clean(b?.provider);if(provider!=='TIINGO_BYO')return out({error:'Unsupported provider.'},400);
 await rest(env,`user_market_data_connections?user_id=eq.${encodeURIComponent(c.user.id)}&provider_code=eq.${encodeURIComponent(provider)}`,{method:'DELETE',prefer:'return=minimal'});return out({ok:true})}if(action==='bars'&&request.method==='GET'){const grant=await toolAccess(env,request,'MARKET_SIMULATOR');if(!grant.authorized)return out({error:grant.reason},403);const provider=clean(u.searchParams.get('provider')||'TIINGO_BYO'),conn=await getConn(env,c.user.id,provider);if(!conn||conn.status!=='connected')return out({error:'Connect the market-data provider first.'},403);const tok=await decrypt(env,conn.credential_ciphertext,conn.credential_iv);const bars=await tiingoBars(tok,Object.fromEntries(u.searchParams));return out({ok:true,provider,ticker:clean(u.searchParams.get('ticker')).toUpperCase(),bars,sourceNote:'PRIVATE BYO Tiingo response for requesting member ONLY; not a member-wide dataset, licensed publication feed, or validated consolidated market history. User verifies coverage, time zone, provider usage terms and corporate actions.'})}return out({error:'Unknown action.'},404)}catch(e){
 const status=[400,401,403,405,413].includes(e.status)?e.status:503;
 const error=status===503?'Provider or market-data connection could not be verified. No market history is certified.':
 status===400||status===405||status===413?e.message:'Market-data access or provider authorization denied.';
 return out({error},status);
}}
