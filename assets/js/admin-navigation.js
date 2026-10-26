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
const defs={
 'Overview':[/^Dashboard$/i,/Control Center Directory|Site Academy/i],
 'People':[/Account|Roles|Member Activity/i],
 'Learning':[/Books|Lab|Learning|Competency|Instructor|Question Bank|Market Data|Tutor|Feature Inventory|^Products$/i],
 'Commerce':[/Commerce|Membership|Checkout|Payment|Advertising|Marketing|Subscription|Orders/i],
 'Community':[/Market Commons|Founders Commons|Reports|Moderation|Support|Announcements|Notifications|Communications/i],
 'Platform':[/Grant Web|Client Draft|Site Operations|Website|Pages|Branding|Forms|Navigation|Site Settings|Inventory|Legal|Audit|System|Security|QA|Archive|Recovery|Feature Control|Automation|Readiness/i]
};
const normalizedGroup=value=>Object.keys(defs).includes(value)?value:({'Accounts & Access':'People','Products':'Learning','Books & Learning':'Learning','Memberships & Commerce':'Commerce','Community & Support':'Community','Website & Grant Web Solutions':'Platform','Security, Operations & QA':'Platform'})[value]||'Platform';
const order=Object.keys(defs);
const storage=new Map();let observer=null,pending=false,ready=false,fetching=false,owner=false;
function key(el){if(el.id)return `builtin:id-${el.id}`;for(const attr of ['panel','v11Panel','v13Panel','v132Panel','v135Control','ocTab','v1352Menu','v142Create'])if(el.dataset[attr])return `builtin:${attr}-${el.dataset[attr]}`;if(el.tagName==='A'){const href=el.getAttribute('href')||'';const encoded=href.toLowerCase().replace(/[^a-z0-9._:-]/g,'-').slice(0,80);return `builtin:link-${encoded}`;}return `builtin:label-${(el.textContent||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'-').slice(0,80)}`;}
function category(el){const s=(el.textContent||'').trim();for(const [group,regex] of Object.entries(defs))if(regex.some(r=>r.test(s)))return group;return 'Platform';}
function builtins(){return $$('button,a',nav()).filter(x=>x.id!=='cc-control-manager'&&!x.classList.contains('cc-admin-custom-link'));}
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
button('cc-direct-reports','Reports — All Member Reports',()=>click('[data-panel="community"]'),()=>isAuthorized($('[data-panel="community"]',n)));
button('cc-direct-moderation','Market Commons — Moderation Queue',()=>{if(typeof window.GroundUpAdminWorkflows?.openModeration!=='function')return false;window.GroundUpAdminWorkflows.openModeration();return true;},()=>{try{return !!window.GroundUpAdminCan?.('forum.moderate')&&!!window.GroundUpAdminWorkflows?.openModeration}catch{return false}});
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
 if(setting?.label)el.textContent=setting.label;
 const group=normalizedGroup(setting?.group_name||category(el));if(!groups.has(group))groups.set(group,[]);groups.get(group).push({el,n:Number(setting?.sort_order??10000),id});}
let seq=0;const sorted=[...groups.keys()].sort((a,b)=>{const ia=order.indexOf(a),ib=order.indexOf(b);return (ia<0?999:ia)-(ib<0?999:ib)||a.localeCompare(b)});
const fragment=document.createDocumentFragment();for(const group of sorted){const wrap=document.createElement('div');wrap.className='v13-admin-group cc-admin-group';wrap.dataset.ccNavGroup=group;const title=document.createElement('div');title.className='v13-admin-group-title cc-admin-group-title';title.textContent=group;wrap.append(title);
for(const item of groups.get(group).sort((a,b)=>a.n-b.n||a.id.localeCompare(b.id)))wrap.append(item.el);fragment.append(wrap);seq++}
const manager=$('#cc-control-manager',n);if(manager){const first=fragment.firstElementChild;const wrap=first&&first.dataset.ccNavGroup==='Overview'?first:null;if(wrap)wrap.append(manager);else fragment.prepend(manager)}
// Preserve the original module mount sentinels. Earlier versions silently
// dropped them via replaceChildren(), causing modules to install new controls
// indefinitely whenever their own mount watchdogs ran.
fragment.append(preserveModuleMounts(n));
n.replaceChildren(fragment);observer?.observe(n,{childList:true,subtree:true});}
function plan(){if(pending)return;pending=true;setTimeout(()=>{pending=false;if(!ready||!nav()||!app()||app().hidden||!$('#admin-gate')?.hidden)return;displayControls()},90)}
async function token(){const sb=await window.getSupabaseClient?.();return (await sb?.auth?.getSession?.())?.data?.session?.access_token||'';}
async function registry(action='GET',data){const access=await token();if(!access)throw Error('Owner session required.');const r=await fetch('/api/admin-control-registry',{method:action,cache:'no-store',headers:{authorization:'Bearer '+access,'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||`HTTP ${r.status}`);return j;}
function panel(){let p=$('#cc-control-manager-panel');if(!p){p=document.createElement('section');p.id='cc-control-manager-panel';p.className='admin-panel';p.innerHTML='<div class="admin-heading"><div><div class="eyebrow">OWNER · Administrative Architecture</div><h1>Manage Admin Controls</h1><p>Add internal navigation links, rename, hide/show, group, and reorder installed controls. This manages navigation only; backend modules and permissions remain authoritative.</p></div></div><div id="cc-control-manager-content"></div>';app().append(p)}return p;}
function managerButton(){if(!owner)return;let b=$('#cc-control-manager',nav());if(!b){b=document.createElement('button');b.type='button';b.id='cc-control-manager';b.textContent='Manage Admin Controls';b.className='cc-admin-shortcut';b.addEventListener('click',openManager);nav().append(b)}panel();}
function items(){const built=uniqueActions(builtins()).filter(el=>el.id!=='cc-direct-moderation'||!el.hidden).map(el=>({control_key:controlId(el),kind:'builtin',label:storage.get(controlId(el))?.label||el.textContent.trim(),group_name:storage.get(controlId(el))?.group_name||category(el),sort_order:storage.get(controlId(el))?.sort_order??10000,is_visible:storage.get(controlId(el))?.is_visible!==false,auth_blocked:!isAuthorized(el)}));const custom=[...storage.values()].filter(x=>x.kind==='custom_link'&&!x.archived);return [...new Map([...built,...custom].map(x=>[x.control_key,x])).values()].sort((a,b)=>a.group_name.localeCompare(b.group_name)||a.sort_order-b.sort_order||a.label.localeCompare(b.label));}
function selectGroups(current){const groups=[...new Set([...order,'Additional Installed Controls',...storage.values().map(x=>x.group_name),current])];return groups.map(s=>`<option value="${esc(s)}" ${s===current?'selected':''}>${esc(s)}</option>`).join('')}
function renderManager(){const root=$('#cc-control-manager-content');if(!root)return;const rows=items();root.innerHTML=`<div class="cc-admin-editor-top"><label>Filter controls<input type="search" id="cc-control-filter" aria-label="Filter installed admin controls" placeholder="Search all installed controls"></label><button type="button" class="btn secondary" id="cc-control-reload">Reload saved settings</button></div><p class="cc-control-info">${rows.length} registered controls. Hiding a control does not disable its API. Adding a link does not create the destination page, API, database table, or permission. The Dashboard and this manager remain accessible.</p><div id="cc-control-list">${rows.map(x=>`<form class="cc-control-row" data-key="${esc(x.control_key)}" data-kind="${esc(x.kind)}"><div><strong>${esc(x.control_key)}</strong><small>${x.auth_blocked?'Permission restricted · ':''}${x.kind==='custom_link'?'Custom internal link':'Installed control'}</small></div><label>Label<input name="label" maxlength="100" value="${esc(x.label)}" required></label><label>Category<select name="group">${selectGroups(x.group_name)}</select></label><label>New category<input name="customGroup" maxlength="80" placeholder="Optional new group"></label><label>Order<input name="order" type="number" min="0" max="99999" value="${Number(x.sort_order)}" required></label><label class="cc-admin-visible">Show<input type="checkbox" name="visible" ${x.is_visible?'checked':''} ${x.control_key==='builtin:panel-dashboard'?'disabled':''}></label><button class="btn secondary" type="submit">Save</button>${x.kind==='custom_link'?'<button class="btn secondary" type="button" data-remove>Remove</button>':''}<p data-row-status role="status"></p></form>`).join('')}</div><form id="cc-control-add" class="admin-card cc-control-add"><h2>Add a Custom Admin Link</h2><p>Add a shortcut to an existing internal page. It does not create a new module or bypass permissions.</p><label>Label<input name="label" maxlength="100" required></label><label>Internal URL<input name="href" placeholder="/training-editor.html" pattern="/[A-Za-z0-9/_?&=.%#-]+" required></label><label>Category<select name="group">${selectGroups('Website & Grant Web Solutions')}</select></label><label>New category<input name="customGroup" maxlength="80" placeholder="Optional new group"></label><label>Order<input name="order" type="number" min="0" max="99999" value="10000" required></label><button class="btn" type="submit">Add Link</button><p data-add-status role="status"></p></form>`;
$('#cc-control-filter').oninput=e=>{$$('.cc-control-row',root).forEach(row=>{row.hidden=!row.textContent.toLowerCase().includes(e.target.value.toLowerCase())})};$('#cc-control-reload').onclick=refresh;
$$('.cc-control-row',root).forEach(row=>{row.onsubmit=async e=>{e.preventDefault();const f=new FormData(row),id=row.dataset.key;const isProtected=id==='builtin:panel-dashboard';const payload={controlKey:id,kind:row.dataset.kind,label:f.get('label'),group:String(f.get('customGroup')||'').trim()||f.get('group'),order:Number(f.get('order')),visible:isProtected?true:f.has('visible'),href:storage.get(id)?.href||''};await save(row,payload)};const remove=$('[data-remove]',row);if(remove)remove.onclick=async()=>{if(!confirm('Remove this custom navigation link? This does not delete the target page.'))return;const record=storage.get(row.dataset.key);await save(row,{controlKey:record.control_key,kind:'custom_link',label:record.label,group:record.group_name,order:record.sort_order,visible:false,href:record.href,remove:true})}});
$('#cc-control-add').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);const uri=String(f.get('href')).trim();if(!/^\/[a-z0-9/_?&=.%#-]+$/i.test(uri)||uri.startsWith('//')||/^\/api\//i.test(uri)){ $('[data-add-status]',form).textContent='Only safe internal page paths are allowed.';return}const key='custom:'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);await save(form,{controlKey:key,kind:'custom_link',label:f.get('label'),href:uri,group:String(f.get('customGroup')||'').trim()||f.get('group'),order:Number(f.get('order')),visible:true})};}
async function save(row,data){const status=$('[data-row-status],[data-add-status]',row),buttons=$$('button',row);buttons.forEach(x=>x.disabled=true);try{await registry('POST',data);status.textContent='Saved and audited.';await refresh();}catch(e){status.textContent=e.message}finally{buttons.forEach(x=>x.disabled=false)}}
async function refresh(){try{const j=await registry();storage.clear();for(const v of j.items||[])storage.set(v.control_key,v);plan();if($('#cc-control-manager-panel')?.classList.contains('active'))renderManager();status('Admin navigation settings loaded.')}catch(e){status(e.message)}}
function openManager(){const p=panel();$$('.admin-panel',app()).forEach(el=>el.classList.remove('active'));$$('#admin-tabs button').forEach(el=>el.classList.remove('active'));p.classList.add('active');$('#cc-control-manager')?.classList.add('active');history.replaceState(null,'','#admin-controls');renderManager()}
async function init(){if(ready)return;ready=true;observer=new MutationObserver(plan);observer.observe(nav(),{childList:true,subtree:true});plan();let data;try{data=await registry();owner=true;for(const item of data.items||[])storage.set(item.control_key,item);managerButton();plan();if(location.hash==='#admin-controls')openManager();}catch(e){/* Admin non-owner sees only permitted installed controls. New registry absent -> keep site working. */if(!/403|authority|session/i.test(e.message))status('Navigation settings unavailable: '+e.message)}setTimeout(plan,1200);setTimeout(plan,3600)}
function wait(){if(nav()&&app()&&!app().hidden&&$('#admin-gate')?.hidden)init();else setTimeout(wait,150)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
window.GroundUpAdminNavigation=Object.freeze({openReports:()=>{const x=$('[data-panel="community"]',nav());if(x&&!x.hidden){x.click();return true}return false},openAccounts:()=>{const x=$('[data-v1352-menu]',nav())||$('[data-panel="users"]',nav());if(x&&!x.hidden){x.click();return true}return false},manage:openManager});
})();
