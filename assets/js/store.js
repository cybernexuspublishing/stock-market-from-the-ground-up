/* v0.14.0.84 — Three exclusive Store categories and distinct product pages.
 * No Stripe session creation in the Store. All actual purchases are gated by
 * the existing secure checkout/backend; no book or KDP metadata is mutated.
 */
(()=>{'use strict';
const C=()=>window.CommerceTools;
const membershipIds=['FREE','FULL_MONTHLY','FULL_ANNUAL','LIFETIME','ONDEMAND_MONTHLY'];
const planPaths={FREE:'store-membership-free.html',FULL_MONTHLY:'store-membership-full-monthly.html',FULL_ANNUAL:'store-membership-full-annual.html',LIFETIME:'store-membership-lifetime.html',ONDEMAND_MONTHLY:'store-membership-ondemand-monthly.html'};
const bookPaths={FOUNDATION_BOOK_1:'store-book-foundation-1.html',FOUNDATION_BOOK_2:'store-book-foundation-2.html',FOUNDATION_BOOK_3:'store-book-foundation-3.html',DAY_TRADING_BOOK_1:'store-book-day-trading-1.html',READING_THE_TAPE:'store-book-reading-the-tape.html'};
const toolPaths={INTERACTIVE_LEARNING:'store-tool-interactive-learning.html',JOURNAL_ANALYTICS:'store-tool-journal-analytics.html',MARKET_SIMULATOR:'store-tool-market-simulator.html',MARKET_TUTOR:'store-tool-market-tutor.html'};
const details=(type,code)=>({plan:planPaths,book:bookPaths,tool:toolPaths}[type]?.[code]||'store-product.html?type='+encodeURIComponent(type)+'&code='+encodeURIComponent(code));
const safe=(value)=>C().safeHref(value);
const esc=(value)=>C().esc(value);
const dollars=c=>C().moneyCents(Number(c||0)/100);
const suffix=x=>({month:'/month',year:'/year',lifetime:' one-time',none:''})[x]||'';
const statusLabel=s=>({published:'Published',publication_candidate:'Publication Candidate',coming_soon:'Coming Soon',in_development:'In Development',archived:'Archived'})[s]||String(s||'Coming Soon').replaceAll('_',' ');
const adLabel=code=>({FULL_MONTHLY:'Limited sponsor placements',FULL_ANNUAL:'Minimal sponsor placements',LIFETIME:'Ad-free'})[code]||'Standard sponsor placements';
const availablePlan=p=>p.planCode!=='PICK_WHAT_YOU_WANT'&&!/(?:^QA_|TEST|ZERO_)/i.test(p.planCode||'');
const activeTool=t=>t.status==='live'&&Number(t.priceCents)>0;
function planCard(p){
 const rec=p.planCode==='FULL_MONTHLY',page=details('plan',p.planCode);
 return `<article class="v11-plan ${rec?'recommended':''}">
 ${rec?'<span class="v11-plan-ribbon">Recommended</span>':''}
 <div class="eyebrow">Membership</div><h3><a href="${esc(page)}">${esc(p.label)}</a></h3>
 <div class="v11-price">${dollars(p.priceCents)} <small>${esc(suffix(p.billingInterval))}</small></div>
 <p>${esc(p.description||'Review this plan’s full coverage and billing terms before purchase.')}</p>
 <ul><li>${esc(adLabel(p.planCode))}</li><li>${p.allTools?'Released first-party platform tools':p.planCode==='ONDEMAND_MONTHLY'?'Book-aligned independent historical practice':'Free/sample or dedicated learning access'}</li>
 <li>${p.allBooks?'First-party book companion learning':p.planCode==='ONDEMAND_MONTHLY'?'Independent training branch':'Books purchased separately'}</li></ul>
 <a class="btn ${rec?'':'secondary'}" href="${esc(page)}" aria-label="Review ${esc(p.label)} details, exclusions and purchase options">View membership details</a></article>`;
}
function bookBuy(label,url){const target=safe(url);return target?`<a class="btn secondary" href="${esc(target)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:''}
function bookCard(p){
 const channels=[];
 if(p.amazonKindleEnabled!==false&&p.amazon?.kindleUrl)channels.push(bookBuy('Buy Kindle on Amazon',p.amazon.kindleUrl));
 if(p.amazonPaperbackEnabled!==false&&p.amazon?.paperbackUrl)channels.push(bookBuy('Buy Paperback on Amazon',p.amazon.paperbackUrl));
 if(p.amazonHardcoverEnabled!==false&&p.amazon?.hardcoverUrl)channels.push(bookBuy('Buy Hardcover on Amazon',p.amazon.hardcoverUrl));
 if(p.directPhysical?.enabled&&p.directPhysical?.checkoutUrl)channels.push(bookBuy('Buy Physical Edition Direct',p.directPhysical.checkoutUrl));
 if(p.directDigital?.enabled&&!p.kdpSelect&&p.directDigital?.checkoutUrl)channels.push(bookBuy('Buy Digital Edition Direct',p.directDigital.checkoutUrl));
 if(p.websiteCheckoutEnabled&&p.lemonVariantId)channels.push(`<a class="btn secondary" href="checkout.html?type=book&amp;code=${encodeURIComponent(p.productCode)}">Buy on Website</a>`);
 if(p.sampleUrl)channels.push(bookBuy('Read Sample',p.sampleUrl));
 const page=details('book',p.productCode),cover=safe(p.coverImageUrl);
 const available=channels.length?channels.join(''):`<span class="small">${['in_development','coming_soon'].includes(p.publicationStatus)?'Purchase links will appear when this edition is released.':'Amazon links will appear here as soon as the listing URLs are added.'}</span>`;
 return `<article class="product-card" data-code="${esc(p.productCode)}" data-family="${esc(p.branchSlug||p.family||'other')}">
 <a href="${esc(page)}" class="store-cover-link" aria-label="Read details about ${esc(p.title)}"><div class="fe-cover">${cover?`<img src="${esc(cover)}" alt="Cover of ${esc(p.shortTitle)}" loading="lazy">`:esc(p.shortTitle)}</div></a>
 <div class="eyebrow">${esc(p.shortTitle)}</div><h3><a href="${esc(page)}">${esc(p.title)}</a></h3>
 <div class="product-meta"><span class="status-pill ${p.publicationStatus==='published'?'status-active':''}">${esc(statusLabel(p.publicationStatus))}</span>
 ${p.salesStatus==='published'?'<span class="status-pill">Sale-ready catalog · checkout subject to availability</span>':''}
 ${p.includedLifetime?'<span class="status-pill">Included with Lifetime companion access</span>':''}</div>
 <p>${esc(p.description||'Full product details, learning subjects and approved purchase formats are available on the book page.')}</p>
 <p class="small">By ${esc(p.author)} · ${esc(p.publisher)}</p>
 <div class="library-actions"><a class="btn" href="${esc(page)}">What this book teaches</a>${available}</div>
 ${p.companionAccess?'<div class="library-actions"><a class="btn secondary" href="dashboard.html?tab=settings">Redeem Book Key</a><a class="btn secondary" href="dashboard.html?tab=books">Companion Access</a></div>':''}</article>`;
}
function toolCard(t){
 const page=details('tool',t.toolCode);
 return `<article class="v11-tool-card"><div class="eyebrow">${esc(t.category)}</div>
 <h3><a href="${esc(page)}">${esc(t.name)}</a></h3><p>${esc(t.description)}</p>
 <div class="v11-tool-meta"><span class="v11-badge active">Released tool</span><span class="v11-badge">${dollars(t.priceCents)}/month</span>
 ${t.freePreview?'<span class="v11-badge">Limited free preview</span>':''}</div>
 <a class="btn secondary" href="${esc(page)}">See features, exclusions &amp; pricing</a></article>`;
}
function comparison(plans,tools){
 const cols=plans.filter(availablePlan),cell=(text)=>`<td>${esc(text)}</td>`;
 if(!cols.length)return '<div class="notice">Membership comparison is temporarily unavailable. Please check back before purchasing.</div>';
 const features=[
 ['Billing',p=>p.planCode==='FREE'?'Free':p.billingInterval==='lifetime'?'One-time':p.billingInterval==='year'?'Renews annually':p.billingInterval==='month'?'Renews monthly':'See plan'],
 ['Released first-party premium tools',p=>p.allTools?'Included':p.planCode==='FREE'?'Free previews only':'Not included as a Full Platform membership'],
 ['Book companion learning',p=>p.allBooks?'Included':p.planCode==='ONDEMAND_MONTHLY'?'Book-aligned training only':'Selected samples; otherwise separate'],
 ['Complete downloadable eBook files',p=>p.planCode==='LIFETIME'?'Five designated editions when permitted':'Not included'],
 ['Advertising',p=>adLabel(p.planCode)],
 ['Brokerage account & external market-data fees',()=> 'Not included']
 ];
 for(const t of tools.filter(activeTool))features.push([
 t.name,p=>p.allTools?'Included':p.planCode==='FREE'&&t.freePreview?'Limited preview':'Separate / not included',details('tool',t.toolCode)
 ]);
 return `<table><caption>Feature-by-feature comparison of currently listed memberships. Detailed plan exclusions control over abbreviations here.</caption>
 <thead><tr><th scope="col">Feature</th>${cols.map(p=>`<th scope="col"><a href="${esc(details('plan',p.planCode))}">${esc(p.label)}</a></th>`).join('')}</tr></thead>
 <tbody>${features.map(([name,fn,href])=>`<tr><th scope="row">${href?`<a href="${esc(href)}">${esc(name)}</a>`:esc(name)}</th>${cols.map(p=>cell(fn(p))).join('')}</tr>`).join('')}</tbody></table>
 <p class="small">Tool access, membership terms and product availability are verified again by checkout. Each linked heading opens its full product explanation.</p>`;
}
function tabs(){
 const buttons=[...document.querySelectorAll('[data-store-category]')],parts=['memberships','books','tools'];
 const select=(name,focus=false)=>{
  const key=parts.includes(name)?name:'memberships';
  for(const b of buttons){const active=b.dataset.storeCategory===key;
   b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus()}
  for(const kind of parts){const p=document.getElementById('store-panel-'+kind);if(p)p.hidden=kind!==key}
  const el=document.getElementById('store-category-status');if(el)el.textContent='Showing '+({memberships:'memberships and their comparison',books:'books only',tools:'individual tools only'})[key]+'.';
  if(location.hash!==('#'+key))history.replaceState(history.state,'','#'+key);
 };
 buttons.forEach((b,i)=>{b.addEventListener('click',()=>select(b.dataset.storeCategory));
  b.addEventListener('keydown',e=>{let idx;if(e.key==='ArrowRight')idx=(i+1)%buttons.length;else if(e.key==='ArrowLeft')idx=(i+buttons.length-1)%buttons.length;else if(e.key==='Home')idx=0;else if(e.key==='End')idx=buttons.length-1;else return;e.preventDefault();select(buttons[idx].dataset.storeCategory,true)})});
 window.addEventListener('hashchange',()=>{const key=location.hash.replace('#','');if(parts.includes(key))select(key)});
 select(location.hash.replace('#',''));
 const filters=[...document.querySelectorAll('#store-tabs button')];
 filters.forEach(b=>b.addEventListener('click',()=>{
  filters.forEach(x=>{const yes=x===b;x.classList.toggle('active',yes);x.setAttribute('aria-pressed',String(yes))});
  document.querySelectorAll('#store-products [data-family]').forEach(c=>{c.hidden=!(b.dataset.filter==='all'||c.dataset.family===b.dataset.filter)});
 }));
 for(const b of filters)b.setAttribute('aria-pressed',String(b.classList.contains('active')));
}
async function init(){
 tabs();
 try{
  const d=await C().load();
  const plans=(d.plans||[]).filter(availablePlan),tools=(d.tools||[]).filter(activeTool);
  document.getElementById('store-plans').innerHTML=plans.length?plans.map(planCard).join(''):
   '<div class="notice">Membership details and prices are temporarily unavailable from the live catalog. No purchase is offered until the catalog is available.</div>';
  document.getElementById('store-products').innerHTML=(d.products||[]).filter(p=>p.storeVisible!==false&&p.salesStatus!=='retired').map(bookCard).join('')||
   '<div class="empty-state">No books are currently listed in this catalog.</div>';
  document.getElementById('store-tools').innerHTML=tools.length?tools.map(toolCard).join(''):
   '<div class="notice">No independently purchasable tools could be verified from the live catalog. Check back when the tool catalog is available.</div>';
  document.getElementById('store-membership-compare').innerHTML=comparison(plans,tools);
  // This coming-soon training branch has a separate detail page from the
  // existing paid ONDEMAND_MONTHLY SKU; do not merge their checkout eligibility.
  const preview=document.querySelector('.v135-replay-plan-cta a');
  if(preview)preview.href='store-membership-replay-training.html';
 }catch(e){
  for(const id of ['store-plans','store-products','store-tools','store-membership-compare']){
   const el=document.getElementById(id);if(el)el.innerHTML='<div class="notice">Store listings are temporarily unavailable. Please try again. No purchase was initiated.</div>';
  }
  console.error('Store catalog load failed:',e);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
