/* v0.13.5 — Owner's unified Control Center, operational management reports.
 * Additive: do not replace the legacy admin tabs, workflows, or synthetic Showcase.
 * Responses are always authorized and filtered by the server-side role policy.
 */
(()=>{'use strict';
 if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
 const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const groups=[
  {code:'overview',title:'Operations Overview',label:'Operations Overview',description:'Account, learning, entitlement and pending-event signals from the live backend.'},
  {code:'commerce',title:'Commerce Reconciliation',label:'Orders & Reconciliation',description:'Checkout intent, webhook, plan and order-ledger monitoring. Payment provider records remain authoritative.'},
  {code:'learning',title:'Learning Analytics',label:'Learning Analytics',description:'Lab progress, graded assessments and historical replay activity. A completed Lab is not proof of mastery.'},
  {code:'support',title:'Support Queue',label:'Support Queue',description:'Live issue priorities and member support workflow status without exposing private message content.'},
  {code:'security',title:'Security & Audit Center',label:'Security & Audit',description:'Staff audit history, flagged accounts and sensitive feature rollout observations.'},
  {code:'notifications',title:'Notifications & Announcements',label:'Notifications & Announcements',description:'Delivery records and current announcements. Existing authorized editors remain authoritative.'}
 ];
 let learningBook='',active='',synthetic=false,requestCounter=0,current=null,setupComplete=false;
 const host=()=>$('#admin-app'),authorized=()=>$('#admin-gate')?.hidden===true&&host()?.hidden===false;
 function flash(message,error=false){let n=$('#v135-ops-center-live');if(!n)return;n.textContent=message||'';n.dataset.error=String(error)}
 async function load(action){const sb=await window.getSupabaseClient();if(!sb)throw Error('Account authentication service unavailable.');const {data,error}=await sb.auth.getSession();if(error||!data?.session)throw Error('Administrator session expired. Sign in again.');
  const r=await fetch('/api/admin-operations-center-v0135?'+new URLSearchParams({action,...(action==='learning'?{bookCode:learningBook}:{})}).toString(),{method:'GET',headers:{authorization:'Bearer '+data.session.access_token},cache:'no-store'});
  const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||`Administration request failed (${r.status}).`);return j;}
 function number(x){return x===null||x===undefined||!Number.isFinite(Number(x))?'Unavailable':Number(x).toLocaleString('en-US')}
 const pill=(s,on)=>`<span class="v135-oc-pill ${on?'good':'muted'}">${esc(s||'Unknown')}</span>`;
 const utc=s=>{const dt=s?new Date(s):null;return dt&&!Number.isNaN(dt.getTime())?dt.toLocaleString():'—'};
 function cards(stats){return `<div class="v135-oc-cards">${(stats||[]).map(x=>`<article class="v135-oc-metric"><small>${esc(x.label)}</small><strong>${esc(number(x.count))}</strong><span>${!x.available?'Database source unavailable':'Recorded '+esc(x.unit||'records')}</span></article>`).join('')}</div>`;}
 function grid(headers,rows){return `<div class="v135-oc-table-wrap"><table class="v135-oc-table"><thead><tr>${headers.map(x=>`<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr><td class="v135-oc-empty" colspan="${headers.length}">No records to display. This does not imply an error.</td></tr>`}</tbody></table></div>`;}
 const mapped=d=>Array.isArray(d?.rows)?d.rows:[];
 const labelMissing=d=>!d?.available?'<p class="v135-oc-warning">This data source is not available. Verify its database prerequisites and staff permissions before relying on its counts.</p>':'';
 const qfield=()=>'<label class="v135-oc-search">Filter displayed records <input type="search" data-oc-filter placeholder="Search this report…" autocomplete="off"></label>';
 function overview(d){return `${cards(d.metrics)}<div class="v135-oc-actions"><button class="btn secondary" data-oc-open="dashboard">Existing Dashboard</button><button class="btn secondary" data-oc-open="audit">Audit Log</button><button class="btn secondary" data-oc-open="system">System Diagnostics</button></div><p class="v135-oc-note">Counts use live database records. These are operational indicators, not independently reconciled revenue or verified payment totals.</p>`}
 function commerce(d){const intents=mapped(d.orders).map(x=>`<tr data-oc-row><td><code>${esc(x.intent_id)}</code></td><td>${esc(x.item_type)} · ${esc(x.item_code)}</td><td>${esc(x.status)}</td><td>${Number.isFinite(Number(x.amount_cents))?(Number(x.amount_cents)/100).toLocaleString(undefined,{style:'currency',currency:x.currency==='USD'?'USD':'USD'}):'—'}</td><td>${esc(utc(x.created_at))}</td></tr>`);
 const wh=mapped(d.webhooks).map(x=>`<tr data-oc-row><td>${esc(x.event_name)}</td><td>${pill(x.status,x.status==='processed')}</td><td>${esc(utc(x.received_at))}</td><td>${esc(utc(x.processed_at))}</td><td>${esc(x.error_message?'Requires investigation':'—')}</td></tr>`);
 const led=mapped(d.grants).map(x=>`<tr data-oc-row><td>${esc(x.product_code)}</td><td>${esc(x.entitlement_kind)}</td><td>${pill(x.status,x.status==='active')}</td><td>${esc(utc(x.created_at))}</td></tr>`);
 const plans=mapped(d.plans).map(x=>`<tr data-oc-row><td>${esc(x.name||x.plan_code)}</td><td>${esc(x.billing_interval||'—')}</td><td>${pill(x.active?'Active':'Inactive',x.active)}</td><td>${pill(x.checkout_enabled?'Configured ON':'Not enabled',!x.checkout_enabled)}</td></tr>`);
 return `${cards(d.counts)}${qfield()}<h3>Recent checkout intents</h3>${labelMissing(d.orders)}${grid(['Intent','Item','State','Listed amount','Created'],intents)}<h3>Payment webhook processing</h3>${labelMissing(d.webhooks)}${grid(['Event','State','Received','Processed','Error summary'],wh)}<h3>Recorded entitlement fulfillment</h3>${labelMissing(d.grants)}${grid(['Item','Entitlement','State','Created'],led)}<h3>Membership plan inventory</h3>${labelMissing(d.plans)}${grid(['Plan','Billing','Active','Checkout flag'],plans)}<div class="v135-oc-actions"><button class="btn secondary" data-oc-open="commerce">Existing Commerce Admin</button><button class="btn secondary" data-oc-open="checkout">Checkout Configuration</button><button class="btn secondary" data-oc-open="platform">Memberships & Tools</button></div>`}
 const LAB_COLLECTIONS=[['FOUNDATION_BOOK_1','Foundations Book I'],['FOUNDATION_BOOK_2','Foundations Book II'],['FOUNDATION_BOOK_3','Foundations Book III'],['DAY_TRADING_BOOK_1','Day Trading'],['READING_THE_TAPE','Reading the Tape'],['SITE_EXCLUSIVE','Site-Exclusive Labs']];
 function learning(d){const skills=mapped(d.definitions).map(x=>`<tr data-oc-row><td><code>${esc(x.competency_code)}</code></td><td>${esc(x.name)}</td><td>${pill(x.active?'Active':'Inactive',x.active)}</td></tr>`);
 const labs=mapped(d.labs).map(x=>`<tr data-oc-row><td><code>${esc(x.lab_id)}</code></td><td>${esc(x.title||'Untitled')}</td><td>${esc(x.book_code||'—')}</td><td>${pill(x.active?'Active':'Inactive',x.active)}</td><td>${pill(x.registry_visible?'Listed':'Hidden',x.registry_visible)}</td></tr>`);
 const grades=mapped(d.attempts).map(x=>`<tr data-oc-row><td>${esc(x.case_code)}</td><td>${x.final_score==null?'Not scored':esc(Number(x.final_score).toFixed(1))+'%'}</td><td>${esc(x.critical_errors??0)}</td><td>${esc(utc(x.submitted_at))}</td></tr>`);
 return `<div class="v1357-collection-picker"><label>Lab collection<select data-v1357-intel-book><option value="">Choose a collection for Lab records…</option>${LAB_COLLECTIONS.map(([id,label])=>`<option value="${id}" ${learningBook===id?'selected':''}>${esc(label)}</option>`).join('')}</select></label></div>${learningBook?cards(d.counts):`<p class="v135-oc-note">Select a collection to display its Lab count. No book/site Labs were requested.</p>${cards((d.counts||[]).filter(x=>x.label!=='Registered Labs'))}`}<p class="v135-oc-warning">Mastery must be established by reviewed assessment evidence. Replay participation and completed Labs cannot substitute for validated skill scoring.</p>${qfield()}<h3>Competency registry</h3>${labelMissing(d.definitions)}${grid(['Skill','Description','State'],skills)}<h3>Selected collection: Lab registry sample</h3>${learningBook?`${labelMissing(d.labs)}${grid(['Lab ID','Lab','Book','Active','Registry'],labs)}`:'<p>Choose a book or Site-Exclusive Labs above; no Lab list is loaded until then.</p>'}<h3>Recent graded cases</h3>${labelMissing(d.attempts)}${grid(['Assessment','Result','Critical errors','Submitted'],grades)}<div class="v135-oc-actions"><button class="btn secondary" data-oc-v135="cases">Competency Cases</button><button class="btn secondary" data-oc-v135="labs">Lab Registry</button></div>`}
 function support(d){const rows=mapped(d.tickets).map(x=>`<tr data-oc-row><td><code>${esc(x.ticket_number)}</code></td><td>${esc(x.subject)}</td><td>${esc(x.category)}</td><td>${pill(x.status,['resolved','closed'].includes(x.status))}</td><td>${pill(x.priority,x.priority==='low')}</td><td>${esc(utc(x.updated_at))}</td></tr>`);
 return `${cards(d.counts)}${qfield()}${labelMissing(d.tickets)}${grid(['Ticket','Subject','Category','Status','Priority','Updated'],rows)}<p class="v135-oc-note">Private ticket messages, contact addresses and security credentials are never included in this report. Case changes remain in the existing Support workflows.</p>`;}
 function security(d){const log=mapped(d.audits).map(x=>`<tr data-oc-row><td>${esc(x.action)}</td><td>${esc(x.target_type||'—')}</td><td>${esc(utc(x.created_at))}</td></tr>`);
 return `${cards(d.counts)}<div class="v135-oc-cards">${(d.safeguards||[]).map(x=>`<article class="v135-oc-metric"><small>${esc(x.label)}</small><strong class="small">${esc(x.value)}</strong></article>`).join('')}</div><p class="v135-oc-warning">Do not enable mandatory CAPTCHA, QR activation, paid checkout, or mandatory staff MFA before all corresponding security acceptance tests pass. This panel cannot enable them.</p>${qfield()}<h3>Recent administrative audit</h3>${labelMissing(d.audits)}${grid(['Action','Target type','Time'],log)}<div class="v135-oc-actions"><button class="btn secondary" data-oc-open="audit">Existing Audit Log</button><button class="btn secondary" data-oc-open="roles">Roles & Permissions</button><button class="btn secondary" data-oc-open="system">System Diagnostics</button></div>`;}
 function notifications(d){const notices=mapped(d.notices).map(x=>`<tr data-oc-row><td>${esc(x.notification_type)}</td><td>Member notification</td><td>${pill(x.is_read?'Read':'Unread',x.is_read)}</td><td>${esc(utc(x.created_at))}</td></tr>`);
 const anns=mapped(d.announcements).map(x=>`<tr data-oc-row><td>${esc(x.title)}</td><td>${esc(x.announcement_type||'general')}</td><td>${esc(x.audience)}</td><td>${pill(x.active?'Active':'Inactive',x.active)}</td><td>${esc(utc(x.updated_at))}</td></tr>`);
 return `${cards(d.counts)}${qfield()}<h3>Recent member notification events</h3>${labelMissing(d.notices)}${grid(['Type','Title','State','Created'],notices)}<h3>Published announcement configuration</h3>${labelMissing(d.announcements)}${grid(['Title','Type','Audience','Active','Updated'],anns)}<div class="v135-oc-actions"><button class="btn secondary" type="button" data-oc-announcements>Jump to Announcement Editor</button><span> Owner-created member notices are managed below.</span></div><p class="v135-oc-note">This is a status report only. Delivery counts are not evidence of email delivery, and no messages are transmitted from this view.</p>`;}
 const R={overview,commerce,learning,support,security,notifications};
 function panelFor(code){return $(`[data-oc-panel="${code}"]`)}
 async function show(code){if(!authorized()||!Object.hasOwn(R,code))return;active=code;const pane=panelFor(code);if(!pane)return;
 $$('.admin-panel',host()).forEach(p=>p.classList.remove('active'));$$('#admin-tabs button').forEach(b=>b.classList.remove('active'));
 pane.classList.add('active');$(`[data-oc-tab="${code}"]`)?.classList.add('active');history.replaceState(null,'','#ops-center-'+code);
 const content=$('[data-oc-data]',pane);content.textContent='Loading authorized information…';flash('');const seq=++requestCounter;
 try{const data=await load(code);if(active!==code||seq!==requestCounter)return;synthetic=!!data.synthetic;current=data;
  content.innerHTML=`<p class="v135-oc-intro">${esc(data.notice||'')}</p>${R[code](data)}`;
  if(code==='notifications'&&!synthetic){
   const annArea=document.createElement('div');annArea.id='v01415-inline-announcements';content.append(annArea);
   const ownerApi=async(path,body)=>{const sb=await window.getSupabaseClient(),session=(await sb.auth.getSession()).data?.session;if(!session)throw Error('Sign in as Owner.');const r=await fetch(path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+session.access_token,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'}),j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||'Announcement operation failed.');return j};
   if(window.SiteAnnouncementEditor?.render){window.SiteAnnouncementEditor.render(annArea,{api:path=>ownerApi(path),adminApi:(action,payload)=>ownerApi('/api/admin-v013?action='+action,payload)}).catch(e=>annArea.textContent='Announcement editor access: '+e.message)}
   else annArea.textContent='Announcement editor could not load.';
   content.querySelector('[data-oc-announcements]')?.addEventListener('click',()=>annArea.scrollIntoView({behavior:'smooth',block:'start'}));
   const area=document.createElement('div');area.className='v01415-owner-notification-host';content.append(area);window.GroundUpOwnerNotifications?.render(area);
  }
  const banner=$('[data-oc-origin]',pane);banner.textContent=synthetic?'SHOWCASE: isolated synthetic data; production records were not accessed.':'AUTHORIZED LIVE REPORT — read-only; time-sensitive records may change.';
  flash(synthetic?'Showcase data is synthetic and read-only.':'Report refreshed successfully.');
 }catch(error){if(seq!==requestCounter)return;content.textContent=error.message||'Unable to load this report.';flash(error.message||'Unable to load report.',true);
  if(/does not permit/.test(error.message||''))$(`[data-oc-tab="${code}"]`)?.setAttribute('hidden','');}}
 function clickExisting(code){const attr=['data-panel','data-v11-panel','data-v13-panel'];const btn=(code==='announcements'?$$('#admin-tabs button').find(b=>b.textContent.trim()==='Announcements'):null)||attr.map(a=>$(`#admin-tabs button[${a}="${code}"]`)).find(Boolean);if(btn&&!btn.hidden&&!btn.closest('[hidden]')){btn.click();return}flash('That workflow is not available to the current role in this deployment.',true)}
 function linkV135(code){const btn=$(`#admin-tabs button[data-v135-control="${code}"]`);if(btn&&!btn.hidden){btn.click();return}flash('That existing Operations section is not currently accessible.',true)}
 function attach(){const app=host(),tabs=$('#admin-tabs');if(!app||!tabs||setupComplete||!authorized())return false;
  setupComplete=true;const category=document.createElement('div');category.className='v135-oc-nav-category';category.id='v135-ops-center-group';
  const label=document.createElement('div');label.className='v135-oc-nav-title';label.textContent='Operations & Intelligence';category.append(label);
  groups.forEach(item=>{
   const button=document.createElement('button');button.type='button';button.dataset.ocTab=item.code;button.textContent=item.label;button.addEventListener('click',()=>show(item.code));category.append(button);
   const section=document.createElement('section');section.className='admin-panel v135-oc-panel';section.dataset.ocPanel=item.code;
   section.innerHTML=`<div class="admin-heading"><div><div class="eyebrow">Operations & Intelligence · v0.13.5</div><h1>${esc(item.title)}</h1><p>${esc(item.description)}</p></div><button class="btn secondary" type="button" data-oc-refresh>Refresh</button></div><p class="v135-oc-origin" data-oc-origin></p><div class="v135-oc-content" data-oc-data></div>`;
   section.querySelector('[data-oc-refresh]').onclick=()=>show(item.code);section.addEventListener('change',ev=>{if(ev.target.matches('[data-v1357-intel-book]')){learningBook=ev.target.value;show('learning')}});app.append(section);
  });tabs.append(category);
  document.addEventListener('input',e=>{if(!e.target.matches('[data-oc-filter]'))return;const pane=e.target.closest('[data-oc-panel]');if(!pane)return;const value=e.target.value.trim().toLowerCase();$$('[data-oc-row]',pane).forEach(row=>row.hidden=!!value&&!row.textContent.toLowerCase().includes(value))});
  document.addEventListener('click',e=>{const old=e.target.closest('[data-oc-open]'),ops=e.target.closest('[data-oc-v135]');if(old)clickExisting(old.dataset.ocOpen);if(ops)linkV135(ops.dataset.ocV135)});
  const n=document.createElement('p');n.id='v135-ops-center-live';n.role='status';n.setAttribute('aria-live','polite');n.className='v135-oc-live';app.prepend(n);
  const hash=location.hash.match(/^#ops-center-(overview|commerce|learning|support|security|notifications)$/)?.[1];if(hash)show(hash);
  return true;
 }
 function start(){if(attach())return;const timer=setInterval(()=>{if(attach())clearInterval(timer)},350);
  setTimeout(()=>clearInterval(timer),30000)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
