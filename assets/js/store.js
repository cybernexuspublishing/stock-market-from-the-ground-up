/* v0.14.0.84 — Four exclusive Store categories and distinct product pages.
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
const freeBenefits=p=>{const m=p.metadata||{};if(Number.isInteger(m.journal_limit_week)&&Number.isInteger(m.simulator_saves_week))return [`Up to ${m.journal_limit_week} new Trading Journal records per UTC week`,`Up to ${m.simulator_saves_week} saved CSV/browser simulator exercises per UTC week (within Journal allowance)`];if(Number.isInteger(m.journal_limit)&&Number.isInteger(m.simulator_sessions_month))return [`Up to ${m.journal_limit} Journal records total`,`Up to ${m.simulator_sessions_month} saved simulator results per month`];return ['Limited Journal and browser simulator saves; check your current allowance'];};
// Only the five owner-approved public membership codes belong in this view.
 // Future plans require explicit registry review and a dedicated product page.
 // Never allow a duplicate canonical SKU to generate two purchase cards.
 const availablePlan=p=>membershipIds.includes(p?.planCode);
 const approvedPlanCatalog=rows=>{
  const items=(Array.isArray(rows)?rows:[]).filter(availablePlan);
  if(new Set(items.map(p=>p.planCode)).size!==items.length)return [];
  return membershipIds.map(code=>items.find(p=>p.planCode===code)).filter(Boolean);
 };
const activeTool=t=>t.status==='live'&&Number(t.priceCents)>0;
const listedTool=t=>['live','beta','in_development','development'].includes(String(t.status||''));
const futureLearning=()=>[]; // Not-started roadmap concepts are hidden, not marketed as products.
function planCard(p){
 const rec=p.planCode==='FULL_MONTHLY',page=details('plan',p.planCode);
 return `<article class="v11-plan ${rec?'recommended':''}">
 ${rec?'<span class="v11-plan-ribbon">Recommended</span>':''}
 <div class="eyebrow">Membership</div><h3><a href="${esc(page)}">${esc(p.label)}</a></h3>
 <div class="v11-price">${dollars(p.priceCents)} <small>${esc(suffix(p.billingInterval))}</small></div>
 <a class="store-plan-primary-link" href="${esc(page)}" aria-label="Read what ${esc(p.label)} includes, excludes and teaches">What’s included, excluded &amp; taught →</a>
 <p>${esc(p.description||'Review this plan’s full coverage and billing terms before purchase.')}</p>
 <ul><li>${esc(adLabel(p.planCode))}</li>${p.planCode==='FREE'?freeBenefits(p).map(x=>`<li>${esc(x)}</li>`).join('')+'<li>Public glossary and released samples; advanced Tutor/server replay require paid access</li>':`<li>${esc(p.allTools?'Released first-party premium tools':'Book-aligned independent practice')}</li>`}<li>${['FULL_MONTHLY','FULL_ANNUAL','LIFETIME'].includes(p.planCode)?'First-party book companion learning':p.planCode==='ONDEMAND_MONTHLY'?'Independent training branch':'Books purchased separately'}</li></ul>
 <div class="store-sales-actions">${p.planCode==='FREE'?'<a class="btn" href="create-account.html">Get Free Access</a>':
 (p.checkoutEnabled&&Number(p.priceCents)>0?'<a class="btn" href="checkout.html?type=plan&amp;code='+encodeURIComponent(p.planCode)+'">Choose This Membership</a>':
 '<span class="store-soon-label">Coming Soon · Enrollment not yet available</span>')}
 <a class="btn secondary" href="${esc(page)}" aria-label="Review ${esc(p.label)} details, exclusions and purchase options">Compare Benefits</a></div></article>`;
}
function bookBuy(label,url){const target=safe(url);return target?`<a class="btn secondary" href="${esc(target)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:''}
function bookCard(p){
 const channels=[];
 if(p.amazonKindleEnabled!==false&&p.amazon?.kindleUrl)channels.push(bookBuy('Buy Kindle on Amazon',p.amazon.kindleUrl));
 if(p.amazonPaperbackEnabled!==false&&p.amazon?.paperbackUrl)channels.push(bookBuy('Buy Paperback on Amazon',p.amazon.paperbackUrl));
 if(p.amazonHardcoverEnabled!==false&&p.amazon?.hardcoverUrl)channels.push(bookBuy('Buy Hardcover on Amazon',p.amazon.hardcoverUrl));
 if(p.directPhysical?.enabled&&p.directPhysical?.checkoutUrl)channels.push(bookBuy('Buy Physical Edition Direct',p.directPhysical.checkoutUrl));
 if(p.directDigital?.enabled&&!p.kdpSelect&&p.directDigital?.checkoutUrl)channels.push(bookBuy('Buy Digital Edition Direct',p.directDigital.checkoutUrl));
 if(p.websiteCheckoutEnabled&&!p.kdpSelect&&p.lemonVariantId)channels.push(`<a class="btn secondary" href="checkout.html?type=book&amp;code=${encodeURIComponent(p.productCode)}">Buy on Website</a>`);
 const purchaseCount=channels.length;
 if(p.sampleUrl)channels.push(bookBuy('Read Sample',p.sampleUrl));
 const page=details('book',p.productCode),cover=safe(p.coverImageUrl);
 const available=purchaseCount?channels.join(''):`<span class="store-soon-label">Coming Soon · Book purchase links pending</span>`+channels.join('');
 const ribbon=p.publicationStatus==='published'&&purchaseCount?'Beta OPEN':'Coming Soon';
 return `<article class="product-card" data-code="${esc(p.productCode)}" data-family="${esc(p.branchSlug||p.family||'other')}">
 <a href="${esc(page)}" class="store-cover-link" aria-label="Read details about ${esc(p.title)}"><div class="fe-cover">${cover?`<img src="${esc(cover)}" alt="Cover of ${esc(p.shortTitle)}" loading="lazy">`:esc(p.shortTitle)}</div></a>
 <div class="eyebrow">${esc(p.shortTitle)}</div><h3><a href="${esc(page)}">${esc(p.title)}</a></h3>
 <div class="product-meta"><span class="store-beta-ribbon">${ribbon}</span><span class="status-pill ${p.publicationStatus==='published'?'status-active':''}">${esc(statusLabel(p.publicationStatus))}</span>
 ${p.salesStatus==='published'&&purchaseCount?'<span class="status-pill">Purchase options listed</span>':''}
 ${p.includedLifetime?'<span class="status-pill">Included with Lifetime companion access</span>':''}</div>
 <p>${esc(p.description||'Full product details, learning subjects and approved purchase formats are available on the book page.')}</p>
 <p class="small">By ${esc(p.author)} · ${esc(p.publisher)}</p>
 <div class="library-actions"><a class="btn" href="${esc(page)}">Explore Book &amp; Purchase Options</a>${available}</div>
 ${p.companionAccess?'<div class="library-actions"><a class="btn secondary" href="dashboard.html?tab=settings">Redeem Book Key</a><a class="btn secondary" href="dashboard.html?tab=books">Companion Access</a></div>':''}</article>`;
}
function toolCard(t){
 const page=details('tool',t.toolCode),released=activeTool(t),enroll=released&&t.checkoutEnabled;
 const price=released?dollars(t.priceCents)+'/month':'Pricing to be announced';
 const action=enroll?'<a class="btn" href="checkout.html?type=tool&amp;code='+encodeURIComponent(t.toolCode)+'">Subscribe Now</a>':
 '<span class="store-soon-label">'+(released?'Purchasing opens soon':'Coming Soon · Not yet released')+'</span>';
 return `<article class="v11-tool-card store-sell-card"><div class="eyebrow">${esc(t.category)}</div>
 <span class="store-beta-ribbon">${enroll?'Beta OPEN':'Coming Soon'}</span><h3><a href="${esc(page)}">${esc(t.name)}</a></h3>
 <p>${esc(t.description||'Further product information is being prepared.')}</p>
 <p class="store-sell-price"><span class="store-price-label">Price</span> ${esc(price)}</p>
 <p class="store-sell-status">${released?'Released learning tool':'Coming Soon'}${released&&!enroll?' · Sales opening pending':''}</p>
 ${t.freePreview?'<span class="v11-badge">Limited free preview</span>':''}
 <div class="store-sales-actions">${action}<a class="btn secondary" href="${esc(page)}">See What You Get</a></div></article>`;
}
function upcomingCard(t){
 return `<article class="v11-tool-card store-sell-card store-future-card">
 <div class="eyebrow">${esc(t.category||'Upcoming learning feature')}</div>
 <span class="store-soon-label">Coming Soon · Independent purchase not available</span><h3>${esc(t.name)}</h3>
 <p>${esc(t.description)}</p><p class="store-sell-price"><span class="store-price-label">Price</span> Pricing to be announced</p>
 <div class="store-sales-actions"><a class="btn secondary" href="${esc(t.route)}">Explore This Feature</a></div></article>`;
}

// Symbols describe coverage; conditions stay visible rather than being reduced to a yes/no claim.
const coverage=(yes,note='')=>({included:!!yes,note});
function comparisonCell(value){
 if(typeof value==='string')return `<td>${esc(value)}</td>`;
 return `<td><span class="catalog-coverage ${value.included?'is-included':'is-excluded'}" role="img" aria-label="${value.included?'Included':'Not included'}">${value.included?'✓':'X'}</span>${value.note?`<small class="catalog-cell-note">${esc(value.note)}</small>`:''}</td>`;
}
function comparison(plans,tools){
 const cols=approvedPlanCatalog(plans);
 if(!cols.length)return '<div class="notice">Membership comparison is temporarily unavailable. Please check back before purchasing.</div>';
 const features=[
 ['Billing',p=>p.planCode==='FREE'?'Free':p.billingInterval==='lifetime'?'One-time':p.billingInterval==='year'?'Renews annually':p.billingInterval==='month'?'Renews monthly':'See plan'],
 ['Released first-party premium tools',p=>coverage(p.allTools,p.planCode==='FREE'?'Selected free previews available':p.allTools?'Released tools only':'Separate access required')],
 ['Book companion learning',p=>coverage(['FULL_MONTHLY','FULL_ANNUAL','LIFETIME'].includes(p.planCode),p.planCode==='ONDEMAND_MONTHLY'?'Book-aligned training only':p.planCode==='FREE'?'Selected samples available':'Full eBook files are separate')],
 ['Complete downloadable eBook files',p=>coverage(p.planCode==='LIFETIME',p.planCode==='LIFETIME'?'Five designated editions when distribution is permitted':'Separate purchase')],
 ['Advertising',p=>adLabel(p.planCode)],
 ['Trading Journal',p=>coverage(p.allTools||p.planCode==='FREE',p.planCode==='FREE'?freeBenefits(p)[0]:p.allTools?'Eligible paid access; Free cap does not apply':'Separate tool access required')],
 ['Brokerage account & external market-data fees',()=>coverage(false)]
 ];
 for(const t of tools.filter(activeTool))features.push([t.name,p=>coverage(p.allTools,p.planCode==='FREE'&&t.freePreview?'Limited preview available':p.allTools?'Released tool access':'Separate subscription required'),details('tool',t.toolCode)]);
 return `<table class="catalog-comparison"><caption>Membership benefits. ✓ Included · X Not included. Qualifications and product terms apply.</caption><thead><tr><th scope="col">Benefit</th>${cols.map(p=>`<th scope="col"><a href="${esc(details('plan',p.planCode))}">${esc(p.label)}</a></th>`).join('')}</tr></thead><tbody>${features.map(([name,fn,href])=>`<tr><th scope="row">${href?`<a href="${esc(href)}">${esc(name)}</a>`:esc(name)}</th>${cols.map(p=>comparisonCell(fn(p))).join('')}</tr>`).join('')}</tbody></table><p class="small">Checkout verifies availability and access. Included features remain subject to release status and the full plan terms.</p>`;
}
async function foundingCatalog(){
 const target=document.getElementById('store-founder-plans'),matrix=document.getElementById('store-founder-compare');if(!target||!matrix)return;
 try{
  const response=await fetch('/data/founding-catalog.json',{cache:'no-store'});if(!response.ok)throw Error('Terms unavailable');
  const terms=await response.json();const codes=['FOUNDING_30','FOUNDING_60'];
  const plans=codes.map(code=>terms.plans?.[code]);
  if(plans.some(p=>!p||!Number.isInteger(p.recurringCents)||!Number.isInteger(p.billingIntervalDays)||!Number.isInteger(p.foundingDiscountBps)))throw Error('Invalid founding terms');
  target.innerHTML=plans.map((p,i)=>`<article class="catalog-founder-card ${i?'is-extended':''}"><div class="catalog-founder-orbit" aria-hidden="true"></div><div class="catalog-founder-top"><span class="eyebrow">Founding ${i?'Extended':'Standard'}</span><span class="catalog-founder-duration">${esc(p.billingIntervalDays)} DAYS</span></div><span class="store-beta-ribbon">Founding Beta · Subscription enrollment opens after payment verification</span><h3>${esc(p.name)}</h3><div class="catalog-founder-price">${dollars(p.recurringCents)}<small>every ${esc(p.billingIntervalDays)} days</small></div><p class="catalog-founder-highlight">${esc(p.foundingDiscountBps/100)}% founding purchase discount</p><ul><li>Permanent founder number after verified enrollment</li><li>${esc(p.incSparks)} included Sparks per paid term</li><li>Private Founders Commons, subject to eligibility</li><li>${i?'Extended Design Council and enhanced learning preferences':'Founder improvement polls and learning priorities'}</li></ul><p class="small">Automatic renewal. Included Sparks have expiry terms. Discounts exclude founding membership fees and do not stack.</p><a class="btn ${i?'':'secondary'}" href="founding600.html">Review ${esc(p.billingIntervalDays)}-day terms &amp; availability ↗</a><span class="catalog-founder-status">Payment availability is verified on the enrollment page.</span></article>`).join('');
  const rows=[['Billing',plans.map(p=>dollars(p.recurringCents)+' every '+p.billingIntervalDays+' days')],['Founding purchase discount',plans.map(p=>(p.foundingDiscountBps/100)+'% · eligible purchases only')],['Included Sparks per paid term',plans.map(p=>String(p.incSparks)+' · expiry terms apply')],['Permanent founding number',[coverage(true,'After verified enrollment'),coverage(true,'After verified enrollment')]],['Private Founders Commons',[coverage(true,'Eligibility required'),coverage(true,'Eligibility required')]],['Founder improvement polls',[coverage(true,'Advisory voting'),coverage(true,'Advisory voting')]],['Extended Design Council',[coverage(false),coverage(true,'Eligible Extended subscribers')]],['Enhanced personal design preferences',[coverage(false),coverage(true,'Eligible Extended subscribers')]],['Brokerage services or guaranteed trading profits',[coverage(false),coverage(false)]]];
  matrix.innerHTML=`<table class="catalog-comparison"><caption>Founding Standard and Extended. ${esc(terms.capacity)} places shared across both offers.</caption><thead><tr><th scope="col">Benefit</th>${plans.map(p=>`<th scope="col">${esc(p.name)}<small class="catalog-cell-note">${esc(p.billingIntervalDays)} days</small></th>`).join('')}</tr></thead><tbody>${rows.map(([label,values])=>`<tr><th scope="row">${esc(label)}</th>${values.map(comparisonCell).join('')}</tr>`).join('')}</tbody></table>`;
 }catch{target.innerHTML='<div class="notice">Founding terms are temporarily unavailable. <a href="founding600.html">Review the founding program</a>.</div>';matrix.textContent='Comparison unavailable until approved terms can be loaded.';}
}

function tabs(){
 const buttons=[...document.querySelectorAll('[data-store-category]')].filter(b=>!b.hidden),parts=['founders','books','tools'];
 const select=(name,focus=false)=>{
  const key=parts.includes(name)?name:'founders';
  for(const b of buttons){const active=b.dataset.storeCategory===key;
   b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus()}
  for(const kind of parts){const p=document.getElementById('store-panel-'+kind);if(p)p.hidden=kind!==key}
  const el=document.getElementById('store-category-status');if(el)el.textContent='Showing '+({founders:'founding memberships and their comparison',books:'books only',tools:'individual tools only'})[key]+'.';
  if(location.hash!==('#'+key))history.replaceState(history.state,'',location.pathname+location.search+'#'+key);
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
 foundingCatalog();
 try{
  const catalog=await C().load();
  const d=typeof C().verifiedCheckout==='function'?await C().verifiedCheckout(catalog):catalog;
  const allTools=(d.tools||[]).filter(listedTool);
  // Standard memberships are not current offers. Their existing entitlements
  // remain untouched, but no legacy plan cards or comparisons are rendered.
  document.getElementById('store-products').innerHTML=(d.products||[]).filter(p=>p.type==='book'&&p.storeVisible!==false&&p.salesStatus!=='retired'&&!['draft','not_started','archived'].includes(p.publicationStatus)).map(bookCard).join('')||
   '<div class="empty-state">No books are currently listed in this catalog.</div>';
  const futureIds=new Set(allTools.map(x=>x.toolCode));
  const future=futureLearning().filter(x=>!futureIds.has(x.code));
  document.getElementById('store-tools').innerHTML=d.commerceUnavailable?
   '<div class="notice">Live product prices and checkout status cannot be verified. Please try again later.</div>':
   allTools.map(toolCard).join('')+future.map(upcomingCard).join('');
  const bookTab=document.getElementById('store-tab-books'),toolTab=document.getElementById('store-tab-tools');
  if(bookTab)bookTab.hidden=!document.getElementById('store-products')?.innerHTML.includes('product-card');
  if(toolTab)toolTab.hidden=!document.getElementById('store-tools')?.innerHTML.includes('store-sell-card');
  // Initial category fragment was already selected by tabs(); no second click.
  // This coming-soon training branch has a separate detail page from the
  // existing paid ONDEMAND_MONTHLY SKU; do not merge their checkout eligibility.
  const preview=document.querySelector('.v135-replay-plan-cta a');
  if(preview)preview.href='store-membership-replay-training.html';
 }catch(e){
  for(const id of ['store-products','store-tools']){
   const el=document.getElementById(id);if(el)el.innerHTML='<div class="notice">Store listings are temporarily unavailable. Please try again. No purchase was initiated.</div>';
  }
  console.error('Store catalog load failed:',e);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
