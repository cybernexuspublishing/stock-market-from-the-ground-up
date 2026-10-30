/* Free member growth V1 source acceptance: no network, payments or accounts. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const pages=['candle-practice.html','free-foundations-challenge.html','market-vs-limit-orders.html','support-resistance-basics.html'];
for(const page of pages){
 const html=read(page);
 assert.equal((html.match(/<h1\b/g)||[]).length,1,'Unique H1 in '+page);
 assert(html.includes('name="viewport"'),'Mobile viewport '+page);
 assert(!/<meta name="robots" content="noindex/i.test(html),'New public guide must be indexable '+page);
 assert(html.includes('create-account.html')||html.includes('Start Day 1'),'Free learning path missing '+page);
 assert(/fictional/i.test(html),'No market examples may masquerade as historical '+page);
 assert(/risk|loss/i.test(html),'Risk statement missing '+page);
 assert(html.includes('member-growth-v1.css'),'Responsive styling missing '+page);
}
const actualCourse=read('functions/_lib/free-foundations-v1.js');
const journey=read('free-foundations-challenge.html');
const titles=[
 'What is a stock, and what does the market do?',
 'How to read a five-minute candlestick',
 'Claims, catalysts and what was actually known',
 'Make a watchlist, not a list of trade signals',
 'Plan risk, choose NO TRADE and review your work'
];
titles.forEach((title,i)=>{
 assert(actualCourse.includes("title:'"+title+"'"),'Free course revision disagrees with entry '+(i+1));
 assert(journey.includes(title),'Public five-day map mismatches real course title '+(i+1));
 assert(journey.includes('program=free5&amp;day='+(i+1)),'Missing protected route for day '+(i+1));
});
assert(journey.includes('No purchase or Sparks needed'),'No misleading commercial prerequisite');
const home=read('index.html'),learn=read('learn.html'),samples=read('lab-samples.html'),signup=read('create-account.html'),dashboard=read('dashboard.html');
for(const [path,html] of [['index',home],['learn',learn],['lab-samples',samples]]){
 assert(html.includes('href="candle-practice.html"'),'Free practice absent from '+path);
 assert(html.includes('href="free-foundations-challenge.html"'),'Free5 entry absent from '+path);
}
assert(home.includes('href="create-account.html">Create a Free Account'),'Free registration must be primary in hero');
assert(signup.includes('after verifying your email')||signup.includes('After verifying your email'),'Email verification must precede Day 1 sign-in');
assert(signup.includes('signin.html?next=%2Fbootcamp-academy.html%3Fprogram%3Dfree5%26day%3D1'),'No verified-user redirect path');
assert(dashboard.includes('free-learning-launchpad')&&dashboard.includes('free-next-action'),'Existing authenticated progress-aware launchpad must remain');
assert(dashboard.includes('candle-practice.html')&&dashboard.includes('free-foundations-challenge.html'),'Member retention links missing');
const practice=read('assets/js/public-candle-practice-v1.js'),sharing=read('assets/js/public-share-v1.js');
new Script(practice,{filename:'public-candle-practice-v1.js'});
new Script(sharing,{filename:'public-share-v1.js'});
assert(practice.includes('fictional')&&practice.includes('createElementNS'),'Original chart visualization must be real and fictional');
assert(!/\bfetch\s*\(|\bXMLHttpRequest\b|localStorage|sessionStorage|gtag\s*\(/.test(practice),'No browsing, account storage or analytics inside practice');
assert(!/\bfetch\s*\(|localStorage|sessionStorage|\bgtag\b|mailto:|location\.search/.test(sharing),'Share without data collection or subscriber email');
assert(sharing.includes('navigator.share')&&sharing.includes('navigator.clipboard'),'Voluntary browser share/copy required');
assert(!/\.createElement\(['"]script['"]\)|checkout\.stripe\.com/.test(sharing+practice),'No third-party dependency or checkout');
const seo=read('scripts/build-public-seo.mjs');
for(const slug of pages.map(p=>p.replace('.html','')))assert(seo.includes("'"+slug+"'"),'Missing SEO whitelist '+slug);
assert(!read('assets/js/ga4-consent-v1.js').includes("ad_storage: 'granted'"),'Ads storage must remain disabled');
console.log('PASS free-member growth V1: original interactive learning, actual Free5 lessons, no-cost entry, consent and voluntary sharing');
