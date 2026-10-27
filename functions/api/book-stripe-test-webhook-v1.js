import {BOOK_CODE,TEST_PRICE,reply,config,stripe,db,accountOK,uuid} from '../_lib/book-stripe-test-v1.js';
const accepted=new Set(['checkout.session.completed','checkout.session.async_payment_succeeded',
 'checkout.session.async_payment_failed','checkout.session.expired','charge.refunded','charge.dispute.created']);
const valid=x=>typeof x==='string'&&/^evt_[A-Za-z0-9_]+$/.test(x);
async function signed(payload,header,secret){
 const parts=String(header||'').split(',').map(x=>x.trim().split('='));
 const t=Number(parts.find(x=>x[0]==='t')?.[1]);
 const sigs=parts.filter(x=>x[0]==='v1'&&/^[a-f0-9]{64}$/i.test(x[1]||'')).map(x=>x[1].toLowerCase());
 if(!Number.isSafeInteger(t)||Math.abs(Math.floor(Date.now()/1000)-t)>300||!sigs.length)return false;
 const enc=new TextEncoder(),key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const hash=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(t+'.'+payload)));
 const hex=[...hash].map(x=>x.toString(16).padStart(2,'0')).join('');
 return sigs.some(s=>{let diff=0;for(let i=0;i<64;i++)diff|=hex.charCodeAt(i)^s.charCodeAt(i);return diff===0});
}
function tag(s){
 const m=s?.metadata||{};
 if(!uuid(m.gu_book_test_intent)||!uuid(m.gu_book_test_member)||m.gu_book_test_code!==BOOK_CODE)return null;
 if(s.client_reference_id!==m.gu_book_test_intent)return null;
 return {id:m.gu_book_test_intent,user:m.gu_book_test_member};
}
async function verifyPaid(c,id){
 if(!/^cs_test_[A-Za-z0-9_]+$/.test(String(id||'')))throw Error('Not a TEST Session');
 const s=await stripe(c,'checkout/sessions/'+encodeURIComponent(id));
 const m=tag(s);
 if(s.id!==id||!m||s.livemode!==false||s.mode!=='payment'||s.payment_status!=='paid'||
  s.currency!=='usd'||s.amount_subtotal!==1099||s.status!=='complete'||
  !/^pi_[A-Za-z0-9_]+$/.test(s.payment_intent||''))throw Error('Session not paid or not bound');
 const lines=await stripe(c,'checkout/sessions/'+encodeURIComponent(id)+'/line_items?limit=2');
 if(lines.data?.length!==1||lines.has_more===true||lines.data[0]?.price?.id!==TEST_PRICE||
  lines.data[0]?.quantity!==1||lines.data[0]?.amount_subtotal!==1099)
  throw Error('Session Price mismatch');
 const pi=await stripe(c,'payment_intents/'+encodeURIComponent(s.payment_intent));
 if(pi.id!==s.payment_intent||pi.livemode!==false||pi.status!=='succeeded'||
  pi.currency!=='usd'||Number(pi.amount_received)<1099||
  pi.metadata?.gu_book_test_intent!==m.id)
  throw Error('PaymentIntent proof missing');
 return {m,pi,s};
}
async function sessionForPi(c,pi){
 const sessions=await stripe(c,'checkout/sessions?payment_intent='+encodeURIComponent(pi)+'&limit=2');
 if(sessions.data?.length!==1||sessions.has_more===true)return null;
 const s=sessions.data[0],m=tag(s);
 if(!m||s.livemode!==false||s.mode!=='payment'||s.payment_intent!==pi||
  s.amount_subtotal!==1099)return null;
 return {m,s};
}
export async function onRequestPost({request,env}){
 let c;try{c=config(env,{requireEnabled:false})}catch{return reply({ok:false,error:'Book TEST webhook unavailable'},503)}
 try{
  if(Number(request.headers.get('content-length')||0)>262144)return reply({ok:false,error:'Payload too large'},413);
  const raw=await request.text();
  if(raw.length>262144)return reply({ok:false,error:'Payload too large'},413);
  if(!await signed(raw,request.headers.get('stripe-signature'),c.webhook))return reply({ok:false,error:'Invalid Stripe signature'},400);
  let evt;try{evt=JSON.parse(raw)}catch{return reply({ok:false,error:'Invalid JSON'},400)}
  if(!valid(evt?.id)||evt.livemode!==false||!evt?.data?.object)return reply({ok:false,error:'Invalid TEST event'},400);
  if(!accepted.has(evt.type))return reply({ok:true,ignored:true});
  await accountOK(c);
  const obj=evt.data.object;
  if(evt.type.startsWith('checkout.session.')){
   if(!/^cs_test_[A-Za-z0-9_]+$/.test(obj.id||''))return reply({ok:true,ignored:true});
   if(evt.type==='checkout.session.completed'||evt.type==='checkout.session.async_payment_succeeded'){
    const session=await stripe(c,'checkout/sessions/'+encodeURIComponent(obj.id));
    if(!tag(session))return reply({ok:true,ignored:true});
    if(session.payment_status!=='paid')return reply({ok:true,pending:true});
    const proof=await verifyPaid(c,obj.id);
    const d=await db(c,'gu_book_test_apply_v1',{
     p_event:evt.id,p_id:proof.m.id,p_kind:'paid',p_session:obj.id,
     p_pi:proof.pi.id,p_price:TEST_PRICE,p_amount:1099});
    return reply({ok:d.ok===true,duplicate:d.duplicate===true});
   }
   const s=await stripe(c,'checkout/sessions/'+encodeURIComponent(obj.id));
   const m=tag(s);if(!m)return reply({ok:true,ignored:true});
   if(evt.type==='checkout.session.expired'&&s.status!=='expired')return reply({ok:true,ignored:true});
   const kind=evt.type==='checkout.session.expired'?'expired':'failed';
   const d=await db(c,'gu_book_test_apply_v1',{p_event:evt.id,p_id:m.id,p_kind:kind});
   return reply({ok:d.ok===true,duplicate:d.duplicate===true});
  }
  const chargeId=evt.type==='charge.refunded'?obj.id:obj.charge;
  if(!/^ch_[A-Za-z0-9_]+$/.test(chargeId||''))return reply({ok:true,ignored:true});
  const charge=await stripe(c,'charges/'+encodeURIComponent(chargeId));
  if(charge.id!==chargeId||charge.livemode!==false||!/^pi_[A-Za-z0-9_]+$/.test(charge.payment_intent||''))
   return reply({ok:true,ignored:true});
  if(evt.type==='charge.refunded'&&Number(charge.amount_refunded||0)<=0)return reply({ok:true,ignored:true});
  const pi=await stripe(c,'payment_intents/'+encodeURIComponent(charge.payment_intent));
  if(!uuid(pi.metadata?.gu_book_test_intent)||pi.livemode!==false)return reply({ok:true,ignored:true});
  const proof=await sessionForPi(c,pi.id);
  if(!proof||proof.m.id!==pi.metadata.gu_book_test_intent)return reply({ok:true,ignored:true});
  const d=await db(c,'gu_book_test_apply_v1',{p_event:evt.id,p_id:proof.m.id,
   p_kind:evt.type==='charge.refunded'?'refunded':'disputed',p_pi:pi.id});
  return reply({ok:d.ok===true,duplicate:d.duplicate===true});
 }catch{return reply({ok:false,error:'Book TEST signed reconciliation failed; Stripe should retry.'},503)}
}
export function onRequestGet(){return reply({ok:false,error:'POST required'},405)}
