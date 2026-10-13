/* v0.13.5 learner-led replay: case facts from verified platform_labs, locked first decision.
 * No hindsight, no trading API integration, no automatically graded competence. */
(()=>{'use strict';
const q=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session,verifiedLabs=[];
async function req(url,opts={}){const r=await fetch(url,{...opts,headers:{authorization:'Bearer '+session.access_token,...(opts.body?{'content-type':'application/json'}:{}),...(opts.headers||{})},cache:'no-store'}),j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'Request failed');return j}
function history(entries){const target=q('#v135-replay-history');if(!target)return;target.innerHTML=entries.length?entries.map(x=>`<article class="v135-card"><strong>${esc(x.ticker)} • ${esc(x.historical_date)}</strong><p>${esc(x.decision)} at ${esc(x.decision_time_et)} ET • ${new Date(x.locked_at).toLocaleString()}</p>${x.reviewed_at?'<p class="small">Reviewed • Self-reported (not scored)</p>':`<button class="btn secondary" type="button" data-review="${esc(x.id)}">Record outcome and reflection</button>`}</article>`).join(''):'<p class="small">No locked replay decisions yet.</p>';
 target.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>{q('#v135-review-id').value=b.dataset.review;q('#v135-review').hidden=false;q('#v135-review').scrollIntoView({behavior:'smooth',block:'center'})});}
async function recent(){const j=await req('/api/replay-practice-v0135?action=recent');history(j.entries||[])}
const inform=t=>{q('#v135-replay-result').textContent=t};
async function initialize(){try{const sb=await window.getSupabaseClient(),{data:{session:s}}=await sb.auth.getSession();if(!s)return;session=s;
 const access=await req('/api/ondemand-training');if(access.access!=='active')return;verifiedLabs=access.labs||[];if(!verifiedLabs.length)return;
 const box=q('#v135-replay-practice');box.hidden=false;const select=q('#v135-lab-id');
 verifiedLabs.forEach(x=>{const el=document.createElement('option');el.value=x.id;el.textContent=`${x.ticker} — ${x.date} — ${x.title}`;select.append(el)});
 select.onchange=()=>{const x=verifiedLabs.find(y=>y.id===select.value);q('#v135-selected-case').textContent=x?`Historical date: ${x.date}; ticker: ${x.ticker}. Confirm actual platform availability before proceeding.`:''};select.onchange();
 q('#v135-lock').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,data=Object.fromEntries(new FormData(f).entries());inform('Locking your decision…');try{const v=await req('/api/replay-practice-v0135?action=lock',{method:'POST',body:JSON.stringify(data)});inform(v.notice+' Session ID: '+v.entry.id);f.reset();select.onchange();await recent()}catch(err){inform(err.message)}};
 q('#v135-review').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,data=Object.fromEntries(new FormData(f).entries());inform('Recording review…');try{const v=await req('/api/replay-practice-v0135?action=review',{method:'POST',body:JSON.stringify(data)});inform(v.notice);f.reset();f.hidden=true;await recent()}catch(err){inform(err.message)}};
 await recent();
}catch(err){const p=q('#v135-replay-result');if(p)p.textContent='Replay journal unavailable: '+err.message}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();
