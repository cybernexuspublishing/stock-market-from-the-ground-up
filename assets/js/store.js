/* v0.14.0.84 — Four exclusive Store categories and distinct product pages.
 * No Stripe session creation in the Store. All actual purchases are gated by
 * the existing secure checkout/backend; no book or KDP metadata is mutated.
 */
(()=>{'use strict';
const C=()=>window.CommerceTools;
const membershipIds=['FREE'];
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
// Free is the sole general public membership; Founder 14/30/60 use their
// independently gated, Owner-approved dedicated membership catalog.
 // Future plans require explicit registry review and a dedicated product page.
 // Never allow a duplicate canonical SKU to generate two purchase cards.
 const availablePlan=p=>membershipIds.includes(p?.planCode);
 const approvedPlanCatalog=rows=>{
  const items=(Array.isArray(rows)?rows:[]).filter(availablePlan);
  if(new Set(items.map(p=>p.planCode)).size!==items.length)return [];
  return membershipIds.map(code=>items.find(p=>p.planCode===code)).filter(Boolean);
 };
const activeTool=t=>t.status==='live'&&Number(t.priceCents)>0;
const listedTool=t=>['live','beta','planned','in_development','development'].includes(String(t.status||''));
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
function bookFamily(p){
 const code=String(p.productCode||'').toUpperCase(),slug=String(p.branchSlug||p.family||'').toLowerCase();
 if(code.startsWith('FOUNDATION_')||slug.includes('foundation'))return 'foundations';
 if(code.includes('DAY_TRADING')||slug.includes('day-trading'))return 'day-trading';
 if(code.includes('READING_THE_TAPE')||slug.includes('tape'))return 'reading-the-tape';
 return 'other';
}
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
 return `<article class="product-card" data-code="${esc(p.productCode)}" data-family="${esc(bookFamily(p))}">
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
const toolImages={INTERACTIVE_LEARNING:'assets/img/store-tools/interactive-learning.svg',JOURNAL_ANALYTICS:'assets/img/store-tools/journal-analytics.svg',MARKET_SIMULATOR:'assets/img/store-tools/market-simulator.svg',MARKET_TUTOR:'assets/img/store-tools/market-tutor.svg'};
const toolSummary=(t,page)=>{const d=String(t.description||'').replace(/\s+/g,' ').trim();
 return d.length>120?esc(d.slice(0,120).trimEnd())+'… <a class="gu-catalog-read-more" href="'+esc(page)+'">Read more</a>':esc(d||'See the full product details.')};
function toolCard(t){
 const page=details('tool',t.toolCode),released=activeTool(t),enroll=released&&t.checkoutEnabled;
 const price=Number(t.priceCents)>0?dollars(t.priceCents)+'/month':t.toolCode==='ONDEMAND_TRAINING'?'Included with Historical Replay Learning — $19.99/month':'Included with eligible membership';
 const action=enroll?'<a class="btn" href="checkout.html?type=tool&amp;code='+encodeURIComponent(t.toolCode)+'">Subscribe Now</a>':
 '<span class="store-soon-label">'+(released?'Purchasing opens soon':'Beta / development · Individual checkout unavailable')+'</span>';
 return `<article class="v11-tool-card store-sell-card">${toolImages[t.toolCode]?`<a class="store-tool-visual" href="${esc(page)}" aria-label="Explore ${esc(t.name)}"><img src="${esc(toolImages[t.toolCode])}" alt="" loading="lazy" width="640" height="320"></a>`:'<div class="store-tool-visual store-tool-visual-generic" aria-hidden="true"></div>'}<div class="eyebrow">${esc(t.category)}</div>
 <span class="store-beta-ribbon">${t.betaTestingReady===true&&released?'Beta Testing Ready':t.status==='beta'?'Beta in development':released?'Released tool':'Individual checkout unavailable'}</span><h3><a href="${esc(page)}">${esc(t.name)}</a></h3>
 <p class="gu-tool-description">${toolSummary(t,page)}</p>
 <p class="store-sell-price"><span class="store-price-label">Price</span> ${esc(price)}</p>
 <p class="store-sell-status">${t.betaTestingReady===true&&released?'Ready for Founding 600 member evaluation · Not yet beta-accepted':released?'Released learning tool':t.status==='beta'?'Beta learning tool':'Not currently released'}${released&&!enroll?' · Individual sales pending':''}</p>
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
  const terms=await response.json();const codes=['FOUNDING_14','FOUNDING_30','FOUNDING_60'];
  const plans=codes.map(code=>terms.plans?.[code]);
  if(plans.some(p=>!p||!Number.isInteger(p.recurringCents)||!Number.isInteger(p.billingIntervalDays)||!Number.isInteger(p.foundingDiscountBps)||p.includedSparksNeverExpire!==true))throw Error('Invalid founding terms');
  // Owner publication is authoritative even when a separate checkout route
  // is inactive. Never display hidden Founder SKU cards or comparison columns.
  const listedResponse=await fetch('/api/storefront-public-catalog',{cache:'no-store'});
  const publicCatalog=listedResponse.ok?await listedResponse.json():null;
  if(publicCatalog?.ok!==true||publicCatalog.source!=='verified_storefront'
    ||!Array.isArray(publicCatalog.items))throw Error('Founder visibility unavailable');
  const publicFounders=new Set(publicCatalog.items.filter(x=>x?.category==='founding'&&
   /^founding:FOUNDING_(14|30|60)$/.test(String(x.sku||''))).map(x=>String(x.sku).slice('founding:'.length)));
  const displayIndices=codes.map((code,i)=>publicFounders.has(code)?i:-1).filter(i=>i>=0);
  if(!displayIndices.length){target.replaceChildren();matrix.replaceChildren();return}
  let accepting=false,eligible=new Map();
  try{
   const status=await fetch('/api/founding600-checkout',{cache:'no-store',signal:AbortSignal.timeout(12000)});
   const state=status.ok?await status.json():null;
   accepting=state?.ok===true&&state.checkoutEnabled===true;
   eligible=new Map((Array.isArray(state?.plans)?state.plans:[]).map(p=>[p.code,p.checkoutEnabled===true]));
  }catch{accepting=false}
  target.innerHTML=displayIndices.map(i=>{const p=plans[i],canJoin=accepting&&eligible.get(codes[i])===true;return `<article class="catalog-founder-card ${i===2?'is-extended':''}">
 <div class="catalog-founder-orbit" aria-hidden="true"></div>
 <div class="catalog-founder-top"><span class="eyebrow">Founding ${i===0?'Starter':i===1?'Standard':'Extended'}</span><span class="catalog-founder-duration">${esc(p.billingIntervalDays)} DAYS</span></div>
 <span class="store-beta-ribbon">${canJoin?'Founding Beta · Enrollment OPEN':'Founding Beta · Enrollment unavailable'}</span>
 <h3>${esc(p.name)}</h3><div class="catalog-founder-price">${dollars(p.recurringCents)}<small>every ${esc(p.billingIntervalDays)} days</small></div>
 <p class="catalog-founder-highlight">${esc(p.foundingDiscountBps/100)}% OFF eligible purchases</p>
 <ul><li>Crownlight Chart Studio: ${['Standard','Advanced','Professional'][i]} tier while the founding term is active</li><li>Permanent founding number after verified enrollment</li><li>${esc(p.incSparks)} included Sparks per paid term</li><li>Private Founders Commons, subject to eligibility</li><li>${i===2?'Extended Design Council and learning preferences':'Founder improvement polls and learning priorities'}</li></ul>
 <p class="small">Renews automatically until canceled. <a href="founding600.html">Review benefit exclusions and nonexpiring Crownlight Sparks.</a></p>
 <a class="btn ${i===2?'':'secondary'}" href="founding600.html">Review ${esc(p.billingIntervalDays)}-day terms &amp; availability</a></article>`;}).join('');
  const yes=()=>coverage(true),no=()=>coverage(false);
  const rows=[
   ['Membership',plans.map(p=>dollars(p.recurringCents)+' / '+p.billingIntervalDays+' days')],
   ['Purchase discount',plans.map(p=>(p.foundingDiscountBps/100)+'% OFF eligible purchases')],
   ['Included Sparks',plans.map(p=>String(p.incSparks)+' / '+p.billingIntervalDays+'-day term')],
   ['Crownlight Chart Studio',['Standard','Advanced','Professional']],
   ['Permanent founding number',plans.map(()=>yes())],
   ['Private Founders Commons',plans.map(()=>yes())],
   ['Founder improvement polls',plans.map(()=>yes())],
   ['Founding Member certificate',plans.map(()=>yes())],
   ['Permanent founder discount eligibility',[no(),yes(),yes()]],
   ['Unused included Sparks expiration',plans.map(()=>'Never')],
   ['Learning progress preservation',plans.map(()=>yes())],
   ['Service-interruption protection',plans.map(()=>yes())],
   ['Extended Design Council',[no(),no(),yes()]],
   ['Enhanced learning preferences',[no(),no(),yes()]]
  ];
  matrix.innerHTML=`<table class="catalog-comparison"><caption>Founding Members Starter, Standard and Extended benefit comparison. Shared capacity: 600.</caption><thead><tr><th scope="col">Benefit</th>${displayIndices.map(i=>{const p=plans[i];return `<th scope="col">${esc(p.name)}<small class="catalog-cell-note">${esc(p.billingIntervalDays)} days</small></th>`}).join('')}</tr></thead><tbody>${rows.map(([label,values])=>`<tr><th scope="row">${esc(label)}</th>${displayIndices.map(i=>comparisonCell(values[i])).join('')}</tr>`).join('')}</tbody></table>`;
 }catch{target.innerHTML='<div class="notice">Founding terms are temporarily unavailable. <a href="founding600.html">Review the founding program</a>.</div>';matrix.textContent='Comparison unavailable until approved terms can be loaded.';}
}


async function enforceOfferVisibility(){
 const founderTab=document.getElementById('store-tab-founders'),publicTab=document.getElementById('store-tab-memberships');
 if(!founderTab||!publicTab)return;
 let state=null;
 try{
  const r=await fetch('/api/founding-offer-status',{cache:'no-store'});
  if(r.ok){const j=await r.json();if(j.ok===true)state=j}
 }catch{}
 founderTab.hidden=state?.offersVisible!==true;
 publicTab.hidden=state?.ok!==true;
 const publicPanel=document.getElementById('store-panel-memberships');
 if(publicPanel)publicPanel.inert=state?.ok!==true;
 const status=document.getElementById('store-category-status');
 if(!state&&status)status.textContent='Membership launch status could not be verified; enrollment offers remain hidden.';
 // Never display founding offers once the gate closes, even if a stale hash is present.
 const requested=location.hash.replace('#','');
 const fallback=state?.offersVisible?'founders':state?.ok?'memberships':'books';
 window.CrownlightStoreSelectCategory?.(
  (requested==='founders'&&!state?.offersVisible)||(requested==='memberships'&&!state?.ok)||!requested?fallback:requested
 );
 if(state?.offersVisible){
  await foundingCatalog(); // Only request founding copy if offers really are visible.
 }else{
  const holder=document.getElementById('store-founder-plans');
  const compare=document.getElementById('store-founder-compare');
  if(holder)holder.replaceChildren();
  if(compare)compare.replaceChildren();
 }
}

function tabs(){
 const buttons=[...document.querySelectorAll('[data-store-category]')],parts=['founders','memberships','books','sparks','tools','current','upcoming'];
 const visibleButtons=()=>buttons.filter(b=>!b.hidden&&!b.disabled);
 const select=(name,focus=false)=>{
  const available=visibleButtons();
  const key=parts.includes(name)&&available.some(b=>b.dataset.storeCategory===name)?name:(available[0]?.dataset.storeCategory||'books');
  for(const b of buttons){const active=b.dataset.storeCategory===key;
   b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus()}
  for(const kind of parts){const p=document.getElementById('store-panel-'+kind);if(p)p.hidden=kind!==key}
  const el=document.getElementById('store-category-status');if(el)el.textContent='Showing '+({founders:'founding memberships and their comparison',memberships:'platform memberships and current prices',books:'books only',sparks:'Crownlight Sparks packages',tools:'released and beta-approved individual tools',current:'current products grouped by type',upcoming:'upcoming releases grouped by type'})[key]+'.';
  if(location.hash!==('#'+key))history.replaceState(history.state,'',location.pathname+location.search+'#'+key);
 };
 buttons.forEach(b=>{b.addEventListener('click',()=>select(b.dataset.storeCategory));
  b.addEventListener('keydown',e=>{
   const available=visibleButtons(),i=available.indexOf(b);
   if(i<0||!available.length)return;
   let idx;if(e.key==='ArrowRight')idx=(i+1)%available.length;else if(e.key==='ArrowLeft')idx=(i+available.length-1)%available.length;else if(e.key==='Home')idx=0;else if(e.key==='End')idx=available.length-1;else return;
   e.preventDefault();select(available[idx].dataset.storeCategory,true)
  })});
 window.addEventListener('hashchange',()=>{const key=location.hash.replace('#','');if(parts.includes(key))select(key)});
 window.CrownlightStoreSelectCategory=select;
 select(location.hash.replace('#',''));
 const filters=[...document.querySelectorAll('#store-tabs button')];
 filters.forEach(b=>b.addEventListener('click',()=>{
  filters.forEach(x=>{const yes=x===b;x.classList.toggle('active',yes);x.setAttribute('aria-pressed',String(yes))});
  document.querySelectorAll('#store-products [data-family]').forEach(c=>{c.hidden=!(b.dataset.filter==='all'||c.dataset.family===b.dataset.filter)});
 }));
 for(const b of filters)b.setAttribute('aria-pressed',String(b.classList.contains('active')));
}

const catalogImage=x=>{const img=window.GroundUpCatalogVisuals?.resolve?.(x);
 return img?'<a class="gu-catalog-card-image" href="'+esc(catalogUrl(x))+'"><img src="'+esc(img.src)+'" alt="'+esc(img.alt)+'" loading="lazy" width="340" height="190"></a>':''};
const catalogUrl=x=>typeof x.page==='string'&&/^[a-z0-9-]+\.html$/.test(x.page)?x.page:'store-upcoming-product.html?sku='+encodeURIComponent(String(x.sku||'').split(':').pop());
const catalogSummary=x=>{const desc=String(x.description||'').replace(/\s+/g,' ').trim();
 return desc.length>132?esc(desc.slice(0,132).trimEnd())+'… <a class="gu-catalog-read-more" href="'+esc(catalogUrl(x))+'">Read more</a>':esc(desc)};
const publicCurrent=x=>x.saleReady===true||['published','selling','for_sale','listed','release_ready'].includes(x.status);
const publicNewest=(a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))||
 Number(a.displayOrder??9999)-Number(b.displayOrder??9999)||String(a.sku||'').localeCompare(String(b.sku||''));
function pageControls(host,page,pages,onPage){
 if(!host)return;host.replaceChildren();if(pages<=1)return;
 const make=(label,disabled,action)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.addEventListener('click',action);return b};
 const n=document.createElement('span');n.textContent='Page '+page+' of '+pages;
 host.append(make('Previous',page===1,()=>onPage(page-1)),n,make('Next',page===pages,()=>onPage(page+1)));
}
function renderToolPages(tools,layout){
 const host=document.getElementById('store-tools'),nav=document.getElementById('store-tools-pagination');
 const size=Math.max(2,Math.min(72,Number(layout.tool_columns||5)*Number(layout.tool_rows||6)));
 let page=1;
 const draw=()=>{const pages=Math.max(1,Math.ceil(tools.length/size));page=Math.min(page,pages);
  host.style?.setProperty?.('--gu-tool-columns',String(layout.tool_columns||5));
  host.innerHTML=tools.slice((page-1)*size,page*size).map(toolCard).join('')||
    '<p>No approved beta or released individual tool listings are available.</p>';
  pageControls(nav,page,pages,p=>{page=p;draw();host.scrollIntoView({block:'start'})});
 };draw();
}
function renderGroupCatalog(host,nav,items,layout){
 if(!host)return;
 let page=1;const size=Math.max(2,Math.min(72,Number(layout?.catalog_columns||5)*Number(layout?.catalog_rows||3)));
 const draw=()=>{
  const pages=Math.max(1,Math.ceil(items.length/size));page=Math.min(page,pages);
  const subset=items.slice((page-1)*size,page*size),groups=new Map();
  for(const item of subset){const k=String(item.category||'Other');
   if(!groups.has(k))groups.set(k,[]);groups.get(k).push(item)}
  host.innerHTML=[...groups].map(([type,rows])=>'<section class="gu-store-type-section"><h3>'+esc(type)+'</h3><div class="gu-store-type-grid">'+rows.map(x=>{
   const href=catalogUrl(x);
   return '<article class="gu-store-type-card">'+catalogImage(x)+(x.betaTestingReady===true?'<span class="store-beta-ribbon">Beta Testing Ready</span>':'')+'<span class="eyebrow">'+esc(x.status||'Listed')+
   '</span><h4><a href="'+esc(href)+'">'+esc(x.name)+'</a></h4><p class="gu-catalog-summary">'+catalogSummary(x)+'</p>'+
   '<p class="small">Price: '+esc(x.price||'Not announced')+'</p><a href="'+esc(href)+'">View details</a></article>';
  }).join('')+'</div></section>').join('')||'<p>No matching public product listings.</p>';
  pageControls(nav,page,pages,p=>{page=p;draw();host.scrollIntoView({block:'start'})});
 };draw();
}
async function renderStoreCatalogPanels(){
 const fallback={tool_columns:5,tool_rows:5,catalog_columns:5,catalog_rows:3};
 try{
  const r=await fetch('/api/storefront-public-catalog',{cache:'no-store'});
  if(!r.ok)throw Error('Product catalog unavailable');
  const data=await r.json();
  if(data.ok!==true||data.source!=='verified_storefront'||!Array.isArray(data.items))throw Error('Catalog verification failed');
  const list=data.items.filter(x=>x.category!=='membership').sort(publicNewest);
  const current=list.filter(publicCurrent),upcoming=list.filter(x=>!publicCurrent(x));
  const opts=data.layout&&typeof data.layout==='object'?data.layout:fallback;
  renderGroupCatalog(document.getElementById('store-current-products'),document.getElementById('store-current-pagination'),current,opts);
  renderGroupCatalog(document.getElementById('store-upcoming-products'),document.getElementById('store-upcoming-pagination'),upcoming,opts);
  return opts;
 }catch{
  for(const id of ['store-current-products','store-upcoming-products']){
   const h=document.getElementById(id);if(h)h.textContent='Current product data could not be verified. Open the full catalog to try again.';
  }
  return fallback;
 }
}

async function init(){
 tabs();
 void enforceOfferVisibility();
 try{
  const catalog=await C().load();
  const d=typeof C().verifiedCheckout==='function'?await C().verifiedCheckout(catalog):catalog;
  const listingResponse=await fetch('/api/storefront-public-catalog',{cache:'no-store'});
   const listing=listingResponse.ok?await listingResponse.json():null;
   if(listing?.ok!==true||listing.source!=='verified_storefront'||!Array.isArray(listing.items))throw Error('Store publication unavailable');
   const visible=new Set(listing.items.map(x=>x.sku));
   const allTools=(d.tools||[]).filter(t=>t.status==='live'&&t.betaTestingReady===true&&visible.has('tool:'+t.toolCode));
  // All current public plans now have a distinct, price-verified Store tab.
  // The server-side read-only per-SKU Stripe preflight controls purchase buttons.
  const plans=approvedPlanCatalog(d.plans||[]).filter(p=>visible.has('plan:'+p.planCode));
  const planHost=document.getElementById('store-member-plans');
  if(planHost)planHost.innerHTML=d.commerceUnavailable?
   '<div class="notice">Current membership prices cannot be verified; checkout is unavailable.</div>':
   plans.length?plans.map(planCard).join(''):
   '<div class="notice">Public membership offers are temporarily unavailable.</div>';
  const planCompare=document.getElementById('store-member-compare');
  if(planCompare)planCompare.innerHTML=d.commerceUnavailable?'':comparison(plans,allTools);
  document.getElementById('store-products').innerHTML=(d.products||[]).filter(p=>p.type==='book'&&visible.has('book:'+p.productCode)&&p.storeVisible!==false&&p.salesStatus!=='retired'&&!['draft','not_started','archived'].includes(p.publicationStatus)).map(bookCard).join('')||
   '<div class="empty-state">No books are currently listed in this catalog.</div>';
  document.querySelector('#store-tabs button.active')?.click();
  const liveOrBeta=allTools.filter(t=>['live','beta'].includes(String(t.status||'')));
  const storeLayout=await renderStoreCatalogPanels();
  if(d.commerceUnavailable){
    document.getElementById('store-tools').innerHTML='<div class="notice">Live product prices and checkout status cannot be verified. No purchase can be initiated.</div>';
  }else renderToolPages(liveOrBeta,storeLayout);

  // Keep navigation available when a catalog request fails; the affected
  // panel shows a recoverable state instead of disappearing altogether.
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
