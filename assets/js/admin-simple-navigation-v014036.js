/* v0.14.0.36 | One simple Admin directory, preserving existing controllers.
   No permission change: shortcuts only activate existing, authorized controls.
   Saved Owner navigation labels remain intact under "All admin controls". */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/i.test(location.pathname)||window.GroundUpSimpleAdminNavV014036)return;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const entries=[
  {title:'Dashboard',target:'[data-panel="dashboard"]',query:/^dashboard$/i},
  {title:'Members & Accounts',target:'#admin-account-management-direct',query:/account management|members & accounts/i,backup:'[data-panel="users"]'},
  {title:'Payments & Billing',target:'[data-panel="commerce"]',query:/^(?:commerce|payments & billing(?: center)?|checkout & payments)$/i},
  {title:'Books & Learning',target:'[data-panel="catalog"]',query:/books & catalog|books & products/i},
  {title:'Market Commons',target:'[data-panel="community"]',query:/market commons|moderation/i},
  {title:'Communications',query:/communications|member messages|notifications & announcements/i},
  {title:'Marketing & Advertising',query:/^advertising$|marketing & advertising/i},
  {title:'Website Settings',target:'[data-panel="settings"]',query:/^site settings$|^website settings$/i},
  {title:'Security & Reports',target:'[data-panel="audit"]',query:/audit log|security & reports/i},
  {title:'Grant Web Solutions',target:'a[href="/gws-projects.html"]',query:/grant web solutions/i}
];
let initialized=false;
function eligible(e){return Boolean(e&&e.isConnected&&!e.disabled&&!e.hidden&&!e.closest('[hidden]')&&!e.classList.contains('cc-owner-hidden')&&e.getAttribute('aria-disabled')!=='true')}
function find(e){const n=$('#admin-tabs');if(!n)return null;
  const exact=e.target?$(e.target,n):null;
  if(eligible(exact))return exact;
  const match=$$('button,a',n).find(x=>eligible(x)&&e.query.test(x.textContent.trim()));
  if(match)return match;
  return e.backup&&eligible($(e.backup,n))?$(e.backup,n):null;
}
function activate(e,notice){const action=find(e);
 if(!action){notice.textContent=`${e.title} is not available for this account. Choose All admin controls for other authorized functions.`;return}
 if(action.matches('a[href]')){location.assign(action.href);return}
 action.click();notice.textContent='';
}
function mount(){if(initialized)return;
 const nav=$('#admin-tabs'),aside=$('.admin-sidebar'),gate=$('#admin-gate'),app=$('#admin-app');
 if(!nav||!aside||!gate||!gate.hidden||!app||app.hidden)return;
 if($('#gu36-simple-admin')){initialized=true;return}
 initialized=true;
 const panel=document.createElement('section');panel.id='gu36-simple-admin';panel.className='gu36-simple-admin';panel.setAttribute('aria-label','Admin main sections');
 const heading=document.createElement('h2');heading.textContent='Admin Menu';panel.append(heading);
 const label=document.createElement('label');label.htmlFor='gu36-find-admin';label.textContent='Search admin controls';
 const search=document.createElement('input');search.type='search';search.id='gu36-find-admin';search.placeholder='Search members, Stripe, books…';search.autocomplete='off';
 label.append(search);panel.append(label);
 const shortcuts=document.createElement('div');shortcuts.className='gu36-quick-links';
 const notice=document.createElement('p');notice.className='gu36-nav-notice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
 for(const e of entries){const btn=document.createElement('button');btn.type='button';btn.textContent=e.title;btn.className='gu36-nav-link';btn.dataset.gu36Target=e.title;
   btn.addEventListener('click',()=>activate(e,notice));shortcuts.append(btn)}
 panel.append(shortcuts,notice);
 // Existing search performs permission-aware indexing. Forward text; don't search private records.
 search.addEventListener('input',()=>{
  const f=$('#gu33-global-input');if(f){f.value=search.value;f.dispatchEvent(new Event('input',{bubbles:true}));}
  const q=search.value.toLocaleLowerCase().trim();
  $$('.gu36-nav-link',shortcuts).forEach(btn=>btn.hidden=!!q&&!btn.textContent.toLocaleLowerCase().includes(q));
  if(q&&!f)notice.textContent='Full search is loading. Basic section names can be searched here.';
  else notice.textContent='';
 });
 const details=document.createElement('details');details.className='gu36-all-controls';
 const summary=document.createElement('summary');summary.textContent='All admin controls';
 details.append(summary);nav.before(panel);nav.before(details);details.append(nav);
 // The original nav stays in the DOM with its handlers, IDs, mutation observer and saved Owner settings.
 // UI structure changes only; backend authorization is never modified.
 window.GroundUpSimpleAdminNavV014036=Object.freeze({version:'0.14.0.36',open:(name)=>{const e=entries.find(x=>x.title===name);if(e)activate(e,notice)}});
}
let attempts=0;const timer=setInterval(()=>{if(initialized||++attempts>180){clearInterval(timer);return}mount()},200);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
