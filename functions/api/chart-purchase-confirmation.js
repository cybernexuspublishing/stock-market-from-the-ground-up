/* Authenticated, read-only Chart Studio TEST order confirmation.
 * A Checkout redirect or SKU alone never confirms a payment or grants access.
 * All details come from the signed-webhook-settled, member-owned private ledger.
 */
import {memberIdentity} from './member-tool-access.js';
import {OFFERS,config,db} from '../_lib/chart-cash-test-v1.js';
const reply=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json; charset=utf-8',
 'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION=/^cs_test_[A-Za-z0-9_]{6,}$/;
export async function onRequestGet({request,env}){
 try{
  const u=new URL(request.url);
  const sessionId=u.searchParams.get('session_id'),orderId=u.searchParams.get('order_id');
  if((!sessionId&&!orderId)||(sessionId&&orderId)||
    (sessionId&&!SESSION.test(sessionId))||(orderId&&!UUID.test(orderId)))
   return reply({ok:false,error:'INVALID_ORDER_REFERENCE'},400);
  const identity=await memberIdentity(env,request),c=config(env);
  const filter=sessionId?'stripe_session_id=eq.'+encodeURIComponent(sessionId):
   'id=eq.'+encodeURIComponent(orderId);
  const rows=await db(c,'crownlight_chart_cash_upgrades_v1?select=id,sku,tier,state,amount_cents,starts_at,expires_at,revoked_at,created_at'+
   '&user_id=eq.'+encodeURIComponent(identity.userId)+'&'+filter+'&limit=2');
  if(!Array.isArray(rows)||rows.length!==1)return reply({ok:false,error:'ORDER_NOT_FOUND'},404);
  const order=rows[0],offer=OFFERS[order.sku];
  if(!offer||order.amount_cents!==offer.amountCents)return reply({ok:false,error:'ORDER_VERIFICATION_UNAVAILABLE'},503);
  const mixedRows=await db(c,'crownlight_chart_mixed_test_v1?select=lumens,discount_cents,cash_cents,original_cents,status'+
   '&upgrade_id=eq.'+encodeURIComponent(order.id)+'&user_id=eq.'+encodeURIComponent(identity.userId)+'&limit=2');
  if(!Array.isArray(mixedRows)||mixedRows.length>1)return reply({ok:false,error:'ORDER_VERIFICATION_UNAVAILABLE'},503);
  const mixed=mixedRows[0]||null;
  if(mixed&&(mixed.original_cents!==offer.amountCents||
      !Number.isSafeInteger(mixed.lumens)||mixed.lumens<1||
      mixed.discount_cents!==Math.min(offer.amountCents,mixed.lumens*7)||
      mixed.cash_cents!==offer.amountCents-mixed.discount_cents))
   return reply({ok:false,error:'ORDER_RECONCILIATION_REQUIRED'},503);
  const validDate=Number.isFinite(Date.parse(order.expires_at))&&Date.parse(order.expires_at)>Date.now();
  let state='pending';
  if(order.state==='active'&&!order.revoked_at&&validDate&&(!mixed||mixed.status==='active'))state='confirmed';
  else if(order.state==='refunded'||mixed?.status==='refunded')state='refunded';
  else if(order.state==='disputed'||mixed?.status==='disputed')state='disputed';
  else if(order.state==='expired'||mixed?.status==='expired'||mixed?.status==='released')state='expired';
  else if(order.revoked_at||order.state==='revoked')state='revoked';
  return reply({ok:true,testOnly:true,state,sku:order.sku,product:offer.label,
   durationDays:offer.durationDays,oneTime:true,renews:false,
   originalCents:offer.amountCents,
   lumensApplied:mixed?.lumens||0,discountCents:mixed?.discount_cents||0,
   cardCents:mixed?mixed.cash_cents:offer.amountCents,
   accessUntil:state==='confirmed'?order.expires_at:null,
   createdAt:order.created_at,
   note:state==='confirmed'?'Verified access is ready.':'This page does not grant access.'});
 }catch(e){return reply({ok:false,error:e.status===401?'SIGN_IN_REQUIRED':'ORDER_VERIFICATION_UNAVAILABLE'},
  e.status===401?401:503)}
}
export function onRequestPost(){return reply({ok:false,error:'READ_ONLY'},405)}
