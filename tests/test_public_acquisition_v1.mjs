/* Public acquisition V1: deterministic source tests; no user or payment access. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const slugs=[
 'how-stock-market-works',
 'how-to-read-candlestick-charts',
 'vwap-explained',
 'bid-ask-spread-explained',
 'stock-trading-risk-management'
];
const hub=['index.html','learn.html','tools.html'].map(read);
for(const slug of slugs){
 const file=slug+'.html',html=read(file);
 assert(/<html lang="en">/i.test(html),'English language for '+file);
 assert(/<meta name="viewport"/i.test(html),'Responsive viewport for '+file);
 assert.equal((html.match(/<h1\b/gi)||[]).length,1,'One heading for '+file);
 assert(!/name="robots"[^>]*noindex/i.test(html),'Public guide must not be noindexed: '+file);
 assert(/By the end of this guide/i.test(html),'Instruction objective required: '+file);
 assert(/fictional/i.test(html),'Training examples must be explicitly fictional: '+file);
 assert(/risk of loss/i.test(html),'Financial educational disclaimer missing: '+file);
 assert(html.includes('href="lab-samples.html"')&&html.includes('href="books.html"'),'Guided destination links: '+file);
 assert(html.includes('bootcamp-academy.html?program=free5'),'Respect existing Free Foundations gateway: '+file);
 assert(!html.includes('ga4-consent-v1.js'),'Consent controller is inserted only by public SEO build');
 for(const h of hub)assert(h.includes('href="'+file+'"'),'Public discovery links missing: '+file);
}
assert(read('assets/css/styles.css').includes('@media(max-width:640px){.gu-edu-guide-list{columns:1}}'),'Mobile single-column guide navigation required');
const builder=read('scripts/build-public-seo.mjs');
for(const slug of slugs){
 assert(builder.includes("'"+slug+"'"),'Sitemap whitelist missing guide: '+slug);
}
const academy=read('assets/js/bootcamp-academy-v014168.js');
assert(academy.includes("['free5',5]"),'Approved five-day course route stays intact');
assert(academy.includes('if(activeCode){')&&academy.includes('void open(activeCode);'),'Direct lesson route bypasses catalog load');
assert(academy.includes('signin.html?next='),'Member login must preserve deep-link destination');
assert(!read('assets/js/route-policy.js').includes("'bootcamp-academy'")||academy.includes("['free5',5]"),'Protected lesson authority must remain in original engine');
console.log('PASS public acquisition V1: five public lessons, source links, risk disclosures, responsive layout and protected Free Academy deep links');
