/* Crownlight Paper Terminal V1 — exclusively ALPACA PAPER API.
 * No live brokerage endpoint, crypto/options/short/margin automation, or account transfer functions.
 * Only authenticated entitlement-verified members with an explicitly selected paper key pair.
 */
import {toolAccess} from './member-tool-access.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
const msg=(message,status=403)=>Object.assign(new Error(message),{status});
const base='https://paper-api.alpaca.markets/v2';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ticker=/^[A-Z][A-Z0-9.-]{0,11}$/;
function service(env){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!url||!secret)throw msg('Credential service unavailable.',503);
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))headers.authorization='Bearer '+secret;
 return {url,headers};
}
async function paperKeys(env,userId){
 const s=service(env);
 const path='/rest/v1/user_secure_credentials?select=credential_ciphertext,credential_iv,status,metadata&user_id=eq.'+
  encodeURIComponent(userId)+'&service_code=eq.ALPACA_BYO&limit=1';
 const r=await fetch(s.url+path,{headers:s.headers,cache:'no-store'});
 if(!r.ok)throw msg('Unable to verify the personal Alpaca connection.',503);
 const rows=await r.json(),record=rows?.[0];
 if(!record||record.status!=='connected'||record.metadata?.accountType!=='paper')
  throw msg('Connect and verify Alpaca Paper Trading credentials in Connections & API Keys.',403);
 const raw=String(env.MARKET_DATA_ENCRYPTION_KEY||'');if(raw.length<32)throw msg('Credential protection unavailable.',503);
 const keyData=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
 const key=await crypto.subtle.importKey('raw',keyData,{name:'AES-GCM'},false,['decrypt']);
 const bytes=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
 let values;
 try{
  const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(record.credential_iv)},key,bytes(record.credential_ciphertext));
  values=JSON.parse(new TextDecoder().decode(clear));
 }catch{throw msg('Saved Alpaca credentials could not be decrypted. Replace and verify the paper keys.',503)}
 if(!values?.apiKey||!values?.apiSecret)throw msg('Paper credentials are incomplete.',503);
 return {apiKey:values.apiKey,apiSecret:values.apiSecret};
}
async function alpaca(keys,path,{method='GET',body}={}){
 const headers={'APCA-API-KEY-ID':keys.apiKey,'APCA-API-SECRET-KEY':keys.apiSecret,
  accept:'application/json'};
 if(body!==undefined)headers['content-type']='application/json';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
 try{
  const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),
   cache:'no-store',signal:controller.signal});
  const payload=await r.json().catch(()=>null);
  return {ok:r.ok,status:r.status,payload,requestId:r.headers.get('x-request-id')||null};
 }catch{throw msg('Alpaca Paper Trading did not respond; check the account directly before retrying.',503)}
 finally{clearTimeout(timeout)}
}
const cash=v=>typeof v==='string'&&/^-?\d+(?:\.\d+)?$/.test(v)?v:null;
function orderView(v){
 if(!v||typeof v!=='object')return null;
 return {id:v.id||null,clientOrderId:v.client_order_id||null,symbol:v.symbol||null,
  side:v.side||null,type:v.type||null,qty:cash(v.qty),filledQty:cash(v.filled_qty),
  limitPrice:cash(v.limit_price),filledAvgPrice:cash(v.filled_avg_price),
  status:v.status||null,createdAt:v.created_at||null,updatedAt:v.updated_at||null};
}
async function accountCheck(keys){
 const a=await alpaca(keys,'/account');
 if(!a.ok||!a.payload?.id)throw msg('Alpaca did not verify these credentials as a paper account.',403);
 return a.payload;
}
export async function onRequest({request,env}){
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 const url=new URL(request.url),origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
 if(request.method==='POST'&&((origin&&origin!==url.origin)||(site&&!['same-origin','none'].includes(site))))
  return json({error:'Cross-origin paper order denied.'},403);
 if(Number(request.headers.get('content-length')||0)>2300)return json({error:'Request too large.'},413);
 try{
  const grant=await toolAccess(env,request,'MARKET_SIMULATOR');
  if(!grant.authorized)throw msg('Paper brokerage is available only with the Market Simulator entitlement.');
  const keys=await paperKeys(env,grant.userId);
  const account=await accountCheck(keys);
  if(request.method==='GET'){
   const [positions,orders]=await Promise.all([
    alpaca(keys,'/positions'),alpaca(keys,'/orders?status=all&limit=30&direction=desc')
   ]);
   if(!positions.ok||!Array.isArray(positions.payload)||!orders.ok||!Array.isArray(orders.payload))
    throw msg('Paper account positions and order status could not be confirmed.',503);
   return json({ok:true,mode:'ALPACA_PAPER_ONLY',account:{status:account.status||null,
    equity:cash(account.equity),cash:cash(account.cash),buyingPower:cash(account.buying_power),
    currency:account.currency||'USD',tradingBlocked:account.trading_blocked===true,
    accountBlocked:account.account_blocked===true},
    positions:positions.payload.slice(0,80).map(x=>({symbol:x.symbol,qty:cash(x.qty),
     avgEntryPrice:cash(x.avg_entry_price),currentPrice:cash(x.current_price),
     unrealizedPl:cash(x.unrealized_pl),marketValue:cash(x.market_value)})),
    orders:orders.payload.map(orderView).filter(Boolean)});
  }
  const b=await request.json().catch(()=>null);
  if(url.searchParams.get('action')!=='submit'||!b||typeof b!=='object'||Array.isArray(b))
   return json({error:'Unsupported paper order operation.'},400);
  const allowed=['symbol','side','type','qty','limitPrice','clientOrderId','confirm'];
  if(Object.keys(b).some(k=>!allowed.includes(k)))return json({error:'Unsupported order field.'},400);
  const symbol=String(b.symbol||'').trim().toUpperCase();
  const qty=Number(b.qty),type=b.type,side=b.side,id=String(b.clientOrderId||'');
  const limit=Number(b.limitPrice);
  if(!ticker.test(symbol)||!['buy','sell'].includes(side)||!['market','limit'].includes(type)||
     !Number.isSafeInteger(qty)||qty<1||qty>1000||!uuid.test(id)||b.confirm!=='PAPER ONLY'||
     (type==='limit'&&(!Number.isFinite(limit)||limit<=0||limit>1000000)))
    return json({error:'Invalid paper order or confirmation. Whole shares 1–1,000 only.'},400);
  if(account.trading_blocked||account.account_blocked||account.trade_suspended_by_user)
   throw msg('Paper account is blocked from trading.');
  // If an earlier network attempt succeeded, returning that exact paper order prevents duplicate fills.
  const lookup=await alpaca(keys,'/orders:by_client_order_id?client_order_id='+encodeURIComponent(id));
  if(lookup.ok&&lookup.payload?.id)return json({ok:true,alreadySubmitted:true,mode:'ALPACA_PAPER_ONLY',order:orderView(lookup.payload)});
  if(lookup.status!==404)throw msg('Previous order state could not be checked. No new order was submitted.',503);
  const body={symbol,qty:String(qty),side,type,time_in_force:'day',extended_hours:false,client_order_id:id};
  if(type==='limit')body.limit_price=limit.toFixed(2);
  const submitted=await alpaca(keys,'/orders',{method:'POST',body});
  if(!submitted.ok){
   // If response is uncertain, never retry with a new ID without checking Alpaca directly.
   return json({ok:false,error:'Alpaca declined the paper order. Review account status and order history.',
    providerStatus:submitted.status,requestId:submitted.requestId},submitted.status===422?422:409);
  }
  return json({ok:true,mode:'ALPACA_PAPER_ONLY',paperOnly:true,order:orderView(submitted.payload),
   requestId:submitted.requestId});
 }catch(e){return json({ok:false,error:e.status===401?'Sign in required.':
  e.status===403?e.message:'Paper Trading service unavailable or unable to verify the order. Review Alpaca directly.'},
  [401,403].includes(e.status)?e.status:503)}
}
