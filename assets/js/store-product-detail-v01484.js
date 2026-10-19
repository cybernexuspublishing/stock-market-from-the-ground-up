/* v0.14.0.84 — One reusable renderer, independent URL/HTML for every product.
 * Catalog names, prices, publication state and purchase URLs derive from the
 * existing read-only database (book static catalog fallback). Product education
 * is a separate reviewed text file; no KDP/admin records are written here.
 */
(()=>{'use strict';
const e=s=>window.CommerceTools.esc(s);
const safe=s=>window.CommerceTools.safeHref(s);
const money=c=>window.CommerceTools.moneyCents(Number(c||0)/100);
// The standalone JSON guide did not reach Cloudflare production (404), causing
// all fifteen detail pages to fail. Embed only reviewed educational copy here;
// canonical prices, entitlement flags and sales availability still come from
// the live database catalog, NEVER from this bundled descriptive material.
const productGuides={"version":"0.14.0.84","notices":{"investment":"Educational content only; not individualized investment advice, trading signals, or a promise of returns. Trading and investing involve risk.","data":"Brokerage accounts, independently licensed software, live market data, and other third-party services are not included unless explicitly stated.","billing":"The checkout page must confirm the current price, billing period, eligibility, terms, and refund policy before payment.","book":"Book sale-readiness is not confirmation that a particular format has an active purchase link or immediate delivery."},"plans":{"FREE":{"summary":"Explore public samples, selected learning previews, limited tools and basic progress without a paid subscription.","learn":["Understand the platform's learning workflow and available public lesson samples.","Try the tools that are specifically marked as free previews before purchasing access."],"included":["Public and sample lessons where released","Limited Tutor and learning-tool previews where available","Basic progress and selected trial experiences"],"excluded":["Unlimited premium tool access","Full first-party companion branches","Downloadable eBooks","Third-party market data or brokerage accounts"],"terms":"No recurring membership charge. Individual tool subscriptions and books, if available, are separate."},"FULL_MONTHLY":{"summary":"Full first-party learning platform access billed monthly, with released tools and book-companion learning.","learn":["Move from market concepts into guided exercises, historical labs, trading journals and decision reviews.","Use released first-party simulation, journal, Tutor, and analytical tools to practice a defined trading process."],"included":["All released first-party platform tools while the membership is active","All current and future first-party book-companion learning branches while active","Historical labs, journal workflows, trading practice, and available Tutor features","Limited sponsor placements under the published Store presentation"],"excluded":["Complete downloadable eBook files (sold separately)","Independently licensed brokerage software, paid data feeds and third-party subscriptions","Access after cancellation or expiry except as described in billing terms"],"terms":"Recurring monthly plan. Renews until canceled under the published Billing Terms."},"FULL_ANNUAL":{"summary":"Full first-party learning platform access with annual billing and the same educational tool coverage as Full Monthly.","learn":["Follow the same guided research, practice, journaling, and review process as Full Monthly.","Develop repeatable analysis and risk-control routines over a longer learning period."],"included":["All released first-party learning tools during the annual term","All current and future first-party book-companion learning branches during the term","Historical labs, trading journal, simulator, Tutor and other released first-party tools","Minimal sponsor placements under the published Store presentation"],"excluded":["Complete downloadable eBook files (sold separately)","Brokerage accounts, third-party trading platforms, live premium market-data feeds","Renewal-free permanent access; this is an annual subscription"],"terms":"Recurring annual plan. Renews until canceled under the published Billing Terms."},"LIFETIME":{"summary":"One-time platform membership covering first-party tools and book companions while the platform operates and the account remains in good standing.","learn":["Work through the first-party trading education system at your own pace.","Use current and future released first-party practice tools and companion branches, subject to platform operation."],"included":["Released and future first-party platform tools","Current and future J. S. Grant book-companion learning branches carried by this platform","Five designated downloadable eBooks when the editions are released and digital distribution is permitted","Ad-free platform experience under the published Store presentation"],"excluded":["A guarantee of indefinite website operation or uninterrupted third-party services","Third-party brokerage accounts, licensed premium data feeds or externally billed platforms","Unlimited downloads of every book edition outside the five designated eBooks unless explicitly granted"],"terms":"One-time purchase. 'Lifetime' means the operational life of the platform, subject to published Terms and an active account in good standing."},"ONDEMAND_MONTHLY":{"summary":"Book-aligned historical replay learning for use with a separately authorized third-party OnDemand installation.","learn":["Practice no-look-ahead chart review and historical trading decisions.","Use guided replay prompts and a decision journal to distinguish observations from hindsight."],"included":["Guided book-aligned historical replay training where released","Historical practice prompts and structured decision-journal exercises"],"excluded":["Downloadable eBooks","The proprietary Market Simulator and other Full Platform tools unless independently licensed","An OnDemand installation, brokerage account, market data, or third-party simulator access","Full Platform Monthly, Annual or Lifetime entitlements"],"terms":"Separate monthly subscription if enrollment is enabled; availability and specific access are verified by checkout."}},"tools":{"INTERACTIVE_LEARNING":{"outcomes":["Work through guided, practice, blind-decision and assessment exercises.","Review historical lab evidence and record the reasoning behind a decision.","Track competence and revisit missed skills using progress feedback."],"included":["Released interactive lessons, historical labs and supported assessments","Competency and learning-progress workflows under tool access"],"excluded":["eBooks, independent brokerage software or subscriptions","Standalone journal analytics, market simulator and Market Tutor subscriptions"],"requirements":"Uses published lesson/lab datasets. Some free previews are available."},"JOURNAL_ANALYTICS":{"outcomes":["Record live, paper, simulator and observation-only trading scenarios.","Compare a written trading plan with actual actions and outcomes.","Use MFE, MAE, R-multiple and behavioral review to identify process errors."],"included":["Trading journal records and released performance-review tools","Plan-versus-actual review, delayed reflection and strategy analysis"],"excluded":["Automatic brokerage execution or a brokerage account","Simulator, Market Tutor, historical lab subscriptions or external data services"],"requirements":"Requires user-entered or supported imported trading records."},"MARKET_SIMULATOR":{"outcomes":["Practice execution and decision-making with no-look-ahead historical replay.","Use locked trade plans, long/short scenarios, risk and session context.","Review MFE/MAE and journal connections to assess process."],"included":["Released first-party historical simulator and replay features","Supported trade review and journal integration"],"excluded":["Real-money orders or brokerage execution","A proprietary third-party OnDemand installation or premium live market-data license","Other separately sold tools and downloadable books"],"requirements":"Requires supported historical datasets, CSVs or independently connected market-data providers as applicable."},"MARKET_TUTOR":{"outcomes":["Clarify terminology and foundational market concepts.","Identify gaps in trading-journal or lab reasoning.","Find related learning material and practice prompts."],"included":["Released first-party Market Tutor educational assistance","Supported curriculum references and learning-history context"],"excluded":["Personalized financial advice or guaranteed accurate trading signals","Unlimited third-party AI services, brokerage accounts or paid data feeds","Other premium tool subscriptions or standalone eBooks"],"requirements":"Uses first-party companion knowledge and available user learning context."}},"books":{"FOUNDATION_BOOK_1":{"overview":"Foundations Book I introduces the basic structure, participants, language and mechanics of the stock market.","topics":["What stocks and stock exchanges represent","How market participants, prices, bids, asks and orders interact","Foundational risk awareness and responsible market observation"],"scope":"Beginner foundations; not a collection of trade alerts or a promise of profitability."},"FOUNDATION_BOOK_2":{"overview":"Foundations Book II develops the ability to interpret market information instead of relying on hindsight.","topics":["Reading price movement, volume and chart context","Identifying trends, important levels and evidence of liquidity","Separating observable market facts from interpretation"],"scope":"Builds on Book I and prepares for structured trading decisions in Book III."},"FOUNDATION_BOOK_3":{"overview":"Foundations Book III connects basic market knowledge and chart reading to a documented decision process.","topics":["Preparing an evidence-based trading plan and considering risk","Defining setups, invalidation, position sizing and review","Recognizing when a NO TRADE decision is appropriate"],"scope":"Develops judgment and risk planning; does not promise trade outcomes."},"DAY_TRADING_BOOK_1":{"overview":"An introductory day-trading workflow focused on observation, planning, execution discipline and risk.","topics":["Developing a repeatable intraday preparation and review routine","Identifying session context, liquidity and potential market setups","Thinking through risk controls, execution and journal review"],"scope":"Recorded as in development in the existing book catalog. The owner controls publication and availability."},"READING_THE_TAPE":{"overview":"A guide to interpreting Time & Sales, Level II and the limits of modern order-flow evidence.","topics":["Reading prints, quotes, bid/ask dynamics and displayed depth","Understanding spread, liquidity, order-size changes and tape context","Avoiding false certainty from displayed orders and historical order-flow patterns"],"scope":"Recorded as in development in the existing book catalog. The owner controls publication and availability."}}};
const status=s=>({published:'Published',publication_candidate:'Publication Candidate',in_development:'In Development',coming_soon:'Coming Soon',archived:'Archived'})[s]||String(s||'Availability pending').replaceAll('_',' ');
const suffix=x=>({month:'/month',year:'/year',lifetime:' one-time',none:''})[x]||'';
const list=(title,arr)=>arr?.length?`<section class="store-product-section"><h2>${e(title)}</h2><ul>${arr.map(v=>`<li>${e(v)}</li>`).join('')}</ul></section>`:'';
const topic=(title,v)=>v?`<section class="store-product-section"><h2>${e(title)}</h2><p>${e(v)}</p></section>`:'';
const button=(text,link,external=false)=>safe(link)?`<a class="btn secondary" href="${e(link)}"${external?' target="_blank" rel="noopener noreferrer"':''}>${e(text)}</a>`:'';
const formatInfo=p=>{const out=[];
 if(p.amazonKindleEnabled!==false&&p.amazon?.kindleUrl)out.push(button('Kindle on Amazon',p.amazon.kindleUrl,true));
 if(p.amazonPaperbackEnabled!==false&&p.amazon?.paperbackUrl)out.push(button('Paperback on Amazon',p.amazon.paperbackUrl,true));
 if(p.amazonHardcoverEnabled!==false&&p.amazon?.hardcoverUrl)out.push(button('Hardcover on Amazon',p.amazon.hardcoverUrl,true));
 if(p.directDigital?.enabled&&!p.kdpSelect&&p.directDigital?.checkoutUrl)out.push(button('Direct digital purchase',p.directDigital.checkoutUrl,true));
 if(p.directPhysical?.enabled&&p.directPhysical?.checkoutUrl)out.push(button('Direct printed edition',p.directPhysical.checkoutUrl,true));
 if(p.websiteCheckoutEnabled&&!p.kdpSelect&&p.lemonVariantId)out.push(button('Website purchase',`checkout.html?type=book&code=${encodeURIComponent(p.productCode)}`));
 return out.filter(Boolean)};
function show(html){const root=document.querySelector('#store-product-root');root.innerHTML=html}
function layout(category,head,description,price,priceNote,actions,sections,advice,visual=''){
 const label={memberships:'Memberships',books:'Books',tools:'À-la-Carte Tools'}[category];
 const kind=category==='tools'?'Individual learning tool':category==='books'?'Book information':'Membership information';
 const availability=actions
  ?'<div class="library-actions">'+actions+'</div><p class="store-product-status">'+e(advice)+'</p>'
  :'<p class="store-product-status">'+e(advice||'No purchase channel is currently available.')+'</p>';
 return `<nav class="store-product-breadcrumbs" aria-label="Breadcrumb"><a href="store.html#${e(category)}">Store</a><span aria-hidden="true">/</span>
 <span>${e(label)}</span></nav>
 <header class="store-product-hero">
  <div class="store-product-hero-layout">
   ${visual?'<div class="store-product-hero-art">'+visual+'</div>':''}
   <div class="store-product-intro">
    <div class="eyebrow">${e(kind)}</div>
    <h1>${e(head)}</h1>
    <p class="store-product-lede">${e(description)}</p>
   </div>
  </div>
 </header>
 <div class="store-product-body">
  <section class="store-product-sections" aria-label="Product coverage and learning outcomes">${sections}</section>
  <aside class="store-product-purchase" aria-label="Pricing and purchase availability">
   <div class="eyebrow">Before you purchase</div>
   <h2>Price &amp; availability</h2>
   <div class="store-product-price">${e(price||'Pricing unavailable')}${priceNote?` <small>${e(priceNote)}</small>`:''}</div>
   ${availability}
   <p class="small">Review billing, access, and refund conditions before purchase.</p>
   <p class="store-product-policies"><a href="refund-policy.html">Refund policy</a> · <a href="terms.html">Terms</a></p>
  </aside>
 </div>
 <div class="store-product-disclaimer">Educational content only. No individualized investment advice, guaranteed results, or access to external brokerage or paid data services unless expressly included. Trading and investing involve risk.</div>
 <p class="store-product-back"><a href="store.html#${e(category)}">← Back to ${e(label)}</a></p>`;
}
function planDetail(p,guide,code){
 const title=p?.label||({FREE:'Free Membership',FULL_MONTHLY:'Full Platform — Monthly',FULL_ANNUAL:'Full Platform — Annual',LIFETIME:'Lifetime Platform Access',ONDEMAND_MONTHLY:'Historical Replay Learning — Monthly'}[code]||code);
 const price=p?money(p.priceCents):'Verify current price',cycle=p?suffix(p.billingInterval):'';
 let actions='',note='Plan availability is being verified from the current platform catalog.';
 if(code==='FREE'){actions=button('Create a free account','create-account.html');note='No paid subscription required.'}
 else if(p?.checkoutEnabled&&!!guide){actions=button('Review plan & secure checkout',`checkout.html?type=plan&code=${encodeURIComponent(code)}`);note='Stripe availability, final amount, age, account status, and eligibility are checked again before payment.'}
 else{note=!guide?'A complete product explanation and exclusions have not been approved for this membership. Checkout is unavailable until they are published.':'Paid enrollment is not currently authorized for this plan. Product information remains available.'}
 const benefits=guide?.included||[],exclusions=guide?.excluded||[];
 const sections=[
 list('What is included',benefits),list('What is not included',exclusions),
 list('What you will practice and learn',guide?.learn),
 topic('Billing and access conditions',guide?.terms),
 topic('Product scope',code==='LIFETIME'?'Lifetime means the operational life of this platform; no guarantee of indefinite service. Designated eBooks depend on publication and distribution rights.':
 code==='ONDEMAND_MONTHLY'?'This guided training branch does not supply an independently licensed OnDemand account or a proprietary simulation product.':
 'Premium access depends on an active membership. Third-party products and book files have separate distribution terms.'),
 `<section class="store-product-section wide"><h2>Compare before purchasing</h2><p>See every membership in the same comparison, including released tool coverage, downloadable eBooks, advertising and recurring billing.</p>
 <a class="btn secondary" href="store.html#memberships">Compare all memberships</a> <a class="btn secondary" href="membership.html">Membership terms and access</a></section>`
 ].join('');
 show(layout('memberships',title,p?.description||guide?.summary||'',price,cycle,actions,sections,note));
}
function toolDetail(t,guide,code){
 const title=t?.name||({INTERACTIVE_LEARNING:'Interactive Learning & Historical Labs',JOURNAL_ANALYTICS:'Trading Journal & Performance Analytics',MARKET_SIMULATOR:'Advanced Market Simulator & Replay',MARKET_TUTOR:'Market Tutor'}[code]||code);
 const released=t?.status==='live'&&Number(t?.priceCents)>0&&!!guide;
 const buyEnabled=released&&t.checkoutEnabled===true;
 const actions=buyEnabled?button('Subscribe Now — secure checkout',`checkout.html?type=tool&code=${encodeURIComponent(code)}`):
 '<span class="store-soon-label">Coming Soon · Enrollment not yet available</span>';
 const sections=[
 list('What you’ll learn and practice',guide?.outcomes),
 list('What individual tool access includes',guide?.included),
 list('What this purchase does not include',guide?.excluded),
 topic('Data and setup requirements',t?.dataRequirement||guide?.requirements),
 topic('Individual subscription terms','This tool has its own recurring monthly payment and is separate from other individually purchased tools. Full Platform memberships include released first-party tools while the membership is active.'),
 `<section class="store-product-section wide"><h2>Preview the tool</h2><p>Learn about the original tool's workflow before buying. Any preview may be limited by access level and data availability.</p>
 ${button('Open tool information',t?.href||'tools.html')} ${button('Compare with Full Platform membership','store.html#memberships')}</section>`
 ].join('');
 show(layout('tools',title,t?.description||'Individual first-party learning tool.',released?money(t.priceCents):'Pricing to be announced',released?'/month':'',
 actions,sections,buyEnabled?'Available to purchase; checkout independently verifies price and eligibility.':
 released?'Listed learning tool; purchasing opens once all live checkout requirements pass.':'Coming Soon. This learning tool is not available for independent enrollment yet.'));
}
function bookDetail(p,guide,code){
 const title=p?.title||code;
 const acts=p?formatInfo(p):[],cover=p?.coverImageUrl&&safe(p.coverImageUrl)?`<img src="${e(p.coverImageUrl)}" alt="Cover of ${e(title)}" class="store-product-book-cover">`:'';
 const detail=[['Catalog status',p?status(p.publicationStatus):'Unable to verify'],
 ['Author',p?.author||'—'],['Publisher',p?.publisher||'—'],
 ['Store offer status',p?.salesStatus==='published'?'Sale-ready catalog; formats must still be activated':p?.salesStatus||'Not verified'],
 ['Website delivery',p?.directDigital?.enabled&&!p.kdpSelect?'Check direct-digital availability': 'Not enabled for a direct eBook download from this listing'] ];
 const sections=[
 `<section class="store-product-section store-product-about"><h2>About this book</h2>
 <p>${e(p?.description||guide?.overview||'This edition’s detailed description is being prepared by the publisher.')}</p>
 <p class="small">The publisher controls edition descriptions, publication state and purchase links.</p></section>`,
 list('What you’ll learn in this book',guide?.topics),
 topic('Who this is for',guide?.scope),
 `<section class="store-product-section"><h2>Edition and purchase information</h2><dl class="store-product-facts">${detail.map(([k,v])=>`<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join('')}</dl><p>Buying a printed book does not automatically provide digital edition files. Companion learning access follows its own eligibility and book-key terms.</p></section>`,
 `<section class="store-product-section wide"><h2>Book companions and learning resources</h2><p>When enabled for this title, eligible readers can redeem a valid Book Key and use the associated online learning materials. A book listing is not a promise of automatic paid platform membership.</p>
 ${button('How companion access works','membership.html')} ${button('Open Store books','store.html#books')}</section>`
 ].join('');
 const advice=acts.length?'Only the listed purchase formats are currently linked. Other formats may not yet be available.':
 'No verified book purchase link is currently configured. The catalog being marked sale-ready does not authorize a charge.';
 show(layout('books',title,guide?.overview||p?.description||'Publisher-controlled book information', 'Price varies by edition', '',
 acts.join(''),sections,advice,cover));
}
function previewReplay(g){
 const secs=list('Learning focus',g.learn)+list('Included when released',g.included)+list('Not included',g.excluded)+topic('Enrollment status',g.terms);
 show(layout('memberships','Historical Replay Learning Membership','Planned independent historical practice program. This coming-soon preview is not itself a paid, active subscription.', 'Price pending','',button('View historical replay information','ondemand-training.html'),secs,
 'Coming soon. Paid enrollment for this separately described program is disabled; do not confuse it with any currently listed OnDemand price.'));
}
async function init(){
 const root=document.querySelector('#store-product-root');if(!root)return;
 document.body?.classList?.add('store-detail-page');
 const type=root.dataset.productType||new URLSearchParams(location.search).get('type');
 const code=root.dataset.productCode||new URLSearchParams(location.search).get('code');
 if(!['plan','tool','book','preview'].includes(type)||!(/^[A-Z][A-Z0-9_]{1,79}$/.test(code||''))){
  root.innerHTML='<h1>Product not found</h1><p>Invalid product reference.</p><a href="store.html">Return to the Store</a>';return;
 }
 try{
  const guideResponse=productGuides;
  const original=await window.CommerceTools.load();
  const catalog=(type==='tool'||type==='plan')&&typeof window.CommerceTools.verifiedCheckout==='function'
    ?await window.CommerceTools.verifiedCheckout(original,{type,code}):original;
  const guide=type==='plan'?guideResponse.plans[code]:type==='tool'?guideResponse.tools[code]:type==='book'?guideResponse.books[code]:guideResponse.plans.ONDEMAND_MONTHLY;
  if(type==='preview'){previewReplay(guide);return}
  if(type==='plan'){const row=catalog.plans.find(x=>x.planCode===code);planDetail(row,guide,code);return}
  if(type==='tool'){const row=catalog.tools.find(x=>x.toolCode===code);toolDetail(row,guide,code);return}
  if(type==='book'){const row=catalog.products.find(x=>x.productCode===code&&x.storeVisible!==false);if(!row){root.innerHTML='<h1>Book not currently listed</h1><a href="store.html#books">Return to books</a>';return}bookDetail(row,guide,code)}
 }catch(err){root.innerHTML='<h1>Product information temporarily unavailable</h1><p>Unable to verify the product catalog. No payment has been initiated. Please try again later.</p><a href="store.html">Return to the Store</a>';console.error('Product detail render error:',err)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
