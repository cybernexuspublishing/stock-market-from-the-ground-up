(function(){
 const CT=()=>window.CommerceTools;
 function statusLabel(s){return ({published:'Published',publication_candidate:'Publication Candidate',coming_soon:'Coming Soon',in_development:'In Development',archived:'Archived'})[s]||String(s||'Coming Soon').replaceAll('_',' ')}
 function adLabel(p){if(p.planCode==='LIFETIME')return 'Ad-free';if(p.planCode==='FULL_ANNUAL')return 'Minimal sponsor placements';if(p.planCode==='FULL_MONTHLY')return 'Limited sponsor placements';return 'Standard sponsor placements'}
 function detailLink(type,code){return 'store-product-'+type+'-'+String(code).toLowerCase().replaceAll('_','-')+'.html'}
 function planCard(p){const C=CT(),suffix=p.billingInterval==='month'?'/month':p.billingInterval==='year'?'/year':p.billingInterval==='lifetime'?' one-time':'';const rec=p.planCode==='FULL_MONTHLY';const url=C.safeHref(p.checkoutUrl);return `<article class="v11-plan ${rec?'recommended':''}">${rec?'<span class="v11-plan-ribbon">Recommended</span>':''}<div class="eyebrow">${C.esc(p.label)}</div><div class="v11-price">${C.moneyCents(p.priceCents/100)} <small>${suffix}</small></div><p>${C.esc(p.description)}</p><ul><li>${C.esc(adLabel(p))}</li><li>${p.allTools?'All first-party platform tools':'Free/sample access'}</li><li>${p.allBooks?'All current and future first-party book companion branches':'Book access handled separately'}</li></ul><a class="btn secondary" href="${C.esc(detailLink('plan',p.planCode))}">View Membership Details</a> <a class="btn ${rec?'':'secondary'} ${url?'':'disabled-buy'}" ${url?`href="${C.esc(url)}"`:'aria-disabled="true"'}>${p.planCode==='FREE'?'Use Free':url?'Choose Plan':'Enrollment Opening Soon'}</a></article>`}
 function buy(label,url){const C=CT(),u=C.safeHref(url);return u?`<a class="btn secondary" href="${C.esc(u)}" target="_blank" rel="noopener">${C.esc(label)}</a>`:''}
 function productCard(p){const C=CT(),channels=[];if(p.amazonKindleEnabled!==false&&p.amazon?.kindleUrl)channels.push(buy('Buy Kindle on Amazon',p.amazon.kindleUrl));if(p.amazonPaperbackEnabled!==false&&p.amazon?.paperbackUrl)channels.push(buy('Buy Paperback on Amazon',p.amazon.paperbackUrl));if(p.amazonHardcoverEnabled!==false&&p.amazon?.hardcoverUrl)channels.push(buy('Buy Hardcover on Amazon',p.amazon.hardcoverUrl));if(p.directPhysical?.enabled&&p.directPhysical?.checkoutUrl)channels.push(buy('Buy Physical Edition Direct',p.directPhysical.checkoutUrl));if(p.directDigital?.enabled&&!p.kdpSelect&&p.directDigital?.checkoutUrl)channels.push(buy('Buy Digital Edition Direct',p.directDigital.checkoutUrl));if(p.websiteCheckoutEnabled&&p.lemonVariantId)channels.push(buy('Buy on Website',`checkout.html?type=book&code=${encodeURIComponent(p.productCode)}`));if(p.sampleUrl)channels.push(buy('Read Sample',p.sampleUrl));const st=statusLabel(p.publicationStatus),saleBadge=p.salesStatus==='published'?'<span class="status-pill">Sale-ready catalog · checkout subject to availability</span>':'';const available=channels.length?channels.join(''):`<span class="small">${['in_development','coming_soon'].includes(p.publicationStatus)?'Purchase links will appear when this edition is released.':'Amazon links will appear here as soon as the listing URLs are added.'}</span>`;return `<article class="product-card" data-code="${C.esc(p.productCode)}" data-family="${C.esc(p.branchSlug||p.family||'other')}"><div class="fe-cover">${p.coverImageUrl?`<img src="${C.esc(p.coverImageUrl)}" alt="Cover of ${C.esc(p.shortTitle)}">`:C.esc(p.shortTitle)}</div><div class="eyebrow">${C.esc(p.shortTitle)}</div><h2><a href="${C.esc(detailLink('book',p.productCode))}">${C.esc(p.title)}</a></h2><p><a class="btn secondary" href="${C.esc(detailLink('book',p.productCode))}">Book Details &amp; Learning Scope</a></p><div class="product-meta"><span class="status-pill ${p.publicationStatus==='published'?'status-active':''}">${C.esc(st)}</span>${saleBadge}${p.includedLifetime?'<span class="status-pill">Included with Lifetime companion access</span>':''}</div><p>${C.esc(p.description||'')}</p><p class="small">By ${C.esc(p.author)} · ${C.esc(p.publisher)}</p><div class="library-actions">${available}</div>${p.companionAccess?`<div class="library-actions"><a class="btn secondary" href="dashboard.html?tab=settings">Redeem Book Key</a><a class="btn secondary" href="dashboard.html?tab=books">Companion Access</a></div>`:''}</article>`}
 function toolCard(t){
  const C=CT(),url=detailLink('tool',t.toolCode),cycle=C.moneyCents(t.priceCents/100);
  return '<article class="v11-tool-card"><div class="eyebrow">'+C.esc(t.category||'Individual learning tool')+'</div><h3><a href="'+C.esc(url)+'">'+C.esc(t.name)+'</a></h3>'+
    '<p>'+C.esc(t.description||'See this tool’s scope and current availability.')+'</p><p>'+cycle+'/month</p>'+
    '<p class="small">Status: '+C.esc(t.status||'Pending')+'</p><a class="btn secondary" href="'+C.esc(url)+'">View Tool Details &amp; Access</a></article>';
 }
 function activateCategory(key,replaceHash=false){
  const chosen=['memberships','books','a-la-carte'].includes(key)?key:'memberships';
  document.querySelectorAll('[data-store-panel]').forEach(el=>{el.hidden=el.dataset.storePanel!==chosen});
  document.querySelectorAll('[data-store-category]').forEach(link=>{
   const active=link.dataset.storeCategory===chosen;link.classList.toggle('active',active);
   if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  });
  const status=document.getElementById('store-category-status');
  if(status)status.textContent='Showing '+({memberships:'memberships',books:'books','a-la-carte':'individual learning tools'})[chosen]+' only.';
  if(replaceHash)history.replaceState(null,'','#'+chosen);
 }
 async function init(){try{const d=await CT().load();const planRoot=document.getElementById('store-plans');
  planRoot.innerHTML=(d.plans||[]).filter(p=>['FREE','FULL_MONTHLY','FULL_ANNUAL','LIFETIME','ONDEMAND_MONTHLY','PICK_WHAT_YOU_WANT'].includes(p.planCode)).map(planCard).join('');
  if(d.commerceUnavailable||!(d.plans||[]).length)planRoot.innerHTML='<div class="notice" role="status">Membership catalog temporarily unavailable. Purchase eligibility cannot be verified.</div>';
  document.getElementById('store-tools').innerHTML=(d.tools||[]).filter(t=>t.status!=='retired').map(toolCard).join('')||'<div class="notice">Individual tool catalog temporarily unavailable.</div>';
  // Customer Store contains only actual configured membership and book offers.
  // Retired $0 LIVE verification is not inserted into the pricing grid.
  document.getElementById('store-products').innerHTML=(d.products||[]).filter(p=>p.storeVisible!==false&&p.salesStatus!=='retired').map(productCard).join('');document.querySelectorAll('#store-tabs button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#store-tabs button').forEach(x=>x.classList.toggle('active',x===b));const f=b.dataset.filter;document.querySelectorAll('#store-products [data-family]').forEach(c=>c.hidden=!(f==='all'||c.dataset.family===f))}));
  activateCategory(location.hash.slice(1));
  window.addEventListener('hashchange',()=>activateCategory(location.hash.slice(1)));
  document.querySelectorAll('[data-store-category]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();activateCategory(link.dataset.storeCategory,true)}));
 }catch(e){document.getElementById('store-products').innerHTML=`<div class="notice">${CT().esc(e.message)}</div>`}}
 document.addEventListener('DOMContentLoaded',init);
})();
