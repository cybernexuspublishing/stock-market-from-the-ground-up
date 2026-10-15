/* v0.14.0.21 — preserve established routes and bootstraps; additive backend UI. */
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
    if(b.amazonUrl){el.href=b.amazonUrl;el.textContent='Buy on Amazon';el.classList.remove('disabled')}
    else{el.href='/store.html';el.textContent='Check availability in Store';el.classList.remove('disabled');el.removeAttribute('aria-disabled')}
  });
}
function membershipState(){
  document.querySelectorAll('[data-membership-checkout]').forEach(el=>{
    if(cfg.MEMBERSHIP_CHECKOUT_URL){el.href=cfg.MEMBERSHIP_CHECKOUT_URL}
    else{el.classList.add('disabled');el.textContent='Membership checkout — setup pending';el.removeAttribute('href')}
  })
}
function loadRichEditor(){
  if(!document.querySelector('link[data-gu-rich-editor]')){
    const style=document.createElement('link');style.rel='stylesheet';style.href='/assets/css/rich-content-editor.css';style.dataset.guRichEditor='1';document.head.append(style);
  }
  if(!document.querySelector('script[src$="/forum-composer.js"],script[src="assets/js/forum-composer.js"]')){
    const script=document.createElement('script');script.src='/assets/js/forum-composer.js';script.dataset.guRichEditor='1';document.head.append(script);
  }
}
function loadOnce(src,key){if(document.querySelector('script[data-gu-correction=\"'+key+'\"]'))return;const x=document.createElement('script');x.src=src;x.defer=true;x.setAttribute('data-gu-correction',key);document.head.append(x)}
document.addEventListener('DOMContentLoaded',()=>{
  setYear();salesState();membershipState();loadRichEditor();
  // These labels describe the client overlay, not a verified Cloudflare deployment SHA.
  for(const meta of document.querySelectorAll('meta[name="application-version"]'))meta.content='v0.14.0.21';
  document.body.dataset.build='v0.14.0.21';
  if(!document.querySelector('link[data-gu-sitewide-acceptance]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/sitewide-acceptance.css';css.dataset.guSitewideAcceptance='1';document.head.append(css)}
  loadOnce('/assets/js/sitewide-runtime.js','sitewideRuntime');
  if(/^\/admin(?:\.html)?$/.test(location.pathname)){
    const style=document.createElement('link');style.rel='stylesheet';style.href='/assets/css/admin-report-policy.css';document.head.append(style);
    const script=document.createElement('script');script.src='/assets/js/admin-report-policy.js';script.defer=true;document.head.append(script);
  }
  if(/^\/(forum-topic|market-commons)(\.html)?$/.test(location.pathname)&&new URLSearchParams(location.search).has(/forum-topic/.test(location.pathname)?'id':'topic')){
    const style=document.createElement('link');style.rel='stylesheet';style.href='/assets/css/forum-interactions.css';document.head.append(style);
    const x=document.createElement('script');x.src='/assets/js/forum-interactions.js';x.defer=true;document.head.append(x);
  }
  if(!document.querySelector('script[data-v01411-announcements]')){
    const script=document.createElement('script');script.defer=true;script.dataset.v01411Announcements='1';script.src='/assets/js/site-announcements.js';document.head.append(script);
  }
  if(/^\/(market-commons|forum|forum-topic)(?:\.html)?$/.test(location.pathname)) loadOnce('/assets/js/v014018-forum-corrections.js','forumCorrections');
  if(/^\/(new-discussion|market-commons|forum|forum-topic)(?:\.html)?$/.test(location.pathname))loadOnce('/assets/js/member-mentions.js','verifiedMentions');
  if(/^\/admin(?:\.html)?$/.test(location.pathname))loadOnce('/assets/js/frontend-integration-health.js','integrationHealth');
  // v0.14.0.21: bind genuine backend data to existing member Settings and Commons.
  if(/^\/(dashboard|market-commons)(?:\.html)?$/.test(location.pathname)){
    if(!document.querySelector('link[data-gu-backend-community]')){
      const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/backend-community-v01421.css';css.dataset.guBackendCommunity='1';document.head.append(css);
    }
    if(/^\/dashboard(?:\.html)?$/.test(location.pathname))
      loadOnce('/assets/js/member-notification-preferences-v01421.js','memberNotificationPreferences');
    if(/^\/market-commons(?:\.html)?$/.test(location.pathname)&&new URLSearchParams(location.search).has('topic'))
      loadOnce('/assets/js/commons-follow-v01421.js','commonsFollow');
  }
});
