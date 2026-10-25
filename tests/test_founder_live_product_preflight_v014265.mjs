import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {foundingProductReadyForCheckout} from '../functions/api/founding600-checkout.js';

for(const plan of ['FOUNDING_30','FOUNDING_60']){
 const id='prod_TEST'+plan,good={id,livemode:true,active:true,
  metadata:{site_sku:plan,site_checkout_enabled:'true',fulfillment_verified:'true',payment_launch_approved:'true'}};
 assert.equal(foundingProductReadyForCheckout(good,plan,id),true,'Ready product may be offered after approved LIVE gate');
 for(const mutation of [
  {active:false},{livemode:false},{id:'prod_OTHER'},
  {metadata:{...good.metadata,site_checkout_enabled:'false'}},
  {metadata:{...good.metadata,fulfillment_verified:'false'}},
  {metadata:{...good.metadata,payment_launch_approved:'false'}},
  {metadata:{...good.metadata,site_sku:'OTHER'}}]){
  assert.equal(foundingProductReadyForCheckout({...good,...mutation},plan,id),false,
   'Inactive, foreign or unapproved product cannot reserve a founder seat');
 }
}
const code=readFileSync('functions/api/founding600-checkout.js','utf8');
const productPosition=code.indexOf("const product=await stripe(c,'products/'");
const seatPosition=code.indexOf("const reserved=await rest(c,'rpc/gu_founder_reserve_with_consent_v014198'");
assert(productPosition>0&&seatPosition>productPosition,'Actual LIVE product preflight MUST precede Founder seat reservation');
assert(code.includes("throw fail('Founding benefits or Stripe product have not passed final launch acceptance.'"),
 'Reject product before checkout when benefits are unaccepted');
console.log('PASS Founding 600 inactive LIVE products and unaccepted metadata never reserve seats or become sellable');
