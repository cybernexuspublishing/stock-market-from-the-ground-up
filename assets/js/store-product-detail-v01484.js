/* v0.14.0.84 — One dedicated URL per sellable catalog record.
 * All prices and purchase actions come from the existing DB catalog and the
 * protected checkout flow. No guessed prices, purchase rights or KDP rewrites.
 */
(()=>{'use strict';
 const q=s=>document.querySelector(s),e=s=>window.CommerceTools.esc(s),money=c=>window.CommerceTools.moneyCents(Number(c||0)/100);
 const page=document.body.dataset,kind=page.productKind,code=page.productCode;
 const renderList=items=>'<ul>'+items.map(s=>'<li>'+e(s)+'</li>').join('')+'</ul>';
 const block=(title,html)=>'<section class="detail-card"><h2>'+e(title)+'</h2>'+html+'</section>';
 const link=(label,href)=>{const url=window.CommerceTools.safeHref(href);return url?'<a class="btn secondary" href="'+e(url)+'">'+e(label)+'</a>':''};
 const plans={
 FREE:{included:['Public learning samples and basic account access','Selected trial or free tools where indicated'],excluded:['Paid premium tool subscriptions','Full platform feature access','Full downloadable eBooks']},
 FULL_MONTHLY:{included:['All released first-party platform tools while subscribed','All released first-party book companion learning branches','Limited sponsor placements'],excluded:['Complete downloadable eBook files','Third-party brokerage software, market data, and external services']},
 FULL_ANNUAL:{included:['All released first-party platform tools while subscribed','All released first-party book companion learning branches','Minimal sponsor placements'],excluded:['Complete downloadable eBook files','Third-party brokerage software, market data, and external services']},
 LIFETIME:{included:['Released and future first-party platform tools during the operational life of the platform','Current and future first-party book companion branches','Five designated downloadable eBooks when distribution rights permit','Ad-free first-party platform access'],excluded:['Indefinite operation of the platform','Third-party brokerage subscriptions, paid data feeds, or other ongoing external services']},
 PICK_WHAT_YOU_WANT:{included:['No base platform fee for choosing released individual tools','Pay only for independently selected subscriptions'],excluded:['Automatic access to every tool','All book companion branches','Full downloadable eBooks']},
 ONDEMAND_MONTHLY:{included:['Guided historical replay learning and book-aligned practice','Chart-reading exercises and structured decision journals on your own independently authorized platform'],excluded:['A brokerage account or Schwab software','A proprietary market simulator or third-party market data','Downloadable eBooks and Full Platform access']}
 };
 const learning={
 FOUNDATION_BOOK_1:['Stock market structure and major participants','Equities, exchanges, brokers and commonly used terminology','Foundational risk concepts and responsible participation'],
 FOUNDATION_BOOK_2:['Price behavior, chart-reading concepts and quotations','Market context, patterns, liquidity and support/resistance','Structured observation and application of foundational concepts'],
 FOUNDATION_BOOK_3:['Connecting market observations to defined trading decisions','Risk planning, evidence-based evaluation and disciplined review','Practice-oriented decision processes; no guaranteed outcomes'],
 DAY_TRADING_BOOK_1:['Day trading workflow, planning and trade selection','Market sessions, execution, risk controls and recordkeeping','Order execution concepts, liquidity and structured practice'],
 READING_THE_TAPE:['Time & Sales, Level II and quotation display interpretation','Bid/ask mechanics, spreads, transactions and displayed liquidity','Order-flow interpretation limits, execution context and risk']
 };
 function cardPlan(p,tools){
  const inc=plans[code];const cycle=p.billingInterval==='month'?'/month':p.billingInterval==='year'?'/year':p.billingInterval==='lifetime'?' one-time':'';
  const price='<p class="v11-price">'+money(p.priceCents)+e(cycle)+'</p>';
  const toolRows=tools.filter(t=>t.status==='live').map(t=>'<tr><td>'+link(t.name,'store-product-tool-'+t.toolCode.toLowerCase().replaceAll('_','-')+'.html')+'</td><td>'+ (p.allTools?'Included while membership active':code==='FREE'?'Limited free preview, where offered':code==='ONDEMAND_MONTHLY'?'Not automatically included':'See membership terms')+'</td></tr>').join('');
  return '<div class="detail-head"><div><div class="eyebrow">Membership</div><h1>'+e(p.label)+'</h1>'+price+'<p>'+e(p.description||'Review the inclusion and exclusion terms below.')+'</p></div></div>'+
  block('What is included',renderList(inc.included))+
  block('What is not included',renderList(inc.excluded))+
  block('Learning access and feature comparison','<p>Open individual tool descriptions to understand each capability. Availability depends on release status and the active membership.</p><table class="detail-table"><thead><tr><th>Tool / feature</th><th>This plan</th></tr></thead><tbody>'+toolRows+'</tbody></table><p>'+link('Compare every membership','membership.html#membership-matrix')+'</p>')+
  block('Billing and enrollment', '<p>'+e(code==='LIFETIME'?'One-time purchase; access lasts only for the operational life of the platform, subject to published Terms.':code==='FREE'||code==='PICK_WHAT_YOU_WANT'?'No base membership charge; individual premium tools have their own subscriptions.': 'Recurring subscription at the displayed interval. Billing, renewal, cancellation and access follow the published Terms and the payment provider.')+'</p>'+
  '<div class="detail-actions">'+(code==='FREE'?link('Create a free account','create-account.html'):code==='PICK_WHAT_YOU_WANT'?link('Choose individual tools','store.html#a-la-carte'):
   link('Continue to secure checkout','checkout.html?type=plan&code='+encodeURIComponent(code)))+'</div><p class="small">Checkout independently verifies the current LIVE product, amount, account eligibility and fulfillment. A displayed price alone is not payment authorization.</p>')+
  '<p>'+link('Back to memberships','store.html#memberships')+'</p>';
 }
 function cardBook(p){
  const learningList=learning[code]||[];
  const channels=[];
  const add=(label,url,ok)=>{if(ok&&url)channels.push(link(label,url))};
  add('Buy Kindle on Amazon',p.amazon?.kindleUrl,p.amazonKindleEnabled!==false);
  add('Buy Paperback on Amazon',p.amazon?.paperbackUrl,p.amazonPaperbackEnabled!==false);
  add('Buy Hardcover on Amazon',p.amazon?.hardcoverUrl,p.amazonHardcoverEnabled!==false);
  add('Buy Digital Edition Direct',p.directDigital?.checkoutUrl,p.directDigital?.enabled&&!p.kdpSelect);
  add('Buy Physical Edition Direct',p.directPhysical?.checkoutUrl,p.directPhysical?.enabled);
  if(p.websiteCheckoutEnabled&&p.lemonVariantId)channels.push(link('Buy on Website','checkout.html?type=book&code='+encodeURIComponent(code)));
  if(p.sampleUrl)channels.push(link('Read available sample',p.sampleUrl));
  const cover=p.coverImageUrl?'<img class="detail-cover" src="'+e(p.coverImageUrl)+'" alt="Cover of '+e(p.title)+'">':'';
  return '<div class="detail-head">'+cover+'<div><div class="eyebrow">'+e(p.shortTitle)+'</div><h1>'+e(p.title)+'</h1><p>By '+e(p.author||'J. S. Grant')+' · '+e(p.publisher||'Crown & Lantern Press')+'</p><p>'+e(p.description||'Review the learning focus and edition availability below.')+'</p></div></div>'+
  block('What this book teaches',renderList(learningList)+'<p class="small">Focus areas summarize the subject matter; confirm the precise edition contents using the table of contents or sample before purchasing.</p>')+
  block('What you receive','<p>What is delivered depends on the format and retailer selected. An Amazon edition is fulfilled by Amazon. A directly purchased digital edition requires an enabled and verified download checkout; printed direct editions require available physical fulfillment.</p>'+
   '<p>Book companion learning is separate from the full downloadable book. Book-key eligibility depends on the applicable edition and the published access terms.</p>')+
  block('Edition status and purchasing','<p>Current catalog publication status: '+e(p.publicationStatus||'Not confirmed')+'. Sale-ready labeling does not guarantee that any specific format or checkout is currently available.</p><div class="detail-actions">'+(channels.join('')||'<p>No verified purchase channel is currently configured for this edition. The Owner manages retailer and direct-sale availability.</p>')+'</div>')+
  '<p>'+link('Back to books','store.html#books')+'</p>';
 }
 function cardTool(t){
  const interval=money(t.priceCents)+'/month';
  return '<div class="detail-head"><div><div class="eyebrow">À-la-Carte / '+e(t.category||'Platform tool')+'</div><h1>'+e(t.name)+'</h1><p class="v11-price">'+interval+'</p><p>'+e(t.description||'See the feature scope and current release status below.')+'</p></div></div>'+
  block('What this tool provides','<p>'+e(t.description||'Feature documentation is maintained in the tool preview. Do not infer functionality beyond the available release.')+'</p>'+
    '<p>'+link('Open tool preview or documentation',t.href||'tools.html')+'</p>')+
  block('Included and excluded',renderList(['Individual access to this tool while the subscription is active, subject to its released features','Any free preview explicitly offered by the tool'])+
    '<h3>Not included</h3>'+renderList(['The entire Full Platform membership','Purchases or downloads of eBooks','Third-party brokerage accounts, licensed market data or software']))+
  block('Availability and checkout','<p>Current release status: '+e(t.status||'Unverified')+'. Tool access and billing are checked against the current account entitlement and Stripe checkout configuration.</p>'+
    (t.status==='live'?'<div class="detail-actions">'+link('Review subscription checkout','checkout.html?type=tool&code='+encodeURIComponent(code))+'</div>':'<p>Paid enrollment is unavailable until this tool is released.</p>'))+
  '<p>'+link('Back to À-la-Carte tools','store.html#a-la-carte')+'</p>';
 }
 async function init(){
  const host=q('#product-detail');if(!host)return;
  try{const d=await window.CommerceTools.load();let html='';
   if(kind==='book'){const p=d.products.find(p=>p.productCode===code&&p.storeVisible!==false);if(!p)throw Error('This book is not in the visible catalog.');html=cardBook(p)}
   else if(kind==='plan'){if(d.commerceUnavailable)throw Error('The membership catalog is unavailable; purchases cannot be verified.');const p=d.plans.find(p=>p.planCode===code);if(!p)throw Error('Membership plan unavailable.');html=cardPlan(p,d.tools||[])}
   else if(kind==='tool'){if(d.commerceUnavailable)throw Error('The tool catalog is unavailable; purchases cannot be verified.');const t=d.tools.find(t=>t.toolCode===code);if(!t)throw Error('This tool is unavailable.');html=cardTool(t)}
   else throw Error('Invalid product type.');
   host.innerHTML=html;
  }catch(err){host.innerHTML='<div class="notice" role="alert">'+e(err.message||'Product details are unavailable.')+'</div><p>'+link('Return to Store','store.html')+'</p>'}
 }
 document.addEventListener('DOMContentLoaded',init);
})();
