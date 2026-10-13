function ee(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function initEnvironments(){
  const access=await window.SiteAccess.get();
  const gate=document.getElementById('environment-gate'),content=document.getElementById('environment-content');
  if(!access.isMember){
    gate.innerHTML='<div class="notice"><strong>Full Learning Access feature:</strong> The Market Environment Library organizes the verified Historical Labs into targeted practice sets. Redeem a Book Key for a 30-day trial or activate membership when subscriptions open.</div>';
    return;
  }
  const defs=await fetch('data/environments.json',{cache:'no-store'}).then(r=>r.json());
  gate.innerHTML='';content.hidden=false;
  document.getElementById('environment-cards').innerHTML=defs.map(d=>`<article class="card skill-card"><div class="skill-card-top"><h3>${ee(d.environment)}</h3><span class="pill">${d.labCount} lab${d.labCount===1?'':'s'}</span></div><p class="small">Build repetition across verified curriculum examples carrying this context tag.</p><a class="btn secondary" href="labs.html?q=${encodeURIComponent(d.environment)}">Open practice set</a></article>`).join('');
}
document.addEventListener('DOMContentLoaded',initEnvironments);
