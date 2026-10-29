/* Public disclosure of a DISABLED proposed Lumen checkout-discount policy.
 * There is deliberately no POST, checkout, wallet spending or purchase here.
 */
import {lumenDiscountPolicy} from '../_lib/lumen-discount-policy-v1.js';
export function onRequestGet(){
 return new Response(JSON.stringify({ok:true,checkoutDiscountActive:false,policy:lumenDiscountPolicy,
  notice:'Limits are proposed. This endpoint cannot redeem credits or authorize a discount.'}),
  {headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=60'}});
}
