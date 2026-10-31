/* Chart Studio mixed Lumen + card TEST quotation only.
 * This endpoint NEVER reserves credits, creates Stripe sessions, or grants access.
 * Settlement remains disabled until atomic cash/Lumen fulfillment is accepted.
 */
import {memberIdentity} from './member-tool-access.js';
import {crownlightChartEntitlement} from './chart-tier-access.js';
import {OFFERS,rank,config,db} from '../_lib/chart-cash-test-v1.js';
import {verifyChartMixedQa} from '../_lib/chart-mixed-test-guard-v1.js';
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
export async function onRequestGet({request,env}){
 try{
  const u=new URL(request.url),sku=u.searchParams.get('sku'),selected=Number(u.searchParams.get('lumens')||'0');
  if(!Object.hasOwn(OFFERS,sku)||!Number.isSafeInteger(selected)||selected<0||selected>10000000)return respond({ok:false,error:'INVALID_QUOTE'},400);
  const identity=await memberIdentity(env,request);
  const entitlement=await crownlightChartEntitlement(env,request);
  if(entitlement.eligible!==true)return respond({ok:false,error:'NOT_ELIGIBLE'},403);
  const offer=OFFERS[sku];
  if(rank[entitlement.tier]>=rank[offer.tier])return respond({ok:false,error:'ALREADY_INCLUDED'},409);
  const c=config(env),uid=encodeURIComponent(identity.userId);
  const buckets=await db(c,'groundup_question_pass_buckets?select=remaining_credits&user_id=eq.'+uid+'&remaining_credits=gt.0&expires_at=is.null&limit=1000');
  if(!Array.isArray(buckets)||buckets.length===1000)return respond({ok:false,error:'BALANCE_UNAVAILABLE'},503);
  const balance=buckets.reduce((sum,b)=>sum+Number(b.remaining_credits),0);
  if(!Number.isSafeInteger(balance)||balance<0||selected>balance)return respond({ok:false,error:'INSUFFICIENT_LUMENS'},409);
  const applied=Math.min(offer.amountCents,selected*7),cashDue=offer.amountCents-applied;
  if(selected>Math.ceil(offer.amountCents/7))return respond({ok:false,error:'EXCEEDS_PRODUCT_PRICE'},409);
  if(cashDue>0&&cashDue<50)return respond({ok:false,error:'BELOW_CARD_MINIMUM'},409);
  // An unfinished full-price session cannot coexist with a discounted order.
  // Identify the pending checkout without exposing payment identifiers to the browser.
  const pendingRows=await db(c,'crownlight_chart_cash_upgrades_v1?select=id,stripe_session_id'+
   '&user_id=eq.'+uid+'&sku=eq.'+encodeURIComponent(sku)+'&state=eq.pending&limit=2');
  const pending=pendingRows?.length===1?pendingRows[0]:null;
  const pendingMixed=pending?await db(c,'crownlight_chart_mixed_test_v1?select=upgrade_id'+
   '&upgrade_id=eq.'+encodeURIComponent(pending.id)+'&limit=1'):[];
  const pendingCardCheckout=!!pending&&!pendingMixed?.length;
  const pendingMixedCheckout=!!pending&&!!pendingMixed?.length;
  const pendingCardSessionBound=pendingCardCheckout&&typeof pending.stripe_session_id==='string'&&
   pending.stripe_session_id.startsWith('cs_test_');
  // Genuine mixed settlement is available only for server-approved noncommercial QA.
  // A pending charge, even if unpaid, must be expired by Stripe before a new purchase.
  const qaEligible=selected>0&&await verifyChartMixedQa(env,identity.userId);
  const checkoutActive=qaEligible&&!pending;
  const cancelPendingCardAvailable=qaEligible&&pendingCardSessionBound;
  return respond({ok:true,testOnly:true,checkoutActive,settlementEnabled:checkoutActive,qaEligible,
   pendingCardCheckout,pendingMixedCheckout,cancelPendingCardAvailable,sku,originalCents:offer.amountCents,
   lumenUnitCents:7,availableLumens:balance,selectedLumens:selected,discountCents:applied,
   remainingLumens:balance-selected,maxLumensUsable:Math.min(balance,Math.ceil(offer.amountCents/7)),cashDueCents:cashDue,fullyCovered:cashDue===0,
   note:checkoutActive?'Authorized TEST checkout available. Credits are reserved only when you submit.':'Preview only. TEST mixed checkout is not available for this account.'});
 }catch(e){return respond({ok:false,error:e.status===401?'SIGN_IN_REQUIRED':'QUOTE_UNAVAILABLE'},e.status===401?401:503)}
}
export function onRequestPost(){return respond({ok:false,error:'SETTLEMENT_NOT_ENABLED'},503)}
