import {toolAccess} from './member-tool-access.js';
import {strictTradingDate,validateHistoricalOhlcv} from '../_lib/market-data-integrity-v014150.js';
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
async function getConn(env,uid,provider){
 if(!['TIINGO_BYO','ALPACA_BYO'].includes(provider))throw Object.assign(new Error('Unsupported provider.'),{status:400});
 const table=provider==='ALPACA_BYO'?'user_secure_credentials':'user_market_data_connections',field=provider==='ALPACA_BYO'?'service_code':'provider_code';
 const rows=await rest(env,`${table}?select=*&user_id=eq.${encodeURIComponent(uid)}&${field}=eq.${encodeURIComponent(provider)}&limit=1`);
 return rows?.[0]||null;
}
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
 }finally{clearTimeout(timer)}return validateHistoricalOhlcv(rows,{startDate:start,endDate:end});}
export async function alpacaIexBars(credentials,q){
 const ticker=clean(q.ticker).toUpperCase(),freq=clean(q.freq||'1min');
 if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(ticker))throw Object.assign(new Error('A valid ticker is required.'),{status:400});
 const start=strictTradingDate(clean(q.start)),end=strictTradingDate(clean(q.end));
 const delta=Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z');
 if(delta<0||delta>31*86400000)throw Object.assign(new Error('Market-data window must be 1–32 inclusive days.'),{status:400});
 const tf={'1min':'1Min','2min':'2Min','3min':'3Min','5min':'5Min','10min':'10Min','15min':'15Min','30min':'30Min','1hour':'1Hour'};
 if(!tf[freq])throw Object.assign(new Error('Unsupported bar frequency.'),{status:400});
 const id=clean(credentials?.apiKey),secret=clean(credentials?.apiSecret);
 if(!id||!secret)throw Object.assign(new Error('Alpaca market-data credentials missing.'),{status:403});
 const from=new Date(Date.parse(start+'T00:00:00Z')+6*3600000).toISOString();
 const to=new Date(Date.parse(end+'T00:00:00Z')+30*3600000).toISOString();
 const u=new URL('https://data.alpaca.markets/v2/stocks/'+encodeURIComponent(ticker)+'/bars');
 u.search=new URLSearchParams({start:from,end:to,timeframe:tf[freq],feed:'iex',adjustment:'raw',sort:'asc',limit:'10000'}).toString();
 const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),12000);
 let data;
 try{
  const r=await fetch(u.toString(),{headers:{'APCA-API-KEY-ID':id,'APCA-API-SECRET-KEY':secret,Accept:'application/json'},signal:ctl.signal,cache:'no-store'});
  if(!r.ok)throw new Error('provider');
  data=await r.json();
 }catch{throw Object.assign(new Error('Alpaca IEX market data unavailable or your account lacks permission.'),{status:503})}
 finally{clearTimeout(timeout)}
 if(!Array.isArray(data?.bars)||data.next_page_token)throw Object.assign(new Error('Alpaca history is incomplete. Select a shorter date window.'),{status:503});
 return validateHistoricalOhlcv(data.bars.map(x=>({timestamp:x.t,open:x.o,high:x.h,low:x.l,close:x.c,volume:x.v})),{startDate:start,endDate:end});
}
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
 await rest(env,`user_market_data_connections?user_id=eq.${encodeURIComponent(c.user.id)}&provider_code=eq.${encodeURIComponent(provider)}`,{method:'DELETE',prefer:'return=minimal'});return out({ok:true})}if(action==='bars'&&request.method==='GET'){
 const grant=await toolAccess(env,request,'MARKET_SIMULATOR');if(!grant.authorized)return out({error:grant.reason},403);
 const provider=clean(u.searchParams.get('provider')||'TIINGO_BYO');
 if(!['TIINGO_BYO','ALPACA_BYO'].includes(provider))return out({error:'Unsupported market-data provider.'},400);
 const conn=await getConn(env,c.user.id,provider);
 if(!conn||conn.status!=='connected')return out({error:'Connect and verify your personal market-data credentials first.'},403);
 const secret=await decrypt(env,conn.credential_ciphertext,conn.credential_iv);
 const alpaca=provider==='ALPACA_BYO';
 const bars=alpaca?await alpacaIexBars(JSON.parse(secret),Object.fromEntries(u.searchParams)):await tiingoBars(secret,Object.fromEntries(u.searchParams));
 return out({ok:true,provider,ticker:clean(u.searchParams.get('ticker')).toUpperCase(),bars,
  integrity:{strictlyChronological:true,timeZoneBasis:'America/New_York',firstTimestamp:bars[0]?.timestamp||null,lastTimestamp:bars.at(-1)?.timestamp||null,observations:bars.length,feedCompletenessVerified:false,corporateActionsVerified:false,consolidatedFeedVerified:false,licensedForMemberWidePublication:false,approvedForOfficialReplay:false,feed:alpaca?'IEX_SINGLE_EXCHANGE':'TIINGO_PERSONAL_ACCOUNT'},
  sourceNote:(alpaca?'PRIVATE personal Alpaca IEX single-exchange data.':'PRIVATE personal Tiingo data.')+' OHLCV and timestamps validated; not certified for consolidated-market coverage, corporate actions, redistribution, or official no-lookahead assessment replay. These all-at-once bars must NEVER be used to certify no-lookahead assessment replay. Use only for ungraded private member practice.'});
}return out({error:'Unknown action.'},404)}catch(e){
 const status=[400,401,403,405,413].includes(e.status)?e.status:503;
 const error=status===503?'Provider or market-data connection could not be verified. No market history is certified.':
 status===400||status===405||status===413?e.message:'Market-data access or provider authorization denied.';
 return out({error},status);
}}
