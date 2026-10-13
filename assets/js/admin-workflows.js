/* Canonical Admin workflow directory. Route only to existing authorized controls.
   No data mutations, no role elevation, no pretend unpublished services. */
(()=>{'use strict';
 if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
 const $=(s,root=document)=>root.querySelector(s),$$=(s,root=document)=>[...root.querySelectorAll(s)];
 const sections=[
 {name:'Accounts & Access',icon:'accounts',items:[
  ['Account Management','Create, edit, secure, suspend and review eligible accounts.','menu','account','Operational UI; server authorization required'],
  ['Account Directory','Search account records and review current roles.','legacy','users','Operational'],
  ['Roles & Permissions','Review and assign staff permissions as authorized.','legacy','roles','Operational'],
  ['Accounts & Access Reports','Manual entitlements and access intelligence.','text','Accounts & Access','Partial; database contract review required'],
  ['Security & Audit','Examine staff audit observations.','ops','security','Read-only report'],
 ]},
 {name:'Books, Education & Historical Labs',icon:'learning',items:[
  ['Book Catalog','Manage existing catalog metadata and display fields.','legacy','catalog','Operational UI'],
  ['Sales & Visibility','Set book presentation, formats and discounts.','text','Book Sales & Visibility','Existing UI; verify KDP status'],
  ['Historical Lab Registry','Review Labs in their own book collection; never load all by default.','learning','labs','Collection-scoped'],
  ['Learning Operations','Select book for Lab statistics and reviews.','learning','overview','Collection-scoped'],
  ['Competency Cases','Review skill definitions and unpublished assessment drafts.','learning','cases','Verification required before publication'],
  ['Feature Inventory','Inspect learning features and rollout restrictions.','learning','features','Existing authorized controls'],
  ['Book Editions','Review published/archived book editions.','learning','editions','Read-only inventory'],
  ['QR Campaigns','Inspect book activation campaigns; remain disabled.','learning','campaigns','Activation locked OFF'],
  ['Tutor & Managed Curriculum','Edit existing managed instructional content.','legacy','content','Existing UI; educational provenance required'],
  ['Market Data & Historical Context','Inspect available market-data connections.','text','Market Data','Provider-dependent'],
 ]},
 {name:'Community & Member Support',icon:'community',items:[
  ['Market Commons Moderation Queue','Review reports and manage published/hidden topics.','moderation','queue','Permission: forum.moderate; audit recorded'],
  ['Communications','Announcements and notification delivery observations.','ops','notifications','Read-only operational report'],
  ['Support Queue','Review member requests without exposing private messages in summaries.','ops','support','Read-only operational report'],
  ['Community Activity','View published discussion navigation.','link','/market-commons.html','Live community'],
 ]},
 {name:'Commerce & Business Operations',icon:'commerce',items:[
  ['Commerce & Orders','Inspect orders, catalog and existing payment controls.','legacy','commerce','Checkout locked OFF'],
  ['Memberships & Tools','Review plans and tool registry.','text','Memberships & Tools','Existing UI; provider verification pending'],
  ['Checkout & Payments','Review disabled-by-default rollout settings.','text','Checkout & Payments','Checkout locked OFF'],
  ['Order Reconciliation','Inspect payment events and entitlement ledger.','ops','commerce','Read-only; not financial reconciliation'],
  ['Sponsor & Advertising','Review advertising configuration and inventory.','text','Advertising','Existing UI; contract review pending'],
 ]},
 {name:'Website & Governance',icon:'site',items:[
  ['Website Operations','Installed module statuses and operational overview.','site','overview','Existing operational module'],
  ['Website Pages & SEO','Create and edit text-based public CMS pages.','site','pages','Text CMS, not drag-and-drop designer'],
  ['Branding & Theme','Set staged colors, name, tagline and logo URL.','site','branding','Existing live administrative UI'],
  ['Forms & Leads','Manage public forms and private lead queue.','site','forms','Existing backend-dependent UI'],
  ['Site Navigation','Configure permitted internal site links.','site','navigation','Existing admin UI'],
  ['Site Settings','Review authorized operational feature settings.','legacy','settings','Existing controls'],
  ['Legal & Policies','Open configured governance settings.','text','Legal & Policies','Review publication accuracy'],
  ['Audit Log','Review recorded administrative operations.','legacy','audit','Existing server-authorized view'],
  ['System Status','Inspect integration readiness and configuration.','legacy','system','Current diagnostic UI'],
 ]},
 {name:'Planning & Safeguards',icon:'safety',items:[
  ['Automation Rules','Draft disabled automation rules; execution is not installed.','site','automations','Draft-only; not an automation runtime'],
  ['Readiness & Config Export','Inspect readiness and export nonsecret configuration.','site','readiness','NOT a database backup'],
  ['Private Admin Overview','Review current operations and intelligence.','ops','overview','Read-only report'],
  ['Learning Analytics','Review scoped competency and progress reports.','ops','learning','Collection-scoped'],
 ]}
 ];
 const icons={accounts:'accounts-access',learning:'learning-system',community:'market-community',commerce:'commerce',site:'website-operations',safety:'security'};
 const itemIcon=group=>`/assets/images/admin-illustrations/${icons[group.icon]}.svg`;
 function html(){return `<div class="admin-heading"><div><div class="eyebrow">Private Administration · Workflow Directory</div><h1>Control Center Directory</h1><p>Open the established management workflow directly. Unavailable backend integrations are identified rather than simulated.</p></div></div><label class="cc-directory-filter">Find administrative capability<input type="search" id="cc-directory-search" placeholder="Search accounts, books, community, settings…" autocomplete="off"></label><p id="cc-directory-status" aria-live="polite" role="status"></p><div class="cc-directory-groups">${sections.map(group=>`<section class="cc-directory-group"><header><img src="${itemIcon(group)}" width="54" height="54" alt="" aria-hidden="true"><h2>${group.name}</h2><span>${group.items.length} workflows</span></header><div class="cc-directory-grid">${group.items.map(([label,desc,kind,target,state])=>`<button type="button" class="cc-directory-card" data-kind="${kind}" data-target="${target}"><span class="cc-directory-card-body"><strong>${label}</strong><span>${desc}</span><small>${state}</small></span><span class="cc-directory-arrow" aria-hidden="true">↗</span></button>`).join('')}</div></section>`).join('')}</div><p class="cc-directory-disclosure">This directory opens existing interfaces. It does not authorize new permissions or enable payment checkout, QR activation, mandatory MFA, CAPTCHA, or Showcase entitlement grants. Source availability and verified production behavior are different.</p>`;}
 function sidebar(){const nav=$('#admin-tabs');if(!nav)return null;let b=$('#cc-directory-trigger');if(!b){b=document.createElement('button');b.type='button';b.id='cc-directory-trigger';b.textContent='Control Center Directory';b.setAttribute('aria-controls','cc-directory-panel');{const main=$('[data-panel=dashboard]',nav); if(main)main.after(b);else nav.prepend(b);}}return b}
 function accountLink(){const nav=$('#admin-tabs');if(!nav)return;const matches=$$('[data-v1352-menu]',nav);let b=matches[0];if(!b){b=document.createElement('button');b.type='button';b.dataset.v1352Menu='1';b.textContent='Account Management';const old=nav.querySelector('[data-panel="users"]');old?.after(b);}matches.slice(1).forEach(x=>x.remove());if(!b)return;
  const group=$$('.v13-admin-group',nav).find(g=>/Accounts\s*&\s*Access/i.test(g.querySelector('.v13-admin-group-title')?.textContent||''));
  if(group&&b.parentNode!==group){const roles=group.querySelector('[data-panel="roles"]');if(roles)roles.before(b);else group.append(b);}
  b.hidden=false;b.removeAttribute('aria-hidden');}
 function launch(kind,target){let button;
  if(kind==='legacy')button=$(`#admin-tabs button[data-panel="${target}"]`);
  if(kind==='menu')button=$('#admin-tabs [data-v1352-menu]');
  if(kind==='learning')button=$(`#admin-tabs button[data-v135-control="${target}"]`);
  if(kind==='ops')button=$(`#admin-tabs button[data-oc-tab="${target}"]`);
  if(kind==='text')button=$$('#admin-tabs button').find(x=>x.textContent.trim().toLowerCase()===target.toLowerCase());
  if(kind==='site'&&typeof window.GroundUpSiteOperations?.open==='function'){window.GroundUpSiteOperations.open(target);return true;}
  if(kind==='link'){location.assign(target);return true;}
  if(kind==='moderation'){openModeration();return true;}
  if(button&&!button.disabled&&!button.hidden){button.click();return true;}return false;}
 let modPage=1;
 async function modRequest(action,body){const sb=await window.getSupabaseClient(),ses=(await sb.auth.getSession()).data?.session;if(!ses)throw Error('Sign in again.');const p=new URLSearchParams({action,page:String(modPage)}),r=await fetch('/api/admin-v0133?'+p.toString(),{method:body?'POST':'GET',headers:{authorization:'Bearer '+ses.access_token,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'}),j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||`Moderation API returned ${r.status}`);return j}
 function moderationPanel(){let p=$('#cc-moderation-panel');if(p)return p;const app=$('#admin-app');p=document.createElement('section');p.id='cc-moderation-panel';p.className='admin-panel';p.innerHTML='<div class="admin-heading"><div><div class="eyebrow">Market Commons · Authorized Moderation</div><h1>Moderation Queue</h1><p>Review member reports and manage community discussion visibility. These operations are logged and require an authorized forum.moderate permission.</p></div></div><div data-moderation-status role="status" aria-live="polite"></div><div data-moderation-results></div>';
 app.append(p);p.addEventListener('click',async e=>{const b=e.target.closest('[data-mod-action]');if(!b||b.disabled)return;const s=p.querySelector('[data-moderation-status]'),act=b.dataset.modAction;let action,payload;try{
 if(act==='prev'||act==='next'){modPage=Math.max(1,modPage+(act==='prev'?-1:1));await loadModeration();return}
 if(act==='reload'){await loadModeration();return}
 if(act==='report'){const note=prompt('Optional internal resolution note (500 characters maximum):')||'';if(note.length>500){s.textContent='Resolution note is too long.';return}action='commons_report_resolve';payload={reportId:Number(b.dataset.id),status:b.dataset.status,note}}
 if(act==='topic'){const field=b.dataset.field,value=field==='status'?b.dataset.value:b.dataset.value==='true';if(!confirm('Apply this moderation action? A recorded audit entry will be created.'))return;action='commons_topic_moderate';payload={topicId:Number(b.dataset.id),field,value,expectedUpdatedAt:b.dataset.version}}
 if(!action)return;b.disabled=true;s.textContent='Saving change…';await modRequest(action,payload);s.textContent='Change recorded.';await loadModeration();
 }catch(err){s.textContent=err.message}finally{b.disabled=false}});return p}
 async function loadModeration(){const panel=moderationPanel(),el=panel.querySelector('[data-moderation-results]'),msg=panel.querySelector('[data-moderation-status]');el.textContent='Loading authorized moderation records…';try{const d=await modRequest('commons_mod_queue');const reportRows=(d.reports||[]).map(x=>`<tr><td>${esc(new Date(x.created_at).toLocaleString())}</td><td>${esc(x.content_type)} / ${esc(x.content_id)}</td><td>${esc(x.reason)}${x.details?`<small>${esc(x.details)}</small>`:''}</td><td>${esc(x.status)}</td><td>${x.status==='open'||x.status==='reviewing'?`<button class="btn secondary" data-mod-action="report" data-id="${x.id}" data-status="reviewing">Reviewing</button> <button class="btn secondary" data-mod-action="report" data-id="${x.id}" data-status="resolved">Resolve</button> <button class="btn secondary" data-mod-action="report" data-id="${x.id}" data-status="dismissed">Dismiss</button>`:'Closed'}</td></tr>`).join('');
 const topicRows=(d.recentTopics||[]).map(t=>`<tr><td><a href="/market-commons.html?topic=${t.id}" rel="noopener" target="_blank">${esc(t.title)}</a><small>${esc(t.forum_code)}</small>${t.is_official?'<small>Official guide — OWNER only</small>':''}</td><td>${esc(t.status)}</td><td>${t.is_locked?'Locked':'Open'}</td><td><button class="btn secondary" data-mod-action="topic" data-id="${t.id}" data-field="is_locked" data-value="${!t.is_locked}" data-version="${esc(t.updated_at)}">${t.is_locked?'Unlock':'Lock'}</button> <button class="btn secondary" data-mod-action="topic" data-id="${t.id}" data-field="is_pinned" data-value="${!t.is_pinned}" data-version="${esc(t.updated_at)}">${t.is_pinned?'Unpin':'Pin'}</button> <button class="btn secondary" data-mod-action="topic" data-id="${t.id}" data-field="status" data-value="${t.status==='published'?'hidden':'published'}" data-version="${esc(t.updated_at)}">${t.status==='published'?'Hide':'Restore'}</button></td></tr>`).join('');
 el.innerHTML=`<div class="v1354-inline"><button class="btn secondary" data-mod-action="reload">Refresh</button></div><h2>Reported content (30 per page)</h2><div class="v1354-table-scroll"><table class="v1354-table"><thead><tr><th>Time</th><th>Content</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead><tbody>${reportRows||'<tr><td colspan="5">No reports on this page.</td></tr>'}</tbody></table></div><nav aria-label="Moderation report pages" class="v1357-page-nav"><button data-mod-action="prev" ${modPage===1?'disabled':''}>Previous</button><span>Page ${modPage}</span><button data-mod-action="next" ${d.hasMore?'':'disabled'}>Next</button></nav><h2>Recently updated community discussions (latest 35)</h2><p>Use the forum link to review context before changing a discussion.</p><div class="v1354-table-scroll"><table class="v1354-table"><thead><tr><th>Discussion</th><th>Visibility</th><th>Replies</th><th>Actions</th></tr></thead><tbody>${topicRows||'<tr><td colspan="4">No discussions returned.</td></tr>'}</tbody></table></div>`;
 }catch(e){el.textContent=e.message;msg.textContent='Moderation is unavailable. Check role permission, database contract and Cloudflare Function logs.'}}
 function openModeration(){const panel=moderationPanel(),app=$('#admin-app'),nav=$('#admin-tabs');$$('.admin-panel',app).forEach(el=>el.classList.remove('active'));$$('button',nav).forEach(el=>el.classList.remove('active'));panel.classList.add('active');history.replaceState(null,'','#commons-moderation');modPage=1;loadModeration()}
 function mount(){const app=$('#admin-app'),nav=$('#admin-tabs'),gate=$('#admin-gate');if(!app||app.hidden||gate?.hidden!==true||!nav)return false;accountLink();const button=sidebar();
  let panel=$('#cc-directory-panel');if(!panel){panel=document.createElement('section');panel.id='cc-directory-panel';panel.className='admin-panel';panel.innerHTML=html();app.append(panel);
   panel.addEventListener('click',e=>{const card=e.target.closest('.cc-directory-card');if(!card)return;const state=$('#cc-directory-status');if(!launch(card.dataset.kind,card.dataset.target)){state.textContent='This authorized module is not available in the current deployment. No action was performed.';}});
   panel.querySelector('input').addEventListener('input',e=>{const term=e.target.value.trim().toLowerCase();$$('.cc-directory-group',panel).forEach(group=>{let count=0;$$('.cc-directory-card',group).forEach(card=>{card.hidden=!!term&&!card.textContent.toLowerCase().includes(term);if(!card.hidden)count++;});group.hidden=count===0;});});}
  button.onclick=()=>{ $$('.admin-panel',app).forEach(el=>el.classList.remove('active'));$$('#admin-tabs button').forEach(el=>el.classList.remove('active'));panel.classList.add('active');button.classList.add('active');history.replaceState(null,'','#control-directory');};
  if(location.hash==='#control-directory')button.click();if(location.hash==='#commons-moderation')openModeration();return true;
 }
 let done=false;function boot(){if(done)return;let tries=0;const timer=setInterval(()=>{tries++;if(mount()){done=true;clearInterval(timer);}else if(tries>100)clearInterval(timer)},250)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
