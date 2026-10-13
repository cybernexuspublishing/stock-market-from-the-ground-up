(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function cd(v){if(!v)return'';const ms=new Date(v)-Date.now();if(ms<=0)return'Expired';const d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),m=Math.floor(ms%3600000/60000);return d?`${d} days ${h} hours`:`${h} hours ${m} minutes`}
  async function init(){
    const gate=document.getElementById('access-gate'),content=document.getElementById('access-content');
    try{
      const sb=await window.getSupabaseClient();
      const {data:{user}}=await sb.auth.getUser();
      if(!user){gate.innerHTML='<div class="notice">Sign in to view access.</div>';return}
      const {data:a,error}=await sb.rpc('my_platform_access');
      if(error)throw error;
      gate.innerHTML='';content.hidden=false;
      const roles=a.staffRoles||[];
      const when=a.renewsAt?`Renews in <strong>${cd(a.renewsAt)}</strong><br><small>${new Date(a.renewsAt).toLocaleString()}</small>`:a.expiresAt?`Expires in <strong>${cd(a.expiresAt)}</strong><br><small>${new Date(a.expiresAt).toLocaleString()}</small>`:a.planCode==='LIFETIME'?'<strong>Never expires</strong>':'';
      document.getElementById('access-summary').innerHTML=`<div class="v11-access-panel"><div class="v11-access-head"><div><div class="eyebrow">Membership</div><h2>${esc(a.planName||'Free')}</h2><div class="v11-chip-row">${roles.map(r=>`<span class="v11-badge staff">${esc(r)}</span>`).join('')}${a.adFree?'<span class="v11-badge active">Ad-Free</span>':'<span class="v11-badge">Sponsored content may appear</span>'}</div></div><div class="v11-countdown">${when}</div></div></div>`;
      document.getElementById('access-tools').innerHTML=(a.tools||[]).map(t=>`<div class="v11-feature ${t.included?'available':'unavailable'}"><span class="v11-feature-mark">${t.included?'✓':'✕'}</span><div>${t.included?`<a href="${esc(t.href||'tools.html')}">${esc(t.name)}</a>`:`<strong>${esc(t.name)}</strong>`}<small>${t.included?'Included with your access':t.status==='planned'?'Planned / not yet available':`Not included · À-la-Carte $${((t.individualPriceCents||2999)/100).toFixed(2)}/mo`}</small></div></div>`).join('');
      document.getElementById('access-books').innerHTML=(a.books||[]).map(b=>`<article class="product-card v11-branch"><div class="eyebrow">${esc((b.family||'book').replace(/-/g,' '))}</div><h3>${esc(b.shortTitle||b.title)}</h3><p><span class="v11-badge ${b.included?'active':'locked'}">${b.included?'✓ Companion Access':'✕ Not in Library'}</span></p><p class="small">Status: ${esc((b.publicationStatus||'').replace(/_/g,' '))}</p>${b.included?'<a class="btn secondary" href="my-library.html">Open in My Library</a>':'<a class="btn secondary" href="store.html">View Store</a>'}</article>`).join('');
      const passes=a.toolPasses||[];
      document.getElementById('access-passes').innerHTML=passes.length?`<div class="v11-matrix"><table><thead><tr><th>Tool</th><th>Status</th><th>Renewal / Expiration</th></tr></thead><tbody>${passes.map(p=>`<tr><td><a href="${esc(p.href||'tools.html')}">${esc(p.name)}</a></td><td>${esc(p.status)}</td><td>${p.renewsAt?`Renews in ${cd(p.renewsAt)}`:p.expiresAt?`Expires in ${cd(p.expiresAt)}`:'—'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="notice">No individual Tool Passes are active. Full Platform plans include all released tools.</div>';
    }catch(e){gate.innerHTML=`<div class="notice">${esc(e.message)}</div>`}
  }
  document.addEventListener('DOMContentLoaded',init);
})();
