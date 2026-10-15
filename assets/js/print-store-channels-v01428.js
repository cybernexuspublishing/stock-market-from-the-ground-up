/* v0.14.0.28 — add individually priced Lulu Direct print edition buttons.
 * Printed book checkout and fulfillment are owned by Lulu/Stripe, NOT Lemon Squeezy.
 * Payment at external print checkout never unlocks an eBook or paid membership.
 */
(()=>{'use strict';
const isStore=/^\/store(?:\.html)?$/i.test(location.pathname);
const isPurchases=/^\/my-purchases(?:\.html)?$/i.test(location.pathname);
if(!isStore&&!isPurchases)return;
function notice(){const root=document.querySelector(isStore?'#store-products':'#order-list');if(!root||document.querySelector('[data-gu-print-purchase-note]'))return;
 const p=document.createElement('p');p.dataset.guPrintPurchaseNote='1';p.className='small';
 p.textContent=isStore?'Paperback and hardcover website orders are processed by the indicated print provider. Amazon, Kindle, and print-provider orders do not automatically grant a downloadable ebook or appear as website subscription payments.':'Books bought through Lulu Direct or Amazon are managed in the provider order history and will not automatically appear in your website purchase records. Companion access is independent of a full digital book license.';
 root.parentElement?.append(p)}
if(isPurchases){let n=0;const t=setInterval(()=>{notice();if(document.querySelector('[data-gu-print-purchase-note]')||++n>60)clearInterval(t)},250);return;}
const valid=x=>{try{const u=new URL(x);return u.protocol==='https:'&&(u.hostname==='lulu.com'||u.hostname.endsWith('.lulu.com'))&&!u.username&&!u.password&&(!u.port||u.port==='443')}catch{return false}};
let installed=false,loading=false;
async function add(){if(installed||loading||typeof window.CommerceTools?.load!=='function')return;
 const products=document.querySelector('#store-products .product-card');if(!products)return;
 loading=true;
 try{
  const d=await window.CommerceTools.load();
  for(const p of (d.products||[])){
   const card=[...document.querySelectorAll('#store-products .product-card')].find(x=>x.dataset.code===p.productCode);
   if(!card)continue;
   // Legacy catalog flags must not advertise inaccessible Kindle Select digital
   // checkout or a physical checkout hosted by a non-print processor.
   const policy=p.metadata?.print_fulfillment_v01429||null;
   // If v01429 policy exists, explicit Owner Lulu OFF overrides old catalog flags.
   // Before v01429 preferences are set, preserve the existing v01428 behavior.
   const luluAllowed=policy?policy.lulu_enabled===true:p.directPhysical?.enabled===true;
   for(const a of [...card.querySelectorAll('a')]){
    if(a.textContent.trim()==='Buy on Website'&&(p.kdpSelect||!p.directDigital?.enabled))a.remove();
    if(a.textContent.trim()==='Buy Physical Edition Direct'&&(!valid(a.href)||!luluAllowed))a.remove();
   }
   if(p.salesStatus!=='published')continue;
   const links=p.metadata?.print_checkout_links_v01428||{},target=card.querySelector('.library-actions');if(!target)continue;
   if(policy?.signed_available===true&&!card.querySelector('[data-gu-signed-copy]')){
     const signed=document.createElement('p');signed.className='small';signed.dataset.guSignedCopy='1';
     signed.textContent='Author-signed paperback/hardcover: ordering is being prepared. Signed copies will be personally signed and shipped by the author; online payment is not yet available.';
     target.append(signed);
   }
   if(!luluAllowed)continue;
   for(const [edition,label] of [['paperback','Buy Paperback Direct — Lulu'],['hardcover','Buy Hardcover Direct — Lulu']]){
    const url=String(links[edition]||'').trim();if(!valid(url)||card.querySelector('[data-print-edition="'+edition+'"]'))continue;
    const anchor=document.createElement('a');anchor.className='btn secondary';anchor.textContent=label;anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.dataset.printEdition=edition;
    anchor.setAttribute('aria-label',label+' for '+(p.title||'book')+', checkout and shipping handled by Lulu Direct');target.append(anchor);
   }
  }
  installed=true;
 }catch{ /* Retry while timer remains; never invent a checkout link. */ }
 finally{loading=false}
 notice();
}
let tries=0;const timer=setInterval(()=>{void add();if(installed||++tries>100)clearInterval(timer)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void add();notice()},{once:true});else{void add();notice()}
})();
