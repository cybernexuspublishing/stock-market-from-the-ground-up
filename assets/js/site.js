/* v0.14.0.32 — activate the EXISTING Supabase/Turnstile integration.
 * Native Supabase Auth CAPTCHA must ALSO be configured in the Supabase dashboard.
 * This boot guard prevents submitting before the adapter checks the runtime flag.
 */
(function(){
 const authPage=/^\/(signin|create-account)(?:\.html)?$/i.test(location.pathname);
 if(!authPage)return;
 // Login and registration must use the Yahoo master Turnstile widget's
 // approved hostname. Preserve the exact local path/query when migrating
 // from the retired legacy hostname or a hashed Yahoo deployment preview.
 // This is navigation, never CAPTCHA bypass or token consumption.
 const canonical='stock-market-from-the-ground-up-d1r.pages.dev';
 const host=String(location.hostname||'').toLowerCase();
 if(host==='stock-market-from-the-ground-up.pages.dev'||host.endsWith('.'+canonical)){
   location.replace('https://'+canonical+location.pathname+location.search+location.hash);
   return;
 }
 if(!document.querySelector('script[data-gu-human-verification-v01432]')){
   const human=document.createElement('script');
   human.src='/assets/js/turnstile-auth.js';human.dataset.guHumanVerificationV01432='1';
   document.head.append(human);
 }
 document.addEventListener('submit',function(event){
   const form=event.target;
   if(!form?.matches?.('form'))return;
   if(!window.GroundUpTurnstile){
     event.preventDefault();event.stopImmediatePropagation();
     let message=form.querySelector('#v135-auth-captcha-status');
     if(!message){message=document.createElement('p');message.id='v135-auth-captcha-status';message.setAttribute('role','status');form.append(message)}
     message.textContent='Human verification is initializing. Please wait a moment and try again.';
     return;
   }
   if(window.GroundUpTurnstile.required){
     try{window.GroundUpTurnstile.getToken()}
     catch(e){event.preventDefault();event.stopImmediatePropagation();
       const box=form.querySelector('#v135-auth-captcha-status');if(box)box.textContent=e.message||'Complete human verification.'}
   }
 },true);
})();

/* v0.14.0.32 — preserve established routes and bootstraps; signed-book commerce additive. */
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
  // Owner-directed workspace refresh is deliberately opt-in by route.
  // Public pages have no workspace side panel. Teaching canvas styles remain separate.
  const workspaceRoute=(location.pathname.replace(/\.html$/,'').replace(/\/$/,'')||'/');
  if(/^(?:\/|\/index|\/dashboard|\/admin|\/store(?:-[a-z0-9-]+)?|\/product|\/membership|\/books|\/tools|\/my-books|\/my-library|\/my-purchases|\/account|\/settings|\/help|\/about|\/signin|\/create-account)$/.test(workspaceRoute)){
    document.body.dataset.guWorkspace=workspaceRoute==='/dashboard'?'member':workspaceRoute==='/admin'?'admin':'site';
  }

  if(/^\/(labs|bootcamp|bootcamp-academy)$/.test(workspaceRoute))document.body.dataset.guMemberNavigation='learning';

  const declaredRelease=/^\d+\.\d+\.\d+\.\d+$/.test(String(cfg.VERSION||''))?'v'+cfg.VERSION:'unverified';
  for(const meta of document.querySelectorAll('meta[name="application-version"]'))meta.content=declaredRelease;
  document.body.dataset.build=declaredRelease;
  if(!document.querySelector('link[data-gu-sitewide-acceptance]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/sitewide-acceptance.css';css.dataset.guSitewideAcceptance='1';document.head.append(css)}
  if(!document.querySelector('link[data-gu-premium-design]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/premium-design-v014168.css';l.dataset.guPremiumDesign='1';document.head.append(l)}
  loadOnce('/assets/js/premium-design-v014168.js','premiumDesignV014168');
  loadOnce('/assets/js/sitewide-runtime.js','sitewideRuntime');
  loadOnce('/assets/js/release-integrity-v014036.js','releaseIntegrityV014036');
  if(/^\/admin(?:\.html)?$/.test(location.pathname)){
    loadOnce('/assets/js/admin-payment-center-v01433.js','adminPaymentCenterV01433');
    loadOnce('/assets/js/admin-simple-navigation-v014036.js','adminSimpleNavigationV014036');
    if(!document.querySelector('link[data-gu36-admin-style]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/admin-simple-navigation-v014036.css';l.dataset.gu36AdminStyle='1';document.head.append(l)}
    loadOnce('/assets/js/admin-human-verification-v01434.js','adminHumanVerificationV01434');
    if(!document.querySelector('link[data-gu34-captcha-style]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/admin-human-verification-v01434.css';l.dataset.gu34CaptchaStyle='1';document.head.append(l)}
    if(!document.querySelector('link[data-gu33-payment-center]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/admin-payment-center-v01433.css';l.dataset.gu33PaymentCenter='1';document.head.append(l)}
  }
  if(/^\/admin(?:\.html)?$/.test(location.pathname)){loadOnce('/assets/js/admin-password-confirm-v01432r1.js','adminPasswordConfirmV01432r1');loadOnce('/assets/js/admin-lemon-readiness-v01432r1.js','adminLemonReadinessV01432r1');loadOnce('/assets/js/admin-payment-providers-v01432r2.js','adminPaymentProvidersV01432r2');if(!document.querySelector('link[data-gu-password-reconfirm]')){const x=document.createElement('link');x.rel='stylesheet';x.href='/assets/css/admin-password-confirm-v01432r1.css';x.dataset.guPasswordReconfirm='1';document.head.append(x)}}
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

/* Pre-LIVE visual contract: client-side fallback when edge HTML rewriting or a
   subsequent body replacement omits the layout marker. Never changes access. */
(function(){
  function ensureSitewideComposition(){
    if(!document.body)return;
    if(!document.body.hasAttribute('data-gu-layout-route')){
      const page=location.pathname.replace(/\.html$/,'').split('/').filter(Boolean).join('-')||'home';
      document.body.setAttribute('data-gu-layout-route',page);
    }
    if(!document.querySelector('link[href*="sitewide-composition-v014234.css"]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='/assets/css/sitewide-composition-v014234.css';
      link.setAttribute('data-gu-sitewide-composition','1');
      document.head.append(link);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureSitewideComposition,{once:true});
  else ensureSitewideComposition();
})();
