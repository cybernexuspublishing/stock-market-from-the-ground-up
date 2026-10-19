/* v0.14.0.84 — One reusable renderer, independent URL/HTML for every product.
 * Catalog names, prices, publication state and purchase URLs derive from the
 * existing read-only database (book static catalog fallback). Product education
 * is a separate reviewed text file; no KDP/admin records are written here.
 */
(()=>{'use strict';
const e=s=>window.CommerceTools.esc(s);
const safe=s=>window.CommerceTools.safeHref(s);
const money=c=>window.CommerceTools.moneyCents(Number(c||0)/100);
const guidesUrl='data/store-product-guides-v01484.json';
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
 if(p.websiteCheckoutEnabled&&p.lemonVariantId)out.push(button('Website purchase',`checkout.html?type=book&code=${encodeURIComponent(p.productCode)}`));
 return out.filter(Boolean)};
function show(html){const root=document.querySelector('#store-product-root');root.innerHTML=html}
function layout(category,head,description,price,priceNote,actions,sections,advice){
 return `<nav class="store-product-breadcrumbs" aria-label="Breadcrumb"><a href="store.html#${e(category)}">Store</a><span aria-hidden="true">/</span>
 <span>${e({memberships:'Memberships',books:'Books',tools:'À-la-Carte Tools'}[category])}</span></nav>
 <div class="store-product-hero">
 <div class="store-product-intro"><div class="eyebrow">${e(category==='tools'?'Individual learning tool':category==='books'?'Book information':'Membership information')}</div>
 <h1>${e(head)}</h1><p class="section-intro">${e(description)}</p></div>
 <aside class="store-product-purchase" aria-label="Pricing and purchasing"><h2>Price &amp; availability</h2>
 <div class="store-product-price">${e(price||'Pricing unavailable')}${priceNote?` <small>${e(priceNote)}</small>`:''}</div>
 <p class="store-product-status">${e(advice)}</p><div class="library-actions">${actions||'<span>No verified purchase channel is currently configured.</span>'}</div>
 <p class="small">Review the relevant billing, refund and access conditions before paying. <a href="refund-policy.html">Refund policy</a> · <a href="terms.html">Terms</a>.</p></aside></div>
 <div class="store-product-sections">${sections}</div>
 <div class="store-product-disclaimer">Educational content only. No individualized investment advice, guaranteed results, or access to external brokerage or paid data services unless expressly included. Trading and investing involve risk.</div>
 <p><a href="store.html#${e(category)}">← Back to ${e(category)}</a></p>`;
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
 const actions=released?button('Review tool subscription & checkout',`checkout.html?type=tool&code=${encodeURIComponent(code)}`):
 '<span>Individual paid tool checkout is not currently verified.</span>';
 const sections=[
 list('Skills and learning outcomes',guide?.outcomes),
 list('What individual tool access includes',guide?.included),
 list('What this purchase does not include',guide?.excluded),
 topic('Data and setup requirements',t?.dataRequirement||guide?.requirements),
 topic('Individual subscription terms','This tool has its own recurring monthly payment and is separate from other individually purchased tools. Full Platform memberships include released first-party tools while the membership is active.'),
 `<section class="store-product-section wide"><h2>Preview the tool</h2><p>Learn about the original tool's workflow before buying. Any preview may be limited by access level and data availability.</p>
 ${button('Open tool information',t?.href||'tools.html')} ${button('Compare with Full Platform membership','store.html#memberships')}</section>`
 ].join('');
 show(layout('tools',title,t?.description||'Individual first-party learning tool.',t?money(t.priceCents):'Verify current price',released?'/month':'',
 actions,sections,released?'Released tool; checkout and member entitlement are checked again before a payment.':!guide?'This tool requires an approved explanation of what is included, excluded and taught before a separate checkout can be offered.':'This tool is not currently verified as a released, purchasable item.'));
}
function bookDetail(p,guide,code){
 const title=p?.title||code;
 const acts=p?formatInfo(p):[],cover=p?.coverImageUrl&&safe(p.coverImageUrl)?`<img src="${e(p.coverImageUrl)}" alt="Cover of ${e(title)}" class="store-product-book-cover">`:'';
 const detail=[['Catalog status',p?status(p.publicationStatus):'Unable to verify'],
 ['Author',p?.author||'—'],['Publisher',p?.publisher||'—'],
 ['Store offer status',p?.salesStatus==='published'?'Sale-ready catalog; formats must still be activated':p?.salesStatus||'Not verified'],
 ['Website delivery',p?.directDigital?.enabled&&!p.kdpSelect?'Check direct-digital availability': 'Not enabled for a direct eBook download from this listing'] ];
 const sections=[
 `<section class="store-product-section"><h2>About this book</h2>${cover}
 <p>${e(p?.description||guide?.overview||'Catalog description is being prepared by the publisher.')}</p>
 <p class="small">The publisher controls edition descriptions, publication state and purchase links.</p></section>`,
 list('Subject areas and learning focus (not a chapter list)',guide?.topics),
 topic('Who this is for',guide?.scope),
 `<section class="store-product-section"><h2>Edition and purchase information</h2><dl class="store-product-facts">${detail.map(([k,v])=>`<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join('')}</dl><p>Buying a printed book does not automatically provide digital edition files. Companion learning access follows its own eligibility and book-key terms.</p></section>`,
 `<section class="store-product-section wide"><h2>Book companions and learning resources</h2><p>When enabled for this title, eligible readers can redeem a valid Book Key and use the associated online learning materials. A book listing is not a promise of automatic paid platform membership.</p>
 ${button('How companion access works','membership.html')} ${button('Open Store books','store.html#books')}</section>`
 ].join('');
 const advice=acts.length?'Only the listed purchase formats are currently linked. Other formats may not yet be available.':
 'No verified book purchase link is currently configured. The catalog being marked sale-ready does not authorize a charge.';
 show(layout('books',title,guide?.overview||p?.description||'Publisher-controlled book information', 'Price varies by edition', '',
 acts.join(''),sections,advice));
}
function previewReplay(g){
 const secs=list('Learning focus',g.learn)+list('Included when released',g.included)+list('Not included',g.excluded)+topic('Enrollment status',g.terms);
 show(layout('memberships','Historical Replay Learning Membership','Planned independent historical practice program. This coming-soon preview is not itself a paid, active subscription.', 'Price pending','',button('View historical replay information','ondemand-training.html'),secs,
 'Coming soon. Paid enrollment for this separately described program is disabled; do not confuse it with any currently listed OnDemand price.'));
}
async function init(){
 const root=document.querySelector('#store-product-root');if(!root)return;
 const type=root.dataset.productType||new URLSearchParams(location.search).get('type');
 const code=root.dataset.productCode||new URLSearchParams(location.search).get('code');
 if(!['plan','tool','book','preview'].includes(type)||!(/^[A-Z][A-Z0-9_]{1,79}$/.test(code||''))){
  root.innerHTML='<h1>Product not found</h1><p>Invalid product reference.</p><a href="store.html">Return to the Store</a>';return;
 }
 try{
  const [guideResponse,catalog]=await Promise.all([
   fetch(guidesUrl,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Product explanation file unavailable.');return r.json()}),
   window.CommerceTools.load()
  ]);
  const guide=type==='plan'?guideResponse.plans[code]:type==='tool'?guideResponse.tools[code]:type==='book'?guideResponse.books[code]:guideResponse.plans.ONDEMAND_MONTHLY;
  if(type==='preview'){previewReplay(guide);return}
  if(type==='plan'){const row=catalog.plans.find(x=>x.planCode===code);planDetail(row,guide,code);return}
  if(type==='tool'){const row=catalog.tools.find(x=>x.toolCode===code&&x.status==='live');toolDetail(row,guide,code);return}
  if(type==='book'){const row=catalog.products.find(x=>x.productCode===code&&x.storeVisible!==false);if(!row){root.innerHTML='<h1>Book not currently listed</h1><a href="store.html#books">Return to books</a>';return}bookDetail(row,guide,code)}
 }catch(err){root.innerHTML='<h1>Product information temporarily unavailable</h1><p>Unable to verify the product catalog. No payment has been initiated. Please try again later.</p><a href="store.html">Return to the Store</a>';console.error('Product detail render error:',err)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
