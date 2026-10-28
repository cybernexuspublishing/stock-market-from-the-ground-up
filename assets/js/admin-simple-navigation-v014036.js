/* v0.14.0.47 | Simple Admin directory. Retains existing authorized controllers. */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/i.test(location.pathname)||window.GroundUpSimpleAdminNavV014036)return;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const entries=[
 {title:'Overview',target:'[data-panel="dashboard"]',query:/^dashboard$/i},
 {title:'People',target:'#admin-account-management-direct',query:/account management|members/i,backup:'[data-panel="users"]'},
 {title:'Learning',target:'[data-panel="catalog"]',query:/books & catalog|books & products|content & tutor/i,backup:'[data-panel="content"]'},
 {title:'Commerce',target:'[data-panel="commerce"]',query:/commerce|payments & billing/i},
 {title:'Community',target:'[data-panel="community"]',query:/market commons|moderation/i},
 {title:'Platform',target:'[data-panel="settings"]',query:/site settings|website settings/i}
];
let initialized=false,attached=false;
function eligible(e){return Boolean(e&&e.isConnected&&!e.disabled&&!e.hidden&&!e.closest('[hidden]')&&!e.classList.contains('cc-owner-hidden')&&e.getAttribute('aria-disabled')!=='true')}
function find(e){const n=$('#admin-tabs');if(!n)return null;
 const exact=e.target?$(e.target,n):null;if(eligible(exact))return exact;
 const match=$$('button,a',n).find(x=>eligible(x)&&e.query.test(x.textContent.trim()));if(match)return match;
 return e.backup&&eligible($(e.backup,n))?$(e.backup,n):null;
}
function activate(e,notice){const action=find(e);
 if(!action){notice.textContent=`${e.title} is not available for this account. Choose All admin controls for other authorized functions.`;return}
 if(action.matches('a[href]')){location.assign(action.href);return}
 action.click();notice.textContent='';
}
function loadShadowDashboard(){if(attached||!eligible($('[data-panel="commerce"]','#admin-tabs')))return;
 attached=true;
 if(!document.querySelector('link[href*="admin-stripe-shadow-v01439.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/admin-stripe-shadow-v01439.css';css.dataset.gu39Css='1';document.head.append(css)}
 if(!document.querySelector('script[src*="admin-stripe-shadow-v01439.js"]')){const script=document.createElement('script');script.src='/assets/js/admin-stripe-shadow-v01439.js?v=014047';script.dataset.gu39Dashboard='1';script.defer=true;document.head.append(script)}
}
function mount(){if(initialized)return;
 const nav=$('#admin-tabs'),aside=$('.admin-sidebar'),gate=$('#admin-gate'),app=$('#admin-app');
 if(!nav||!aside||!gate||!gate.hidden||!app||app.hidden)return;
 if($('#gu36-simple-admin')){initialized=true;loadShadowDashboard();return}
 initialized=true;
 const panel=document.createElement('section');panel.id='gu36-simple-admin';panel.className='gu36-simple-admin';panel.setAttribute('aria-label','Admin main sections');
 const heading=document.createElement('h2');heading.textContent='Workspace';panel.append(heading);
 const label=document.createElement('label');label.htmlFor='gu36-find-admin';label.textContent='Search admin controls';
 const search=document.createElement('input');search.type='search';search.id='gu36-find-admin';search.placeholder='Search members, Stripe, books…';search.autocomplete='off';
 label.append(search);panel.append(label);
 const shortcuts=document.createElement('div');shortcuts.className='gu36-quick-links';
 const notice=document.createElement('p');notice.className='gu36-nav-notice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
 for(const e of entries){const btn=document.createElement('button');btn.type='button';btn.textContent=e.title;btn.className='gu36-nav-link';btn.dataset.gu36Target=e.title;
 btn.addEventListener('click',()=>activate(e,notice));shortcuts.append(btn)}
 // A dedicated Owner-only $0 LIVE diagnostic shortcut belongs in the main
 // Workspace menu, not only in a collapsed legacy navigation or Stripe TEST hub.
 // This reveals no billing authority: GU71 continues to enforce Owner JWT,
 // password confirmation, a verified $0 one-time Price and same-origin POST.
 const context=typeof ADMIN!=='undefined'?ADMIN.ctx:null;
 if(context?.roles?.includes('OWNER')&&context?.permissions?.includes('commerce.view')){
  const qa=document.createElement('button');qa.type='button';qa.id='gu36-owner-zero-live-qa';
  qa.className='gu36-nav-link';qa.textContent='Owner LIVE $0.00 QA';
  qa.addEventListener('click',()=>{
   const commerce=$('#admin-tabs button[data-panel="commerce"]');
   if(!commerce||commerce.disabled){notice.textContent='Payments & Billing is unavailable to this account.';return}
   commerce.click();
   let tries=0;const timer=setInterval(()=>{
    const target=$('#gu71-zero-live-checkout');
    if(target){clearInterval(timer);target.open=true;target.scrollIntoView({block:'start',behavior:'smooth'});notice.textContent='';}
    else if(++tries>=40){clearInterval(timer);notice.textContent='Owner QA controls did not load. Refresh the Admin panel and review the payment controls.';}
   },100);
  });
  shortcuts.append(qa);
 }
 panel.append(shortcuts,notice);
 search.addEventListener('input',()=>{
  const f=$('#gu33-global-input');if(f){f.value=search.value;f.dispatchEvent(new Event('input',{bubbles:true}))}
  const q=search.value.toLocaleLowerCase().trim();$$('.gu36-nav-link',shortcuts).forEach(b=>b.hidden=!!q&&!b.textContent.toLocaleLowerCase().includes(q));
  notice.textContent=q&&!f?'Full search is loading. Basic section names can be searched here.':'';
 });
 const details=document.createElement('details');details.className='gu36-all-controls';
 const summary=document.createElement('summary');summary.textContent='Browse all authorized controls';details.append(summary);
 nav.before(panel);nav.before(details);details.append(nav);
 window.GroundUpSimpleAdminNavV014036=Object.freeze({version:'0.14.0.47',open:(name)=>{const e=entries.find(x=>x.title===name);if(e)activate(e,notice)}});
 loadShadowDashboard();
}
let tries=0;const timer=setInterval(()=>{if(initialized||++tries>180){clearInterval(timer);return}mount()},200);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
