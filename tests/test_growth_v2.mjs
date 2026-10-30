/* Zero-cost Growth V2 publication and return-to-learning source acceptance. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';
const file=p=>readFileSync(p,'utf8');
const html=file('dashboard.html'),calendar=file('assets/js/free-return-calendar-v2.js');
new Script(calendar,{filename:'free-return-calendar-v2.js'});
assert(html.includes('id="free-learning-launchpad"')&&html.includes('id="free-next-action"'),
 'Preserve prior private progress-aware resume functionality');
assert(html.includes('id="gu-v2-calendar-export"')&&html.includes('id="gu-v2-calendar-delay"'),
 'Missing voluntary calendar UI');
assert(html.includes('free-return-calendar-v2.js')&&html.includes('free-return-calendar-v2.css'),
 'Calendar assets must load in Free member workspace');
assert(calendar.includes("new Blob(")&&calendar.includes("text/calendar")&&calendar.includes("URL.createObjectURL"),
 'Reminder must create local portable calendar');
assert(!/\bfetch\s*\(|localStorage\.|sessionStorage\.|navigator\.share|email\.send|Notification\.requestPermission/i.test(calendar),
 'Reminder must not contact or track visitors');
assert(!/innerHTML\s*=/.test(calendar),'No unchecked DOM interpolation in calendar UI');
const parent={
 button:{addEventListener(_event,handler){this.click=handler}},
 select:{value:'3'},status:{textContent:''}
};
let written='',clicked=0,downloads=0;
class MockBlob{constructor(chunks){written=chunks.join('')}}
const doc={
 getElementById(key){return ({
  'gu-v2-calendar-export':parent.button,
  'gu-v2-calendar-delay':parent.select,
  'gu-v2-calendar-status':parent.status
 })[key]||null},
 createElement(){return {hidden:false,click(){clicked++},remove(){}}},
 body:{append(){downloads++}}
};
const u={createObjectURL(){return 'blob:local'},revokeObjectURL(){}};
const context=createContext({document:doc,Blob:MockBlob,URL:u,Date,Set,
 setTimeout(fn){fn()},console});
new Script(calendar).runInContext(context);
parent.button.click();
assert.equal(clicked,1,'Calendar file only downloaded on direct user click');
assert.equal(downloads,1,'Only one local file');
assert(written.includes('BEGIN:VCALENDAR')&&written.includes('BEGIN:VEVENT')&&
 written.includes('END:VCALENDAR'),'ICS format must be valid');
assert(/DTSTART:\d{8}T\d{6}Z/.test(written),'ICS event must have UTC timestamp');
assert(/URL:https:\/\/stock-market-from-the-ground-up-d1r.pages.dev\/dashboard.html/.test(written),
 'Return link must use the real dashboard, not a member-specific URL');
assert(!/\b(?:mailto|password|member_id|reflection_saved|email)\b/i.test(written),
 'No private learning, account or contact data in reminder');
const original=written;
parent.select.value='44';parent.button.click();
assert.equal(clicked,1,'Invalid delay cannot download another invitation');
assert.equal(written,original,'Invalid delay must not produce a calendar event');
const seo=file('scripts/build-public-seo.mjs');
assert(seo.includes("writeFileSync(join(output,'feed.xml'),freeFeed)"),'RSS build missing');
assert(seo.includes('filter(slug=>indexable.has'),'Feed must be from exact public allowlist');
assert(!/publishedAt|pubDate|datePublished/.test(seo.slice(seo.indexOf('const feedSlugs='),seo.indexOf("writeFileSync(join(output,'feed.xml'),freeFeed)"))),
 'RSS must not fabricate per-article publication dates');
for(const page of ['index.html','learn.html','free-foundations-challenge.html']){
 assert(file(page).includes('type="application/rss+xml"')&&file(page).includes('href="/feed.xml"'),
 'Public RSS discovery missing on '+page);
}
const key='0f6a1a00e2945eb90d24e5c5b6e75946';
assert(file(key+'.txt').trim()===key,'IndexNow ownership key missing');
const build=file('scripts/build-pages.sh');
assert(build.includes('cp -- "$INDEXNOW_VERIFICATION_KEY.txt"'),'IndexNow key not published by Pages build');
const notifier=file('scripts/submit-indexnow-v2.mjs');
assert(notifier.includes("mode[0]==='--submit'"),'Notifier must be explicit opt-in');
assert(notifier.includes("https://api.indexnow.org/indexnow"),'IndexNow official endpoint expected');
assert(notifier.includes("const paths=['/candle-practice.html'"),'Use curated public URLs only');
assert(notifier.includes("sitemap.includes('<loc>'"),'Sitemap membership must be verified');
assert(notifier.includes("const actual=(await fetchText(origin+'/'+key+'.txt')).trim()"),
 'Real production ownership key verification required');
console.log('PASS Growth V2: optional calendar download, public-only feed discovery, verified IndexNow gating and no contact capture');
