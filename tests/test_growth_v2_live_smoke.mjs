/* Zero-cost V2 production smoke. Anonymous GET only; no payments or messages. */
import assert from 'node:assert/strict';
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
async function page(path){
 const r=await fetch(origin+path,{cache:'no-store',signal:AbortSignal.timeout(25000)});
 assert.equal(r.status,200,path+' must return 200');
 return {body:await r.text(),headers:r.headers};
}
const feed=(await page('/feed.xml')).body;
assert(feed.startsWith('<?xml version="1.0" encoding="UTF-8"?>'),'Feed XML declaration missing');
assert(feed.includes('<rss version="2.0">')&&feed.includes('</rss>'),'RSS 2.0 root missing');
assert.equal((feed.match(/<item>/g)||[]).length,6,'Only six curated learning items may appear');
assert(!/\/(?:admin|dashboard|owner-|api\/|checkout|account)\b/.test(feed),'Private or purchase URLs in RSS');
for(const slug of ['candle-practice','free-foundations-challenge','market-vs-limit-orders','support-resistance-basics']){
 assert(feed.includes(origin+'/'+slug+'.html'),'New public educational lesson missing from RSS');
}
for(const p of ['/','/learn.html','/free-foundations-challenge.html']){
 const {body}=await page(p);
 assert(body.includes('type="application/rss+xml"'),'RSS autodiscovery link missing on '+p);
}
const dash=await page('/dashboard.html');
assert(/data-auth-required="true"/.test(dash.body)&&/data-route-access="member"/.test(dash.body),
 'Dashboard must remain protected');
assert(dash.body.includes('gu-v2-calendar-export')&&dash.body.includes('free-return-calendar-v2.js'),
 'Optional member calendar feature not deployed');
const publishing=await page('/owner-growth-publishing.html');
assert(publishing.body.includes('noindex,nofollow'),'Owner publishing desk must be noindex');
assert(publishing.body.includes('data-route-access="staff"'),'Shared Pages middleware must classify publishing as staff');
assert(publishing.body.includes('data-gu-copy-post'),'Original manual outreach desk is not deployed');
assert((publishing.body.match(/data-gu-copy-post/g)||[]).length===15,'Twelve posts and three video scripts required');
console.log('PASS live Growth V2: six-item original RSS, three discovery links, protected member calendar and Owner manual publishing desk');
