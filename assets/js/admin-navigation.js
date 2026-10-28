/* v0.14.0.10 — Single owner of Admin sidebar composition.
 * Preserve dynamically created module mount roots and render each stable action at most once.
 * Without this, an independent module detects its detached root as missing, mounts
 * again, and floods navigation with duplicate controls on each observer cycle.
 * Operational panels still belong to their original controllers; this registry edits placement only.
 */
(()=>{'use strict';
if(window.__groundupAdminNavigationOwner)return;window.__groundupAdminNavigationOwner=true;
if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nav=()=>$('#admin-tabs'),app=()=>$('#admin-app');
// Presentation taxonomy only. Existing module IDs, delegated handlers, and
// backend registry permissions remain authoritative.
const defs={
 'Overview':[/^Today$|^Dashboard$|Find a Tool|Control Center Directory|Site Academy/i],
 'Members & Access':[/Member|Account|User|Role|Permission|Showcase|Test Account/i],
 'Learning Administration':[/Lab|Academy|Boot Camp|Instruction|Question|Competenc|Learning|Tutor|Teaching|Training|Curriculum|Market Data/i],
 'Commerce':[/Store|Product|Book|Order|Commerce|Subscription|Payment|Checkout|Stripe|Sparks|Fulfillment|Founding|Founder|Catalog|Print|Refund|Sales|Expense|Billing|Lemon/i],
 'Community':[/Commons|Forum|Moderation|Design Council|Poll|Voting|^Reports|Member Reports|Community Health|Notices/i],
 'Website Management':[/Site Setting|Website|Pages|Branding|Design|Themes|Navigation|Announcement|Marketing|Advertising|Social|Feature|Forms|Grant Web Solutions|Client Website|Visibility/i],
 'Support & Operations':[/Support|Ticket|Notification|Operation|Health|Integration|Scheduled|System|Deploy|Logs|QA|Readiness|Automation|Inventory|Recovery|Delivery/i],
 'Security & Governance':[/Audit|Activity Log|Security|Privacy|Legal|Compliance|Access Review|Governance|Bot Protection|Password/i]
};
// Stable underlying identifiers, not labels, control the approved taxonomy.
// A renamed link never changes its route, controller, permission, or registry key.
const canonical=[
 [/^builtin:panel-dashboard$/i,'Today','Overview'],
 [/^builtin:id-cc-find-control$/i,'Find a Tool','Overview'],
 [/^builtin:id-cc-payments-shortcut$/i,'Payments (Stripe)','Commerce'],
 [/^builtin:id-admin-account-management-direct$/i,'Members','Members & Access'],
 [/^builtin:id-admin-create-account-direct$/i,'Add a Member','Members & Access'],
 [/^builtin:panel-users$/i,'Member Support','Members & Access'],
 [/^builtin:panel-roles$/i,'Staff & Permissions','Members & Access'],
 [/^builtin:panel-products$/i,'Products & Prices','Commerce'],
 [/^builtin:panel-commerce$/i,'Orders & Subscriptions','Commerce'],
 [/^builtin:panel-content$/i,'Tutor Content & Feedback','Learning Administration'],
 [/^builtin:panel-community$/i,'Moderation','Community'],
 [/^builtin:panel-sparks$/i,'Sparks Packages','Commerce'],
 [/^builtin:panel-settings$/i,'Site Settings','Website Management'],
 [/^builtin:panel-audit$/i,'Activity Log','Security & Governance'],
 [/^builtin:panel-system$/i,'Integrations Status','Support & Operations'],
 [/admin-book-receipts/i,'Book Receipt Claims','Commerce'],
 [/training-editor/i,'Question Bank','Learning Administration'],
 [/admin-founders/i,'Founders Commons','Community'],
 [/admin-advertising/i,'Advertising Sales','Website Management'],
 [/gws-projects/i,'Client Website Drafts (Grant Web Solutions)','Website Management'],
 [/^builtin:id-cc-direct-reports$/i,'Community Reports','Community'],
 [/^builtin:id-cc-direct-moderation$/i,'Moderation Queue','Community'],
 [/^builtin:id-cc-control-manager$/i,'Manage Admin Controls','Security & Governance']
];

// Legacy installed modules retain their original controller keys and click handlers.
// These presentation aliases cover the exact labels documented in the Owner guide.
const legacyNames=new Map([
 ['control center directory',['Find a Tool','Overview']],
 ['membership test accounts',['Test Accounts','Members & Access']],
 ['create showcase account',['Showcase Demo Logins','Members & Access']],
 ['synthetic showcase account',['Showcase Demo Logins','Members & Access']],
 ['lab registry management',['Lab Library','Learning Administration']],
 ['read-only member lab preview',['Lab Preview','Learning Administration']],
 ['instructor · question bank',['Question Bank','Learning Administration']],
 ['competency registry',['Competencies & Rubrics','Learning Administration']],
 ['assessment rubric registry',['Competencies & Rubrics','Learning Administration']],
 ['operations & learning administration',['Boot Camp & Academy','Learning Administration']],
 ['market data',['Market Data Sources','Learning Administration']],
 ['market data sources',['Market Data Sources','Learning Administration']],
 ['membership plans',['Products & Prices','Commerce']],
 ['membership prices',['Products & Prices','Commerce']],
 ['books & editions',['Products & Prices','Commerce']],
 ['individual learning tools',['Products & Prices','Commerce']],
 ['memberships & tools',['Products & Prices','Commerce']],
 ['à-la-carte tools',['Products & Prices','Commerce']],
 ['founding plans',['Founding 600 Offers','Commerce']],
 ['founding 600 offers',['Founding 600 Offers','Commerce']],
 ['recent orders',['Orders & Subscriptions','Commerce']],
 ['subscriptions',['Orders & Subscriptions','Commerce']],
 ['owner sales',['Sales & Expenses','Commerce']],
 ['expenses & order verification',['Sales & Expenses','Commerce']],
 ['payment & billing center',['Payments (Stripe)','Commerce']],
 ['payments & billing center',['Payments (Stripe)','Commerce']],
 ['payments & billing',['Payments (Stripe)','Commerce']],
 ['stripe shadow',['Stripe Sync Check','Support & Operations']],
 ['stripe catalog',['Stripe Sync Check','Support & Operations']],
 ['book receipt verification',['Book Receipt Claims','Commerce']],
 ['digital books',['Digital Books','Commerce']],
 ['print channels',['Printed & Signed Books','Commerce']],
 ['signed books',['Printed & Signed Books','Commerce']],
 ['staff shipping',['Printed & Signed Books','Commerce']],
 ['sparks pricing',['Sparks Packages','Commerce']],
 ['store categories',['Store Display','Commerce']],
 ['store display & pagination',['Store Display','Commerce']],
 ['store photos',['Store Display','Commerce']],
 ['moderation queue',['Moderation','Community']],
 ['report policy',['Moderation','Community']],
 ['sub-forums',['Forum Sections','Community']],
 ['founders commons · design council',['Founders Commons','Community']],
 ['site announcements',['Announcements','Community']],
 ['announcements',['Announcements','Community']],
 ['member notices',['Member Notices','Community']],
 ['founders commons',['Founders Commons','Community']],
 ['advertising sales',['Advertising Sales','Website Management']],
 ['manage member notifications',['Member Notices','Community']],
 ['community health',['Community Health','Community']],
 ['visibility & inventory',['Show or Hide Features','Website Management']],
 ['feature visibility',['Show or Hide Features','Website Management']],
 ['marketing & social media',['Advertising Sales','Website Management']],
 ['social media planner',['Social Media Planner','Website Management']],
 ['advertising',['Advertising Sales','Website Management']],
 ['social operations',['Social Media Planner','Website Management']],
 ['grant web solutions · client drafts',['Client Website Drafts (Grant Web Solutions)','Website Management']],
 ['site operations center',['Operations Center','Support & Operations']],
 ['operations & intelligence',['Operations Center','Support & Operations']],
 ['operations center',['Operations Center','Support & Operations']],
 ['pre-live acceptance center',['Launch Readiness','Support & Operations']],
 ['system & integrations',['Integrations Status','Support & Operations']],
 ['unified admin preview',['Admin Preview','Support & Operations']],
 ['audit log',['Activity Log','Security & Governance']],
 ['human verification',['Bot Protection','Security & Governance']],
 ['password confirmation',['Password Check for Risky Actions','Security & Governance']],
 ['lemon readiness',['Other Payment Providers','Commerce']],
 ['payment providers',['Other Payment Providers','Commerce']],
 ['billing reconciliation',['Payment Reconciliation','Commerce']],
 ['delivery brief',['Delivery Brief','Support & Operations']]
]);

const synonyms={
 'Today':'Dashboard; Priority checks; Your authority',
 'Members':'Account Management; User Accounts',
 'Add a Member':'Create Account',
 'Member Support':'Account Details & Support',
 'Staff & Permissions':'Roles & Permissions',
 'Products & Prices':'Products; Books & Editions; Individual Learning Tools; Memberships & Tools',
 'Orders & Subscriptions':'Commerce; Recent Orders; Subscriptions',
 'Tutor Content & Feedback':'Content & Tutor; Content & Market Tutor',
 'Moderation':'Market Commons Reports; Market Commons · Reports',
 'Sparks Packages':'Sparks Pricing',
 'Activity Log':'Audit Log',
 'Integrations Status':'System; System & Integrations',
 'Advertising Sales':'Marketing & Social Media; Advertising',
 'Client Website Drafts (Grant Web Solutions)':'Grant Web Solutions · Client Drafts',
 'Question Bank':'Instructor · Question Bank',
 'Founders Commons':'Founders Commons · Design Council',
 'Book Receipt Claims':'Book Receipt Verification'
};
function canon(id,el){const match=canonical.find(([re])=>re.test(id));if(match)return match;const label=String(el?.dataset.ccLegacyLabel||el?.textContent||'').trim().toLowerCase();const alias=legacyNames.get(label);return alias?[null,...alias]:undefined;}
const order=Object.keys(defs);
const legacyGroups=new Set(['People','Learning','Commerce','Community','Platform','Overview','Accounts & Access','Products','Books & Learning','Memberships & Commerce','Community & Support','Website & Grant Web Solutions','Security, Operations & QA']);
const normalizedGroup=(value,el)=>order.includes(value)?value:legacyGroups.has(value)?category(el):value||category(el);
const storage=new Map();let observer=null,pending=false,ready=false,fetching=false,owner=false,openGroup='Overview';
function key(el){if(el.id)return `builtin:id-${el.id}`;for(const attr of ['panel','v11Panel','v13Panel','v132Panel','v135Control','ocTab','v1352Menu','v142Create'])if(el.dataset[attr])return `builtin:${attr}-${el.dataset[attr]}`;if(el.tagName==='A'){const href=el.getAttribute('href')||'';const encoded=href.toLowerCase().replace(/[^a-z0-9._:-]/g,'-').slice(0,80);return `builtin:link-${encoded}`;}return `builtin:label-${(el.textContent||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'-').slice(0,80)}`;}
function category(el){const match=canon(controlId(el),el);if(match)return match[2];
 const s=(el.textContent||'').trim();for(const [group,regex] of Object.entries(defs))if(regex.some(r=>r.test(s)))return group;
 // Preserve every unclassified installed control and flag it for Owner review.
 return 'Support & Operations';
}
function builtins(){return $$('button,a',nav()).filter(x=>x.id!=='cc-control-manager'&&!x.hasAttribute('data-cc-group-toggle')&&!x.classList.contains('cc-admin-custom-link'));}
// Modules installed before the canonical navigation manager may track their own
// wrapper by ID. Removing their wrapper makes them re-mount and duplicate buttons.
// Keep their actual wrapper in a visually inert holding area, with the actions
// moved into the canonical visible groups. No handler is cloned or recreated.
function preserveModuleMounts(n){
 let host=$('#cc-preserved-module-roots',n);
 if(!host){host=document.createElement('div');host.id='cc-preserved-module-roots';host.className='cc-preserved-module-roots';host.setAttribute('aria-hidden','true');}
 const legacy=$$('.v13-admin-group',n).filter(el=>!el.classList.contains('cc-admin-group'));
 for(const el of legacy){
   if(el===host||host.contains(el))continue;
   // The original module group remains connected so original modules recognize
   // their initialized state and never inject a duplicate menu.
   host.append(el);
 }
 return host;
}
// Stable actions are identified by their module key; repeated injections must
// never become extra rows. Remove only redundant *action nodes* (not module
// wrappers). Keep the first live action and its original click handler.
function uniqueActions(elements){
 const seen=new Set(),unique=[];
 for(const el of elements){
   const id=controlId(el);
   if(seen.has(id)){
     el.remove();
     continue;
   }
   seen.add(id);unique.push(el);
 }
 return unique;
}
function controlId(el){const v=el.dataset.ccControlKey||key(el);el.dataset.ccControlKey=v;return v;}
function isAuthorized(el){return !el.hidden&&!el.disabled&&!el.closest('[hidden]');}
function status(m){let s=$('#cc-admin-navigation-status');if(!s){s=document.createElement('p');s.id='cc-admin-navigation-status';s.setAttribute('role','status');s.setAttribute('aria-live','polite');nav().after(s)}s.textContent=m||'';}
function special(){const n=nav();function button(id,label,cb,show){let b=$('#'+id,n);if(!b){b=document.createElement('button');b.type='button';b.id=id;b.className='cc-admin-shortcut';b.textContent=label;b.onclick=()=>{if(!cb())status('This workflow is unavailable or not authorized.');};n.append(b)}b.hidden=!show();return b;}
const click=(sel)=>{const el=$(sel,n);if(!el||!isAuthorized(el))return false;el.click();return true;};
button('cc-direct-reports','Community Reports',()=>click('[data-panel="community"]'),()=>isAuthorized($('[data-panel="community"]',n)));
button('cc-direct-moderation','Moderation Queue',()=>{if(typeof window.GroundUpAdminWorkflows?.openModeration!=='function')return false;window.GroundUpAdminWorkflows.openModeration();return true;},()=>{try{return !!window.GroundUpAdminCan?.('forum.moderate')&&!!window.GroundUpAdminWorkflows?.openModeration}catch{return false}});
button('cc-find-control','Find a Tool',()=>{ensureTopbar();const field=$('#gu33-global-input');if(!field)return false;field.focus();return true;},()=>true);
button('cc-payments-shortcut','Payments (Stripe)',()=>{const target=$('[data-panel="commerce"]',n);if(!isAuthorized(target))return false;target.click();let count=0;const timer=setInterval(()=>{const hub=$('[data-gu33-payment-hub]');if(hub){clearInterval(timer);hub.scrollIntoView({block:'start',behavior:'smooth'});}else if(++count>20)clearInterval(timer);},150);return true;},()=>isAuthorized($('[data-panel="commerce"]',n)));
}
function displayControls(){const n=nav();if(!n)return;observer?.disconnect();special();
for(const link of $$('.cc-admin-custom-link',n))link.remove();
for(const entry of storage.values())if(entry.kind==='custom_link'&&!entry.archived){const a=document.createElement('a');a.className='admin-back cc-admin-custom-link';a.href=entry.href;a.textContent=entry.label;a.dataset.ccControlKey=entry.control_key;a.dataset.ccOriginalAllowed='1';n.append(a)}
const all=uniqueActions(builtins().concat($$('.cc-admin-custom-link',n)));
const groups=new Map();for(const el of all){const id=controlId(el);const setting=storage.get(id);
 if(!el.hasAttribute('data-cc-original-allowed'))el.dataset.ccOriginalAllowed=String(isAuthorized(el));
 const shown=!(setting&&(setting.is_visible===false||setting.archived));
 // Presentation toggle is an additional restriction. It NEVER unhides an authorization-disabled control.
 el.classList.toggle('cc-owner-hidden',!shown);
 const rule=canon(id,el);
 if(!el.dataset.ccLegacyLabel)el.dataset.ccLegacyLabel=(el.textContent||'').trim();
 const approved=rule?.[1];
 // Explicit Owner edits remain authoritative, but a stock legacy label is updated.
 const historicLabels=[el.dataset.ccLegacyLabel,...(synonyms[approved]||'').split(';').map(x=>x.trim())];
 const historicAlias=legacyNames.get(String(setting?.label||'').trim().toLowerCase());
 const customized=Boolean(setting?.label&&!historicLabels.some(x=>x&&x.toLowerCase()===String(setting.label).trim().toLowerCase())&&historicAlias?.[0]!==approved);
 if(customized)el.textContent=setting.label;
 else if(approved)el.textContent=approved;
 el.dataset.ccSearchAliases=[el.dataset.ccLegacyLabel,synonyms[approved]||''].filter(Boolean).join('; ');
 const group=normalizedGroup(setting?.group_name||rule?.[2]||category(el),el);
 if(!groups.has(group))groups.set(group,[]);
 groups.get(group).push({el,n:Number(setting?.sort_order??10000),id,restricted:/owner|developer|preview|qa|sync check|showcase demo|test accounts/i.test(el.textContent)});}
const sorted=order.filter(g=>groups.has(g));
const extras=[...groups.keys()].filter(g=>!order.includes(g));
for(const unexpected of extras){if(!groups.has('Support & Operations'))groups.set('Support & Operations',[]);
 groups.get('Support & Operations').push(...groups.get(unexpected));}
if(extras.length&&!sorted.includes('Support & Operations'))sorted.push('Support & Operations');
sorted.sort((a,b)=>order.indexOf(a)-order.indexOf(b));
const fragment=document.createDocumentFragment();
const pinned=all.filter(el=>el.classList.contains('cc-admin-custom-link'));
if(pinned.length){const block=document.createElement('div');block.className='cc-pinned';const heading=document.createElement('div');heading.className='cc-admin-group-title';heading.textContent='Pinned';block.append(heading);for(const a of pinned)block.append(a);fragment.append(block);}
for(const group of sorted){
 const wrap=document.createElement('div');wrap.className='v13-admin-group cc-admin-group';wrap.dataset.ccNavGroup=group;
 const title=document.createElement('div');title.className='v13-admin-group-title cc-admin-group-title';title.textContent=group;
 title.setAttribute('role','button');title.tabIndex=0;title.setAttribute('aria-expanded',String(group===openGroup));
 const activate=()=>{openGroup=group;for(const node of $$('.cc-admin-group',n)){node.classList.toggle('cc-group-open',node.dataset.ccNavGroup===group);node.querySelector('.cc-admin-group-title')?.setAttribute('aria-expanded',String(node.dataset.ccNavGroup===group));}};
 title.addEventListener('click',activate);title.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
 wrap.append(title);wrap.classList.toggle('cc-group-open',group===openGroup);
 let visible=0,overflow=null,overflowCount=0;
 for(const item of groups.get(group).sort((a,b)=>Number(a.restricted)-Number(b.restricted)||a.n-b.n||a.id.localeCompare(b.id))){
   if(item.el.classList.contains('cc-admin-custom-link'))continue;
   if(item.restricted&&owner&&!item.el.dataset.ccOwnerChip){
     item.el.dataset.ccOwnerChip='1';item.el.setAttribute('title',(item.el.title?item.el.title+' — ':'')+'Owner or developer control');
     item.el.classList.add('cc-restricted-item');
   }
   const useMore=visible>=8||item.restricted&&visible>=3;
   if(useMore){
     if(!overflow){overflow=document.createElement('details');overflow.className='cc-group-more';const summary=document.createElement('summary');summary.textContent='Additional controls';overflow.append(summary);wrap.append(overflow);}
     overflow.append(item.el);overflowCount++;
   }else wrap.append(item.el);
   visible++;
 }
 if(overflow){overflow.querySelector('summary').textContent='More controls ('+overflowCount+')';if(overflow.querySelector('.active'))overflow.open=true;}
 fragment.append(wrap);
}
const manager=$('#cc-control-manager',n);if(manager){const target=$$('.cc-admin-group',fragment).find(x=>x.dataset.ccNavGroup==='Security & Governance');
 if(target)target.append(manager);else fragment.append(manager);}
// Preserve the original module mount sentinels. Earlier versions silently
// dropped them via replaceChildren(), causing modules to install new controls
// indefinitely whenever their own mount watchdogs ran.
fragment.append(preserveModuleMounts(n));
n.replaceChildren(fragment);
 syncPanelHeadings();
 const selected=$('#admin-tabs button.active,#admin-tabs a[aria-current="page"]');
 if(selected?.closest('[data-cc-nav-group]')){const group=selected.closest('[data-cc-nav-group]').dataset.ccNavGroup;if(group!==openGroup){openGroup=group;for(const node of $$('.cc-admin-group',n)){const active=node.dataset.ccNavGroup===group;node.classList.toggle('cc-group-open',active);node.querySelector('.cc-admin-group-title')?.setAttribute('aria-expanded',String(active));}}}
 ensureOverview();ensureTopbar();ensureShowcase();
 observer?.observe(n,{childList:true,subtree:true});}
function plan(){if(pending)return;pending=true;setTimeout(()=>{pending=false;if(!ready||!nav()||!app()||app().hidden||!$('#admin-gate')?.hidden)return;displayControls()},90)}
function navigateTo(selector){
 const el=$(selector,nav());if(!el||!isAuthorized(el)||el.classList.contains('cc-owner-hidden')){status('This control is not installed or is not available to the signed-in role.');return;}
 openGroup=el.closest('[data-cc-nav-group]')?.dataset.ccNavGroup||openGroup;
 if(el.tagName==='A'){location.assign(el.href);return;}el.click();
}
function syncPanelHeadings(){
 const active=$('#admin-tabs button.active[data-panel]'),id=active?.dataset.panel;
 if(!id)return;
 const panel=$('[data-admin-panel="'+id+'"]',app()),heading=panel?.querySelector('.admin-heading h1');
 if(!heading)return;
 const rule=canon(controlId(active),active),label=rule?.[1]||active.textContent.trim();
 if(heading.textContent!==label)heading.textContent=label;
 let breadcrumb=panel.querySelector('.cc-admin-breadcrumb');
 if(!breadcrumb){breadcrumb=document.createElement('p');breadcrumb.className='cc-admin-breadcrumb';panel.querySelector('.admin-heading')?.prepend(breadcrumb);}
 breadcrumb.textContent=(rule?.[2]||category(active))+' / '+label;
}
function ensureOverview(){
 const panel=$('[data-admin-panel="dashboard"]',app());if(!panel||$('#cc-overview-shortcuts'))return;
 const items=[['Find or help a member','#admin-account-management-direct'],['Add a member','#admin-create-account-direct'],['Change a price','[data-panel="products"]'],['Check an order or refund','[data-panel="commerce"]'],['Review a reported post','#cc-direct-moderation'],['Post an announcement','[data-oc-tab="notifications"]'],['Change registration or background','[data-panel="settings"]'],['Turn a feature on or off','[data-panel="settings"]'],['See who changed something','[data-panel="audit"]'],['Show the admin to a developer','[data-cc-showcase-logins]']];
 const section=document.createElement('section');section.id='cc-overview-shortcuts';section.className='admin-card cc-overview-shortcuts';const title=document.createElement('h2');title.textContent='I want to…';section.append(title);
 const grid=document.createElement('div');grid.className='cc-shortcuts-grid';
 for(const [name,target] of items){const b=document.createElement('button');b.type='button';b.className='btn secondary';b.textContent=name;b.addEventListener('click',()=>navigateTo(target));grid.append(b)}section.append(grid);panel.append(section);
}
function adminContext(){return typeof ADMIN!=='undefined'?ADMIN.ctx:window.ADMIN?.ctx;}
function ensureTopbar(){
 const main=$('.admin-main');if(!main)return;let bar=$('#cc-admin-topbar');
 if(!bar){bar=document.createElement('div');bar.id='cc-admin-topbar';bar.className='cc-admin-topbar';bar.innerHTML='<div class="cc-topbar-search"></div><div class="cc-topbar-status"><span id="cc-env-status">Pre-live</span><span id="cc-role-status">STAFF</span><a href="/index.html">Return to site</a></div>';main.insertBefore(bar,main.firstChild);}
 const search=$('.gu33-global-search',main);if(search&&!bar.contains(search))$('.cc-topbar-search',bar).append(search);
 const roles=adminContext()?.roles||[];$('#cc-role-status',bar).textContent=roles.includes('SHOWCASE_VIEWER')?'SHOWCASE':roles.includes('OWNER')?'OWNER':'STAFF';
}
function ensureShowcase(){
 const showcase=(adminContext()?.roles||[]).includes('SHOWCASE_VIEWER');
 document.body.classList.toggle('cc-showcase',showcase);if(!showcase)return;
 let banner=$('#cc-showcase-banner');if(!banner){banner=document.createElement('p');banner.id='cc-showcase-banner';banner.setAttribute('role','status');banner.textContent='DEMO: fictional data, read-only. Nothing here changes the real site.';$('.admin-main')?.prepend(banner);}
 for(const group of $$('.cc-admin-group',nav()))if(['Support & Operations','Security & Governance'].includes(group.dataset.ccNavGroup))group.hidden=true;
 // UI safeguards supplement, but never replace, server-side HTTP 403 mutation denial.
 const protect=()=>{
  for(const el of $$('.admin-panel input,.admin-panel select,.admin-panel textarea,.admin-panel button',app())){
   if(el.dataset.ccShowcaseNavigation)continue;
   const name=(el.textContent||'').trim();
   const safeSearch=el.matches('input[type="search"]');
   const safeRead=el.tagName==='BUTTON'&&(el.hasAttribute('data-refresh')||/^(refresh|view|preview|search|find|next|previous|filter|reload|back|expand|collapse|show details|open details)\b/i.test(name))&&!/checkout|purchase|payment|activate|grant|refund/i.test(name);
   if(safeSearch||safeRead)continue;
   el.disabled=true;el.title='Disabled in Showcase';
  }
 };
 protect();
 if(!window.__ccShowcaseContentObserver){
  const guard=new MutationObserver(protect);guard.observe(app(),{childList:true,subtree:true});
  window.__ccShowcaseContentObserver=guard;
 }
}
async function token(){const sb=await window.getSupabaseClient?.();return (await sb?.auth?.getSession?.())?.data?.session?.access_token||'';}
async function registry(action='GET',data){const access=await token();if(!access)throw Error('Owner session required.');const r=await fetch('/api/admin-control-registry',{method:action,cache:'no-store',headers:{authorization:'Bearer '+access,'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||`HTTP ${r.status}`);return j;}
function panel(){let p=$('#cc-control-manager-panel');if(!p){p=document.createElement('section');p.id='cc-control-manager-panel';p.className='admin-panel';p.innerHTML='<div class="admin-heading"><div><div class="eyebrow">OWNER · Administrative Architecture</div><h1>Manage Admin Controls</h1><p>Add internal navigation links, rename, hide/show, group, and reorder installed controls. This manages navigation only; backend modules and permissions remain authoritative.</p></div></div><div id="cc-control-manager-content"></div>';app().append(p)}return p;}
function managerButton(){if(!owner)return;let b=$('#cc-control-manager',nav());if(!b){b=document.createElement('button');b.type='button';b.id='cc-control-manager';b.textContent='Manage Admin Controls';b.className='cc-admin-shortcut';b.addEventListener('click',openManager);nav().append(b)}panel();}
function items(){const built=uniqueActions(builtins()).filter(el=>el.id!=='cc-direct-moderation'||!el.hidden).map(el=>({control_key:controlId(el),kind:'builtin',label:storage.get(controlId(el))?.label||el.textContent.trim(),group_name:storage.get(controlId(el))?.group_name||canon(controlId(el),el)?.[2]||category(el),sort_order:storage.get(controlId(el))?.sort_order??10000,is_visible:storage.get(controlId(el))?.is_visible!==false,auth_blocked:!isAuthorized(el)}));const custom=[...storage.values()].filter(x=>x.kind==='custom_link'&&!x.archived);return [...new Map([...built,...custom].map(x=>[x.control_key,x])).values()].sort((a,b)=>a.group_name.localeCompare(b.group_name)||a.sort_order-b.sort_order||a.label.localeCompare(b.label));}
function selectGroups(current){const groups=[...new Set([...order,...storage.values().map(x=>x.group_name),current])];return groups.map(s=>`<option value="${esc(s)}" ${s===current?'selected':''}>${esc(s)}</option>`).join('')}
function renderManager(){const root=$('#cc-control-manager-content');if(!root)return;const rows=items();root.innerHTML=`<div class="cc-admin-editor-top"><label>Filter controls<input type="search" id="cc-control-filter" aria-label="Filter installed admin controls" placeholder="Search all installed controls"></label><button type="button" class="btn secondary" id="cc-control-reload">Reload saved settings</button></div><p class="cc-control-info">${rows.length} registered controls. Hiding a control does not disable its API. Adding a link does not create the destination page, API, database table, or permission. The Dashboard and this manager remain accessible.</p><div id="cc-control-list">${rows.map(x=>`<form class="cc-control-row" data-key="${esc(x.control_key)}" data-kind="${esc(x.kind)}"><div><strong>${esc(x.control_key)}</strong><small>${x.auth_blocked?'Permission restricted · ':''}${x.kind==='custom_link'?'Custom internal link':'Installed control'}</small></div><label>Label<input name="label" maxlength="100" value="${esc(x.label)}" required></label><label>Category<select name="group">${selectGroups(x.group_name)}</select></label><label>New category<input name="customGroup" maxlength="80" placeholder="Optional new group"></label><label>Order<input name="order" type="number" min="0" max="99999" value="${Number(x.sort_order)}" required></label><label class="cc-admin-visible">Show<input type="checkbox" name="visible" ${x.is_visible?'checked':''} ${x.control_key==='builtin:panel-dashboard'?'disabled':''}></label><button class="btn secondary" type="submit">Save</button>${x.kind==='custom_link'?'<button class="btn secondary" type="button" data-remove>Remove</button>':''}<p data-row-status role="status"></p></form>`).join('')}</div><form id="cc-control-add" class="admin-card cc-control-add"><h2>Add a Custom Admin Link</h2><p>Add a shortcut to an existing internal page. It does not create a new module or bypass permissions.</p><label>Label<input name="label" maxlength="100" required></label><label>Internal URL<input name="href" placeholder="/training-editor.html" pattern="/[A-Za-z0-9/_?&=.%#-]+" required></label><label>Category<select name="group">${selectGroups('Website & Grant Web Solutions')}</select></label><label>New category<input name="customGroup" maxlength="80" placeholder="Optional new group"></label><label>Order<input name="order" type="number" min="0" max="99999" value="10000" required></label><button class="btn" type="submit">Add Link</button><p data-add-status role="status"></p></form>`;
$('#cc-control-filter').oninput=e=>{$$('.cc-control-row',root).forEach(row=>{row.hidden=!row.textContent.toLowerCase().includes(e.target.value.toLowerCase())})};$('#cc-control-reload').onclick=refresh;
$$('.cc-control-row',root).forEach(row=>{row.onsubmit=async e=>{e.preventDefault();const f=new FormData(row),id=row.dataset.key;const isProtected=id==='builtin:panel-dashboard';const payload={controlKey:id,kind:row.dataset.kind,label:f.get('label'),group:String(f.get('customGroup')||'').trim()||f.get('group'),order:Number(f.get('order')),visible:isProtected?true:f.has('visible'),href:storage.get(id)?.href||''};await save(row,payload)};const remove=$('[data-remove]',row);if(remove)remove.onclick=async()=>{if(!confirm('Remove this custom navigation link? This does not delete the target page.'))return;const record=storage.get(row.dataset.key);await save(row,{controlKey:record.control_key,kind:'custom_link',label:record.label,group:record.group_name,order:record.sort_order,visible:false,href:record.href,remove:true})}});
$('#cc-control-add').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);const uri=String(f.get('href')).trim();if(!/^\/[a-z0-9/_?&=.%#-]+$/i.test(uri)||uri.startsWith('//')||/^\/api\//i.test(uri)){ $('[data-add-status]',form).textContent='Only safe internal page paths are allowed.';return}const key='custom:'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);await save(form,{controlKey:key,kind:'custom_link',label:f.get('label'),href:uri,group:String(f.get('customGroup')||'').trim()||f.get('group'),order:Number(f.get('order')),visible:true})};}
async function save(row,data){const status=$('[data-row-status],[data-add-status]',row),buttons=$$('button',row);buttons.forEach(x=>x.disabled=true);try{await registry('POST',data);status.textContent='Saved and audited.';await refresh();}catch(e){status.textContent=e.message}finally{buttons.forEach(x=>x.disabled=false)}}
async function refresh(){try{const j=await registry();storage.clear();for(const v of j.items||[])storage.set(v.control_key,v);plan();if($('#cc-control-manager-panel')?.classList.contains('active'))renderManager();status('Admin navigation settings loaded.')}catch(e){status(e.message)}}
function openManager(){const p=panel();$$('.admin-panel',app()).forEach(el=>el.classList.remove('active'));$$('#admin-tabs button').forEach(el=>el.classList.remove('active'));p.classList.add('active');$('#cc-control-manager')?.classList.add('active');history.replaceState(null,'','#admin-controls');renderManager()}
function setupCollapse(){
 const sidebar=$('.admin-sidebar');if(!sidebar||$('#cc-admin-nav-toggle'))return;
 const block=$('.admin-brand-block',sidebar)||sidebar;
 const control=document.createElement('button');control.type='button';control.id='cc-admin-nav-toggle';
 control.className='cc-admin-nav-toggle';control.setAttribute('aria-controls','admin-tabs');
 const apply=collapsed=>{
  sidebar.classList.toggle('cc-nav-collapsed',collapsed);
  sidebar.closest('.admin-shell')?.classList.toggle('cc-shell-collapsed',collapsed);
  control.setAttribute('aria-expanded',String(!collapsed));
  control.textContent=collapsed?'Open navigation':'Collapse navigation';
  if(collapsed&&nav()?.contains(document.activeElement))control.focus();
 };
 control.addEventListener('click',()=>apply(!sidebar.classList.contains('cc-nav-collapsed')));
 block.append(control);
 apply(typeof window.matchMedia==='function'&&window.matchMedia('(max-width: 900px)').matches);
}
async function init(){if(ready)return;ready=true;setupCollapse();
 nav()?.addEventListener('click',e=>{const target=e.target.closest('button,a');if(!target)return;const group=target.closest('.cc-admin-group');if(group){openGroup=group.dataset.ccNavGroup;target.closest('details.cc-group-more')?.setAttribute('open','');}setTimeout(syncPanelHeadings,0);},true);
 [500,1500,3000].forEach(ms=>setTimeout(ensureTopbar,ms));
 observer=new MutationObserver(plan);observer.observe(nav(),{childList:true,subtree:true});plan();let data;try{data=await registry();owner=true;for(const item of data.items||[])storage.set(item.control_key,item);managerButton();plan();if(location.hash==='#admin-controls')openManager();}catch(e){/* Admin non-owner sees only permitted installed controls. New registry absent -> keep site working. */if(!/403|authority|session/i.test(e.message))status('Navigation settings unavailable: '+e.message)}setTimeout(plan,1200);setTimeout(plan,3600)}
function wait(){if(nav()&&app()&&!app().hidden&&$('#admin-gate')?.hidden)init();else setTimeout(wait,150)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
window.GroundUpAdminNavigation=Object.freeze({openReports:()=>{const x=$('[data-panel="community"]',nav());if(x&&!x.hidden){x.click();return true}return false},openAccounts:()=>{const x=$('[data-v1352-menu]',nav())||$('[data-panel="users"]',nav());if(x&&!x.hidden){x.click();return true}return false},manage:openManager});
})();
