(()=>{'use strict';
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const q=s=>document.querySelector(s);
const status=(s)=>{q('#v135-training-status').textContent=s};
async function init(){try{const sb=await window.getSupabaseClient(),{data:{session}}=await sb.auth.getSession();if(!session)throw new Error('Sign in to see your training access.');
const response=await fetch('/api/ondemand-training',{headers:{authorization:'Bearer '+session.access_token},cache:'no-store'}),r=await response.json();if(!r.ok)throw new Error(r.error||'Unable to load training.');
const active=r.access==='active';status(active?'Your training access is active.':r.access==='showcase'?'Showcase preview — synthetic presentation only. No production access.':'Training preview — subscription not yet activated.');
const modules=r.modules||[],labs=r.labs||[];
q('#v135-modules').innerHTML=modules.map(x=>`<article class="v135-card"><div class="eyebrow">${e(x.book)}</div><h3>${e(x.title)}</h3>${active?`<p>${e(x.focus||'')}</p><p class="small"><strong>Exercise:</strong> ${e(x.process||'')}</p>`:'<p class="small">Preview • available with eligible training access.</p>'}</article>`).join('');
q('#v135-labs').innerHTML=active?(labs.length?labs.map(x=>`<article class="v135-card"><h3>${e(x.title)}</h3><p class="small">${e(x.ticker)} • ${e(x.date)} • ${e(x.timeframe||'Select valid timeframe in the Lab')}</p><a class="btn" href="/verified-replay.html?scope=historical&amp;ticker=${encodeURIComponent(x.ticker)}&amp;date=${encodeURIComponent(x.date)}&amp;timeframe=${encodeURIComponent((/(?:^|[^0-9])(1|3|5|15)\s*[- ]?\s*(?:m(?:in(?:utes?)?)?)\b/i.exec(String(x.timeframe||''))||[])[1]||'1')}">Open Website Classroom</a> <a class="btn secondary" href="${e(x.href)}">Independent thinkorswim Instructions</a><p class="small">Website historical data appear only when the specific case has a published, rights-approved dataset.</p></article>`).join(''):'<div class="v135-card">No eligible historical-date cases are currently available. Do not substitute invented historical data.</div>'):'<div class="v135-card">Case exercises are available after entitlement verification. <a href="/membership.html">View Membership</a></div>';
q('#v135-training-content').hidden=false;
}catch(err){status(err.message||'The training service is not available.')}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
