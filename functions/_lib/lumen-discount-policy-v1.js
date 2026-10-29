/* Crownlight Lumens — planned purchase discount cap.
 * PREVIEW ONLY: no billing integration, no credit debit, no entitlement, no grant.
 * Checkout must independently verify eligible settled prices and spend credits
 * atomically with a verified payment. Never accept a client-supplied subtotal
 * as an authority to charge, deduct, or fulfill.
 */
export const lumenDiscountPolicy=Object.freeze({
  version:3,
  enabled:false,
  denominationCents:7,
  maxPercentBasisPoints:10000,
  maxOrderDiscountCents:null,
  currency:'USD',
  eligibleKinds:Object.freeze(['digital_book','digital_course','digital_tool','digital_pass','addon','feature','membership','subscription','physical_product','apparel']),
  excludedKinds:Object.freeze(['lumen_bundle','tax','shipping','gift_card','donation']),
  calculationBase:'100% of eligible subtotal after other applicable discounts, before taxes and shipping',
  stacking:'Founding Member discounts and approved discounts are calculated first; Lumens apply afterward',
  nonExpiring:true,
  renewalPolicy:'Applied to current authorized invoice only; future recurring payments require separately approved recurring-credit authorization',
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
  // A final Lumen can cover a smaller residual (1–6 cents) on full payment.
  // Always show the rounded-up whole-Lumen requirement before redemption.
  const capLumens=Math.ceil(net/policy.denominationCents);
  const appliedLumens=Math.min(requested,balance,capLumens);
  const discountCents=Math.min(net,appliedLumens*policy.denominationCents);
  return {status:'PREVIEW_ONLY',eligible:true,appliedLumens,discountCents,
    remainingLumens:balance-appliedLumens,remainingSubtotalCents:net-discountCents,
    capLumens,fullyCovered:discountCents===net,rounding:'The final whole Lumen may cover fewer than 7 cents; no cash change is issued.',
    maxPerOrderCents:policy.maxOrderDiscountCents};
}
