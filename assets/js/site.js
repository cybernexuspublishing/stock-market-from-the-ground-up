/* Complete v0.14.0.16 site.js, carrying forward established behavior plus v0.14.0.17 safe rich-content loader. */
const cfg = window.SITE_CONFIG || {};
function setYear(){document.querySelectorAll('[data-year]').forEach(e=>e.textContent=new Date().getFullYear())}
async function loadJSON(url){const r=await fetch(url); if(!r.ok) throw new Error(`Failed to load ${url}`); return r.json()}
function salesState(){
  document.querySelectorAll('[data-book-sale]').forEach(el=>{
    const n=Number(el.dataset.bookSale), b=(cfg.BOOKS||{})[n]||{};
    if(b.kdpSelectExclusive || !b.directDigitalSaleEnabled || !b.directSaleUrl){
      el.classList.add('disabled');el.setAttribute('aria-disabled','true');el.textContent='Direct digital sale — locked';el.removeAttribute('href');
    } else { el.href=b.directSaleUrl; }
  });
  document.querySelectorAll('[data-amazon-book]').forEach(el=>{
    const n=Number(el.dataset.amazonBook), b=(cfg.BOOKS||{})[n]||{};
    if(b.amazonUrl){el.href=b.amazonUrl;el.textContent='Buy on Amazon';el.classList.remove('disabled')}else{el.classList.add('disabled');el.textContent='Amazon listing — coming soon';el.removeAttribute('href')}
  });
}
function membershipState(){
  document.querySelectorAll('[data-membership-checkout]').forEach(el=>{
    if(cfg.MEMBERSHIP_CHECKOUT_URL){el.href=cfg.MEMBERSHIP_CHECKOUT_URL}else{el.classList.add('disabled');el.textContent='Membership checkout — setup pending';el.removeAttribute('href')}
  })
}
function loadRichEditor(){
  /* Shared on public member and owner pages. Existing forum script tags take precedence. */
  if(!document.querySelector('link[data-gu-rich-editor]')){
    const style=document.createElement('link');style.rel='stylesheet';style.href='/assets/css/rich-content-editor.css';style.dataset.guRichEditor='1';document.head.append(style);
  }
  if(!document.querySelector('script[src$="/forum-composer.js"],script[src="assets/js/forum-composer.js"]')){
    const script=document.createElement('script');script.src='/assets/js/forum-composer.js';script.dataset.guRichEditor='1';document.head.append(script);
  }
}
document.addEventListener('DOMContentLoaded',()=>{
  setYear();salesState();membershipState();loadRichEditor();
  if(/^\/(forum-topic|market-commons)(\.html)?$/.test(location.pathname)&&new URLSearchParams(location.search).has(/forum-topic/.test(location.pathname)?'id':'topic')){const style=document.createElement('link');style.rel='stylesheet';style.href='/assets/css/forum-interactions.css';document.head.append(style);const x=document.createElement('script');x.src='/assets/js/forum-interactions.js';x.defer=true;document.head.append(x)}
  if(!document.querySelector('script[data-v01411-announcements]')){
    const script=document.createElement('script');script.defer=true;script.dataset.v01411Announcements='1';script.src='/assets/js/site-announcements.js';document.head.append(script);
  }
});
