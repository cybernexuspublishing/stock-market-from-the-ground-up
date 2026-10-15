/* v31: provider-authorized signed physical sales. No book companion / digital license. */
(()=>{'use strict';if(!/^\/store(?:\.html)?$/.test(location.pathname))return;
const codeOK=s=>/^[A-Z0-9_]{3,90}$/.test(String(s||''));
async function safeJSON(url,opt){const r=await fetch(url,{cache:'no-store',...opt}),j=await r.json().catch(()=>({}));if(!r.ok||j.ok===false)throw Error(j.error||'Offer unavailable.');return j}
async function add(){const cards=[...document.querySelectorAll('#store-products .product-card')];if(!cards.length)return false;
 for(const card of cards){const code=card.dataset.code;if(!codeOK(code)||card.dataset.guSignedV01431)return true;
  const target=card.querySelector('.library-actions');if(!target)continue;card.dataset.guSignedV01431='1';
  for(const edition of ['paperback','hardcover']){
   let quote;try{const qs=new URLSearchParams({action:'quote',code,edition});const data=await safeJSON('/api/signed-book-checkout?'+qs);if(!data.available)continue;quote=data.quote}
   catch{continue}
   if(!quote||!Number.isInteger(quote.priceCents)||!Number.isInteger(quote.shippingCents))continue;
   const block=document.createElement('div');block.className='gu-signed-offer';
   const price=document.createElement('p');price.textContent='Personally Signed '+edition+' — '+((quote.priceCents+quote.shippingCents)/100).toLocaleString(undefined,{style:'currency',currency:'USD'})+' before applicable tax (includes configured US shipping).';
   const policy=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';policy.append(checkbox,document.createTextNode(' I accept the '));
   const a=document.createElement('a');a.href='/terms.html';a.textContent='Terms';a.target='_blank';a.rel='noopener noreferrer';policy.append(a,document.createTextNode(' and the physical-book handling times, refund and shipping policy.'));
   const button=document.createElement('button');button.type='button';button.className='btn';button.textContent='Buy Signed '+edition;button.disabled=true;
   const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');checkbox.addEventListener('change',()=>button.disabled=!checkbox.checked);
   button.onclick=async()=>{button.disabled=true;status.textContent='Creating a secure Stripe Checkout session…';try{
     const sb=await window.getSupabaseClient();const {data:{session}}=await sb.auth.getSession();if(!session)throw Error('Sign in before purchasing.');
     const r=await safeJSON('/api/signed-book-checkout?action=create',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+session.access_token},body:JSON.stringify({code,edition})});
     const u=new URL(r.url);if(u.protocol!=='https:'||u.hostname!=='checkout.stripe.com')throw Error('Unexpected payment provider.');window.location.assign(u.href);
    }catch(e){status.textContent=e.message||'Checkout unavailable';button.disabled=!checkbox.checked}};
   block.append(price,policy,button,status);target.append(block);
  }
 }return true;
}
let i=0;const timer=setInterval(()=>{void add().then(success=>{if(success||++i>100)clearInterval(timer)})},300);
})();
