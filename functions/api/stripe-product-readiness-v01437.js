/* v0.14.0.41: read-only REST compatibility adapter to single GU39 verifier. */
import {onRequestGet as inspect} from './gu39-sandbox.js';
const respond=(b,status=200)=>new Response(JSON.stringify(b),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
export async function onRequestGet({request,env}){
 const url=new URL(request.url);url.searchParams.set('view','catalog');
 const reply=await inspect({request:new Request(url,{method:'GET',headers:request.headers}),env});
 const body=await reply.json().catch(()=>null);
 if(!reply.ok||!body?.ok)return respond({ok:false,error:body?.error||'Sandbox unavailable.',customerCheckoutEnabledByThisRelease:false},reply.status);
 return respond({ok:true,version:'0.14.0.41',environment:'Stripe Sandbox read-only',
  ownerReportedProductCount:body.productsExpected,verifiedProductCount:body.productsVerified,
  verifiedPriceCount:body.pricesVerified,priceMappedCount:body.priceIdsConfigured,
  taxClassificationReviewRequired:body.taxClassificationReviewRequired,
  products:body.rows.map(r=>({sku:r.sku,productId:r.productId,displayName:r.productName||r.sku,
   expectedAmountCents:r.amountCents,billing:r.interval,stripeTaxCode:r.stripeTaxCode||null,
   priceMapped:Boolean(r.priceId),productVerified:r.productVerified,priceVerified:r.priceVerified,
   productActive:r.productVerified,reason:r.reason||'',status:r.status})),
  customerCheckoutEnabledByThisRelease:false,
  warning:'Authoritative GU39 Stripe TEST read-only verification; live checkout remains OFF.'});
}
export function onRequestPost(){return respond({ok:false,error:'GET required.'},405)}
