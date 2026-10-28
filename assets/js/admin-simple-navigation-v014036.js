/* Admin navigation compatibility and Owner-only diagnostics.
 * Navigation is owned by admin-navigation.js. No parallel Workspace menu,
 * duplicate all-controls directory, or cloned module actions are created.
 */
(()=>{'use strict';
if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname)||window.GroundUpSimpleAdminNavV014036)return;
const $=(s,r=document)=>r.querySelector(s);
function allowed(el){return !!(el&&el.isConnected&&!el.disabled&&!el.hidden&&!el.closest('[hidden]')&&!el.classList.contains('cc-owner-hidden'));}
function attachShadow(){
 if(!allowed($('#admin-tabs [data-panel="commerce"]')))return;
 if(!document.querySelector('link[href*="admin-stripe-shadow-v01439.css"]')){
  const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/admin-stripe-shadow-v01439.css';document.head.append(l);
 }
 if(!document.querySelector('script[src*="admin-stripe-shadow-v01439.js"]')){
  const s=document.createElement('script');s.src='/assets/js/admin-stripe-shadow-v01439.js?v=014047';s.defer=true;document.head.append(s);
 }
}
function installOwnerQa(){
 const nav=$('#admin-tabs'),ctx=typeof ADMIN!=='undefined'?ADMIN.ctx:window.ADMIN?.ctx;
 if(!nav||!ctx?.roles?.includes('OWNER')||!ctx?.permissions?.includes('commerce.view'))return;
 if($('#gu36-owner-zero-live-qa'))return;
 const qa=document.createElement('button');qa.type='button';qa.id='gu36-owner-zero-live-qa';
 qa.className='cc-admin-shortcut';qa.textContent='Owner LIVE $0.00 QA';
 qa.dataset.ccNavGroup='Support & Operations';qa.dataset.ccOwnerOnly='true';
 qa.title='Owner-only diagnostic navigation; does not initiate a payment.';
 qa.addEventListener('click',()=>{
  const commerce=$('#admin-tabs [data-panel="commerce"]');
  if(!allowed(commerce))return;
  commerce.click();let tries=0;
  const timer=setInterval(()=>{
   const target=$('#gu71-zero-live-checkout');
   if(target){clearInterval(timer);target.open=true;target.scrollIntoView({block:'start',behavior:'smooth'});}
   else if(++tries>=40)clearInterval(timer);
  },100);
 });
 nav.append(qa);
}
function route(name){
 const keys={Overview:'[data-panel="dashboard"]',People:'#admin-account-management-direct',Learning:'[data-panel="content"]',Commerce:'[data-panel="commerce"]',Community:'[data-panel="community"]',Platform:'[data-panel="settings"]'};
 const el=$(keys[name]||'#admin-tabs [data-cc-legacy-label="'+String(name||'').replace(/"/g,'')+'"]');
 if(allowed(el))el.click();
}
function mount(){
 const nav=$('#admin-tabs'),aside=$('.admin-sidebar'),gate=$('#admin-gate'),app=$('#admin-app');
 if(!nav||!aside||!gate?.hidden||app?.hidden||!app)return false;
 // Undo a legacy wrapper if this script was loaded after an older release.
 const old=$('#gu36-simple-admin'),details=$('details.gu36-all-controls');
 if(details&&details.contains(nav))aside.append(nav);
 if(old)old.remove();if(details)details.remove();
 installOwnerQa();attachShadow();
 window.GroundUpSimpleAdminNavV014036=Object.freeze({version:'organized-v1',open:route});
 return true;
}
let attempts=0;const timer=setInterval(()=>{if(mount()||++attempts>180)clearInterval(timer)},200);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();