/* Founding 600 buyer consent and member-authenticated Stripe Checkout initiation.
 * Checkout is unavailable until BOTH server environment and database launch gates open.
 */
(()=>{'use strict';
const el=id=>document.getElementById(id);
async function init(){
 // Do not display founding offer pages after general launch or sold-out capacity.
 try{const r=await fetch('/api/founding-offer-status',{cache:'no-store'});
  const state=r.ok?await r.json():null;
  if(state?.ok===true&&state.offersVisible!==true){
   location.replace('store.html#'+(state.publicLaunch?'memberships':'books'));return;
  }
 }catch{}
 const status=el('f600-enrollment-status'),form=el('f600-enrollment-form'),
 closed=el('f600-enrollment-closed'),submit=el('f600-enroll-button'),feedback=el('f600-enrollment-feedback');
 let enabled=false;
 try{
  const response=await fetch('/api/founding600-checkout',{cache:'no-store'});
  const data=await response.json();
  enabled=response.ok&&data?.ok===true&&data?.checkoutEnabled===true;
 }catch{enabled=false}
 if(!enabled){status.textContent='Founding Members enrollment is not open for payment.';closed.hidden=false;return}
 form.hidden=false;status.textContent='Founding seats are available subject to secure provider verification.';
 const update=()=>{submit.disabled=!(el('f600-consent-renew').checked&&el('f600-consent-terms').checked)};
 form.addEventListener('change',update);update();
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const plan=form.querySelector('input[name="plan"]:checked')?.value;
  if(!plan||submit.disabled)return;
  submit.disabled=true;feedback.textContent='Verifying your membership and reserving a founding seat before checkout…';
  try{
   const client=await window.getSupabaseClient(),session=(await client.auth.getSession()).data?.session;
   if(!session?.access_token){feedback.textContent='Sign in to your account before founding enrollment.';return}
   const r=await fetch('/api/founding600-checkout',{method:'POST',headers:{
    authorization:'Bearer '+session.access_token,'content-type':'application/json'},
    body:JSON.stringify({plan,autoRenewConsent:true,founderTermsConsent:true})});
   const answer=await r.json().catch(()=>({}));
   if(!r.ok||!answer.ok){feedback.textContent=answer.error||'Enrollment is unavailable. You have not been charged.';return}
   const destination=new URL(answer.checkoutUrl);
   if(destination.protocol!=='https:'||destination.hostname!=='checkout.stripe.com')
    throw Error('Checkout destination could not be verified.');
   location.assign(destination.href);
  }catch{feedback.textContent='The checkout service could not safely confirm your seat. No successful charge has been established.'}
  finally{update()}
 });
}
init();
})();