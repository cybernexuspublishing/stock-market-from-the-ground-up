/* Crownlight Lumens — planned purchase discount cap.
 * PREVIEW ONLY: no billing integration, no credit debit, no entitlement, no grant.
 * Checkout must independently verify eligible settled prices and spend credits
 * atomically with a verified payment. Never accept a client-supplied subtotal
 * as an authority to charge, deduct, or fulfill.
 */
export const lumenDiscountPolicy=Object.freeze({
  version:1,
  enabled:false,
  denominationCents:10,
  maxPercentBasisPoints:2000,
  maxOrderDiscountCents:1000,
  currency:'USD',
  eligibleKinds:Object.freeze(['digital_book','digital_course','digital_tool','digital_pass']),
  excludedKinds:Object.freeze(['subscription','lumen_bundle','tax','shipping','apparel','gift_card','donation']),
  calculationBase:'eligible subtotal after other applicable discounts, before taxes and shipping',
  stacking:'Founding Member discounts and approved discounts are calculated first; Lumens apply afterward',
  nonExpiring:true,
  trialAutoRenew:false
});
const nonnegative=(x,name)=>{
  if(!Number.isSafeInteger(x)||x<0)throw new TypeError(name+' must be a nonnegative safe integer');
  return x;
};
/* Pure arithmetic for future independently verified server checkout. No purchase
 * or credit debit can be authorized by this function or its public policy API. */
export function previewLumenDiscount({eligibleNetCents,availableLumens,requestedLumens,productKind},policy=lumenDiscountPolicy){
  const net=nonnegative(eligibleNetCents,'eligibleNetCents');
  const balance=nonnegative(availableLumens,'availableLumens');
  const requested=nonnegative(requestedLumens,'requestedLumens');
  if(!policy.eligibleKinds.includes(productKind))
    return {status:'PREVIEW_ONLY',eligible:false,appliedLumens:0,discountCents:0,remainingLumens:balance,remainingSubtotalCents:net};
  const percentCap=Math.floor(net*policy.maxPercentBasisPoints/10000);
  const cap=Math.min(percentCap,policy.maxOrderDiscountCents);
  const capLumens=Math.floor(cap/policy.denominationCents);
  const appliedLumens=Math.min(requested,balance,capLumens);
  const discountCents=appliedLumens*policy.denominationCents;
  return {status:'PREVIEW_ONLY',eligible:true,appliedLumens,discountCents,
    remainingLumens:balance-appliedLumens,remainingSubtotalCents:net-discountCents,
    capLumens,maxPerOrderCents:policy.maxOrderDiscountCents};
}
