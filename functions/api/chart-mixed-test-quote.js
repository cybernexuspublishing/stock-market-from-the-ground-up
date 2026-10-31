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
  const qaEligible=selected>0&&await verifyChartMixedQa(env,identity.userId);
  // Quote eligibility is not settlement readiness. The POST route is disabled.
  const checkoutActive=false;
  return respond({ok:true,testOnly:true,checkoutActive,settlementEnabled:false,qaEligible,sku,originalCents:offer.amountCents,
   lumenUnitCents:7,availableLumens:balance,selectedLumens:selected,discountCents:applied,
   remainingLumens:balance-selected,maxLumensUsable:Math.min(balance,Math.ceil(offer.amountCents/7)),cashDueCents:cashDue,fullyCovered:cashDue===0,
   note:'Quotation only. Mixed Chart Studio checkout is disabled; no Lumens can be reserved or paid through this route.'});
 }catch(e){return respond({ok:false,error:e.status===401?'SIGN_IN_REQUIRED':'QUOTE_UNAVAILABLE'},e.status===401?401:503)}
}
export function onRequestPost(){return respond({ok:false,error:'SETTLEMENT_NOT_ENABLED'},503)}
