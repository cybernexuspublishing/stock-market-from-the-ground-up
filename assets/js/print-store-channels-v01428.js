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
 p.textContent=isStore?'Paperback and hardcover website orders are processed by the indicated print provider. Amazon, Kindle, and print-provider orders do not automatically grant a downloadable ebook or appear as website subscription payments.':'Printed books bought through Lulu Direct or Amazon are managed in the provider order history and will not automatically appear in your website purchase records. Companion access is independent of a full digital book license.';
 root.parentElement?.append(p)}
if(isPurchases){let n=0;const t=setInterval(()=>{notice();if(document.querySelector('[data-gu-print-purchase-note]')||++n>60)clearInterval(t)},250);return;}
const valid=x=>{try{const u=new URL(x);return u.protocol==='https:'&&(u.hostname==='lulu.com'||u.hostname.endsWith('.lulu.com'))&&!u.username&&!u.password&&(!u.port||u.port==='443')}catch{return false}};
let installed=false;
async function add(){if(installed||typeof window.CommerceTools?.load!=='function')return;
 const products=document.querySelector('#store-products .product-card');if(!products)return;
 installed=true;
 try{
  const d=await window.CommerceTools.load();
  for(const p of (d.products||[])){
   const card=[...document.querySelectorAll('#store-products .product-card')].find(x=>x.dataset.code===p.productCode);
   if(!card)continue;
   // Legacy catalog flags must not advertise inaccessible Kindle Select digital
   // checkout or a physical checkout hosted by a non-print processor.
   for(const a of [...card.querySelectorAll('a')]){
    if(a.textContent.trim()==='Buy on Website'&&(p.kdpSelect||!p.directDigital?.enabled))a.remove();
    if(a.textContent.trim()==='Buy Physical Edition Direct'&&!valid(a.href))a.remove();
   }
   if(!p.directPhysical?.enabled||p.salesStatus!=='published')continue;
   const links=p.metadata?.print_checkout_links_v01428||{},target=card.querySelector('.library-actions');if(!target)continue;
   for(const [edition,label] of [['paperback','Buy Paperback Direct — Lulu'],['hardcover','Buy Hardcover Direct — Lulu']]){
    const url=String(links[edition]||'').trim();if(!valid(url)||card.querySelector('[data-print-edition="'+edition+'"]'))continue;
    const anchor=document.createElement('a');anchor.className='btn secondary';anchor.textContent=label;anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.dataset.printEdition=edition;
    anchor.setAttribute('aria-label',label+' for '+(p.title||'book')+', checkout and shipping handled by Lulu Direct');target.append(anchor);
   }
  }
 }catch{ /* Never invent a checkout provider link on network failure. */ }
 notice();
}
let tries=0;const timer=setInterval(()=>{void add();if(installed||++tries>100)clearInterval(timer)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void add();notice()},{once:true});else{void add();notice()}
})();
