(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr=s=>esc(s).replace(/`/g,'&#96;');
const fmt=d=>d?new Date(d).toLocaleString():'';
let SB,USER,LAB,PROGRESS;
function state(title,body,action=''){return `<div class="fe-state"><strong>${esc(title)}</strong><span>${esc(body)}</span>${action}</div>`}
async function auth(){SB=await window.getSupabaseClient();const {data}=await SB.auth.getSession();if(!data.session){location.replace(`signin.html?next=${encodeURIComponent(location.pathname+location.search)}`);return false}USER=data.session.user;return true}
function links(m){const urls=Array.isArray(m.source_urls)?m.source_urls.filter(u=>{try{const x=new URL(u);return ['https:','http:'].includes(x.protocol)}catch{return false}}):[];if(!urls.length)return '';
 return `<section class="v133-lab-panel"><div class="eyebrow">References</div><h2>Sources and supporting material</h2><p>Use these references to verify mechanics or supporting context. The exercise itself should still be completed without hindsight.</p><div class="v133-ref-list">${urls.map((u,i)=>`<a href="${attr(u)}" target="_blank" rel="noopener noreferrer">Reference ${i+1}<span aria-hidden="true">↗</span></a>`).join('')}</div></section>`}
function infoChip(label,val){return val?`<span class="v133-lab-chip"><strong>${esc(label)}:</strong> ${esc(val)}</span>`:''}
function render(){const host=document.getElementById('v133-site-lab'),m=LAB.metadata||{},qs=Array.isArray(m.questions)?m.questions:[],steps=Array.isArray(m.how)?m.how:[],resp=PROGRESS?.responses||{};
 document.title=`${LAB.lab_id} — ${LAB.title}`;const crumb=document.getElementById('v133-lab-crumb');if(crumb)crumb.textContent=LAB.lab_id;
 const warning=m.historical_tape_warning?`<div class="v133-tape-warning"><strong>Tape-data boundary</strong><p>${esc(m.historical_tape_warning)}</p></div>`:'';
 const anchor=m.historical_anchor?`<section class="v133-lab-panel"><div class="eyebrow">Historical anchor</div><h2>Practice context</h2><p>${esc(typeof m.historical_anchor==='string'?m.historical_anchor:JSON.stringify(m.historical_anchor))}</p></section>`:'';
 const tool=m.tool_href?`<a class="btn secondary" href="${attr(m.tool_href)}">Open Related Tool</a>`:'';
 const sim=LAB.ticker?`<a class="btn secondary" href="simulator.html?symbol=${encodeURIComponent(LAB.ticker)}${LAB.historical_date?`&date=${encodeURIComponent(LAB.historical_date)}`:''}">Open Simulator</a>`:'';
 host.innerHTML=`
 <article class="v133-lab-hero">
   <div class="eyebrow">${esc(LAB.book_label||m.track||'Historical Lab')}</div>
   <div class="v133-lab-title-row"><div><h1>${esc(LAB.title)}</h1><p class="v133-lab-code">${esc(LAB.lab_id)}</p></div><span id="v133-progress-pill" class="v133-lab-chip">${esc((PROGRESS?.status||'not_started').replaceAll('_',' '))}</span></div>
   <div class="v133-lab-meta">${infoChip('Book',LAB.book_label)}${infoChip('Chapter',LAB.chapter_number)}${infoChip('Ticker',LAB.ticker)}${infoChip('Date',LAB.historical_date)}${infoChip('Timeframe',LAB.timeframe)}${infoChip('Difficulty',m.difficulty)}${infoChip('Mode',m.mode)}</div>
 </article>
 ${window.GroundUpLabNarrative(LAB)}
 <form id="v133-lab-form" class="v133-lab-panel">
  <div class="eyebrow">Your work</div><h2>Answer before you reveal more information</h2>
  <p>Write what you could support at the decision point. Do not rewrite the answer after seeing the later outcome.</p>
  <div class="v133-question-list">${qs.map((question,i)=>`<label><span>${i+1}. ${esc(question)}</span><textarea data-q="q${i+1}" rows="5" placeholder="Write your answer…">${esc(resp[`q${i+1}`]||'')}</textarea></label>`).join('')}</div>
  <label class="v133-reflection"><span>Decision / reflection notes</span><textarea data-q="reflection" rows="7" placeholder="Evidence, inference, invalidation, next action, and review notes…">${esc(resp.reflection||'')}</textarea></label>
 </form>
 ${links(m)}
 <section class="v133-lab-panel"><h2>Author-created replay scenario</h2><p>Practice the decision boundary with an ORIGINAL FICTIONAL OHLCV sequence created for this Lab. Its ticker, timestamps, prices and volume are invented and are not historical evidence. The existing private replay engine reveals one bar at a time.</p><a class="btn secondary" href="verified-replay.html?dataset=${encodeURIComponent('GUSIM_'+LAB.lab_id.replaceAll('-','_'))}">Open Original Simulated Replay</a></section>
 <section class="v133-lab-panel" aria-label="Reviewed assessment" id="v133-graded-assessment"><h2>Step-by-step knowledge assessment</h2><p>This is separate from your reflection worksheet. A graded assessment appears only after a private answer key is independently reviewed. Hypothetical teaching examples are not historical market data.</p><div id="v133-training-workspace"></div></section>
 <div class="v133-lab-sticky"><div><strong id="v133-save-state">${PROGRESS?.updated_at?`Last saved ${esc(fmt(PROGRESS.updated_at))}`:'Not saved yet'}</strong><span>Progress is saved to your account.</span></div><div class="actions"><a class="btn secondary" href="labs.html">Back to Registry</a>${tool}${sim}<button class="btn secondary" id="v133-save" type="button">Save Draft</button><button class="btn" id="v133-complete" type="button">Complete Reflection (Ungraded)</button></div></div>`;
 document.getElementById('v133-save').onclick=()=>save(false);document.getElementById('v133-complete').onclick=()=>save(true);
 const training=document.getElementById('v133-training-workspace');if(training&&window.GroundUpInteractiveTraining)window.GroundUpInteractiveTraining.begin(LAB.lab_id,'guided',training);
}
function responses(){const o={};document.querySelectorAll('#v133-lab-form [data-q]').forEach(el=>o[el.dataset.q]=el.value.trim());return o}
async function save(complete){const m=LAB.metadata||{},qs=Array.isArray(m.questions)?m.questions:[],r=responses(),status=document.getElementById('v133-save-state');if(complete){if(!qs.length&&String(r.reflection||'').trim().length<60){status.textContent='Record at least 60 characters of your own lesson-based observation before marking this reference exercise complete.';document.querySelector('[data-q=reflection]')?.focus();return}const missing=qs.map((_,i)=>`q${i+1}`).filter(k=>!r[k]);if(missing.length){status.textContent='Answer every required Lab question before marking complete.';document.querySelector(`[data-q="${missing[0]}"]`)?.focus();return}}
 status.textContent='Saving…';const now=new Date().toISOString(),body={user_id:USER.id,lab_id:LAB.lab_id,status:complete?'completed':'in_progress',responses:r,started_at:PROGRESS?.started_at||now,completed_at:complete?now:null,updated_at:now};
 const {data,error}=await SB.from('site_lab_progress').upsert(body,{onConflict:'user_id,lab_id'}).select().single();if(error){status.textContent=`Save failed: ${error.message}`;return}PROGRESS=data;document.getElementById('v133-progress-pill').textContent=complete?'completed':'in progress';status.textContent=complete?'Ungraded reflection saved. A reviewed assessment score requires the separate step-wise assessment.':`Saved ${new Date().toLocaleTimeString()}`;
}
async function init(){const host=document.getElementById('v133-site-lab');if(!host||!(await auth()))return;const id=(new URLSearchParams(location.search).get('lab')||'').trim();if(!id){host.innerHTML=state('Lab ID missing','Return to the Lab Registry and choose an exercise.','<a class="btn" href="labs.html">Lab Registry</a>');return}
 const [{data:lab,error},{data:progress}]=await Promise.all([SB.from('platform_labs').select('*').eq('lab_id',id).eq('active',true).eq('registry_visible',true).maybeSingle(),SB.from('site_lab_progress').select('*').eq('user_id',USER.id).eq('lab_id',id).maybeSingle()]);
 if(error||!lab){host.innerHTML=state('Lab unavailable',error?.message||'This Lab is not currently available.','<a class="btn" href="labs.html">Lab Registry</a>');return}LAB=lab;PROGRESS=progress||null;LAB.book_label=LAB.metadata?.book_label||({DAY_TRADING_BOOK_1:'Day Trading',READING_THE_TAPE:'Reading the Tape',SITE_EXCLUSIVE:'Site-Exclusive Labs'}[LAB.book_code]||LAB.book_code);render()}
document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));
})();
