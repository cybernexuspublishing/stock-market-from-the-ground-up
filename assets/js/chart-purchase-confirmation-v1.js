/* Purchase status is checked server-side. A success redirect is not proof of payment. */
(async()=>{'use strict';
 const status=document.getElementById('purchase-status'),details=document.getElementById('purchase-detail');
 const params=new URLSearchParams(location.search),sku=params.get('sku');
 const known={CHART_ADVANCED_30D:'Advanced Chart Studio — 30 Days',CHART_PROFESSIONAL_30D:'Professional Chart Studio — 30 Days'};
 if(!Object.hasOwn(known,sku)){status.textContent='Your checkout return was received.';details.textContent='Please open your member dashboard to verify any new access. If a payment is still processing, allow its verified confirmation to complete.';return}
 try{
  const client=await window.getSupabaseClient(),session=(await client.auth.getSession()).data?.session;
  if(!session?.access_token){status.textContent='Sign in to verify your purchase.';details.textContent='Your payment confirmation is associated with your account. Return here after signing in.';return}
  const response=await fetch('/api/chart-cash-upgrade',{headers:{authorization:'Bearer '+session.access_token},cache:'no-store'});
  const data=await response.json();
  if(!response.ok||data.ok!==true)throw Error('Unable to verify');
  const offer=data.offers?.find(x=>x.sku===sku);
  if(!offer)throw Error('Product unavailable');
  if(offer.activeUntil&&Date.parse(offer.activeUntil)>Date.now()){
   status.textContent='Purchase verified — thank you!';
   details.textContent=known[sku]+' is active on your account until '+new Date(offer.activeUntil).toLocaleString()+'. Your existing membership and Lumens remain unchanged.';
  }else{
   status.textContent='Payment confirmation pending';
   details.textContent='We have not yet verified a currently active cash-upgrade entitlement for '+known[sku]+'. Do not purchase it again while the payment is being verified. Check your dashboard or contact support if access does not appear.';
  }
 }catch{status.textContent='Purchase status temporarily unavailable';details.textContent='No purchase is confirmed by this page alone. Review your member dashboard or contact support if your paid access is missing.'}
})();