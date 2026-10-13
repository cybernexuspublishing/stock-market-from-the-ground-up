/* Dashboard module group: metrics and settings presentation. */

/* v0.13.5 — actual member Overview metrics. No fixed '419' or fabricated access totals. */
(()=>{'use strict';if(!/^\/dashboard(?:\.html)?$/i.test(location.pathname))return;
let currentHost=null,pend=null;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numeric=x=>Number.isFinite(Number(x))?String(x):'—';
async function fill(box){const sb=await window.getSupabaseClient(),{data:{session}}=await sb.auth.getSession();if(!session)return;
const [r,a,prog,skills]=await Promise.all([
 sb.from('platform_labs').select('lab_id,book_code,active,registry_visible,public_sample').eq('active',true).eq('registry_visible',true),
 window.PlatformAccess?.get?.()||Promise.resolve(null),
 sb.from('site_lab_progress').select('lab_id,status,completed_at,started_at').eq('user_id',session.user.id),
 fetch('/api/competencies?action=summary',{headers:{authorization:'Bearer '+session.access_token},cache:'no-store'}).then(v=>v.ok?v.json():null).catch(()=>null)
]);if(!box.isConnected)return;
const labs=r.data||[],included=new Set((a?.books||[]).filter(b=>b.included).map(b=>b.productCode||b.bookCode).filter(Boolean));
const all=!!(a?.allTools||['FULL_MONTHLY','FULL_ANNUAL','LIFETIME','BOOK_TRIAL'].includes(a?.planCode)||a?.tools?.some(t=>t.toolCode==='INTERACTIVE_LEARNING'&&t.included));
const permitted=x=>all||x.public_sample||included.has(x.book_code);
const eligible=labs.filter(permitted);const progress=(prog.data||[]).filter(x=>eligible.some(l=>l.lab_id===x.lab_id));
const done=new Set(progress.filter(x=>x.status==='completed').map(x=>x.lab_id)).size;
const doing=new Set(progress.filter(x=>x.status==='in_progress').map(x=>x.lab_id)).size;
const assessed=(skills?.skills||[]).filter(x=>x.score!==null&&x.score!==undefined).length;
const totalSkills=(skills?.skills||[]).length;
const toolCount=(a?.tools||[]).filter(t=>t.included&&t.status!=='retired').length;
const cards=[
 ['Platform Labs',r.error?'—':labs.length,'Visible active Labs (not a membership entitlement)'],
 ['Your Labs',r.error?'—':eligible.length,'Available under your current access'],
 ['Labs Completed',prog.error?'—':done,'Unique accessible Lab IDs'],
 ['In Progress',prog.error?'—':doing,'Unique accessible Lab IDs'],
 ['Books Available',(a?.books||[]).filter(b=>b.included).length,'Companion branches'],
 ['Skills Assessed',totalSkills?`${assessed} / ${totalSkills}`:'—','Skills with scored evidence'],
 ['Tools Included',toolCount,'Current membership tools']
];box.innerHTML=cards.map(([name,value,note])=>`<article><strong>${escape(value)}</strong><span>${escape(name)}</span><small>${escape(note)}</small></article>`).join('');}
function check(){const summary=document.querySelector('.v1321-overview .v1324-summary-grid');if(!summary||summary===currentHost)return;currentHost=summary;const box=document.createElement('section');box.id='v135-overview-strip';box.className='v135-overview-strip';box.setAttribute('aria-label','Current platform and personal learning metrics');summary.insertAdjacentElement('afterend',box);box.innerHTML='<p>Loading learning metrics…</p>';fill(box).catch(()=>box.textContent='Learning counts are temporarily unavailable.');}
function init(){new MutationObserver(()=>{clearTimeout(pend);pend=setTimeout(check,140)}).observe(document.body,{childList:true,subtree:true});check()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();})();


/* Consolidate Book Access under My Books, and eliminate the nested full-page frame.
   The older legacy key redemption remains available in a compact dialog. */
(()=>{'use strict';if(!/^\/dashboard(?:\.html)?$/i.test(location.pathname))return;
let busy=false;function restore(){if(busy)return;const wrap=document.querySelector('.v1324-book-access');if(!wrap||wrap.dataset.v135Refactored)return;wrap.dataset.v135Refactored='1';busy=true;
wrap.innerHTML='<div class="v135-book-activate-inline"><p>Books, access status and QR activation now live in <strong>My Books</strong>. Your existing Book Keys continue to work.</p><div class="v135-actions"><a class="btn" href="/my-books.html">Open My Books</a><a class="btn secondary" href="/activate-book.html">Activate Book QR</a><button type="button" class="btn secondary" data-v135-key>Redeem Legacy Book Key</button></div></div>';
wrap.querySelector('[data-v135-key]').onclick=()=>{let d=document.getElementById('v135-legacy-key-dialog');if(!d){d=document.createElement('dialog');d.id='v135-legacy-key-dialog';d.className='v135-legacy-dialog';d.innerHTML='<div class="v135-dialog-head"><h2>Redeem a Book Key</h2><button type="button" class="btn secondary" data-close>Close</button></div><iframe title="Legacy Book Key redemption" loading="lazy" src="/settings.html?embedded=1&section=book-access"></iframe>';document.body.appendChild(d);d.querySelector('[data-close]').onclick=()=>d.close()}d.showModal()};busy=false}
let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(restore,120)}).observe(document.body,{childList:true,subtree:true});restore();})();

