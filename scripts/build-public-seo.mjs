/* D17 public SEO build: whitelist discovery pages only. Never make private
 * Admin/member pages indexable or call external providers. D18 must verify
 * the final canonical custom domain before enabling search indexing.
 */
import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
const output=resolve(process.env.GU_SITE_BUILD_DIR||'public');
const rawOrigin=process.env.GU_PUBLIC_SITE_ORIGIN||'https://stock-market-from-the-ground-up-d1r.pages.dev';
let origin;
try{
 const url=new URL(rawOrigin);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||
    url.search||url.hash||url.hostname.length>253||url.port)throw Error('Invalid canonical site origin');
 origin=url.origin;
}catch{throw Error('GU_PUBLIC_SITE_ORIGIN must be an HTTPS origin without path, query, credentials, or port');}
const candidates=[
 'index','about','books','store','learn','tools','lab-samples',
 'membership','help','faq','philosophy',
 'how-stock-market-works','how-to-read-candlestick-charts','vwap-explained',
 'bid-ask-spread-explained','stock-trading-risk-management',
 'candle-practice','free-foundations-challenge','market-vs-limit-orders',
 'support-resistance-basics'
];
// Curated copy mirrors each existing public page; do not invent sales availability.
const metadata={
 index:{
  title:'Learn the Stock Market for Free | Guides & Practice — SMFGU',
  description:'Start learning the stock market from zero with free beginner guides, fictional candlestick practice and five Free Foundations lessons. No purchase needed to begin.'
 },
 about:{
  title:'About J. S. Grant | Stock Market Education',
  description:'Meet author J. S. Grant and learn how The Stock Market: From the Ground Up teaches market mechanics, charts, research, risk and decision practice.'
 },
 books:{
  title:'Stock Market Foundations Books I–III | J. S. Grant',
  description:'Explore J. S. Grant’s Foundations books I–III covering stock-market mechanics, candlesticks, price structure, VWAP and trading decisions.'
 },
 store:{
  title:'Stock Market Learning Store | Books & Memberships',
  description:'Browse Founding Memberships, Foundations books, learning tools and Crownlight Lumens. Compare access and check current availability before purchase.'
 },
 learn:{
  title:'Learn the Stock Market | Guided Labs & Boot Camps',
  description:'Study stock-market concepts through guided book-linked Labs, decision practice, learning paths, Boot Camps and a structured learning record.'
 },
 tools:{
  title:'Trading-Learning Tools, Watchlists & Chart Practice',
  description:'Explore educational watchlists, trade plans, chart practice and decision journaling. Check current tool availability and membership options.'
 },
 'lab-samples':{
  title:'Try Sample Stock Market Labs | SMFGU',
  description:'Try three sample stock-market Labs without an account. Practice observations and evidence-based decisions before exploring the full learning system.'
 },
 membership:{
  title:'Stock Market Memberships & Individual Tool Access',
  description:'Explore membership and individual-tool access for stock-market education and historical replay learning. Review eligibility, availability and terms.'
 },
 help:{
  title:'Help with Books, Accounts & Learning Tools | SMFGU',
  description:'Find guidance for account access, stock-market books, learning Labs, memberships, educational tools and connected market-data features.'
 },
 philosophy:{
  title:'Our Teaching Philosophy | The Stock Market: From the Ground Up',
  description:'Learn how the four steps—Learn, Understand, Practice, Trade—support foundational knowledge, evidence-based practice and repeatable decisions.'
 },
 'how-stock-market-works':{
  title:'How the Stock Market Works | Beginner Guide',
  description:'Understand shares, brokers, orders and stock prices through a fictional example. A free beginner guide to essential market mechanics.'
 },
 'how-to-read-candlestick-charts':{
  title:'How to Read Candlestick Charts | Beginner Guide',
  description:'Learn how open, high, low and close make candle bodies and wicks. Use fictional examples to understand limits, timeframes and volume.'
 },
 'vwap-explained':{
  title:'What Is VWAP? Volume-Weighted Average Price Explained',
  description:'Learn how VWAP uses price and trading volume, why session settings matter and why a VWAP cross is not a guaranteed signal.'
 },
 'bid-ask-spread-explained':{
  title:'Bid, Ask and Spread Explained | Beginner Guide',
  description:'Understand bids, asks, spreads, order types and potential execution costs with a fictional stock quotation example.'
 },
 'stock-trading-risk-management':{
  title:'Stock Trading Risk Management | Position Sizing Basics',
  description:'Practice stop-reference risk, position sizing and reward-to-risk with a fictional trade plan. Learn why no trade can be a valid choice.'
 },
 'candle-practice':{
  title:'Free Candlestick Reading Practice | Three Guided Questions',
  description:'Try three interactive fictional candlestick chart questions. Learn OHLC, wicks, ranges and the limits of what a candle proves. No account needed.'
 },
 'free-foundations-challenge':{
  title:'Five-Day Free Stock Market Foundations Learning Path',
  description:'Learn stock ownership, candlesticks, source evidence, research watchlists and trading risk through five free guided beginner lessons.'
 },
 'market-vs-limit-orders':{
  title:'Market Orders vs Limit Orders | Beginner Stock Guide',
  description:'Understand market versus limit order execution, price control, partial fills and spread risk using an original fictional share-quote example.'
 },
 'support-resistance-basics':{
  title:'Support and Resistance for Beginners | Chart Learning',
  description:'Understand observed price regions, breakouts, failed breakouts and hindsight bias with original fictional chart examples.'
 },
 faq:{
  title:'Frequently Asked Questions | SMFGU',
  description:'Answers to common questions about stock-market education, learning resources, books and member access.'
 }
};
const escapeMeta=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function upsertTag(html,pattern,tag){
  return pattern.test(html)?html.replace(pattern,tag):html.replace(/<\/head>/i,tag+'</head>');
}
// Build must fail if the public opt-in controller is missing or cannot parse.
const ga4Controller=join(output,'assets/js/ga4-consent-v1.js');
if(!existsSync(ga4Controller))throw Error('GA4 consent controller missing from public assets');
execFileSync(process.execPath,['--check',ga4Controller],{stdio:'pipe'});
if(!readFileSync(ga4Controller,'utf8').includes('G-6BDZQGVPD2'))throw Error('GA4 measurement ID mismatch');
const indexable=new Set(),report={origin,pages:[],excluded:[],sourceOnly:true,productionAccepted:false};
for(const name of candidates){
 const file=join(output,name+'.html');if(!existsSync(file))continue;
 let html=readFileSync(file,'utf8');
 if(/<meta\s+[^>]*name=['"]robots['"][^>]*noindex/i.test(html)){
  report.excluded.push(name+'.html (existing noindex)');continue;
 }
 const path=name==='index'?'/':'/'+name+'.html';
 const canonical=origin+path;
 const seo=metadata[name];
 if(seo){
  // Keep original public copy intact while improving how pages appear in Search.
  const titleTag='<title>'+escapeMeta(seo.title)+'</title>';
  html=upsertTag(html,/<title\b[^>]*>[\s\S]*?<\/title>/i,titleTag);
  const summary='<meta name="description" content="'+escapeMeta(seo.description)+'">';
  html=upsertTag(html,/<meta\b[^>]*name=['"]description['"][^>]*>/i,summary);
  const og=[
   ['og:type','website'],
   ['og:title',seo.title],
   ['og:description',seo.description],
   ['og:url',canonical]
  ];
  for(const [property,value] of og){
    const pattern=new RegExp('<meta\\b[^>]*property=["\\x27]'+property+'["\\x27][^>]*>','i');
    const tag='<meta property="'+property+'" content="'+escapeMeta(value)+'">';
    html=upsertTag(html,pattern,tag);
  }
 }
 const canonicalTag='<link rel="canonical" href="'+canonical+'">';
 const canonicalPattern=/<link\s+[^>]*rel=['"]canonical['"][^>]*>/i;
 if(!/<\/head>/i.test(html))throw Error('Public page has no head: '+name);
 if(canonicalPattern.test(html))html=html.replace(canonicalPattern,canonicalTag);
 else html=html.replace(/<\/head>/i,canonicalTag+'</head>');
 // Match markup to visible page facts, without claiming unverified
 // authorship, prices, a legal organization name or historical market data.
 if(name==='index'||name.startsWith('how-')||name==='vwap-explained'||
    name==='bid-ask-spread-explained'||name==='stock-trading-risk-management'||
    name==='market-vs-limit-orders'||name==='support-resistance-basics'){
  const publisher={'@type':'Organization',name:'Crown & Lantern Press'};
  const schema=name==='index'?{
   '@context':'https://schema.org','@graph':[
    {'@type':'WebSite',name:'The Stock Market: From the Ground Up',url:origin+'/'},
    {'@type':'Organization',name:'Crown & Lantern Press',url:origin+'/about.html'}
   ]
  }:{
   '@context':'https://schema.org','@type':'Article',
   headline:seo.title.split(' | ')[0],
   description:seo.description,
   mainEntityOfPage:canonical,
   isAccessibleForFree:true,
   educationalLevel:'Beginner',
   publisher
  };
  const script='<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script>';
  if(!html.includes('application/ld+json'))html=html.replace('</head>',script+'</head>');
 }
 // Load optional analytics only on verified public discovery pages.
 // The controller does not request Google code before visitor permission.
 const ga4Markup='<script defer src="/assets/js/ga4-consent-v1.js"></script>';
 if(!html.includes('ga4-consent-v1.js'))html=html.replace(/<\/head>/i,ga4Markup+'</head>');
 writeFileSync(file,html);
 indexable.add(path);
 report.pages.push({path,canonical});
}
for(const file of readdirSync(output).filter(x=>x.endsWith('.html'))){
 // Search Console's exact ownership token is not an HTML document. Never mutate it.
 if(file==='googleb8863e241e8dc1fa.html')continue;
 const slug=file.slice(0,-5);
 if(candidates.includes(slug)&&indexable.has(slug==='index'?'/':'/'+file))continue;
 const location=join(output,file);
 let html=readFileSync(location,'utf8');
 if(!/<meta\s+[^>]*name=['"]robots['"]/i.test(html)){
  if(!/<\/head>/i.test(html))throw Error('Nonpublic page has no head: '+file);
  html=html.replace(/<\/head>/i,'<meta name="robots" content="noindex,nofollow"></head>');
  writeFileSync(location,html);
 }
}
const xmlEntities=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n'+
 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
 [...indexable].map(path=>'  <url><loc>'+xmlEntities(origin+path)+'</loc></url>').join('\n')+
 '\n</urlset>\n';
writeFileSync(join(output,'sitemap.xml'),sitemap);
// Free Learning RSS Feed V2: editorially selected public guides only.
// These items describe existing educational pages; no invented publishing dates.
const feedSlugs=['free-foundations-challenge','candle-practice',
 'market-vs-limit-orders','support-resistance-basics',
 'how-stock-market-works','how-to-read-candlestick-charts'];
const feedItems=feedSlugs.filter(slug=>indexable.has('/'+slug+'.html')).map(slug=>{
 const item=metadata[slug],link=origin+'/'+slug+'.html';
 return '  <item><title>'+xmlEntities(item.title)+'</title><link>'+xmlEntities(link)+
  '</link><guid isPermaLink="true">'+xmlEntities(link)+'</guid><description>'+
  xmlEntities(item.description)+'</description></item>';
});
const freeFeed='<?xml version="1.0" encoding="UTF-8"?>\n'+
 '<rss version="2.0"><channel><title>SMFGU — Free Stock Market Learning</title>'+ 
 '<link>'+xmlEntities(origin+'/free-foundations-challenge.html')+'</link>'+ 
 '<description>Original free beginner lessons and fictional chart practice. Education only.</description>'+ 
 '<language>en-US</language>\n'+feedItems.join('\n')+'\n</channel></rss>\n';
writeFileSync(join(output,'feed.xml'),freeFeed);
writeFileSync(join(output,'robots.txt'),[
 'User-agent: *','Disallow: /api/','Disallow: /admin','Disallow: /dashboard',
 'Disallow: /account','Disallow: /my-purchases','Disallow: /my-library',
 'Disallow: /journal','Disallow: /simulator','Disallow: /market-tutor',
 'Disallow: /checkout','Disallow: /settings','Disallow: /owner-roadmap',
 'Disallow: /training-editor','Disallow: /lab-player',
 'Sitemap: '+origin+'/sitemap.xml',''].join('\n'));
console.log('D17 public SEO build: '+indexable.size+' whitelisted public routes; other HTML noindex; canonical domain needs D18 approval.');
