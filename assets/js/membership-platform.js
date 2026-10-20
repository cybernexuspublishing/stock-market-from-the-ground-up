/* v0.14.0.35 — Approved companion & Lifetime ebook terms; do not advertise live checkout. */
(function(){'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=c=>`$${(Number(c||0)/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
 async function load(){const sb=await window.getSupabaseClient();const [{data:plans,error:pError},{data:tools,error:tError},{data:matrix},{data:current}]=await Promise.all([
   sb.from('platform_plans').select('*').eq('active',true).eq('public_visible',true).order('sort_order'),
   sb.from('platform_tools').select('*').eq('active',true).eq('public_visible',true).order('sort_order'),
   sb.from('plan_tool_access').select('*'),sb.rpc('my_platform_access')
 ]);if(pError||tError)throw Error('Membership catalog temporarily unavailable.');
 return {plans:plans||[],tools:tools||[],matrix:matrix||[],current:current||{authenticated:false,planName:'Free'}}}
 function freeBenefits(p){const m=p.metadata||{};if(Number.isInteger(m.journal_limit_week)&&Number.isInteger(m.simulator_saves_week))return [`Up to ${m.journal_limit_week} Journal records per UTC week`,`Up to ${m.simulator_saves_week} saved browser CSV exercises per UTC week (within Journal allowance)`];if(Number.isInteger(m.journal_limit)&&Number.isInteger(m.simulator_sessions_month))return [`Up to ${m.journal_limit} Journal records total`,`Up to ${m.simulator_sessions_month} simulator saves per month`];return ['Limited Journal and browser simulator saves; check current policy'];}
 function adLabel(p){if(p.plan_code==='LIFETIME')return 'Ad-free';if(p.plan_code==='FULL_ANNUAL')return 'Minimal sponsor placements';if(p.plan_code==='FULL_MONTHLY')return 'Limited sponsor placements';return 'Standard sponsor placements'}
 function planCard(p){const code=p.plan_code,free=code==='FREE',pick=code==='PICK_WHAT_YOU_WANT',lifetime=code==='LIFETIME',full=['FULL_MONTHLY','FULL_ANNUAL'].includes(code);
  const suffix=p.billing_interval==='month'&& !pick?'/month':p.billing_interval==='year'?'/year':p.billing_interval==='lifetime'?' one-time':'';
  const heading=pick?'No base fee — choose individual tools':`${money(p.price_cents)} ${suffix}`;
  const note=pick?'Choose the released tools you need; pay only for those tools. eBooks are sold separately.':
     lifetime?'Platform access lasts while the website operates and your account remains active and in good standing. Includes five downloadable eBooks only after publishing rights allow distribution.':
     full?'Released learning tools and all first-party book companion lessons are included. Complete eBook downloads are sold separately.':
     'Start free and try selected learning tools.';
  const terms=lifetime?'One-time payment · Lifetime refers to the operational life of the platform, subject to Terms of Service.':full?'Recurring membership; cancel according to the published billing terms.':pick?'Separate tool subscriptions. Manage each tool independently.':'';
  const list=[adLabel(p),...(free?freeBenefits(p):[]),pick?'Pick individual released tools and services':p.includes_all_tools?'Released first-party learning tools':free?'Public glossary and released samples; advanced Tutor and server replay are paid':'Free/sample access',
    lifetime?'Five designated eBook downloads when legally available; companions included':
    full?'All available book companion learning (not full eBook files)':
    p.includes_all_books?'Book companions included':'Book companion access separately'];
  const action=free?'<a class="btn secondary" href="create-account.html">Create Free Account</a>':
    pick?'<a class="btn secondary" href="#tool-passes">Choose Your Tools</a>':
    '<span class="btn disabled-buy" aria-disabled="true">Enrollment Opening Soon</span>';
  return `<article class="v11-plan ${code==='FULL_MONTHLY'?'recommended':''}">
   ${code==='FULL_MONTHLY'?'<span class="v11-plan-ribbon">Recommended</span>':''}
   <div class="eyebrow">${esc(code==='FULL_MONTHLY'?'Full Platform — Monthly':code==='FREE'?'Free Membership':p.name)}</div><div class="v11-price">${esc(heading)}</div>
   <p>${esc(p.description||note)}</p><ul>${list.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
   ${terms?`<p class="small">${esc(terms)}</p>`:''}${action}</article>`}
 function toolCard(t){const released=t.status==='live';const buy='<span class="btn disabled-buy" aria-disabled="true">Tool Subscription Coming Soon</span>';
  return `<article class="v11-tool-card"><div class="eyebrow">${esc(t.category)}</div><h3>${esc(t.name)}</h3><p>${esc(t.description||'')}</p>
   <div class="v11-tool-meta"><span class="v11-badge ${released?'active':''}">${esc(String(t.status||'planned').toUpperCase())}</span>
   <span class="v11-badge">${money(t.individual_price_cents)}/mo</span></div><div class="actions">
   <a class="btn secondary" href="${esc(t.href||'tools.html')}">${t.status==='planned'?'Preview Roadmap':'View Tool'}</a>${buy}</div></article>`}
 function matrix(plans,tools,links){const cols=plans.filter(p=>['FREE','FULL_MONTHLY','FULL_ANNUAL','LIFETIME'].includes(p.plan_code)),set=new Set(links.map(x=>`${x.plan_code}|${x.tool_code}`));
 return `<table><thead><tr><th>Feature</th>${cols.map(p=>`<th>${esc(p.name)}</th>`).join('')}<th>Pick Your Tools</th></tr></thead><tbody>${tools.filter(t=>t.status!=='retired').map(t=>
 `<tr><td>${esc(t.name)}</td>${cols.map(p=>`<td>${set.has(`${p.plan_code}|${t.tool_code}`)||p.includes_all_tools?'<span class="v11-check">✓</span>':'<span class="v11-x">✕</span>'}</td>`).join('')}
 <td>${t.status==='live'?`<span>${money(t.individual_price_cents)}/month</span>`:'<span>Not yet offered</span>'}</td></tr>`).join('')}
 <tr><td>Book companion learning (not ebook files)</td>${cols.map(p=>`<td>${p.includes_all_books?'✓':'Separate'}</td>`).join('')}<td>Books separately</td></tr>
 <tr><td>Five designated downloadable eBooks (after KDP Select ends)</td>${cols.map(p=>`<td>${p.plan_code==='LIFETIME'?'Included when available':'Separate purchase'}</td>`).join('')}<td>Separate purchase</td></tr>
 <tr><td>Advertisements</td>${cols.map(p=>`<td>${esc(adLabel(p))}</td>`).join('')}<td>May display ads</td></tr></tbody></table>`}
 function cleanMembershipPage(){document.querySelectorAll('h1,h2,h3').forEach(h=>{if(/^Book Companion Access$/i.test((h.textContent||'').trim()))(h.closest('section,article,.card,.product-card')||h.parentElement)?.remove()});
  document.querySelectorAll('p').forEach(p=>{if(/Book Companion Access remains separate from membership/i.test(p.textContent||''))p.textContent='Book companion learning is included in Full and Lifetime memberships. Downloadable eBooks are separate except for the five designated Lifetime editions when digital distribution is permitted.'})}
 async function init(){cleanMembershipPage();const cur=document.getElementById('membership-current');try{const d=await load();
   const plans=document.getElementById('membership-plans'),tools=document.getElementById('tool-passes'),matrixNode=document.getElementById('membership-matrix');
   if(plans)plans.innerHTML=d.plans.map(planCard).join('');if(tools)tools.innerHTML=d.tools.filter(t=>t.status!=='retired').map(toolCard).join('');
   if(matrixNode)matrixNode.innerHTML=matrix(d.plans,d.tools,d.matrix);
   const c=d.current;
   if(cur&&c.authenticated){const when=c.renewsAt?`Renews ${new Date(c.renewsAt).toLocaleString()}`:c.expiresAt?`Expires ${new Date(c.expiresAt).toLocaleString()}`:
       c.planCode==='LIFETIME'?'Access continues while the platform operates and your account remains in good standing.':'';
    cur.innerHTML=`<div class="v11-access-panel"><div class="eyebrow">Your current access</div><h2>${esc(c.planName||'Free')}</h2>
    ${(c.staffRoles||[]).length?`<div class="v11-chip-row">${c.staffRoles.map(r=>`<span class="v11-badge staff">${esc(r)}</span>`).join('')}</div>`:''}
    ${when?`<p>${esc(when)}</p>`:''}<a class="btn secondary" href="dashboard.html?tab=access">View Your Access</a></div>`}
  }catch(e){if(cur)cur.innerHTML=`<div class="notice">${esc(e.message)}</div>`}}
 document.addEventListener('DOMContentLoaded',init);
})();
