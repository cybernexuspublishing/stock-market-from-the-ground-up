/* v84 browserless UI integration smoke test; NO real Stripe or database calls. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const safeHref=s=>{const str=String(s||'');return /^(?:https:\/\/[a-z0-9.-]+(?:\/[^\s<>]*)?|(?:\.\/)?[\w-]+\.html(?:[?#].*)?|\/[\w\/.\-]+(?:[?#].*)?)$/i.test(str)?str:''};
const ct=(data)=>({load:async()=>data,esc,safeHref,moneyCents:n=>(Number(n)/100).toLocaleString('en-US',{style:'currency',currency:'USD'})});
const makeNode=(name)=>({name,innerHTML:'',hidden:false,dataset:{},tabIndex:0,
   classes:new Set(),attributes:{},events:{},
   classList:{toggle(){},contains(){return false}},setAttribute(k,v){this.attributes[k]=v},addEventListener(k,cb){this.events[k]=cb},focus(){this.focused=true}});
const book=id=>({type:'book',productCode:id,shortTitle:id,title:'Educational '+id,storeVisible:true,salesStatus:'published',
  branchSlug:'foundations',author:'J. S. Grant',publisher:'Crown & Lantern Press',
  publicationStatus:'publication_candidate',amazon:{kindleUrl:'',paperbackUrl:'',hardcoverUrl:''},
  directDigital:{enabled:false},directPhysical:{enabled:false},coverImageUrl:'/assets/images/books/foundation-book-1.webp',metadata:id==='FOUNDATION_BOOK_1'?{amazon_listing_url:'https://www.amazon.com/dp/B0HMPSNLGS'}:{}});
const pl=(id,cents,billing,allTools)=>({planCode:id,label:id,description:'Guided plan',priceCents:cents,billingInterval:billing,checkoutEnabled:true,allTools,allBooks:false});
const betaToolCodes=new Set(['INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR']);
const tt=(code,status='live')=>({toolCode:code,name:code,description:'Teaching tool',priceCents:2999,status,category:'Learn',freePreview:false,href:'learn.html',checkoutEnabled:status==='live',betaTestingReady:status==='live'&&betaToolCodes.has(code)});
const plans=[pl('FREE',0,'none',false),pl('FULL_MONTHLY',6999,'month',true),pl('FULL_ANNUAL',69900,'year',true),
 pl('LIFETIME',249900,'lifetime',true),pl('ONDEMAND_MONTHLY',1999,'month',false),
 pl('PICK_WHAT_YOU_WANT',0,'none',false),pl('QA_TEST',0,'month',true),
 pl('UNREVIEWED_REPLAY_ANNUAL',3900,'year',false)];
const products=['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE'].map(book);
const tools=['INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR'].map(x=>tt(x));
tools.push(tt('DISCOVERY_LAB','beta'));
const data={plans,products:[...products,{type:'bundle',productCode:'BUNDLE',title:'Bundled products',storeVisible:true,salesStatus:'published'}],tools};
const tabIds=['founders','books','sparks','tools'];
const tabNodes=tabIds.map(k=>({...makeNode(k),dataset:{storeCategory:k}}));
const membershipTab={...makeNode('memberships'),dataset:{storeCategory:'memberships'},hidden:true};
// The real Store creates this future-public tab but keeps it hidden throughout beta.
tabNodes[0].hidden=true;
const filters=['all','foundations','day-trading','reading-the-tape'].map(k=>({...makeNode(k),dataset:{filter:k},classList:{toggle(){},contains(){return false}}}));
const nodes=Object.fromEntries(['store-plans','store-products','store-tools','store-membership-compare','store-category-status','store-founder-plans','store-founder-compare','store-panel-memberships',...tabIds.map(k=>'store-panel-'+k)].map(k=>[k,makeNode(k)]));
nodes['store-tab-founders']=tabNodes[0];nodes['store-tab-memberships']=membershipTab;
const preview=makeNode('preview'),winHandlers={};
const doc={
 readyState:'loading',callback:null,
 addEventListener(k,cb){if(k==='DOMContentLoaded')this.callback=cb},
 getElementById(id){return nodes[id]||null},
 querySelectorAll(q){
   if(q==='[data-store-category]')return [tabNodes[0],membershipTab,...tabNodes.slice(1)];
   if(q==='#store-tabs button')return filters;
   if(q==='#store-products [data-family]')return [];
   return [];
 },
 querySelector(q){return q==='.v135-replay-plan-cta a'?preview:null}
};
const location={hash:'#books',pathname:'/store.html',search:'?ref=training'},history={replaceState(_x,_y,url){assert.match(url,/ref=training/);location.hash='#'+url.split('#').pop()}};
const window={CommerceTools:ct(data),addEventListener(k,cb){winHandlers[k]=cb}};
const requests=[];
const context={window,document:doc,location,history,console,URL,URLSearchParams,encodeURIComponent,fetch:async(url,options)=>{
  requests.push({url,options});assert.equal(options?.method,undefined,'Store rendering must only perform GET');
  if(url==='/api/founding-offer-status')return {ok:true,json:async()=>({
   ok:true,offersVisible:true,publicLaunch:false,phase:'beta',remaining:600,enrollmentEnabled:true
  })};
  if(url==='/api/founding600-checkout')return {ok:true,json:async()=>({ok:true,checkoutEnabled:false})};
  if(url==='/api/storefront-public-catalog')return {ok:true,json:async()=>({ok:true,source:'verified_storefront',items:[
   {sku:'plan:FREE',category:'membership',status:'listed',saleReady:false},
   ...['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE'].map(code=>({sku:'book:'+code,category:'book',status:'listed',saleReady:false})),
   ...['INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR'].map(code=>({sku:'tool:'+code,category:'tool',status:'for_sale',saleReady:true,betaTestingReady:true})),
   {sku:'founding:FOUNDING_30',category:'founding',saleReady:false},
   {sku:'founding:FOUNDING_60',category:'founding',saleReady:false}
  ]})};
  return {ok:true,json:async()=>JSON.parse(read('data/founding600-terms-v014170.json'))};
 }};
vm.runInNewContext(read('assets/js/store.js'),context);
await doc.callback();await new Promise(ok=>setTimeout(ok,0));
assert.equal(nodes['store-panel-books'].hidden,false,'Direct link to books must select books only');
assert.equal(nodes['store-panel-founders'].hidden,true);
assert.equal(nodes['store-panel-tools'].hidden,true);
assert.equal((nodes['store-products'].innerHTML.match(/Explore Book &amp; Purchase Options/g)||[]).length,5);
assert.match(nodes['store-products'].innerHTML,/View Amazon listing/,'Owner-supplied retailer link must be visible for books');
assert.doesNotMatch(nodes['store-products'].innerHTML,/Buy Kindle on Amazon/,'Unverified retail format must not be invented');
assert.doesNotMatch(nodes['store-products'].innerHTML,/Bundled products/,'Nonbooks must not appear in Books');
assert.equal(nodes['store-plans'].innerHTML,'','Legacy membership plans are not offered');
assert.doesNotMatch(nodes['store-products'].innerHTML,/Choose This Membership/);
assert.doesNotMatch(nodes['store-products'].innerHTML,/QA_TEST|PICK_WHAT_YOU_WANT|UNREVIEWED_REPLAY_ANNUAL/);
assert.equal(nodes['store-membership-compare'].innerHTML,'','Legacy membership comparison is hidden');
assert.equal((nodes['store-tools'].innerHTML.match(/See What You Get/g)||[]).length,4);
assert.match(nodes['store-tools'].innerHTML,/Subscribe Now/);
assert.match(nodes['store-tools'].innerHTML,/\$29\.99/,'Existing beta-tool prices must be displayed');
assert.equal((nodes['store-tools'].innerHTML.match(/Beta Testing Ready/g)||[]).length,4,'Exactly four sale-ready tools are marked for beta evaluation');
assert.doesNotMatch(nodes['store-tools'].innerHTML,/Beta in development/,'Unaccepted tools must remain hidden');
assert.doesNotMatch(nodes['store-tools'].innerHTML,/Beta OPEN/);
assert.doesNotMatch(nodes['store-tools'].innerHTML,/DISCOVERY_LAB/,'Unaccepted beta tool must remain hidden');
assert.doesNotMatch(nodes['store-products'].innerHTML,/store-membership-full-monthly\.html/);
assert.match(nodes['store-tools'].innerHTML,/store-tool-journal-analytics\.html/);
for(const asset of ['interactive-learning','journal-analytics','market-simulator','market-tutor']){
 assert.match(read('assets/img/store-tools/'+asset+'.svg'),/<svg /);
 assert.match(nodes['store-tools'].innerHTML,new RegExp('assets/img/store-tools/'+asset+'\\.svg'));
}
assert.ok(read('store.html').includes('id="store-tab-sparks"'));
assert.ok(read('store.html').includes('id="store-panel-sparks"'));
assert.ok(read('assets/js/admin-products-v01489.js').includes("show('books')"));

assert.equal(tabNodes[1].attributes['aria-selected'],'true');
tabNodes[2].events.click();
assert.equal(nodes['store-panel-sparks'].hidden,false,'Crownlight Sparks must have its own tab');
assert.equal(location.hash,'#sparks');
tabNodes[3].events.click();
assert.equal(nodes['store-panel-tools'].hidden,false);
assert.equal(nodes['store-panel-books'].hidden,true);
assert.equal(location.hash,'#tools');
tabNodes[2].events.keydown({key:'Home',preventDefault(){}});
assert.equal(location.hash,'#founders','Keyboard Home must select first Store category');
assert.ok(tabNodes[0].focused);

assert.equal(nodes['store-panel-founders'].hidden,false);
assert.equal(nodes['store-panel-books'].hidden,true);
assert.match(nodes['store-founder-plans'].innerHTML,/49\.99/);
assert.match(nodes['store-founder-plans'].innerHTML,/59\.99/);
assert.doesNotMatch(nodes['store-founder-plans'].innerHTML,/22\.99|14 DAYS/,'Unpublished 14-day Founder tier stays hidden');
assert.doesNotMatch(nodes['store-founder-compare'].innerHTML,/14 days|10 \/ 14-day term/,'Unpublished tier must not leak into Founder comparison');
assert.match(nodes['store-founder-plans'].innerHTML,/10% OFF eligible purchases/);
assert.match(nodes['store-founder-plans'].innerHTML,/15% OFF eligible purchases/);
assert.doesNotMatch(nodes['store-founder-plans'].innerHTML,/20%|checkout\.html|checkout\.stripe/);
assert.match(nodes['store-founder-compare'].innerHTML,/15 \/ 30-day term/);
assert.match(nodes['store-founder-compare'].innerHTML,/20 \/ 60-day term/);
assert.doesNotMatch(nodes['store-founder-compare'].innerHTML,/Brokerage services or guaranteed trading profits/);
assert.match(nodes['store-founder-compare'].innerHTML,/Founding Member certificate/);
assert.match(nodes['store-founder-compare'].innerHTML,/aria-label="Included"/);
assert.match(nodes['store-founder-compare'].innerHTML,/aria-label="Not included"/);
assert.match(nodes['store-founder-compare'].innerHTML,/class="catalog-coverage is-excluded"/);
assert.ok(requests.some(x=>x.url==='/data/founding-catalog.json'));
assert.ok(requests.some(x=>x.url==='/api/storefront-public-catalog'));
assert.ok(requests.every(x=>x.options?.method===undefined),'The Store must not start payment or write requests');

const guides=JSON.parse(read('data/store-product-guides-v01484.json'));
async function detail(type,code,overrides={}){
 const node={...makeNode('store-product-root'),dataset:{productType:type,productCode:code}};
 const d={readyState:'loading',addEventListener(_k,cb){this.callback=cb},querySelector(sel){return sel==='#store-product-root'?node:null}};
 const catalog={...data,...overrides};
 const context={
  window:{CommerceTools:ct(catalog)},
  document:d,location:{search:''},console,URLSearchParams,encodeURIComponent,
  fetch:async()=>({ok:true,json:async()=>guides})
 };
 vm.runInNewContext(read('assets/js/store-product-detail-v01484.js'),context);
 await d.callback();await new Promise(ok=>setTimeout(ok,0));return node.innerHTML;
}
const paid=await detail('plan','FULL_MONTHLY');
assert.match(paid,/\$69\.99/);assert.match(paid,/What is included/);assert.match(paid,/What is not included/);
assert.match(paid,/checkout\.html\?type=plan&amp;code=FULL_MONTHLY|checkout\.html\?type=plan&code=FULL_MONTHLY/);
const missing=await detail('plan','FULL_MONTHLY',{plans:[]});
assert.doesNotMatch(missing,/Review plan &amp; secure checkout|Review plan & secure checkout/);
const tool=await detail('tool','MARKET_SIMULATOR');
assert.match(tool,/29\.99/);assert.match(tool,/checkout\.html\?type=tool/);assert.match(tool,/no-look-ahead/i);
assert.match(tool,/Beta Testing Ready/);
assert.match(tool,/not completed member acceptance/i);
const unreleased=await detail('tool','MARKET_SIMULATOR',{tools:[tt('MARKET_SIMULATOR','paused')]});
assert.doesNotMatch(unreleased,/Subscribe Now/);
const bookPage=await detail('book','FOUNDATION_BOOK_1');
assert.match(bookPage,/What you.ll learn in this book/i);
assert.match(bookPage,/View Amazon listing/,'A verified owner-supplied retailer listing should appear');
assert.doesNotMatch(bookPage,/Kindle on Amazon|Direct digital purchase/,'Never infer edition-specific formats');
const unlinkedBook=await detail('book','FOUNDATION_BOOK_1',{products:[{...book('FOUNDATION_BOOK_1'),metadata:{}}]});
assert.match(unlinkedBook,/No verified book purchase link/,'Missing retailer evidence must fail closed');
assert.doesNotMatch(unlinkedBook,/View Amazon listing|Website purchase|Direct digital purchase/);
const futurePlan=await detail('plan','NEW_MONTHLY_PRODUCT',{plans:[pl('NEW_MONTHLY_PRODUCT',3999,'month',false)]});
assert.doesNotMatch(futurePlan,/Review plan &amp; secure checkout/,'Unknown public plans must not be sold without approved inclusions/exclusions');
assert.match(futurePlan,/complete product explanation/i);
const futureTool=await detail('tool','NEW_PAID_TOOL',{tools:[tt('NEW_PAID_TOOL')]});
assert.doesNotMatch(futureTool,/Subscribe Now/,'New released tools need a reviewed product disclosure before checkout');
assert.match(futureTool,/Coming Soon/i);
const exclusive=await detail('book','FOUNDATION_BOOK_1',{products:[{...book('FOUNDATION_BOOK_1'),kdpSelect:true,websiteCheckoutEnabled:true,lemonVariantId:'v_test',
 directDigital:{enabled:true,checkoutUrl:'https://store.example/digital'}}]});
assert.doesNotMatch(exclusive,/Website purchase|Direct digital purchase/,'KDP Select flag must block all direct eBook channels even if a variant was accidentally enabled');
const xss=await detail('book','FOUNDATION_BOOK_1',{products:[{...book('FOUNDATION_BOOK_1'),title:'<img src=x onerror=alert(1)>'}]});
assert.doesNotMatch(xss,/<img src=x onerror=/);assert.match(xss,/&lt;img/);
console.log('PASS v84 UI: Founding-only storefront with 5 book editions, safe detail rendering, no legacy membership purchase cards, and XSS escaping.');
