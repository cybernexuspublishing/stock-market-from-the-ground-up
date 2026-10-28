/* Crownlight Live IEX WebSocket bridge. No orders, portfolio APIs or provider secrets in browser.
 * Single symbol and single provider socket per browser connection. Alpaca may enforce
 * one concurrent market stream for a member; do NOT silently fan out private data.
 */
import {readUpgradeTicket,verifyLiveTicket} from '../_lib/crownlight-live-auth-v1.js';
const denied=(status=403)=>new Response('Live market connection not authorized.',{
 status,headers:{'cache-control':'no-store','referrer-policy':'no-referrer'}});
const clean=v=>String(v||'').trim();
function cfg(env){
 const url=clean(env.SUPABASE_URL).replace(/\/$/,'');
 const secret=clean(env.SUPABASE_SECRET_KEY);
 if(!url||!secret)throw Error('Server configuration missing');
 return {url,secret};
}
async function read(env,path){
 const c=cfg(env),headers={apikey:c.secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(c.secret))headers.authorization='Bearer '+c.secret;
 const r=await fetch(c.url+'/rest/v1/'+path,{headers,cache:'no-store'});
 if(!r.ok)throw Error('Account authorization unavailable');
 return r.json();
}
async function key(env){
 const value=clean(env.MARKET_DATA_ENCRYPTION_KEY);
 if(value.length<32)throw Error('Credential protection unavailable');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['decrypt']);
}
async function credentials(env,userId){
 const id=encodeURIComponent(userId);
 const [profile,flags,rows]=await Promise.all([
  read(env,'profiles?select=account_kind,deleted_at&id=eq.'+id+'&limit=1'),
  read(env,'admin_user_flags?select=status&user_id=eq.'+id+'&limit=20'),
  read(env,'user_secure_credentials?select=credential_ciphertext,credential_iv,status&user_id=eq.'+id+'&service_code=eq.ALPACA_BYO&limit=1')
 ]);
 if(profile?.[0]?.account_kind!=='member'||profile[0].deleted_at||
    flags.some(x=>['restricted','suspended'].includes(String(x.status).toLowerCase())))throw Error('Member access denied');
 const row=rows?.[0];
 if(!row||row.status!=='connected')throw Error('Verified Alpaca account required');
 const decode=s=>Uint8Array.from(atob(s),x=>x.charCodeAt(0));
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(row.credential_iv)},await key(env),decode(row.credential_ciphertext));
 const data=JSON.parse(new TextDecoder().decode(plain));
 if(!data.apiKey||!data.apiSecret)throw Error('Incomplete Alpaca credentials');
 return {id:data.apiKey,secret:data.apiSecret};
}
function safeTrade(raw,symbol){
 if(raw?.T!=='t'||raw.S!==symbol||typeof raw.t!=='string')return null;
 const epoch=Date.parse(raw.t);
 if(!Number.isFinite(epoch)||!Number.isFinite(raw.p)||raw.p<=0||!Number.isSafeInteger(raw.s)||raw.s<1)return null;
 return {T:'t',S:symbol,p:raw.p,s:raw.s,t:raw.t,i:Number.isSafeInteger(raw.i)?raw.i:null};
}
export async function onRequest({request,env}){
 if(request.method!=='GET'||request.headers.get('upgrade')?.toLowerCase()!=='websocket')return denied(426);
 const u=new URL(request.url),origin=request.headers.get('origin');
 if(!origin||origin!==u.origin)return denied();
 let scope,alpaca;
 try{
  scope=await verifyLiveTicket(env,readUpgradeTicket(request));
  alpaca=await credentials(env,scope.userId);
 }catch{return denied()}
 const pair=new WebSocketPair(),browser=pair[0],server=pair[1];
 server.accept();
 let upstream=null,closed=false,authenticated=false,subscribed=false;
 const message=(value)=>{if(!closed&&server.readyState===1)try{server.send(JSON.stringify(value))}catch{}};
 const close=(code=1000)=>{if(closed)return;closed=true;
  try{upstream?.close()}catch{}
  try{server.close(code,'Stream ended')}catch{}
 };
 // Browser messages are never forwarded. In particular, order or subscription
 // requests cannot be used to change the fixed feed, ticker, or access scope.
 server.addEventListener('message',()=>{});
 server.addEventListener('close',()=>close());
 server.addEventListener('error',()=>close());
 try{
  upstream=new WebSocket('wss://stream.data.alpaca.markets/v2/iex');
  upstream.addEventListener('open',()=>{
   try{upstream.send(JSON.stringify({action:'auth',key:alpaca.id,secret:alpaca.secret}))}catch{message({type:'error',code:'AUTH_UNAVAILABLE'});close(1011)}
  });
  upstream.addEventListener('message',event=>{
   let incoming;
   try{incoming=JSON.parse(typeof event.data==='string'?event.data:'')}catch{return}
   if(!Array.isArray(incoming)||incoming.length>1000)return;
   for(const item of incoming){
    if(item?.T==='success'){
     if(item.msg==='authenticated'&&!authenticated){
      authenticated=true;message({type:'status',state:'authenticated',feed:'iex',symbol:scope.symbol});
      if(!subscribed){subscribed=true;upstream.send(JSON.stringify({action:'subscribe',trades:[scope.symbol]}))}
     }
    }else if(item?.T==='subscription'){
     if(authenticated&&item.trades?.includes(scope.symbol))message({type:'status',state:'streaming',feed:'iex',symbol:scope.symbol});
    }else if(item?.T==='error'){
     const code=Number(item.code);
     message({type:'error',code:code===406?'CONNECTION_LIMIT':code===401||code===402||code===403?'ACCESS_DENIED':'PROVIDER_UNAVAILABLE'});
     close(1008);return;
    }else{
     const trade=safeTrade(item,scope.symbol);
     if(authenticated&&trade)message({type:'trade',trade,feed:'iex'});
    }
   }
  });
  upstream.addEventListener('close',()=>{message({type:'status',state:'disconnected'});close()});
  upstream.addEventListener('error',()=>{message({type:'error',code:'PROVIDER_UNAVAILABLE'});close(1011)});
 }catch{close(1011);return denied(503)}
 return new Response(null,{status:101,webSocket:browser,headers:{'Sec-WebSocket-Protocol':'crownlight-v1',
  'cache-control':'no-store','referrer-policy':'no-referrer'}});
}
