/* v0.14.0.8 Admin navigation repair. Presentation only; original server-side RBAC remains authoritative.
 * Never invent hidden modules. Group existing installed controls; provide guarded entry points to real reports.
 */
(()=>{'use strict';
if(window.__groundupAdminNav148)return;window.__groundupAdminNav148=true;
if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const labels={
 'Overview': [/^Dashboard$/i,/Control Center Directory/i,/^Site Academy$/i],
 'Accounts & Access':[/^Account Management$/i,/^Create Account$/i,/Account Details|^User Accounts$/i,/Roles & Permissions/i,/Member Activity/i,/Accounts & Access/i],
 'Books & Learning':[/Books & Catalog|Book Sales & Visibility|Content & Tutor|Market Data/i,/Learning Operations|Lab Registry|Feature Inventory|Competency Cases|Book Editions|Book QR Campaigns/i,/Instructor|Question Bank/i],
 'Memberships & Commerce':[/^Commerce$|Memberships & Tools|Checkout & Payments|Advertising|Subscription/i,/Membership Visibility|Enrollment|Payment|Order/i],
 'Community & Support':[/^Market Commons$|^Market Commons · Reports$|^Reports \/|^Reports —|Moderation Queue|Support Queue|Announcements|Notifications|^Communications$/i],
 'Website & Grant Web Solutions':[/Grant Web Solutions|Client Drafts|Site Operations Center|Website|Pages|Branding|Form|Navigation|Site Settings|Visibility & Inventory|Site Governance|Legal & Policies/i],
 'Security, Operations & QA':[/^Audit Log$|^System$|Security|QA & Test|Archive|Recovery|Feature Controls|Automation|Readiness/i]
};
const ordered=Object.keys(labels);
const nav=()=>$('#admin-tabs');
function allowed(b){return b&&!b.disabled&&!b.hidden&&!b.closest('[hidden]');}
function activate(name){const b=$(`#admin-tabs button[data-panel="${name}"]`);if(!allowed(b))return false;b.click();return true;}
function reportOpen(){return activate('community')}
function moderationOpen(){if(!window.GroundUpAdminWorkflows?.openModeration)return false;window.GroundUpAdminWorkflows.openModeration();return true}
function accountOpen(){const b=$('#admin-tabs button[data-v1352-menu]');return allowed(b)?(b.click(),true):activate('users')}
function addShortcut(id,text,action,check){let b=$('#'+id);if(!b){b=document.createElement('button');b.type='button';b.id=id;b.className='cc-admin-shortcut';b.textContent=text;b.dataset.ccGroup='1';nav().append(b);b.addEventListener('click',()=>{if(!action()){const status=$('#cc-admin-navigation-status');if(status)status.textContent='This workflow has not loaded or is not authorized. Please refresh the page.';}})}b.hidden=!check();return b}
function groupOf(el){if(el.dataset.ccReports==='1'||el.id==='cc-direct-moderation')return 'Community & Support';if(el.id==='cc-direct-account')return 'Accounts & Access';if(el.id==='cc-directory-trigger')return 'Overview';if(el.id==='v1354-main-nav'||el.dataset.ccGroup==='website')return 'Website & Grant Web Solutions';
 const text=(el.textContent||'').trim();if(el.dataset.ocTab){const code=el.dataset.ocTab;return ['security'].includes(code)?'Security, Operations & QA':['support','notifications'].includes(code)?'Community & Support':['commerce'].includes(code)?'Memberships & Commerce':['learning'].includes(code)?'Books & Learning':'Overview';}
 if(el.dataset.v135Control)return 'Books & Learning';
 for(const [name,patterns] of Object.entries(labels))if(patterns.some(re=>re.test(text)))return name;
 return 'Additional Installed Controls';}
let rootObs=null,scheduled=false;
function regroup(){const root=nav(),app=$('#admin-app');if(!root||!app||app.hidden||!$('#admin-gate')?.hidden)return;
 rootObs?.disconnect();
 // Do not override or expose unauthorized buttons: the original scripts retain permission decisions.
 addShortcut('cc-direct-account','Account Management — Open',accountOpen,()=>allowed($('#admin-tabs [data-v1352-menu]'))||allowed($('#admin-tabs [data-panel=users]')));
 addShortcut('cc-direct-reports','Reports — All Member Reports',reportOpen,()=>allowed($('#admin-tabs [data-panel=community]')));
 addShortcut('cc-direct-moderation','Market Commons — Moderation Queue',moderationOpen,()=>{
  try{return !!window.GroundUpAdminCan?.('forum.moderate') && typeof window.GroundUpAdminWorkflows?.openModeration==='function'}catch{return false}
 });
 const controls=$$('button,a',root).filter(x=>!x.closest('.cc-admin-group-title'));
 const groups=new Map();for(const x of controls){const group=groupOf(x);if(!groups.has(group))groups.set(group,[]);groups.get(group).push(x)}
 const frag=document.createDocumentFragment();for(const name of [...ordered,'Additional Installed Controls']){
  const items=groups.get(name)||[];if(!items.length)continue;const wrap=document.createElement('div');wrap.className='v13-admin-group cc-admin-group';wrap.dataset.ccNavGroup=name;const heading=document.createElement('div');heading.className='v13-admin-group-title cc-admin-group-title';heading.textContent=name;wrap.append(heading);items.forEach(item=>wrap.append(item));frag.append(wrap)
 }
 root.replaceChildren(frag);
 let state=$('#cc-admin-navigation-status');if(!state){state=document.createElement('p');state.id='cc-admin-navigation-status';state.setAttribute('role','status');state.setAttribute('aria-live','polite');root.after(state)}
 if(rootObs)rootObs.observe(root,{childList:true,subtree:true});
}
function plan(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;regroup()},100)}
let lastReports=null;
window.addEventListener('groundup:admin-summary',event=>{lastReports=event.detail?.openReports;setReportCount()});
function setReportCount(){const b=$('#cc-direct-reports');if(!b||lastReports==null)return;b.textContent=`Reports — All Member Reports (${lastReports} open)`;}
function setup(){if(nav()&&!rootObs){rootObs=new MutationObserver(plan);rootObs.observe(nav(),{childList:true,subtree:true})}plan();setTimeout(plan,800);setTimeout(plan,2200);setTimeout(plan,4800);setTimeout(setReportCount,5300)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
window.GroundUpAdminNavigation=Object.freeze({openReports:reportOpen,openModeration:moderationOpen,openAccounts:accountOpen});
})();
