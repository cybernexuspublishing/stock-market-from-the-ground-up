/* v0.14.0.31 maintenance: Lulu Direct remains separately Owner-enabled;
 * signed author-copy availability is independent from actual Stripe checkout status. */
(()=>{'use strict';
const isStore=/^\/store(?:\.html)?$/i.test(location.pathname);
const isPurchases=/^\/my-purchases(?:\.html)?$/i.test(location.pathname);
if(!isStore&&!isPurchases)return;
function notice(){const root=document.querySelector(isStore?'#store-products':'#order-list');if(!root||document.querySelector('[data-gu-print-purchase-note]'))return;
 const p=document.createElement('p');p.dataset.guPrintPurchaseNote='1';p.className='small';
 p.textContent=isStore?'Amazon and Lulu orders are fulfilled by the specified external providers. Signed author copies purchased on this website are ordered, signed and shipped by the author. Printed books do not grant full EPUB/PDF access.':'Books purchased through Lulu Direct or Amazon remain in the provider order history. Signed copies purchased directly here are displayed separately below; companion access does not grant a full digital eBook license.';
 root.parentElement?.append(p)}
if(isPurchases){let n=0;const t=setInterval(()=>{notice();if(document.querySelector('[data-gu-print-purchase-note]')||++n>60)clearInterval(t)},250);return;}
const valid=x=>{try{const u=new URL(x);return u.protocol==='https:'&&(u.hostname==='lulu.com'||u.hostname.endsWith('.lulu.com'))&&!u.username&&!u.password&&(!u.port||u.port==='443')}catch{return false}};
let installed=false,loading=false;
async function add(){if(installed||loading||typeof window.CommerceTools?.load!=='function')return;
 if(!document.querySelector('#store-products .product-card'))return;loading=true;
 try{const data=await window.CommerceTools.load();
  for(const p of data.products||[]){const card=[...document.querySelectorAll('#store-products .product-card')].find(x=>x.dataset.code===p.productCode);if(!card)continue;
   const policy=p.metadata?.print_fulfillment_v01429||null;
   const luluAllowed=policy?policy.lulu_enabled===true:p.directPhysical?.enabled===true;
   for(const a of [...card.querySelectorAll('a')]){
    if(a.textContent.trim()==='Buy on Website'&&(p.kdpSelect||!p.directDigital?.enabled))a.remove();
    if(a.textContent.trim()==='Buy Physical Edition Direct'&&(!valid(a.href)||!luluAllowed))a.remove();
   }
   if(p.salesStatus!=='published')continue;
   const links=p.metadata?.print_checkout_links_v01428||{},target=card.querySelector('.library-actions');if(!target)continue;
   if(policy?.signed_available===true&&!card.querySelector('[data-gu-signed-copy]')){
    const signed=document.createElement('p');signed.className='small';signed.dataset.guSignedCopy='1';
    signed.textContent='Personally Signed paperback/hardcover — purchase options, availability and estimated shipping are shown separately when signed checkout is enabled. Signed copies will be personally signed and shipped by the author.';
    target.append(signed);
   }
   if(!luluAllowed)continue;
   for(const [edition,label] of [['paperback','Buy Paperback Direct — Lulu'],['hardcover','Buy Hardcover Direct — Lulu']]){
    const url=String(links[edition]||'').trim();if(!valid(url)||card.querySelector('[data-print-edition="'+edition+'"]'))continue;
    const a=document.createElement('a');a.className='btn secondary';a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.dataset.printEdition=edition;
    a.setAttribute('aria-label',label+' for '+(p.title||'book')+', checkout and shipping handled by Lulu Direct');target.append(a);
   }
  }installed=true;
 }catch{/* try again while initial timer remains */}finally{loading=false}notice();
}
let tries=0;const timer=setInterval(()=>{void add();if(installed||++tries>100)clearInterval(timer)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void add();notice()},{once:true});else{void add();notice()}
})();
