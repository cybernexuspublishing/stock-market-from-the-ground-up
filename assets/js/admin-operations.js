/* The Stock Market: From the Ground Up — v0.13.5 Admin Control Center consolidation.
 * Controlled replacement for the former link-only enhancer.
 * IMPORTANT: Retain /admin.html. The existing Admin and RBAC modules remain authoritative.
 * Six existing, server-authorized Operations views are mounted INTO the existing
 * Admin panel system. No privileged access is granted by this frontend module.
 * Deliberately leaves /admin-operations.html intact for legacy deep links.
 */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const ROOT_ID='v135-unified-operations';
const CSS='/assets/css/admin-operations.css';
const definitions=[
 {code:'overview',label:'Learning Operations',heading:'Learning Operations',desc:'Live Lab, competency, catalog and change-activity totals. Figures are obtained from the existing authorized backend.'},
 {code:'labs',label:'Lab Registry',heading:'Historical Lab Registry',desc:'Review existing Lab identifiers and manage visibility without changing approved instructional content.'},
 {code:'features',label:'Feature Inventory',heading:'Visibility & Feature Inventory',desc:'Review platform feature flags. Sensitive security and commerce activation remains locked.'},
 {code:'cases',label:'Competency Cases',heading:'Competency & Assessment Cases',desc:'Review assessed skills, author draft cases and publish only owner-reviewed assessments.'},
 {code:'editions',label:'Book Editions',heading:'Book Editions & Formats',desc:'Read-only view of the existing edition register. Publishing controls remain restricted.'},
 {code:'campaigns',label:'Book QR Campaigns',heading:'Book Activation & QR Campaigns',desc:'Read-only reporting. Activation cannot be enabled from this panel.'}
];
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const message=x=>String(x?.message||x||'Request unsuccessful.');
const fmt=x=>x===null||x===undefined||!Number.isFinite(Number(x))?'—':new Intl.NumberFormat('en-US').format(Number(x));
let active='',synthetic=false,verifiedMfa=false,staffMfaRequired=true,fetchSeq=0,waiting=null;const LAB_COLLECTIONS=[['FOUNDATION_BOOK_1','Foundations Book I'],['FOUNDATION_BOOK_2','Foundations Book II'],['FOUNDATION_BOOK_3','Foundations Book III'],['DAY_TRADING_BOOK_1','Day Trading'],['READING_THE_TAPE','Reading the Tape'],['SITE_EXCLUSIVE','Site-Exclusive Labs']];let labBook='',labPage=0;
function secureFlag(code){return /(?:MFA|CAPTCHA|TURNSTILE|CHECKOUT|QR[_-]?ACTIVAT|PAYMENT|PAYMENTS|DIRECT[_-]?DIGITAL|SHOWCASE[_-]?CREATE)/i.test(code||'')}
function installStyle(){if($('#v135-unified-admin-style')||document.querySelector('link[href="'+CSS+'"]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href=CSS;l.id='v135-unified-admin-style';document.head.append(l)}
function authorized(){return $('#admin-gate')?.hidden===true&&$('#admin-app')?.hidden===false}
async function session(){const sb=await window.getSupabaseClient();const s=(await sb.auth.getSession()).data?.session;if(!s)throw Error('The administrator session expired. Sign in again.');return s}
function tokenAssurance(tok){try{const p=tok.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');const json=JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,'=')));return json.aal==='aal2'}catch{return false}}
async function api(action,body,params={}){const s=await session();verifiedMfa=tokenAssurance(s.access_token);const r=await fetch('/api/admin-operations-v0135?'+new URLSearchParams({action,...params}).toString(),{method:body?'POST':'GET',headers:{authorization:'Bearer '+s.access_token,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||`Administration request failed (${r.status}).`);return d}
function root(code){return $(`[data-v135-unified-panel="${code}"]`)}
function content(code){return $('[data-v135-content]',root(code))}
function note(code,value,kind=''){const el=$('[data-v135-note]',root(code));if(el){el.textContent=value;el.dataset.kind=kind}}
function common(heading,body){return `<div class="v135-unified-table-wrap"><table class="v135-unified-table"><thead><tr>${heading.map(x=>`<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${body.length?body.join(''):`<tr><td colspan="${heading.length}" class="v135-empty">No records were returned.</td></tr>`}</tbody></table></div>`}
function searchRow(rootEl){const filter=$('[data-v135-filter]',rootEl);if(filter)filter.oninput=()=>{const needle=filter.value.trim().toLocaleLowerCase();$$('[data-v135-filterrow]',rootEl).forEach(r=>r.hidden=!!needle&&!r.textContent.toLocaleLowerCase().includes(needle))}}
const mutatingButton=(html,action)=>`<button type="button" class="btn secondary v135-action" ${synthetic||(staffMfaRequired&&!verifiedMfa)?'disabled title="Verified administrator MFA required if enabled"':''} ${action}>${esc(html)}</button>`;
function booleanAction(id,key,v,scope){const next=!v;if(scope==='features'&&next&&secureFlag(id))return '<span class="v135-locked" title="Sensitive feature activation is intentionally disabled">Activation locked</span>';
return mutatingButton(v?'Disable':'Enable',`data-v135-change="${scope}" data-code="${esc(id)}" data-field="${esc(key)}" data-next="${next}"`)}
function renderOverview(d){const chooser=`<div class="v1357-collection-picker"><label>Select book or Site-Exclusive Labs<select data-v1357-legacy-book><option value="">Select a collection to load Lab counts…</option>${LAB_COLLECTIONS.map(([id,label])=>`<option value="${id}" ${labBook===id?'selected':''}>${esc(label)}</option>`).join('')}</select></label></div>`;const x=d.overview||{},rows=[['Total registered Labs',x.labs],['Active Labs',x.activeLabs],['Visible Labs',x.registryLabs],['Active skills',x.skills],['Active book products',x.books]];const cards=rows.map(([label,val])=>`<article><strong>${esc(fmt(val))}</strong><span>${esc(label)}</span></article>`).join('');const events=(d.events||[]).map(z=>`<tr data-v135-filterrow><td>${esc(z.created_at?new Date(z.created_at).toLocaleString():'—')}</td><td>${esc(z.action)}</td><td>${esc(z.object_code||'')}</td></tr>`);return `<h2>Learning operations snapshot</h2>${chooser}<div class="v135-unified-stat-grid">${cards}</div><h3>Recent operational events</h3>${common(['Recorded at','Action','Reference'],events)}`}
function renderLabs(d){const selection=`<div class="v1357-collection-picker"><label for="v1357-legacy-collection">Choose book or Site-Exclusive Labs<select id="v1357-legacy-collection" data-v1357-legacy-book><option value="">Choose a collection…</option>${LAB_COLLECTIONS.map(([code,label])=>`<option value="${code}" ${labBook===code?'selected':''}>${esc(label)}</option>`).join('')}</select></label><p>Only the selected collection loads. Other Labs stay on the server.</p></div>`;if(!labBook)return selection+'<p>Select a collection to view and manage its Labs.</p>';const rows=(d.labs||[]).map(z=>`<tr data-v135-filterrow><td><code>${esc(z.lab_id)}</code></td><td>${esc(z.title)}</td><td>${esc(z.book_code||'Unassigned')}</td>${[['active','Active'],['registry_visible','Visible'],['public_sample','Public sample']].map(([field])=>`<td><div class="v135-state-pair"><span class="v135-state ${z[field]?'on':'off'}">${z[field]?'Yes':'No'}</span>${booleanAction(z.lab_id,field,!!z[field],'labs')}</div></td>`).join('')}</tr>`);return `<div class="v135-unified-warning">Existing Lab IDs and learner history are preserved. Use the separate View and Edit controls below. Unverified security-sensitive actions are not activated.</div><label class="v135-unified-filter">Find a Lab<input type="search" data-v135-filter placeholder="Search by ID, book or Lab title" autocomplete="off"></label>${selection}${common(['Lab ID','Lab','Book','Active','Registry','Sample'],rows)}<nav class="v1357-page-nav"><button type="button" data-v1357-legacy-page="prev" ${labPage===0?'disabled':''}>Previous</button><span>Page ${labPage+1}</span><button type="button" data-v1357-legacy-page="next" ${d.hasMore?'':'disabled'}>Next</button></nav>`}
function renderFeatures(d){const rows=(d.features||[]).map(z=>`<tr data-v135-filterrow><td><strong>${esc(z.label||z.feature_code)}</strong><small>${esc(z.feature_code)}</small></td><td>${esc(z.category||'General')}</td><td><span class="v135-state ${z.enabled?'on':'off'}">${z.enabled?'Enabled':'Disabled'}</span></td><td>${booleanAction(z.feature_code,'enabled',!!z.enabled,'features')}</td></tr>`);return `<div class="v135-unified-warning">QR activation, paid checkout, mandatory CAPTCHA and staff MFA remain disabled. Enabling sensitive features is not available from this panel.</div><label class="v135-unified-filter">Find a feature<input type="search" data-v135-filter placeholder="Feature name, code or category" autocomplete="off"></label>${common(['Feature','Category','Current state','Action'],rows)}`}
function renderCases(d){const rows=(d.cases||[]).map(z=>`<tr data-v135-filterrow><td><code>${esc(z.case_code)}</code></td><td>${esc(z.competency_code)}</td><td>${esc(z.title)}</td><td><span class="v135-state ${z.active?'on':'off'}">${z.active?'Published':'Draft / Retired'}</span></td><td>${mutatingButton(z.active?'Retire':'Review & publish',`data-v135-case="${esc(z.case_code)}" data-v135-mode="${z.active?'retire':'publish'}"`)}</td></tr>`);
const draftButton=mutatingButton('Create Assessment Draft','data-v135-new-draft="1"');return `<div class="v135-unified-warning">A completed Lab does not establish skill mastery. Only reviewed, published cases can generate validated scores. Assessment answer keys stay server-private.</div><div class="v135-unified-actions">${draftButton}<a class="btn secondary" href="/dashboard.html?tab=skills">View Member Skill Development</a></div><label class="v135-unified-filter">Find an assessment<input type="search" data-v135-filter placeholder="Case code, competency or title" autocomplete="off"></label>${common(['Case','Competency','Assessment','Status','Review'],rows)}`}
function renderEditions(d){const rows=(d.editions||[]).map(z=>`<tr data-v135-filterrow><td><code>${esc(z.edition_code)}</code></td><td>${esc(z.product_code)}</td><td>${esc(z.edition_label||'—')}</td><td>${esc(z.format||'—')}</td><td>${esc(z.channel||'—')}</td><td>${esc(z.publication_status||'Unknown')}</td></tr>`);return `<div class="v135-unified-warning">Reporting only. This screen does not enable publishing, direct digital sales, or change KDP Select status.</div><label class="v135-unified-filter">Find an edition<input type="search" data-v135-filter placeholder="Edition, book, format or channel"></label>${common(['Edition','Product','Label','Format','Channel','Status'],rows)}`}
function renderCampaigns(d){const rows=(d.campaigns||[]).map(z=>`<tr data-v135-filterrow><td><code>${esc(z.campaign_code)}</code></td><td>${esc(z.edition_code)}</td><td>${esc(z.label)}</td><td><span class="v135-state ${z.active?'on':'off'}">${z.active?'Active':'Inactive'}</span></td><td>${esc(z.max_activations??'Not specified')}</td></tr>`);return `<div class="v135-unified-warning">QR campaigns must stay inactive until edition-specific possession questions, abuse controls and activation verification are accepted. A QR scan alone is not proof of an Amazon purchase.</div><label class="v135-unified-filter">Find a campaign<input type="search" data-v135-filter placeholder="Campaign code or edition"></label>${common(['Campaign','Edition','Label','Recorded status','Activation limit'],rows)}`}
const renderers={overview:renderOverview,labs:renderLabs,features:renderFeatures,cases:renderCases,editions:renderEditions,campaigns:renderCampaigns};
async function show(code,push=true){if(!authorized())return;if(!definitions.some(x=>x.code===code))return;active=code;
$$('.admin-panel').forEach(x=>x.classList.remove('active'));$$('#admin-tabs button').forEach(x=>{x.classList.remove('active');if(x.dataset.v135Control)x.setAttribute('aria-selected',String(x.dataset.v135Control===code))});
const pane=root(code);if(!pane)return;pane.classList.add('active');const b=$(`[data-v135-control="${code}"]`);b?.classList.add('active');if(push)history.replaceState(null,'','#ops-'+code);
content(code).textContent='Loading authorized operational data…';note(code,'');const seq=++fetchSeq;
try{const d=code==='labs'&&!labBook?{ok:true,labs:[]}:await api(code,null,(code==='labs'||code==='overview')?{bookCode:labBook,page:String(labPage)}:{});if(seq!==fetchSeq||active!==code)return;synthetic=!!d.synthetic;if(typeof d.staffMfaRequired==='boolean')staffMfaRequired=d.staffMfaRequired;pane.dataset.synthetic=String(synthetic);
content(code).innerHTML=renderers[code](d);searchRow(pane);
note(code,synthetic?'SHOWCASE DEMONSTRATION — mock records only. Production changes unavailable.':verifiedMfa?'Verified staff session. All mutations remain subject to server-side role checks.':'Viewing authorized records. Staff MFA remains optional when disabled by Owner policy.',synthetic?'demo':'ok');
}catch(err){if(seq===fetchSeq)content(code).textContent=message(err)}}
function dialog(){let d=$('#v135-unified-dialog');if(d)return d;d=document.createElement('dialog');d.id='v135-unified-dialog';d.className='v135-unified-dialog';d.innerHTML='<div class="v135-unified-dialog-heading"><h2>Administrative action</h2><button type="button" class="btn secondary" data-close aria-label="Close dialog">Close</button></div><div data-dialog-body></div><p data-dialog-status role="status" aria-live="polite"></p>';document.body.append(d);$('[data-close]',d).onclick=()=>d.close();return d}
function confirmTyped(title,description,phrase){return new Promise(resolve=>{const d=dialog(),body=$('[data-dialog-body]',d);$('.v135-unified-dialog-heading h2',d).textContent=title;
body.replaceChildren();const p=document.createElement('p');p.textContent=description;const label=document.createElement('label');label.textContent='Type exactly: '+phrase;const input=document.createElement('input');input.autocomplete='off';label.append(input);const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='Confirm';body.append(p,label,b);const status=$('[data-dialog-status]',d);status.textContent='';
let finished=false;const done=v=>{if(finished)return;finished=true;d.close();resolve(v)};b.onclick=()=>{if(input.value.trim()!==phrase){status.textContent='Confirmation phrase does not match.';return}done(true)};d.addEventListener('close',()=>done(false),{once:true});d.showModal();input.focus()})}
const DIMENSIONS=[['knowledge','Knowledge'],['recognition','Recognition'],['decision','Decision'],['process','Execution / Process']];
function createDraftDialog(){const d=dialog(),host=$('[data-dialog-body]',d);$('.v135-unified-dialog-heading h2',d).textContent='Create Competency Assessment Draft';
let html='<form id="v135-unified-draft-form"><p>Build an original four-dimension assessment. Publication is separate and requires verified review.</p><div class="v135-unified-form-grid"><label>Case code<input name="caseCode" pattern="[A-Za-z0-9_-]{3,90}" placeholder="VWAP_RECLAIM_01" required></label><label>Competency code<input name="competencyCode" pattern="[A-Za-z0-9_-]{3,90}" placeholder="VWAP_CONTEXT" required></label><label class="wide">Title<input name="title" minlength="5" maxlength="180" required></label><label class="wide">Description<textarea name="description" maxlength="2000"></textarea></label></div>';
for(const [dim,label] of DIMENSIONS)html+=`<fieldset data-dimension="${dim}"><legend>${label}</legend><label>Question / decision prompt<textarea name="prompt_${dim}" maxlength="800" required></textarea></label><div class="v135-unified-form-grid"><label>Option A<input name="a_${dim}" maxlength="300" required></label><label>Option B<input name="b_${dim}" maxlength="300" required></label><label>Approved correct option<select name="answer_${dim}"><option value="A">A</option><option value="B">B</option></select></label></div></fieldset>`;
html+='<div class="v135-unified-actions"><button type="submit" class="btn">Save Draft (Not Published)</button></div></form>';host.innerHTML=html;$('[data-dialog-status]',d).textContent='';const f=$('form',host);f.onsubmit=async ev=>{ev.preventDefault();const vals=Object.fromEntries(new FormData(f)),questions=[],answerKey={};for(const [dim] of DIMENSIONS){const id=dim.toUpperCase()+'_1';questions.push({id,dimension:dim,prompt:vals['prompt_'+dim],options:[{code:'A',label:vals['a_'+dim]},{code:'B',label:vals['b_'+dim]}]});answerKey[id]=vals['answer_'+dim]}
const save=$('button[type=submit]',f);save.disabled=true;try{await api('case_create_draft',{caseCode:vals.caseCode.trim().toUpperCase(),competencyCode:vals.competencyCode.trim().toUpperCase(),title:vals.title,description:vals.description,questions,answerKey});d.close();await show('cases');note('cases','Draft saved. It has not been published or enabled for member scoring.','ok')}catch(err){$('[data-dialog-status]',d).textContent=message(err);save.disabled=false}};d.showModal()}
async function change(ev){const btn=ev.target.closest('button');if(!btn||!btn.closest('[data-v135-unified-panel]')||btn.disabled)return;
if(btn.hasAttribute('data-v135-new-draft')){createDraftDialog();return}
const scope=btn.dataset.v135Change;let action='',body={},code='';if(scope){code=btn.dataset.code;const field=btn.dataset.field,next=btn.dataset.next==='true';if(scope==='features'&&next&&secureFlag(code)){note(active,'Sensitive activation is locked.','error');return}
action=scope==='labs'?'lab_update':'feature_update';body=scope==='labs'?{labId:code,[field]:next}:{featureCode:code,enabled:next};const phrase=next?'ENABLE '+code:'DISABLE '+code;if(!(await confirmTyped('Confirm operational change',`Update ${field} on ${code} to ${next?'enabled':'disabled'}? This will be recorded in the audit trail.`,phrase)))return;
}else if(btn.hasAttribute('data-v135-case')){code=btn.dataset.v135Case;action=btn.dataset.v135Mode==='publish'?'case_publish':'case_retire';const phrase=action==='case_publish'?'PUBLISH VERIFIED RUBRIC':'RETIRE '+code;if(!(await confirmTyped(action==='case_publish'?'Publish competency assessment':'Retire competency assessment',action==='case_publish'?`Confirm that all question answers, four dimensions, historical boundaries and risk controls in ${code} have been independently reviewed. Publishing enables scoring.`:`Retire ${code} from future graded practice. Existing evidence is preserved.`,phrase)))return;body={caseCode:code,...(action==='case_publish'?{confirmPhrase:'PUBLISH VERIFIED RUBRIC'}:{})};}else return;
btn.disabled=true;try{await api(action,body);await show(active);note(active,`${action} completed and recorded for ${code}.`,'ok')}catch(err){note(active,message(err),'error');btn.disabled=false}}
function mount(){if(!authorized())return false;installStyle();const tabs=$('#admin-tabs'),app=$('#admin-app');if(!tabs||!app)return false;
let group=$('#'+ROOT_ID);if(!group){group=document.createElement('div');group.id=ROOT_ID;group.className='v13-admin-group v135-unified-group';const title=document.createElement('div');title.className='v13-admin-group-title';title.textContent='Learning Operations';group.append(title);
for(const d of definitions){const b=document.createElement('button');b.type='button';b.dataset.v135Control=d.code;b.textContent=d.label;b.setAttribute('aria-selected','false');b.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();show(d.code)},true);group.append(b)}tabs.append(group)}
for(const d of definitions){let pane=root(d.code);if(pane)continue;pane=document.createElement('section');pane.className='admin-panel v135-unified-panel';pane.dataset.v135UnifiedPanel=d.code;pane.innerHTML=`<div class="admin-heading"><div><div class="eyebrow">Admin Control Center · Learning Operations</div><h1>${esc(d.heading)}</h1><p>${esc(d.desc)}</p></div><button class="btn secondary" type="button" data-v135-refresh="${esc(d.code)}">Refresh</button></div><div class="v135-unified-toolbar"><p data-v135-note aria-live="polite" role="status"></p></div><div data-v135-content class="v135-unified-content">Select this section to load data.</div>`;app.append(pane);
pane.addEventListener('change',ev=>{if(ev.target.matches('[data-v1357-legacy-book]')){labBook=ev.target.value;labPage=0;show(d.code)}});pane.addEventListener('click',ev=>{const page=ev.target.closest('[data-v1357-legacy-page]');if(page){labPage=Math.max(0,labPage+(page.dataset.v1357LegacyPage==='next'?1:-1));show('labs');return}const refresh=ev.target.closest('[data-v135-refresh]');if(refresh){show(refresh.dataset.v135Refresh);return}change(ev)});}
// Remove obsolete off-page link; keep /admin-operations.html as a compatibility path.
$$('[data-v135-ops]').forEach(el=>el.remove());
if(!active){const incoming=location.hash.match(/^#ops-(overview|labs|features|cases|editions|campaigns)$/);if(incoming)show(incoming[1],false)}
return true}
function init(){let tries=0;const timer=setInterval(()=>{tries++;if(mount()||tries>=60)clearInterval(timer)},450);
const tabs=$('#admin-tabs');if(tabs){const observer=new MutationObserver(()=>{if(!authorized())return;if(!$('#'+ROOT_ID))setTimeout(mount,150)});observer.observe(tabs,{childList:true,subtree:false});setTimeout(()=>observer.disconnect(),25000)}
addEventListener('hashchange',()=>{const m=location.hash.match(/^#ops-(overview|labs|features|cases|editions|campaigns)$/);if(m)show(m[1],false)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1000),{once:true});else setTimeout(init,1000);
})();


/* Account Management — integrated entry module (v0.13.5.3 approved behavior). */
/* v0.13.5.3 — single visible Account Management interface.
 * Owner-only server writes; Showcase view synthetic/read-only.
 * Real Auth passwords are one-way: only disposable test/showcase credentials
 * may be recoverable from an independently configured encrypted vault. */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KINDS={member:'Member',test:'Dummy / Test',showcase:'Showcase (synthetic, read-only)',moderator:'Moderator',admin:'Administrator',owner:'Owner'};
const PW_RULE='At least 10 characters, including an uppercase letter, a lowercase letter and a symbol from !@#$%^&*+_?.';
const strongPassword=p=>p.length>=10&&p.length<=120&&/[a-z]/.test(p)&&/[A-Z]/.test(p)&&/[!@#$%^&*+_?]/.test(p);
function isoToUs(s){const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[2]+'/'+m[3]+'/'+m[1]:''}
function usToIso(s){const m=String(s||'').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)throw Error('Date of birth must be MM/DD/YYYY.');const mo=+m[1],day=+m[2],y=+m[3];const dt=new Date(Date.UTC(y,mo-1,day));if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==day)throw Error('Date of birth is not valid.');return `${m[3]}-${m[1]}-${m[2]}`}
function maskDob(field){if(!field||field.dataset.dobMask)return;field.dataset.dobMask='1';field.addEventListener('input',()=>{let n=field.value.replace(/\D/g,'').slice(0,8);field.value=n.slice(0,2)+(n.length>2?'/'+n.slice(2,4):'')+(n.length>4?'/'+n.slice(4):'')})}
const SECRET_NOTE='Real member, Moderator, Administrator, and Owner passwords cannot be viewed. They can be replaced; only encrypted dummy/Showcase credentials can be retrieved.';
let accounts=[],owner=false,synthetic=false,aal='aal1',vault=false,page=1,query='',plans=[],roles=[],viewerId='',timer=null;
const pane=()=>$('#v1352-accounts'), dlg=()=>$('#v1352-dialog');
function say(x,type=''){const box=$('#v1352-status');if(box){box.textContent=x;box.dataset.kind=type}}
async function session(){const sb=await window.getSupabaseClient();const {data:{session}}=await sb.auth.getSession();if(!session)throw Error('Sign in again to use Account Management.');viewerId=session.user?.id||'';return session}
async function api(action,body=null,params={}){const s=await session(),q=new URLSearchParams({action,...params});const res=await fetch('/api/admin-accounts-v01353?'+q,{method:body?'POST':'GET',cache:'no-store',headers:{authorization:'Bearer '+s.access_token,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const j=await res.json().catch(()=>({}));if(!res.ok||j.ok!==true)throw Error(j.error||`Account request rejected (HTTP ${res.status}).`);return j}
function openTab(){if(!pane()){mount();if(!pane())return;}$$('.admin-panel').forEach(x=>x.classList.remove('active'));$$('#admin-tabs button').forEach(x=>x.classList.remove('active'));pane().classList.add('active');$('[data-v1352-menu]')?.classList.add('active');history.replaceState(null,'','#account-management');load()}
function mount(){const app=$('#admin-app'),nav=$('#admin-tabs');if(!app||!nav||app.hidden)return false;if(pane())return true;
 const panel=document.createElement('section');panel.className='admin-panel v1352';panel.id='v1352-accounts';panel.innerHTML=`<div class="admin-heading"><div><div class="eyebrow">Accounts &amp; Access</div><h1>Account Management</h1><p>Create, review, edit, secure, and delete eligible accounts from one place. All six account types are available in the creation interface.</p></div></div><div class="v1352-disclosure"><strong>Credentials:</strong> ${SECRET_NOTE} All changes are server-authorized and audited.</div><div class="v1352-buttons"><button type="button" class="btn" data-v1352-create>Create Account</button><button type="button" class="btn secondary" data-v1352-refresh>Refresh Accounts</button><a class="btn secondary" href="/admin.html#roles">Roles &amp; Permissions</a></div><div class="v1352-states"><span data-v1352-vault></span><span data-v1352-assurance></span></div><p id="v1352-status" aria-live="polite" role="status"></p><div class="v1352-search"><label>Search by first name, last name, username or email<input type="search" id="v1352-search" autocomplete="off" placeholder="Search accounts"></label><button type="button" class="btn secondary" data-v1352-search>Search</button></div><div id="v1352-table" aria-live="polite">Loading authorized accounts…</div><div class="v1352-buttons"><button type="button" class="btn secondary" data-v1352-prev>Previous</button><span data-v1352-page>Page 1</span><button type="button" class="btn secondary" data-v1352-next>Next</button></div><p class="small">Edit Account now includes editable names, account type, role, membership and dates. Owner-to-Owner changes are restricted to authenticated Owner accounts. Dummy and Showcase access remains synthetic.</p>`;
 app.append(panel);let group=$$('.v13-admin-group',nav).find(g=>/Overview/i.test(g.querySelector('.v13-admin-group-title')?.textContent||''));let b=$('[data-v1352-menu]',nav);if(!b){b=document.createElement('button');b.type='button';b.dataset.v1352Menu='1';b.id='admin-account-management-direct';b.textContent='Account Management';}if(group&&b.parentElement!==group){const dashboard=$('[data-panel=dashboard]',group);dashboard?dashboard.after(b):group.prepend(b)}else if(!b.isConnected){const dashboard=$('[data-panel=dashboard]',nav);dashboard?dashboard.after(b):nav.prepend(b)}b.hidden=false;b.removeAttribute('aria-hidden');b.onclick=openTab;const createShortcut=$('[data-v142-create]',nav);if(createShortcut){createShortcut.hidden=false;createShortcut.onclick=()=>{openTab();createForm()}};
 $('[data-v1352-create]',panel).onclick=()=>createForm();$('[data-v1352-refresh]',panel).onclick=load;$('[data-v1352-search]',panel).onclick=()=>{query=$('#v1352-search').value.trim();page=1;load()};$('#v1352-search').onkeydown=ev=>{if(ev.key==='Enter')$('[data-v1352-search]').click()};$('[data-v1352-prev]').onclick=()=>{page=Math.max(1,page-1);load()};$('[data-v1352-next]').onclick=()=>{page++;load()};$('#v1352-table').addEventListener('click',onRow);
 // Retire the previous Account Management navigation and panel, without deleting
 // any of its files, the original Users panel, or its important role controls.
 $$('[data-v1351-accounts]').forEach(x=>x.hidden=true);const older=$('#v1351-owner-accounts');if(older){older.hidden=true;older.classList.remove('active')}
 if(location.hash==='#account-management')setTimeout(openTab,0);
 return true;}
function retireOld(){const old=$('[data-v134-create-account]');if(old){old.textContent='Create Account (all types)';old.title='Opens the new unified creation form';}const old2=$('[data-v134-showcase]');if(old2)old2.textContent='Create Showcase (new form)';$$('[data-v1351-accounts]').forEach(x=>x.hidden=true)}
// The original Users -> Open dialog still exists for legacy role and journal controls.
// Add a prominent route to the new complete editor rather than presenting only the
// old username-only Exceptional Rename form.
function extendLegacy(){const legacy=$('#admin-user-detail');if(!legacy)return;
 const identity=legacy.querySelector('.admin-user-sections section');if(!identity||identity.querySelector('[data-v1353-full-edit]'))return;
 const b=document.createElement('button');b.type='button';b.className='btn';b.dataset.v1353FullEdit='1';b.textContent='Edit Full Account';identity.append(b);identity.querySelectorAll('[data-v134-email],[data-v134-identity]').forEach(x=>{x.hidden=true;x.setAttribute('aria-hidden','true')});identity.querySelectorAll('.admin-username-override,.admin-username-controls').forEach(x=>{x.hidden=true})
 b.onclick=async()=>{const title=$('#admin-user-title')?.textContent||'';let uid='';try{uid=typeof ADMIN!=='undefined'?ADMIN.currentUser?.user?.id||'':''}catch{}let user=accounts.find(a=>a.id===uid)||accounts.find(a=>title.includes(a.username)||title.includes(a.email));if(uid&&!user){try{const r=await api('detail',null,{id:uid});user=r.account||null}catch(err){window.alert(err.message);return}}
  if(!user){try{const q=title.split(' — ')[0].trim();const r=await api('list',null,{q});user=(r.accounts||[])[0]}catch{}}
  if(!user){const err='Unable to locate this account. Open Account Management to search directly.';window.alert(err);return}$('#admin-user-dialog')?.close();openTab();await editForm(user)};
}
// Old v0.13.4 Create Account modal was the screenshot problem. Intercept the
// click BEFORE its legacy onclick can run, and open the v0.13.5.3 form instead.
document.addEventListener('click',ev=>{const old=ev.target.closest?.('[data-v134-create-account],[data-v134-showcase]');if(!old)return;ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();openTab();createForm(old.matches('[data-v134-showcase]')?'showcase':'member')},true);
async function load(){const table=$('#v1352-table');if(!table)return;table.textContent='Loading…';say('');try{const r=await api('list',null,{page:String(page),q:query});accounts=r.accounts||[];owner=!!r.owner;synthetic=!!r.synthetic;aal=r.aal||'aal1';vault=!!r.vaultReady;$('[data-v1352-create]').disabled=synthetic;
 $('[data-v1352-vault]').textContent=synthetic?'Showcase: synthetic only':`Dummy credential vault: ${vault?'Configured':'Not configured — passwords visible once only'}`;$('[data-v1352-assurance]').textContent=owner?'Owner: account administration with protected staff and billing source controls.':'Administrator: manage ordinary member accounts only; Owner and staff privileges remain protected.';
 if(synthetic)say('SHOWCASE MODE — demonstration accounts only; no production writes.','demo');
 else if(r.searchLimited)say('Search examined 500 accounts maximum. Narrow your query to find more.','warn');
 const rows=accounts.map(a=>`<tr><td><strong>${e(a.username)}</strong><small>${e(a.email)}</small></td><td>${e((a.firstName+' '+a.lastName).trim()||'—')}</td><td>${e(KINDS[a.type]||a.type)}</td><td>${(a.roles||[]).map(r=>`<span class="admin-badge">${e(r)}</span>`).join(' ')||'—'}</td><td><button class="btn secondary" data-v1352-action="edit" data-id="${e(a.id)}" ${synthetic?'disabled':''}>Edit Account</button><button class="btn secondary" data-v1352-action="password" data-id="${e(a.id)}" ${synthetic?'disabled':''}>${a.id===viewerId&&a.type==='owner'?'Change My Password':'Reset Password'}</button>${['test','showcase'].includes(a.type)?`<button class="btn secondary" data-v1352-action="reveal" data-id="${e(a.id)}" ${!owner?'disabled':''}>View Dummy Password</button>`:''}<button class="btn secondary danger" data-v1352-action="delete" data-id="${e(a.id)}" ${!owner||a.id===viewerId?'disabled':''}>Delete</button></td></tr>`).join('');table.innerHTML=`<div class="v1352-scroll"><table class="admin-table"><thead><tr><th>Account</th><th>Name</th><th>Account Type</th><th>Roles</th><th>Controls</th></tr></thead><tbody>${rows||'<tr><td colspan="5">No matching accounts.</td></tr>'}</tbody></table></div>`;
 $('[data-v1352-page]').textContent=`Page ${page}${r.total?` · ${r.total} accounts`:''}`;$('[data-v1352-prev]').disabled=page<=1;$('[data-v1352-next]').disabled=!r.hasMore;
 }catch(err){table.textContent=err.message;say(err.message,'error')}}
function dialog(title){let d=dlg();if(!d){d=document.createElement('dialog');d.id='v1352-dialog';d.className='v1352-dialog';d.innerHTML='<header><h2></h2><button type="button" class="btn secondary" data-v1352-close>Close</button></header><div data-v1352-body></div><p data-v1352-error role="status" aria-live="polite"></p>';document.body.append(d);$('[data-v1352-close]',d).onclick=()=>d.close()}if(d.open)d.close();$('h2',d).textContent=title;$('[data-v1352-body]',d).replaceChildren();$('[data-v1352-error]',d).textContent='';return d}
function hideLater(d,inp){
 if(timer)clearTimeout(timer);
 const clear=()=>{inp.value='';if(timer)clearTimeout(timer);document.removeEventListener('visibilitychange',onHidden)};
 const onHidden=()=>{if(document.hidden){clear();if(d.open)d.close()}};
 timer=setTimeout(()=>{clear();if(d.open)d.close()},30000);
 d.addEventListener('close',clear,{once:true});document.addEventListener('visibilitychange',onHidden);
}
function showPassword(p,desc,stored=false){const d=dialog('Credential — 30-Second Display');const box=$('[data-v1352-body]',d);box.innerHTML=`<p>${e(desc)}</p><label>New or saved disposable credential<input type="password" autocomplete="off" spellcheck="false" readonly data-cred></label><div class="v1352-buttons"><button class="btn secondary" type="button" data-show>Show / Hide</button><button class="btn secondary" type="button" data-copy>Copy</button><button class="btn secondary" type="button" data-erase>Clear and Close</button></div><p class="small">${stored?'This disposable credential may be retrieved later from the encrypted test vault.':'Not saved for later retrieval. Record it securely now.'} The display clears in 30 seconds.</p>`;
 const inp=$('[data-cred]',d);inp.value=p;hideLater(d,inp);$('[data-show]',d).onclick=()=>{inp.type=inp.type==='password'?'text':'password'};$('[data-copy]',d).onclick=async()=>{try{await navigator.clipboard.writeText(inp.value);$('[data-v1352-error]',d).textContent='Copied to clipboard. Clear it when finished.'}catch{$('[data-v1352-error]',d).textContent='Clipboard unavailable. Select Show instead.'}};$('[data-erase]',d).onclick=()=>{inp.value='';d.close()};d.showModal()}
async function planList(){if(plans.length)return plans;const data=await api('plans');plans=data.plans||[];return plans}
async function roleList(){if(roles.length)return roles;const data=await api('roles');roles=data.roles||[];return roles}
function creationKind(form){const type=$('[name=type]',form)?.value||'member',sandbox=['test','showcase'].includes(type);$('[data-v1352-dob]',form).hidden=sandbox;$('[name=dateOfBirth]',form).required=!sandbox;$('[data-v1353-method]',form).hidden=sandbox;if(sandbox)form.elements.creationMethod.value='owner_password';const wantsPassword=sandbox||form.elements.creationMethod.value==='owner_password';$('[data-v1352-password]',form).hidden=!wantsPassword;$('[data-v1352-password-confirm]',form).hidden=!wantsPassword;$('[data-v1352-owner]',form).hidden=type!=='owner';$('[data-v1352-scenario]',form).hidden=type!=='test';$('[data-v1352-membership]',form).hidden=false;$('[data-v1352-method]',form).textContent=sandbox?'Choose a password (or leave blank for secure generation). Only synthetic/mock access is granted to Showcase.':'Invitation sends account setup instructions. Owner-issued passwords are displayed once and should be shared securely; this creation method marks the initial email as confirmed by Owner authorization.'}
async function createForm(pref='member'){if(!pane())return;const d=dialog('Create Account — All Account Types');const body=$('[data-v1352-body]',d);body.innerHTML=`<form id="v1352-create-form" class="v1352-grid"><label>Account type<select name="type">${Object.entries(KINDS).map(([k,v])=>`<option value="${k}" ${pref===k?'selected':''}>${e(v)}</option>`).join('')}</select></label><label>First name<input name="firstName" maxlength="80" required autocomplete="off"></label><label>Last name<input name="lastName" maxlength="80" required autocomplete="off"></label><label>Username<input name="username" pattern="[A-Za-z][A-Za-z0-9_]{2,23}" minlength="3" maxlength="24" required autocomplete="off"></label><label>Email address<input name="email" type="email" maxlength="254" required autocomplete="off"></label><label data-v1352-dob>Date of birth — MM/DD/YYYY<input name="dateOfBirth" type="text" inputmode="numeric" maxlength="10" placeholder="MM/DD/YYYY" required autocomplete="bday"></label><label data-v1352-membership>Initial membership<select name="planCode"><option value="FREE">Free (default)</option></select></label><label>Membership starts<input type="datetime-local" name="startsAt"></label><label>Membership ends<input type="datetime-local" name="endsAt"></label><label data-v1352-scenario hidden>Test scenario<select name="testScenario"><option value="free">Free Reader</option><option value="expired">Expired Membership</option><option value="admin-preview">Simulated Administrator</option><option value="moderator-preview">Simulated Moderator</option><option value="full-preview">Full Platform Preview</option></select></label><label data-v1353-method>Creation method<select name="creationMethod"><option value="invite">Send email invitation (recommended)</option><option value="owner_password">Owner sets an initial password</option></select></label><label data-v1352-password hidden class="full">Initial password (optional — generated for Dummy/Showcase if blank)<input name="newPassword" type="password" minlength="10" maxlength="120" autocomplete="new-password" placeholder="10+ characters, upper/lower and symbol"></label><label data-v1352-password-confirm hidden class="full">Confirm Dummy/Showcase password<input name="confirmPassword" type="password" minlength="10" maxlength="120" autocomplete="new-password" placeholder="Repeat chosen password"></label><p class="full small">Password rules: 10 or more characters, uppercase and lowercase letters, and at least one of !@#$%^&amp;*+_?. Numbers are allowed but not required. Leave both blank to generate a strong password.</p><label data-v1352-owner hidden class="full">Owner authority confirmation: type CREATE OWNER<input name="confirmation" autocomplete="off" placeholder="CREATE OWNER"></label><p class="full v1352-note" data-v1352-method></p><p class="full v1352-note">Dummy and Showcase accounts are test identities; Showcase receives NO production plan, book, tool, or skill entitlements. Membership assignment for other account types is explicitly Owner-authorized.</p><div class="full v1352-buttons"><button type="submit" class="btn">Create Account</button><button class="btn secondary" type="button" data-cancel>Cancel</button></div></form>`;const f=$('#v1352-create-form',d),kind=$('[name=type]',f);
 if(!owner){kind.innerHTML='<option value="member">Member (Administrator permission)</option>';kind.value='member'}
 maskDob(f.elements.dateOfBirth);kind.onchange=()=>creationKind(f);f.elements.creationMethod.onchange=()=>creationKind(f);creationKind(f);$('[data-cancel]',f).onclick=()=>d.close();d.showModal();
 try{const xs=await planList();const select=$('[name=planCode]',f);for(const p of xs.filter(p=>p.plan_code!=='FREE')){const o=document.createElement('option');o.value=p.plan_code;o.textContent=p.name+' — manual Owner grant';select.append(o)}}catch(err){$('[data-v1352-error]',d).textContent='Membership listing unavailable: '+err.message}
 f.onsubmit=async ev=>{ev.preventDefault();const btn=$('button[type=submit]',f);btn.disabled=true;$('[data-v1352-error]',d).textContent='Creating account…';try{const data=Object.fromEntries(new FormData(f).entries());if(data.dateOfBirth)data.dateOfBirth=usToIso(data.dateOfBirth);for(const field of ['startsAt','endsAt'])if(data[field]){const when=new Date(data[field]);if(!Number.isFinite(when.getTime()))throw Error('Invalid membership '+field+' date/time.');data[field]=when.toISOString();}if(data.creationMethod==='owner_password'&&!['test','showcase'].includes(data.type)&&!data.newPassword)throw Error('Enter and confirm an initial password, or choose Email Invitation.');if(data.newPassword&&(!strongPassword(data.newPassword)||data.newPassword!==data.confirmPassword))throw Error('Password needs 10+ characters, uppercase, lowercase, symbol, and must match confirmation.');if(!data.newPassword&&data.confirmPassword)throw Error('Leave both password fields empty for an automatic password.');const r=await api('create',data);d.close();await load();if(r.temporaryPassword)showPassword(r.temporaryPassword,`${r.account.type} ${r.account.username} created.`,!!r.storedForLater);else say(`${r.account.type.toUpperCase()} account ${r.account.username} created. Invitation issued.${r.warning?' '+r.warning:''}`,r.warning?'warn':'ok')}catch(err){$('[data-v1352-error]',d).textContent=err.message;btn.disabled=false}}}
async function onRow(ev){const btn=ev.target.closest('[data-v1352-action]');if(!btn||btn.disabled)return;const a=accounts.find(r=>r.id===btn.dataset.id);if(!a)return;try{const op=btn.dataset.v1352Action;if(op==='edit')await editForm(a);else if(op==='password')await resetForm(a);else if(op==='reveal')await reveal(a);else if(op==='delete')await deleteForm(a)}catch(err){say(err.message,'error')}}
async function editForm(a){const info=await api('detail',null,{id:a.id}),account=info.account||a;
 const availablePlans=await planList(),availableRoles=await roleList();
 const currentRole=(account.roles||[]).includes('OWNER')?'OWNER':(account.roles||[]).includes('ADMIN')?'ADMIN':(account.roles||[]).includes('MODERATOR')?'MODERATOR':(account.roles||[]).find(x=>x!=='SHOWCASE_VIEWER')||'NONE';
 const currentType=account.type||'member',member=info.membership||{planCode:'FREE'},profile=account.profile||{},flag=info.flag||{status:'active',reason:''},isBanned=!!(account.bannedUntil&&new Date(account.bannedUntil)>new Date());
 const canAssignStaff=info.permissions?.owner!==false;
 if(!member.synthetic&&info.effectiveAccess?.planCode){
   member.planCode=info.effectiveAccess.planCode;
   member.startsAt=info.effectiveAccess.startsAt||member.startsAt;
   member.endsAt=info.effectiveAccess.expiresAt||info.effectiveAccess.renewsAt||member.endsAt;
 }
 const inv=info.inventory||{},failed=info.inventoryErrors||{};
 const verifiedPlan=info.effectiveAccess?.planCode||null;
 const fmtDate=x=>{if(!x)return '—';const dt=new Date(x);return Number.isFinite(dt.getTime())?dt.toLocaleString():String(x)};
 const itemTable=(title,key,items,describe,sourceOf,expiresOf,revocable)=>{
  if(failed[key]||items===null)return '<h4>'+e(title)+'</h4><p class="small" role="alert">'+e(failed[key]||'This account source is unavailable; do not assume no records exist.')+'</p>';
  const rows=(items||[]).map(x=>{
   const kind=revocable(x),grantId=Number(x.id);
   const action=kind&&Number.isSafeInteger(grantId)&&grantId>0?
    '<button type="button" class="btn secondary" data-account-resource-revoke="'+e(kind)+'" data-resource-id="'+grantId+'">Revoke this manual item</button>':
    '<span class="small">View / source-specific workflow</span>';
   return '<tr><td>'+e(describe(x))+'</td><td>'+e(x.status||'—')+'</td><td>'+e(sourceOf(x)||'—')+'</td><td>'+e(fmtDate(expiresOf(x)))+'</td><td>'+action+'</td></tr>'
  });
  return '<h4>'+e(title)+'</h4><div class="v1355-scroll"><table class="v1355-table"><thead><tr><th>Item</th><th>Status</th><th>Issuing source</th><th>Expiration</th><th>Change</th></tr></thead><tbody>'+
    (rows.join('')||'<tr><td colspan="5">No records for this source.</td></tr>')+'</tbody></table></div>'
 };
 const isManual=x=>/^admin(?:_|$)/i.test(String(x.source||x.source_channel||'')); 
 const isActive=x=>['active','trialing'].includes(String(x.status||'').toLowerCase())&&(!x.ends_at||Date.parse(x.ends_at)>Date.now());
 const grantCatalog=info.grantCatalog||{},grantErrors=info.grantCatalogError;
 const manualGrantChoices=(arr,key,title)=>((arr||[]).map(item=>'<option value="'+e(item[key])+'">'+e(item[title]||item[key])+'</option>').join(''));
 const bookChoices=manualGrantChoices(grantCatalog.books,'product_code','short_title');
 const toolChoices=manualGrantChoices(grantCatalog.tools,'tool_code','name');
 const grantHtml=account.type==='member'?('<form id="v1479-grant-resource" class="v1352-grid">'+
   '<h4 class="full">Issue an audited manual account entitlement</h4>'+
   '<label>Grant type<select name="kind"><option value="manual_book">Book companion</option><option value="manual_tool">Platform tool</option><option value="manual_learning">Full learning access</option></select></label>'+
   '<label data-v1479-book>Book<select name="bookCode">'+bookChoices+'</select></label>'+
   '<label data-v1479-tool hidden>Tool<select name="toolCode">'+toolChoices+'</select></label>'+
   '<label>Expiration (optional)<input name="expiresAt" type="datetime-local"></label>'+
   '<label class="full">Audit reason (required, 10–500 characters)<textarea name="reason" required minlength="10" maxlength="500"></textarea></label>'+
   (grantErrors?'<p class="full small" role="alert">'+e(grantErrors)+'</p>':'')+
   '<div class="v1352-buttons full"><button type="submit" class="btn" '+(grantErrors?'disabled':'')+'>Grant selected access</button></div></form>'):'';
 const inventoryHtml=
  '<p class="small"><strong>Effective membership:</strong> '+e(verifiedPlan||'UNVERIFIED')+
    (info.effectiveError?'<br><strong>'+e(info.effectiveError)+'</strong>':'')+
    '. Source records remain available even if the final membership cannot be calculated. A dropdown change alone does not revoke a separate entitlement.</p>'+
  itemTable('Platform plan grants','grants',inv.grants,x=>x.plan_code,x=>x.source,x=>x.ends_at,x=>isManual(x)&&isActive(x)?'manual_plan':null)+
  itemTable('Payment-provider subscriptions','subscriptions',inv.subscriptions,x=>x.plan_code,x=>x.provider,x=>x.current_period_end,()=>null)+
  itemTable('Book and companion access','books',inv.books,x=>x.product_code,x=>x.source_channel,x=>x.expires_at,x=>/^admin/i.test(x.source_channel||'')?'manual_book':null)+
  itemTable('Tool passes','tools',inv.tools,x=>x.tool_code,x=>x.provider||'Owner/manual',x=>x.ends_at,x=>!x.provider&&isActive(x)?'manual_tool':null)+
  itemTable('Legacy full-learning access','legacyLearning',inv.legacyLearning,x=>x.product_key,x=>x.source,x=>x.ends_at,x=>isManual(x)&&isActive(x)?'manual_learning':null)+
  itemTable('Book Key activation history','bookKeys',inv.bookKeys,x=>x.book_code,()=>'Book Key',x=>x.ends_at,()=>null)+
  itemTable('Order/payment history','orders',inv.orders,x=>x.id,x=>x.provider,x=>x.paid_at||x.created_at,()=>null);
 const d=dialog('Edit Account — '+account.username),box=$('[data-v1352-body]',d);
 const roleOptions=[{role_code:'NONE',name:'No staff role'},...availableRoles];if(!roleOptions.some(x=>x.role_code==='OWNER'))roleOptions.push({role_code:'OWNER',name:'Owner / Super Administrator (confirmation required)'});
 const toLocal=v=>{if(!v)return '';const x=new Date(v);if(!Number.isFinite(x.getTime()))return '';const shift=x.getTimezoneOffset()*60000;return new Date(x.getTime()-shift).toISOString().slice(0,16)};
 box.innerHTML=`<div class="v1353-account-editor"><form id="v1353-identity-form" class="v1352-grid">
 <h3 class="full">Account Identity &amp; Role</h3><label>Account Type<select name="type">${Object.entries(KINDS).map(([k,v])=>`<option value="${k}" ${k===currentType?'selected':''}>${e(v)}</option>`).join('')}</select></label>
 <label>Account Role<select name="roleCode">${roleOptions.map(r=>`<option value="${e(r.role_code)}" ${currentRole===r.role_code?'selected':''}>${e(r.name)}</option>`).join('')}</select></label>
 <label>First name<input name="firstName" value="${e(account.firstName)}" required maxlength="80"></label><label>Last name<input name="lastName" value="${e(account.lastName)}" required maxlength="80"></label>
 <label>Username<input name="username" value="${e(account.username)}" required pattern="[A-Za-z][A-Za-z0-9_]{2,23}" maxlength="24"></label><label>Email<input name="email" type="email" value="${e(account.email)}" required></label>
 <label>Display name (linked to username)<input name="displayName" value="${e(account.displayName||account.username)}" readonly aria-describedby="v142-display-policy"></label><label>Date of birth — MM/DD/YYYY<input name="dateOfBirth" type="text" inputmode="numeric" autocomplete="bday" maxlength="10" placeholder="MM/DD/YYYY" value="${e(isoToUs(info.dateOfBirth||''))}"></label>
 <label class="full v1353-inlinecheck"><input type="checkbox" name="emailConfirmed"> Confirm email change when changing email address</label>
 <label class="full" data-v1353-owner-confirm hidden>To change Owner role, type CHANGE OWNER ${e(account.username)}<input name="ownerConfirmation" autocomplete="off" placeholder="CHANGE OWNER ${e(account.username)}"></label>
 <p class="full small" id="v142-display-policy">Display name is intentionally linked to username. Editing a username through this Owner-only tool also updates the display name.</p><p class="full small">Only an authenticated OWNER may update Owner identities and permissions. Mandatory MFA is not enabled. Switching a real customer account into a synthetic/test identity is blocked to protect existing production records.</p>
 <div class="v1352-buttons full"><button type="submit" class="btn">Save Identity &amp; Role</button></div></form>
 <form id="v1353-membership-form" class="v1352-grid"><h3 class="full">Membership &amp; Access Dates</h3>
 <label>Membership type<select name="planCode">${availablePlans.map(p=>`<option value="${e(p.plan_code)}" ${p.plan_code===member.planCode?'selected':''}>${e(p.name)}</option>`).join('')}</select></label>
 <label>Access begins (local time)<input name="startsAt" type="datetime-local" value="${e(toLocal(member.startsAt))}"></label>
 <label>Access ends (optional; local time)<input name="endsAt" type="datetime-local" value="${e(toLocal(member.endsAt))}"></label>
 <p class="full small">${(account.roles||[]).includes('OWNER')?'OWNER role grants independent administrator access; plan dates do not expire Owner authority. ':''}${member.synthetic?'Dummy / Showcase membership is synthetic display data only. No live entitlements are granted.':member.providerManaged?'This account has an active payment-provider subscription. Change its billing lifecycle with provider billing tools, not manual grants.':member.zeroQaActive?(member.zeroQaResettable?
  'This Monthly membership was granted by the $0 Stripe LIVE test. Select FREE and Save to cancel ONLY this test grant, preserve Stripe checkout history, and permit another test with the same account. Paid subscriptions and other access remain protected.':
  'An active $0 Stripe test grant exists, but this account is not the designated authorized QA member. It cannot be reset here.'):
  'Manual Owner changes only affect administrator-issued plan grants. Active payment-provider grants are never silently overwritten.'}</p>
 <div class="v1352-buttons full"><button type="submit" class="btn">Save Membership &amp; Dates</button></div></form>
 <form id="v1353-profile-form" class="v1352-grid"><h3 class="full">Profile &amp; Session Preferences</h3>
 <label class="full">Biography<textarea name="bio" maxlength="1000" rows="3">${e(profile.bio||'')}</textarea></label>
 <label class="full">Avatar image (HTTPS URL)<input name="avatarUrl" type="url" placeholder="https://…" value="${e(profile.avatarUrl||'')}" maxlength="1000"></label>
 <label>Time zone (IANA)<input name="timezone" value="${e(profile.timezone||'UTC')}" maxlength="64" required></label>
 <label>Language / locale<input name="locale" value="${e(profile.locale||'en-US')}" maxlength="35" required></label>
 <label>Automatic session timeout<select name="sessionTimeoutMinutes">${[[15,'15 minutes'],[30,'30 minutes'],[60,'1 hour'],[240,'4 hours'],[480,'8 hours'],[1440,'24 hours']].map(([minutes,label])=>`<option value="${minutes}" ${Number(profile.sessionTimeoutMinutes||30)===minutes?'selected':''}>${label}</option>`).join('')}</select></label>
 <p class="full small">Display name remains linked to the username under the existing identity policy. Historical verification timestamps, consent, billing, and provider-controlled fields are not fabricated or overwritten.</p>
 <div class="v1352-buttons full"><button type="submit" class="btn">Save Profile &amp; Preferences</button></div></form>
 <form id="v1353-state-form" class="v1352-grid"><h3 class="full">Account Status &amp; Moderation</h3>
 <label>Status flag<select name="status">${['active','watch','restricted','suspended'].map(v=>`<option value="${v}" ${flag.status===v?'selected':''}>${v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select></label>
 <label class="full">Reason (required when non-active)<textarea name="reason" rows="2" maxlength="1000">${e(flag.reason||'')}</textarea></label>
 <p class="full small">An administrative status flag is not a sign-in ban. Explicitly use a sign-in suspension control below to block authentication; access rules and forum privileges remain server-controlled.</p>
 <div class="v1352-buttons full"><button type="submit" class="btn">Save Account Status</button></div></form>
 <section class="v1353-danger"><h3>Authentication &amp; Recovery</h3><p class="v1353-info">Email verified: <strong>${account.emailConfirmed?'Yes':'No'}</strong> · Last sign-in: <strong>${e(account.lastSignInAt?new Date(account.lastSignInAt).toLocaleString():'Not recorded')}</strong> · Created: <strong>${e(account.createdAt?new Date(account.createdAt).toLocaleString():'Not recorded')}</strong><br>Current sign-in suspension: <strong>${isBanned?'Active until '+e(new Date(account.bannedUntil).toLocaleString()):'None recorded'}</strong></p>
 <div class="v1353-jump"><button class="btn secondary" type="button" data-editor-action="password">${account.id===viewerId&&currentType==='owner'?'Change My Password':'Reset Password'}</button><button class="btn secondary" type="button" data-editor-action="ban24" ${account.id===viewerId||currentType==='owner'?'disabled':''}>Suspend Sign-in 24 Hours</button><button class="btn secondary" type="button" data-editor-action="ban7" ${account.id===viewerId||currentType==='owner'?'disabled':''}>Suspend Sign-in 7 Days</button><button class="btn secondary" type="button" data-editor-action="unban">Restore Sign-in</button></div>
 <p class="small">Real member passwords cannot be displayed. Only properly encrypted disposable Dummy / Showcase credentials may be revealed.</p></section>
 <section id="v1479-account-resource-control"><h3>All Account Entitlements &amp; Revocation</h3>
 <p class="small">This is the account's source-aware ledger. Owner-issued manual grants can be revoked individually with an audited reason. Stripe subscriptions, paid purchases, original Book Keys and transaction history must be managed through their actual source lifecycle, not deleted. An unavailable ledger is shown as an error, never as an empty list.</p>
 ${inventoryHtml}
 ${grantHtml}
 <div class="v1353-jump"><button type="button" class="btn secondary" data-editor-action="access">Issue book or tool grant</button><button type="button" class="btn secondary" data-editor-action="roles">Account roles &amp; permissions</button><button type="button" class="btn secondary" data-editor-action="activity">Account activity &amp; audit</button></div></section>
 <form id="v1353-notes-form" class="v1352-grid"><h3 class="full">Internal Account Notes &amp; Support</h3>
 <label>Note category<select name="noteType">${['general','support','moderation','commerce','learning','security'].map(x=>`<option value="${x}">${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></label>
 <label class="full">Add internal note<textarea name="note" rows="3" minlength="2" maxlength="3000" required></textarea></label>
 <div class="v1352-buttons full"><button type="submit" class="btn secondary">Save Internal Note</button></div>
 <div class="full"><h4>Recent support and administrative notes</h4>${(info.notes||[]).map(n=>`<p class="v1353-info"><strong>${e(n.note_type)}</strong> — ${e(n.created_at?new Date(n.created_at).toLocaleString():'Not dated')}<br>${e(n.note)}</p>`).join('')||'<p>No internal notes are recorded for this account.</p>'}</div></form>
 <section class="v1353-danger"><h3>Permanent Account Deletion</h3><p>Deletion is guarded by typed confirmation, a recorded reason, financial record checks, and last-Owner protection.</p><button type="button" class="btn danger" data-editor-action="delete" ${account.id===viewerId?'disabled':''}>Delete This Account</button></section>
 </div>`;
 const f=$('#v1353-identity-form',box),mf=$('#v1353-membership-form',box),pf=$('#v1353-profile-form',box),sf=$('#v1353-state-form',box),nf=$('#v1353-notes-form',box),t=f.elements.type,r=f.elements.roleCode;maskDob(f.elements.dateOfBirth);
 const sync=()=>{
  if(!canAssignStaff)return;
  if(t.value==='owner')r.value='OWNER';else if(t.value==='moderator')r.value='MODERATOR';
  else if(t.value==='admin'&&['NONE','OWNER','MODERATOR'].includes(r.value))r.value='ADMIN';
  else if(t.value==='member'||t.value==='test'||t.value==='showcase')r.value='NONE';
  r.disabled=t.value==='showcase'||t.value==='test';
  $('[data-v1353-owner-confirm]',f).hidden=!(((account.roles||[]).includes('OWNER')&&r.value!=='OWNER')||(!(account.roles||[]).includes('OWNER')&&r.value==='OWNER'));
 };
 t.onchange=sync;r.onchange=()=>{
  if(r.value==='OWNER')t.value='owner';else if(r.value==='MODERATOR')t.value='moderator';else if(r.value==='NONE'&&!['showcase','test'].includes(t.value))t.value='member';else if(!['test','showcase'].includes(t.value))t.value='admin';
  $('[data-v1353-owner-confirm]',f).hidden=!(((account.roles||[]).includes('OWNER')&&r.value!=='OWNER')||(!(account.roles||[]).includes('OWNER')&&r.value==='OWNER'));
 };sync();
 if(!canAssignStaff){t.disabled=true;r.disabled=true}
 if(member.providerManaged)mf.querySelector('button[type=submit]').disabled=true;
 window.GroundUpAccountItems?.mount({box,modal:d,account,info,api,refresh:load,notify:say});
 d.showModal();f.onsubmit=async ev=>{ev.preventDefault();const btn=$('button[type=submit]',f);btn.disabled=true;try{const vals=Object.fromEntries(new FormData(f));if(r.disabled)vals.roleCode='NONE';if(vals.dateOfBirth)vals.dateOfBirth=usToIso(vals.dateOfBirth);await api('edit',{...vals,userId:a.id,emailConfirmed:!!f.elements.emailConfirmed?.checked});d.close();await load();say(`Account identity and role updated for ${a.username}.`,'ok')}catch(err){$('[data-v1352-error]',d).textContent=err.message;btn.disabled=false}};
 mf.onsubmit=async ev=>{ev.preventDefault();const btn=$('button[type=submit]',mf);btn.disabled=true;try{const vals=Object.fromEntries(new FormData(mf));const s=vals.startsAt?new Date(vals.startsAt).toISOString():null,end=vals.endsAt?new Date(vals.endsAt).toISOString():null;
 const result=await api('membership',{userId:a.id,planCode:vals.planCode,startsAt:s,endsAt:end});
 d.close();await load();say(result.membership?.zeroQaResetCount>0?
   `Confirmed: ${a.username}'s $0 LIVE test grant was canceled and effective membership is FREE. You may retest from the Store using the same account.`:
   `Membership updated for ${a.username}. Effective plan: ${result.membership?.planCode||vals.planCode}.`,'ok')}catch(err){$('[data-v1352-error]',d).textContent=err.message;btn.disabled=false}};
 async function submitSecondary(ev,action,values,message){ev.preventDefault();const form=ev.currentTarget,btn=$('button[type=submit]',form);btn.disabled=true;$('[data-v1352-error]',d).textContent='';try{await api(action,{userId:a.id,...values(form)});d.close();await load();say(message,'ok')}catch(err){$('[data-v1352-error]',d).textContent=err.message;btn.disabled=false}}
 pf.onsubmit=ev=>submitSecondary(ev,'profile',form=>Object.fromEntries(new FormData(form)),`Profile updated for ${account.username}.`);
 sf.onsubmit=ev=>submitSecondary(ev,'flag',form=>Object.fromEntries(new FormData(form)),`Account status updated for ${account.username}.`);
 nf.onsubmit=ev=>submitSecondary(ev,'note',form=>Object.fromEntries(new FormData(form)),`Internal note saved for ${account.username}.`);
 const grantForm=$('#v1479-grant-resource',box);
 if(grantForm){
   const sync=()=>{const kind=grantForm.elements.kind.value;
     $('[data-v1479-book]',grantForm).hidden=kind!=='manual_book';
     $('[data-v1479-tool]',grantForm).hidden=kind!=='manual_tool';
   };
   grantForm.elements.kind.onchange=sync;sync();
   grantForm.onsubmit=async ev=>{
     ev.preventDefault();const btn=grantForm.querySelector('button[type="submit"]');
     const kind=grantForm.elements.kind.value,code=kind==='manual_book'?grantForm.elements.bookCode.value:
       kind==='manual_tool'?grantForm.elements.toolCode.value:'FULL_LEARNING_ACCESS';
     const reason=grantForm.elements.reason.value.trim();
     const expiry=grantForm.elements.expiresAt.value;
     if(!code||reason.length<10||reason.length>500){$('[data-v1352-error]',d).textContent='Choose an item and a 10–500 character reason.';return}
     if(!window.confirm('Issue one verified '+kind.replace('manual_','')+' entitlement for '+account.username+'? This does NOT represent a purchase or subscription.'))return;
     btn.disabled=true;
     try{
       const result=await api('grant_resource',{userId:account.id,kind,code,
         expiresAt:expiry?new Date(expiry).toISOString():null,reason});
       if(!result.granted)throw Error('Database did not confirm grant.');
       d.close();await load();say('Verified new manual '+kind+' for '+account.username+'.','ok');
     }catch(err){$('[data-v1352-error]',d).textContent=err.message;btn.disabled=false}
   };
 }
 box.querySelectorAll('[data-account-resource-revoke]').forEach(button=>button.onclick=async()=>{
   const kind=button.dataset.accountResourceRevoke,recordId=Number(button.dataset.resourceId);
   if(!['manual_plan','manual_book','manual_tool','manual_learning'].includes(kind)||
      !Number.isSafeInteger(recordId)||recordId<1)return;
   if(!window.confirm('Revoke exactly this Owner-issued '+kind.replace('manual_','')+' item for '+account.username+'? This does not refund Stripe charges or delete financial history.'))return;
   const reason=window.prompt('Required audit reason for revoking this specific member entitlement (10–500 characters):','Repeatable membership testing / Owner-directed access correction');
   if(reason===null)return;
   if(reason.trim().length<10||reason.trim().length>500){$('[data-v1352-error]',d).textContent='Provide a 10–500 character revocation reason.';return}
   button.disabled=true;
   try{
     const result=await api('revoke_resource',{userId:account.id,kind,recordId,reason:reason.trim()});
     if(!result.revoked)throw Error('Database did not confirm a specific entitlement revocation.');
     d.close();await load();
     say('Confirmed revoked '+kind+' item '+recordId+' for '+account.username+
       (result.effectiveVerified?' · Effective plan: '+result.effectivePlan:
        ' · Effective plan unverified: refresh and reconcile other active sources.'),'ok');
   }catch(err){$('[data-v1352-error]',d).textContent=err.message;button.disabled=false}
 });
 box.querySelectorAll('[data-editor-action]').forEach(button=>button.onclick=async()=>{const what=button.dataset.editorAction;
  if(what==='password'){d.close();return resetForm(account)}
  if(what==='delete'){d.close();return deleteForm(account)}
  if(['ban24','ban7','unban'].includes(what)){
   const duration=what==='ban24'?'24h':what==='ban7'?'168h':'none';
   if(!window.confirm(duration==='none'?'Restore this account’s ability to sign in?':'Suspend this account’s authentication for the selected duration?'))return;
   button.disabled=true;try{await api('ban',{userId:account.id,duration});d.close();await load();say('Authentication restriction updated for '+account.username+'.','ok')}catch(err){$('[data-v1352-error]',d).textContent=err.message;button.disabled=false}return;
  }
  d.close();if(what==='access'){try{await window.GroundUpAccountAccess?.openForUser(account.id)}catch(err){say(err.message,'error')}return}
  if(what==='roles'){$('[data-panel=roles]')?.click();return}
  if(what==='activity'){await window.GroundUpAccountAccess?.open('activity');return}
 });
 if(info.synthetic){const warning=document.createElement('p');warning.className='v1353-info';warning.textContent='SHOWCASE — synthetic demonstration only. Editing is disabled; production accounts are not exposed.';box.prepend(warning);box.querySelectorAll('form input,form select,form textarea,form button,section button').forEach(el=>el.disabled=true)}
}
async function selfOwnerPassword(a){const s=await session();const d=dialog('Change My Owner Password');$('[data-v1352-body]',d).innerHTML=`<p>Supabase Auth does not expose existing passwords. Only your authenticated Owner account can change this password. No mandatory MFA enrollment is required. At least 10 characters, uppercase, lowercase, and a symbol from !@#$%^&amp;*+_?.</p><form><label>New password<input name="password" type="password" minlength="10" maxlength="120" autocomplete="new-password" required></label><label>Confirm new password<input name="again" type="password" minlength="10" maxlength="120" autocomplete="new-password" required></label><button type="submit" class="btn">Change My Password</button></form>`;const f=$('form',d);d.showModal();f.onsubmit=async ev=>{ev.preventDefault();const pw=f.elements.password.value;if(pw!==f.elements.again.value){$('[data-v1352-error]',d).textContent='Passwords do not match.';return}if(!strongPassword(pw)){$('[data-v1352-error]',d).textContent='Password must have 10+ characters, uppercase, lowercase and a symbol from !@#$%^&*+_?.';return}try{const sb=await window.getSupabaseClient(),r=await sb.auth.updateUser({password:pw});if(r.error)throw r.error;f.reset();d.close();say('Your own Owner password has been changed.','ok')}catch(err){$('[data-v1352-error]',d).textContent=err.message}}}
async function resetForm(a){
 if(a.type==='owner'&&a.id===viewerId)return selfOwnerPassword(a);
 const d=dialog('Reset Password — '+a.username);
 $('[data-v1352-body]',d).innerHTML=`<form><p>Existing real-account passwords cannot be retrieved. Choose a new password and repeat it, or leave both fields empty to generate one. ${e(PW_RULE)}</p>
 <label>New password<input name="newPassword" type="password" minlength="10" maxlength="120" autocomplete="new-password" placeholder="Leave blank to generate"></label>
 <label>Confirm new password<input name="confirmPassword" type="password" minlength="10" maxlength="120" autocomplete="new-password" placeholder="Repeat your chosen password"></label>
 <button class="btn" type="submit">Replace Password</button></form>`;
 const f=$('form',d);d.showModal();f.onsubmit=async ev=>{ev.preventDefault();const btn=$('button[type=submit]',f);
 const data=Object.fromEntries(new FormData(f).entries());if(data.newPassword){if(!strongPassword(data.newPassword)||data.newPassword!==data.confirmPassword){$('[data-v1352-error]',d).textContent='Password needs 10+ characters, uppercase, lowercase, symbol, and exact confirmation.';return}}
 else if(data.confirmPassword){$('[data-v1352-error]',d).textContent='Leave both fields empty for automatic generation.';return}
 if(a.type==='owner'&&!confirm('Replace the password for another Owner? This action will be audited.'))return;
 btn.disabled=true;try{const r=await api('password',{userId:a.id,...data});d.close();showPassword(r.temporaryPassword,`New credential for ${a.username}.`,!!r.storedForLater)}catch(err){$('[data-v1352-error]',d).textContent=err.message;btn.disabled=false}}}
async function reveal(a){if(!confirm('View the stored disposable credential for '+a.username+'?'))return;
 try{const r=await api('reveal',{userId:a.id});showPassword(r.temporaryPassword,'Encrypted dummy/Showcase credential retrieved.',true)}catch(err){say(err.message,'error')}}
async function deleteForm(a){const phrase='DELETE ACCOUNT';const d=dialog('Delete Account — '+a.username);$('[data-v1352-body]',d).innerHTML=`<form><div class="v1352-danger"><strong>Permanent deletion.</strong> Financially linked accounts are blocked. The last Owner and self-deletion remain blocked; permanent deletion requires explicit confirmation.</div><label>Reason (minimum 10 characters)<textarea name="reason" required minlength="10" maxlength="1000"></textarea></label><label>Type ${e(phrase)} exactly<input name="confirmation" required autocomplete="off"></label>${a.type==='owner'?`<label>Owner-only secondary confirmation: Type DELETE OWNER ${e(a.username)}<input name="ownerConfirmation" required autocomplete="off"></label>`:''}<button type="submit" class="btn danger">Permanently Delete Account</button></form>`;const f=$('form',d);d.showModal();f.onsubmit=async ev=>{ev.preventDefault();const btn=$('button[type=submit]',f);btn.disabled=true;try{const r=await api('delete',{userId:a.id,...Object.fromEntries(new FormData(f))});d.close();await load();say(`Account ${a.username} deleted.`,'ok')}catch(err){$('[data-v1352-error]',d).textContent=err.message;btn.disabled=false}}}
window.GroundUpAccountEditor={openManagement:openTab,openCreate:()=>{openTab();createForm()},openById:async id=>{try{const d=await api('detail',null,{id});if(!d.account)throw Error('Account not found.');$('#admin-user-dialog')?.close();openTab();await editForm(d.account)}catch(error){window.alert('Account editor: '+error.message)}}};
function init(){let tries=0;const i=setInterval(()=>{tries++;if(mount()||tries>90)clearInterval(i);retireOld();extendLegacy()},300);window.addEventListener('hashchange',()=>{if(location.hash==='#account-management'&&pane())openTab()});const legacy=$('#admin-user-detail');if(legacy){const obs=new MutationObserver(()=>extendLegacy());obs.observe(legacy,{subtree:true,childList:true});}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
