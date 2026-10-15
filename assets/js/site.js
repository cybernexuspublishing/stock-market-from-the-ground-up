/* v0.14.0.31 — preserve established routes and bootstraps; signed-book commerce additive. */
const cfg = window.SITE_CONFIG || {};
function setYear(){document.querySelectorAll('[data-year]').forEach(e=>e.textContent=new Date().getFullYear())}
async function loadJSON(url){const r=await fetch(url); if(!r.ok) throw new Error(`Failed to load ${url}`); return r.json()}
function salesState(){
  document.querySelectorAll('[data-book-sale]').forEach(el=>{
    el.href='/store.html';el.textContent='Check Digital Edition Availability';
    el.classList.remove('disabled');el.removeAttribute('aria-disabled');
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
function loadOnce(src,key){if(document.querySelector('script[data-gu-correction="'+key+'"]'))return;const x=document.createElement('script');x.src=src;x.defer=true;x.setAttribute('data-gu-correction',key);document.head.append(x)}
document.addEventListener('DOMContentLoaded',()=>{
  setYear();salesState();membershipState();loadRichEditor();
  const declaredRelease=/^\d+\.\d+\.\d+\.\d+$/.test(String(cfg.VERSION||''))?'v'+cfg.VERSION:'unverified';
  for(const meta of document.querySelectorAll('meta[name="application-version"]'))meta.content=declaredRelease;
  document.body.dataset.build=declaredRelease;
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
  if(/^\/admin(?:\.html)?$/.test(location.pathname)){loadOnce('/assets/js/frontend-integration-health.js','integrationHealth');loadOnce('/assets/js/admin-community-health-v01423.js','communityHealth');loadOnce('/assets/js/admin-report-cases-v01424.js','reportCasesV01424');if(!document.querySelector('link[data-gu-report-cases-v01424]')){const x=document.createElement('link');x.rel='stylesheet';x.href='/assets/css/admin-report-cases-v01424.css';x.dataset.guReportCasesV01424='1';document.head.append(x)}if(!document.querySelector('link[data-gu-community-health]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/admin-community-health-v01423.css';l.dataset.guCommunityHealth='1';document.head.append(l)}}
  if(/^\/admin(?:\.html)?$/.test(location.pathname)){
    loadOnce('/assets/js/admin-print-channels-v01428.js','ownerPrintChannels');
    loadOnce('/assets/js/admin-print-modes-v01429.js','ownerPrintModesV01429');
    if(!document.querySelector('link[data-gu-print-channel-style]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/print-channel-admin-v01428.css';css.dataset.guPrintChannelStyle='1';document.head.append(css)}
  }
  if(/^\/(store|my-purchases)(?:\.html)?$/.test(location.pathname))
    loadOnce('/assets/js/print-store-channels-v01428.js','printStoreChannels');
  if(/^\/admin(?:\.html)?$/.test(location.pathname)){
    loadOnce('/assets/js/admin-digital-books-v01430.js','ownerDigitalBooksV01430');
    if(!document.querySelector('link[data-gu-digital-v01430]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/digital-books-v01430.css';css.dataset.guDigitalV01430='1';document.head.append(css)}
    loadOnce('/assets/js/admin-signed-books-v01431.js','ownerSignedBooksV01431');
    loadOnce('/assets/js/admin-communications-v01431r1.js','adminCommsV01431r1');
    loadOnce('/assets/js/admin-account-usernames-v01431r1.js','accountUsernamesV01431r1');
    loadOnce('/assets/js/admin-forum-usernames-v01431r1.js','forumUsernamesV01431r1');
    loadOnce('/assets/js/admin-staff-shipping-v01431r1.js','staffShippingV01431r1');
    if(!document.querySelector('link[data-gu-communications-style]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/admin-communication-r1.css';css.dataset.guCommunicationsStyle='1';document.head.append(css)}
    if(!document.querySelector('link[data-gu-signed-v01431]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/signed-books-v01431.css';css.dataset.guSignedV01431='1';document.head.append(css)}
  }
  if(/^\/create-account(?:\.html)?$/.test(location.pathname))loadOnce('/assets/js/registration-visibility-v01431r1.js','registrationVisibilityV01431r1');
  if(/^\/store(?:\.html)?$/.test(location.pathname)){
    loadOnce('/assets/js/digital-store-v01430.js','digitalStoreV01430');
    loadOnce('/assets/js/store-signed-books-v01431.js','storeSignedBooksV01431');
  }
  if(/^\/my-books(?:\.html)?$/.test(location.pathname))loadOnce('/assets/js/digital-library-v01430.js','digitalLibraryV01430');
  if(/^\/my-purchases(?:\.html)?$/.test(location.pathname))loadOnce('/assets/js/member-signed-orders-v01431.js','memberSignedOrdersV01431');
  if(/^\/(dashboard|market-commons)(?:\.html)?$/.test(location.pathname)){
    if(!document.querySelector('link[data-gu-backend-community]')){
      const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/backend-community-v01421.css';css.dataset.guBackendCommunity='1';document.head.append(css);
    }
    if(/^\/dashboard(?:\.html)?$/.test(location.pathname))
      {loadOnce('/assets/js/member-notification-preferences-v01421.js','memberNotificationPreferences');loadOnce('/assets/js/mention-notification-preferences-v01423.js','mentionNotificationPreferences');if(!document.querySelector('link[data-gu-mention-prefs]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/mention-notifications-v01423.css';l.dataset.guMentionPrefs='1';document.head.append(l)}}
    if(/^\/market-commons(?:\.html)?$/.test(location.pathname)&&new URLSearchParams(location.search).has('topic'))
      loadOnce('/assets/js/commons-follow-v01421.js','commonsFollow');
  }
});
