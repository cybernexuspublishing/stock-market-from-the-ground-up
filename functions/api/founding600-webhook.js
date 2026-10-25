/* Founding 600 v0.14.0.199 dedicated, signed Stripe LIVE payment verifier.
 * Entire handler is disabled unless explicitly activated in Production.
 * Only provider-fetched PAID invoices produce seat/membership/Sparks grants.
 */
const text=(value,status=200)=>new Response(String(value),{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const pattern=(s,p)=>new RegExp('^'+p+'_[A-Za-z0-9_]{6,}$').test(String(s||''));
function envConfig(e){
 const base=String(e.SUPABASE_URL||'').replace(/\/$/,'');
 const stripe=String(e.GU58_STRIPE_LIVE_SECRET_KEY||''),secret=String(e.GU_F600_LIVE_WEBHOOK_SECRET||''),key=String(e.SUPABASE_SECRET_KEY||'');
 if(e.GU_F600_LIVE_WEBHOOK_ENABLED!=='true'||e.GU_F600_LIVE_FULFILLMENT_APPROVED!=='true'
 ||!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!stripe.startsWith('sk_live_')
 ||!secret.startsWith('whsec_')||!key||!pattern(e.GU58_STRIPE_LIVE_ACCOUNT_ID,'acct'))
 return null;
 let catalog;try{catalog=JSON.parse(e.GU_F600_LIVE_CATALOG_JSON||'')}catch{return null}
 if(!catalog||!catalog.FOUNDING_30?.priceId||!catalog.FOUNDING_60?.priceId)return null;
 return {base,stripe,secret,key,account:e.GU58_STRIPE_LIVE_ACCOUNT_ID,catalog};
}
async function raw(req){
 if(Number(req.headers.get('content-length')||0)>262144)throw Error('TOO_LARGE');
 const reader=req.body?.getReader();if(!reader)throw Error('INVALID_BODY');
 const parts=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;
  size+=value.byteLength;if(size>262144){await reader.cancel().catch(()=>{});throw Error('TOO_LARGE')}parts.push(value)}
 const all=new Uint8Array(size);let offset=0;for(const p of parts){all.set(p,offset);offset+=p.length}
 return new TextDecoder('utf-8',{fatal:true}).decode(all);
}
async function signature(raw,header,key){
 const parts=String(header||'').split(',').map(s=>s.trim().split('='));const ts=parts.find(x=>x[0]==='t')?.[1];
 const valid=parts.filter(x=>x[0]==='v1'&&/^[a-f0-9]{64}$/i.test(x[1]||'')).map(x=>x[1]);
 if(!/^\d{9,13}$/.test(ts||'')||Math.abs(Number(ts)-Date.now()/1000)>300||!valid.length)return false;
 const cryptokey=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=new Uint8Array(await crypto.subtle.sign('HMAC',cryptokey,new TextEncoder().encode(ts+'.'+raw)));
 let okay=false;for(const candidate of valid){let wrong=0;for(let i=0;i<32;i++)wrong|=digest[i]^Number.parseInt(candidate.slice(i*2,i*2+2),16);okay=okay||(wrong===0)}
 return okay;
}
async function stripe(c,path){
 const r=await fetch('https://api.stripe.com/v1/'+path,{headers:{authorization:'Bearer '+c.stripe},cache:'no-store'});
 if(!r.ok)throw Error('STRIPE_PROVIDER_UNAVAILABLE');
 const d=await r.json();if(d?.livemode===false)throw Error('NOT_LIVE_PROVIDER');
 return d;
}
function dbHeaders(c){return {apikey:c.key,...(c.key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.key}),'content-type':'application/json'}}
async function db(c,path,body){
 const r=await fetch(c.base+'/rest/v1/'+path,{method:body===undefined?'GET':'POST',headers:dbHeaders(c),
 body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 if(!r.ok)throw Error('DATABASE_RETRY');
 return r.json();
}
const iso=x=>Number.isSafeInteger(x)&&x>0?new Date(x*1000).toISOString():null;
async function fulfill(c,event){
 const invoice=event.data?.object;if(!pattern(invoice?.id,'in'))return 'IGNORE';
 const verified=await stripe(c,'invoices/'+encodeURIComponent(invoice.id));
 if(verified.id!==invoice.id||verified.livemode!==true||verified.status!=='paid'||verified.currency!=='usd')
 return 'IGNORE';
 const sid=typeof verified.subscription==='string'?verified.subscription:
  verified.parent?.subscription_details?.subscription;
 if(!pattern(sid,'sub'))return 'IGNORE';
 const sub=await stripe(c,'subscriptions/'+encodeURIComponent(sid));
 if(sub.id!==sid||sub.livemode!==true||sub.status!=='active')return 'IGNORE';
 const reservationId=sub.metadata?.f600_reservation;
 if(!/^[0-9a-f-]{36}$/i.test(reservationId||''))return 'IGNORE';
 const rows=await db(c,'gu_founder_reservations_v014173?select=*&id=eq.'+encodeURIComponent(reservationId)+'&limit=1');
 if(!Array.isArray(rows)||rows.length!==1)throw Error('RESERVATION_NOT_FOUND');
 const reserved=rows[0],price=c.catalog[reserved.plan_code]?.priceId;
 if(!price||reserved.checkout_price_id!==price||!pattern(reserved.checkout_session_id,'cs_live'))throw Error('BINDING_FAILED');
 const original=await stripe(c,'checkout/sessions/'+encodeURIComponent(reserved.checkout_session_id));
 if(original.id!==reserved.checkout_session_id||original.livemode!==true
 ||original.client_reference_id!==reservationId||original.mode!=='subscription'
 ||original.subscription!==sid||original.metadata?.f600_user!==reserved.user_id)
 throw Error('CHECKOUT_SOURCE_MISMATCH');
 const item=sub.items?.data?.[0];
 if(sub.items?.data?.length!==1||item?.price?.id!==price
 ||item.price?.recurring?.interval!=='day'
 ||item.price.recurring.interval_count!==(reserved.plan_code==='FOUNDING_30'?30:60))
 throw Error('STRIPE_CADENCE_MISMATCH');
 const line=verified.lines?.data?.find(l=>(l.price?.id||l.pricing?.price_details?.price)===price);
 if(verified.lines?.has_more===true||verified.lines?.data?.length!==1)
 throw Error('UNEXPECTED_INVOICE_LINES');
 const start=iso(line?.period?.start),end=iso(line?.period?.end);
 if(!start||!end||!pattern(verified.customer,'cus')||!pattern(event.id,'evt'))
 throw Error('INVALID_CYCLE');
 const expected=reserved.plan_code==='FOUNDING_30'?4999:5999;
 if(!line||line.amount!==expected||verified.subtotal!==expected||verified.amount_paid<expected)
 throw Error('INVOICE_PRICE_MISMATCH');
 const result=await db(c,'rpc/gu_founder_record_paid_cycle_v014196',{
  p_reservation:reservationId,p_user:reserved.user_id,p_session:reserved.checkout_session_id,
  p_subscription:sid,p_invoice:verified.id,p_event:event.id,p_customer:verified.customer,
  p_price:price,p_plan_line_amount:expected,p_period_start:start,p_period_end:end,p_livemode:true
 });
 if(result?.ok!==true)throw Error('DATABASE_FULFILLMENT_RETRY');
 return result.replayed?'REPLAY':'PAID';
}
export async function onRequestPost({request,env}){
 const c=envConfig(env);if(!c)return text('Founding webhook inactive',503);
 let body;try{body=await raw(request)}catch{return text('Invalid event request',400)}
 if(!await signature(body,request.headers.get('stripe-signature'),c.secret))return text('Invalid event signature',403);
 let event;try{event=JSON.parse(body)}catch{return text('Malformed event',400)}
 if(event.livemode!==true||!pattern(event.id,'evt')||event.account&&event.account!==c.account)return text('Foreign event',403);
 if(event.type!=='invoice.paid')return text('Not handled by founding payment verifier',503);
 try{
  const account=await stripe(c,'account');if(account.id!==c.account)throw Error('FOREIGN_ACCOUNT');
  const status=await fulfill(c,event);
  return text(status,200);
 }catch{return text('Provider or fulfillment confirmation unavailable',503)}
}
