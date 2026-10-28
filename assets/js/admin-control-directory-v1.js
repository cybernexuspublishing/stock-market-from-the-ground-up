/* Unified Admin control finder. Navigates existing authorized modules only.
 * It never grants permissions, duplicates an editor, or writes to an API.
 */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const G=['Overview','Members & Access','Learning Administration','Commerce','Community','Website Management','Support & Operations','Security & Governance'];
const entries=[
 ['Today','Overview','[data-panel="dashboard"]','Dashboard;Priority checks'],
 ['Find a Tool','Overview',null,'Control Center Directory'],
 ['Members','Members & Access','#admin-account-management-direct','Account Management;User Accounts'],
 ['Add a Member','Members & Access','#admin-create-account-direct','Create Account'],
 ['Member Support','Members & Access','[data-panel="users"]','Account Details & Support'],
 ['Staff & Permissions','Members & Access','[data-panel="roles"]','Roles & Permissions'],
 ['Showcase Demo Logins','Members & Access','#admin-create-account-direct','Create Showcase Account;Synthetic Showcase Account',true],
 ['Test Accounts','Members & Access',null,'Membership Test Accounts;QA Accounts',true,'/admin.html#membership-test'],
 ['Lab Library','Learning Administration',null,'Lab Registry Management','/admin-operations.html'],
 ['Lab Preview','Learning Administration',null,'Read-only Member Lab Preview',false,'/admin-lab-preview.html'],
 ['Question Bank','Learning Administration',null,'Instructor Question Bank',false,'/training-editor.html'],
 ['Tutor Content & Feedback','Learning Administration','[data-panel="content"]','Content & Tutor;Content & Market Tutor'],
 ['Competencies & Rubrics','Learning Administration',null,'Competency registry;Assessment Rubric Registry',false,'/admin-operations.html'],
 ['Boot Camp & Academy','Learning Administration',null,'Operations & Learning Administration',false,'/admin-operations.html'],
 ['Market Data Sources','Learning Administration','[data-v135-control="market-data"]','Market Data'],
 ['Products & Prices','Commerce','[data-panel="products"]','Products;Books & Editions;Individual Learning Tools'],
 ['Founding 600 Offers','Commerce','[data-panel="products"]','Founding Plans',false,null,'founding'],
 ['Orders & Subscriptions','Commerce','[data-panel="commerce"]','Recent Orders;Refunds;Subscriptions'],
 ['Sales & Expenses','Commerce','[data-panel="commerce"]','Owner Sales;Expenses & Order Verification'],
 ['Payments (Stripe)','Commerce','[data-panel="commerce"]','Payments & Billing;Stripe'],
 ['Book Receipt Claims','Commerce',null,'Book Receipt Verification',false,'/admin-book-receipts.html'],
 ['Digital Books','Commerce','[data-panel="products"]','eBooks;EPUB;PDF',false,null,'books'],
 ['Printed & Signed Books','Commerce','[data-panel="commerce"]','Print Channels;Signed Books;Shipping'],
 ['Sparks Packages','Commerce','[data-panel="sparks"]','Sparks Pricing',true],
 ['Store Display','Commerce','[data-panel="products"]','Store Categories;Photos;Pagination'],
 ['Other Payment Providers','Commerce','[data-panel="commerce"]','Lemon readiness;Payment providers',true],
 ['Payment Reconciliation','Commerce','[data-panel="commerce"]','Billing reconciliation',true],
 ['Moderation','Community','[data-panel="community"]','Market Commons Reports;Moderation Queue'],
 ['Forum Sections','Community','[data-panel="community"]','Sub-forums'],
 ['Founders Commons','Community',null,'Founders Commons Design Council',false,'/admin-founders.html'],
 ['Announcements','Community','[data-oc-tab="notifications"]','Site Announcements'],
 ['Member Notices','Community','[data-oc-tab="notifications"]','Manage Member Notifications'],
 ['Community Health','Community','[data-panel="community"]','Reports'],
 ['Site Settings','Website Management','[data-panel="settings"]','Registration;Site background'],
 ['Show or Hide Features','Website Management',null,'Visibility & Inventory;Feature Visibility',false,'/admin-operations.html'],
 ['Advertising Sales','Website Management',null,'Marketing & Social Media;Advertising',true,'/admin-advertising.html'],
 ['Social Media Planner','Website Management',null,'Social Operations',true,'/admin-advertising.html'],
 ['Client Website Drafts (Grant Web Solutions)','Website Management',null,'Grant Web Solutions Client Drafts',false,'/gws-projects.html'],
 ['Operations Center','Support & Operations',null,'Site Operations Center;Operations & Intelligence'],
 ['Launch Readiness','Support & Operations','[data-admin-prelive]','Pre-LIVE Acceptance Center',true],
 ['Integrations Status','Support & Operations','[data-panel="system"]','System & Integrations'],
 ['Stripe Sync Check','Support & Operations','[data-panel="commerce"]','Stripe Shadow;Stripe Catalog',true],
 ['Admin Preview','Support & Operations',null,'Unified Admin Preview',true,'/admin-unified-preview.html'],
 ['Delivery Brief','Support & Operations','[data-panel="system"]','Delivery brief',true],
 ['Activity Log','Security & Governance','[data-panel="audit"]','Audit Log'],
 ['Bot Protection','Security & Governance','[data-panel="settings"]','Human Verification'],
 ['Password Check for Risky Actions','Security & Governance','[data-panel="settings"]','Password Confirmation']
].map(([label,group,target,aliases,ownerOnly=false,href=null,productTab=null])=>Object.freeze({label,group,target,aliases,ownerOnly,href,productTab}));
const $=(sel,root=document)=>root.querySelector(sel);
const getCtx=()=>typeof ADMIN!=='undefined'?ADMIN.ctx:window.ADMIN?.ctx;
const owner=()=>getCtx()?.roles?.includes('OWNER')===true;
function canShow(entry){
 if(entry.ownerOnly&&!owner())return false;
 if((getCtx()?.roles||[]).includes('SHOWCASE_VIEWER')&&(['Support & Operations','Security & Governance'].includes(entry.group)||entry.ownerOnly))return false;
 if(entry.href)return true; // Existing standalone pages enforce their own server permissions.
 if(entry.target){const x=$('#admin-tabs '+entry.target);return !!(x&&!x.disabled&&!x.hidden&&!x.classList.contains('cc-owner-hidden')&&!x.closest('[hidden]'));}
 return !!$('#admin-tabs');
}
function openEntry(entry,message){
 if(!canShow(entry)){message.textContent='This control is not available for your role.';return;}
 if(entry.href&&entry.href!='/admin.html#membership-test'){location.assign(entry.href);return;}
 if(entry.href==='/admin.html#membership-test'){
  const test=$('#admin-membership-qa-users')||$('#v1-membership-test-accounts');
  if(test){test.scrollIntoView({block:'start'});return;}
 }
 let target=entry.target?$('#admin-tabs '+entry.target):null;
 if(!target){
  target=[...document.querySelectorAll('#admin-tabs button,#admin-tabs a')].find(x=>x.textContent.trim().toLowerCase()===entry.label.toLowerCase()&&!x.hidden&&!x.disabled);
 }
 if(!target){
  message.textContent=entry.label+' is indexed but its authorized module has not loaded. No substitute control was opened.';
  return;
 }
 if(target.matches('a[href]')){location.assign(target.href);return;}
 target.click();
 if(entry.productTab){
  let n=0;const tick=setInterval(()=>{const b=$('#admin-products-tab-'+entry.productTab);if(b&&!b.disabled){clearInterval(tick);b.click();}else if(++n>20)clearInterval(tick);},100);
 }
 message.textContent='';
}
function mount(){
 let app=$('#admin-app');if(!app)return null;
 let panel=$('#cc-control-directory');if(panel)return panel;
 panel=document.createElement('section');panel.className='admin-panel';panel.id='cc-control-directory';
 const heading=document.createElement('div');heading.className='admin-heading';
 const block=document.createElement('div');const title=document.createElement('h1');title.textContent='Find a Tool';
 const desc=document.createElement('p');desc.textContent='Search every indexed administrative function, including historical names. Only controls permitted for your role can be opened.';
 block.append(title,desc);heading.append(block);
 const field=document.createElement('input');field.type='search';field.id='cc-directory-search';field.autocomplete='off';field.placeholder='Search members, Labs, prices, Stripe, Showcase…';field.setAttribute('aria-label','Search the Admin control directory');
 const results=document.createElement('div');results.id='cc-directory-results';
 const notice=document.createElement('p');notice.id='cc-directory-message';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
 panel.append(heading,field,results,notice);app.append(panel);
 const render=()=>{
  const q=field.value.trim().toLowerCase();results.replaceChildren();
  const visible=entries.filter(e=>canShow(e)&&(!q||[e.label,e.group,e.aliases].join(' ').toLowerCase().includes(q)));
  for(const group of G){
   const matching=visible.filter(e=>e.group===group);if(!matching.length)continue;
   const section=document.createElement('section');section.className='cc-directory-group';
   const h=document.createElement('h2');h.textContent=group;section.append(h);
   const grid=document.createElement('div');grid.className='cc-directory-grid';
   for(const entry of matching){
    const button=document.createElement('button');button.type='button';button.className='cc-directory-entry';
    button.textContent=entry.label;
    if(entry.ownerOnly){const tag=document.createElement('small');tag.textContent='OWNER';button.append(tag);}
    button.addEventListener('click',()=>openEntry(entry,notice));grid.append(button);
   }
   section.append(grid);results.append(section);
  }
  if(!visible.length){const none=document.createElement('p');none.textContent='No matching authorized control. Try the previous name.';results.append(none);}
 };
 field.addEventListener('input',render);panel.dataset.ccReady='true';render();
 return panel;
}
function open(q=''){
 const p=mount();if(!p)return false;
 document.querySelectorAll('#admin-app .admin-panel').forEach(x=>x.classList.remove('active'));
 document.querySelectorAll('#admin-tabs button').forEach(x=>x.classList.remove('active'));
 p.classList.add('active');const f=$('#cc-directory-search');
 if(q){f.value=q;f.dispatchEvent(new Event('input',{bubbles:true}));}f.focus();
 history.replaceState(null,'','#find-a-tool');return true;
}
window.GroundUpAdminDirectory=Object.freeze({open,entries:()=>entries.length});
let initialized=false;
function boot(){
 if(initialized||!$('#admin-app')||$('#admin-app').hidden||!$('#admin-gate')?.hidden)return;
 initialized=true;
 const initial=new URLSearchParams(location.search).get('find');
 if(initial)open(initial.slice(0,120));
}
let tries=0;const timer=setInterval(()=>{boot();if(initialized||++tries>180)clearInterval(timer)},200);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();