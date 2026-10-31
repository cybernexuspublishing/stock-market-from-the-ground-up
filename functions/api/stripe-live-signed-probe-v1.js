/* GU301 — isolated LIVE signed Stripe transport acceptance.
 * Only accepts metadata-only updates to the existing dedicated QA customer.
 * Never writes to Stripe or Supabase or grants any entitlements.
 */
const result=(body,status)=>new Response(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const QA_CUSTOMER='cus_VXWdBJblFyXHjl';
const QA_MARKER='20261031_signed_delivery_probe';
export function onRequestGet(){return result('POST required',405)}
export async function onRequestPost({request,env}){
 const secret=String(env.GU301_STRIPE_LIVE_SIGNING_SECRET||'').trim();
 const apiKey=String((env.STRIPE_LIVE_SECRET_KEY||env.GU58_STRIPE_LIVE_SECRET_KEY)||'').trim();
 const account=String((env.STRIPE_LIVE_ACCOUNT_ID||env.GU58_STRIPE_LIVE_ACCOUNT_ID)||'').trim();
 if(!/^whsec_[A-Za-z0-9_]+$/.test(secret)||!/^sk_live_[A-Za-z0-9_]+$/.test(apiKey)||
    !/^acct_[A-Za-z0-9_]{6,}$/.test(account))
   return result('Probe unavailable',503);
 const header=request.headers.get('stripe-signature')||'';
 const parts=header.split(',').map(x=>x.trim().split('='));
 const stamp=parts.find(x=>x[0]==='t')?.[1]||'';
 if(!/^\d{9,13}$/.test(stamp)||Math.abs(Date.now()/1000-Number(stamp))>300)
   return result('Invalid signature',401);
 const signatures=parts.filter(x=>x[0]==='v1'&&/^[a-f0-9]{64}$/i.test(x[1]||'')).map(x=>x[1]);
 if(!signatures.length)return result('Invalid signature',401);
 let reader,bytes;
 try{
  if(Number(request.headers.get('content-length')||0)>262144)return result('Too large',413);
  reader=request.body?.getReader();if(!reader)return result('Invalid body',400);
  const chunks=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;
   total+=value.byteLength;if(total>262144)return result('Too large',413);
   chunks.push(value)}
  bytes=new Uint8Array(total);let offset=0;
  for(const c of chunks){bytes.set(c,offset);offset+=c.length}
 }catch{return result('Invalid body',400)}
 let raw;try{raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{return result('Invalid body',400)}
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signed=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(stamp+'.'+raw)));
 let match=false;
 for(const s of signatures){let diff=0;for(let i=0;i<32;i++)diff|=signed[i]^parseInt(s.slice(2*i,2*i+2),16);match=match||(diff===0)}
 if(!match)return result('Invalid signature',401);
 let event;try{event=JSON.parse(raw)}catch{return result('Invalid event',400)}
 if(event?.type!=='customer.updated'||event.livemode!==true||
    !/^evt_[A-Za-z0-9_]{4,150}$/.test(event.id||'')||
    (event.account!==undefined&&event.account!==account)||
    event.data?.object?.id!==QA_CUSTOMER||
    event.data?.object?.metadata?.smfgu_webhook_probe!==QA_MARKER)
   return result('Unrelated event',200);
 try{
  const r=await fetch('https://api.stripe.com/v1/account',{headers:{authorization:'Bearer '+apiKey},cache:'no-store'});
  if(!r.ok)return result('LIVE provider verification unavailable',503);
  const a=await r.json();
  if(a?.id!==account)return result('LIVE account mismatch',503);
  return result('live-signed-stripe-probe-verified-no-grant',200);
 }catch{return result('LIVE provider verification unavailable',503)}
}
