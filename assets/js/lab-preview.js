/* Member-style Lab preview: same section structure/class names as site-lab.html;
 * intentionally NO progress read or write and NO member entitlement bypass. */
(()=>{'use strict';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
const chip=(name,val)=>val?`<span class="v133-lab-chip"><strong>${esc(name)}:</strong> ${esc(val)}</span>`:'';
function show(l,preview){const m=l.metadata||{},steps=Array.isArray(m.how)?m.how:[],qs=Array.isArray(m.questions)?m.questions:[],urls=Array.isArray(m.source_urls)?m.source_urls:[];
 const label=m.book_label||({DAY_TRADING_BOOK_1:'Day Trading',READING_THE_TAPE:'Reading the Tape',SITE_EXCLUSIVE:'Site-Exclusive Labs'}[l.book_code]||l.book_code||'Historical Lab');
 document.title='Lab Preview · '+l.lab_id;$('#v133-lab-crumb').textContent=l.lab_id;
 $('#v133-site-lab').innerHTML=`<article class="v133-lab-hero"><div class="eyebrow">${esc(label)}</div><div class="v133-lab-title-row"><div><h1>${esc(l.title||l.lab_id)}</h1><p class="v133-lab-code">${esc(l.lab_id)}</p></div><span class="v133-lab-chip">Not started · preview</span></div><div class="v133-lab-meta">${chip('Book',label)}${chip('Chapter',l.chapter_number)}${chip('Ticker',l.ticker)}${chip('Date',l.historical_date)}${chip('Timeframe',l.timeframe)}${chip('Difficulty',m.difficulty)}${chip('Mode',m.mode)}</div></article>
 ${window.GroundUpLabNarrative(l)}
 <section class="v133-lab-panel"><div class="eyebrow">Your work</div><h2>Answer before you reveal more information</h2><p>This is a read-only administrative preview. No answers or progress can be saved here.</p><div class="v133-question-list">${qs.map((q,i)=>`<label><span>${i+1}. ${esc(q)}</span><textarea rows="5" disabled placeholder="Member response field (preview only)"></textarea></label>`).join('')}</div><label class="v133-reflection"><span>Decision / reflection notes</span><textarea rows="7" disabled placeholder="Member response field (preview only)"></textarea></label></section>
 ${urls.length?`<section class="v133-lab-panel"><div class="eyebrow">References</div><h2>Sources and supporting material</h2><div class="v133-ref-list">${urls.filter(x=>/^https:\/\//i.test(String(x))).map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Reference ${i+1} ↗</a>`).join('')}</div></section>`:''}
 <div class="v133-lab-sticky"><div><strong>Read-only preview</strong><span>Member Save Draft and Mark Complete actions are unavailable.</span></div><div class="actions"><a class="btn secondary" href="/admin.html#site-labs">Back to Lab Manager</a><button type="button" class="btn secondary" disabled>Save Draft</button><button type="button" class="btn" disabled>Mark Complete</button></div></div>`;
 const status=$('#v1355-preview-status');status.textContent=preview.synthetic?'Synthetic showcase example; production records are not shown.':preview.memberVisible===false?preview.warning:'This Lab is available to members if their account has the required access. This preview does not test entitlement grants.';
 status.className=preview.memberVisible===false?'v1355-preview-warning':'v1355-preview-note';
}
async function start(){const params=new URLSearchParams(location.search),id=params.get('lab')||'',box=$('#v1355-preview-status');if(!/^[A-Za-z0-9._-]{2,90}$/.test(id)){box.textContent='Invalid or missing Lab ID.';return}
 try{const sb=await window.getSupabaseClient(),session=(await sb.auth.getSession()).data?.session;if(!session){location.replace('/signin.html?next='+encodeURIComponent(location.pathname+location.search));return}
 const r=await fetch('/api/admin-lab-preview-v01355?lab='+encodeURIComponent(id),{headers:{authorization:'Bearer '+session.access_token},cache:'no-store'}),p=await r.json();if(!r.ok||!p.ok)throw Error(p.error||'Preview access denied.');show(p.lab,p)}catch(e){box.textContent=e.message||'Lab preview unavailable.'}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
