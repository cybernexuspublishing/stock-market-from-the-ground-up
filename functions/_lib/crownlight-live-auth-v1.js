/* Crownlight Live V1: short-lived HMAC-signed scoped upgrade tickets.
 * No Alpaca keys and no Supabase bearer JWT are ever included in tickets.
 */
const enc=new TextEncoder();
const validSymbol=s=>typeof s==='string'&&/^[A-Z][A-Z0-9.-]{0,11}$/.test(s);
const fail=()=>Object.assign(new Error('Invalid or expired live-stream authorization.'),{status:403});
const toBase64Url=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const fromBase64Url=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
async function signingKey(env){
 const secret=String(env.MARKET_DATA_ENCRYPTION_KEY||'');
 if(secret.length<32)throw Object.assign(new Error('Live connection signing is not configured.'),{status:503});
 const seed=await crypto.subtle.digest('SHA-256',enc.encode('crownlight-live-tickets-v1:'+secret));
 return crypto.subtle.importKey('raw',seed,{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
export async function mintLiveTicket(env,{userId,symbol},now=Date.now()){
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(userId))||!validSymbol(symbol))throw fail();
 const payload={v:1,sub:userId,symbol,exp:Math.floor(now/1000)+20,nonce:toBase64Url(crypto.getRandomValues(new Uint8Array(12)))};
 const body=toBase64Url(enc.encode(JSON.stringify(payload))),key=await signingKey(env);
 const signature=toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(body))));
 return body+'.'+signature;
}
export async function verifyLiveTicket(env,ticket,now=Date.now()){
 try{
  if(typeof ticket!=='string'||ticket.length>900||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(ticket))throw fail();
  const [body,signature]=ticket.split('.');
  const key=await signingKey(env);
  if(!await crypto.subtle.verify('HMAC',key,fromBase64Url(signature),enc.encode(body)))throw fail();
  const payload=JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
  const age=payload.exp-Math.floor(now/1000);
  if(payload.v!==1||!validSymbol(payload.symbol)||typeof payload.sub!=='string'||!Number.isInteger(payload.exp)||age<0||age>20)throw fail();
  return {userId:payload.sub,symbol:payload.symbol};
 }catch(e){if(e?.status===503)throw e;throw fail()}
}
export function readUpgradeTicket(request){
 const offered=(request.headers.get('sec-websocket-protocol')||'').split(',').map(x=>x.trim());
 if(!offered.includes('crownlight-v1'))throw fail();
 const ticketTokens=offered.filter(x=>x.startsWith('ticket.'));
 if(ticketTokens.length!==1)throw fail();
 return ticketTokens[0].slice(7);
}
