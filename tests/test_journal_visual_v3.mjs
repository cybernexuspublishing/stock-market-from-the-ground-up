/* Professional Visual Journal V3 — deterministic, no member login or payments.
 * Member-generated values only. No synthetic trade/equity charts shipped.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const src=p=>readFileSync(p,'utf8');
const sandbox={window:{},document:{readyState:'loading',addEventListener(){}},
 Date,Intl,Number,String,Object,Array,Math,Set,Map};
runInNewContext(src('assets/js/journal-visual-v3.js'),sandbox);
const v=sandbox.window.JournalV3Visual;
assert(v,'Dashboard should export pure, testable calendar calculations');
assert.equal(v.validDate('2026-10-27'),true);
assert.equal(v.validDate('2026-02-29'),false);
assert.equal(v.validDate('2026-10-99'),false);
assert.equal(v.validDate('not-a-date'),false);
assert.equal(v.dayKey(new Date('2026-10-27T23:59:00Z')),'2026-10-27');
const sample=[
 {user_id:'owner',journal_type:'live',trade_date:'2026-10-26',status:'closed',decision:'ENTER'},
 {user_id:'owner',journal_type:'paper',trade_date:'2026-10-27',status:'no_trade',decision:'NO TRADE'},
 {user_id:'owner',journal_type:'observation',trade_date:'2026-10-27',status:'draft',decision:'NO TRADE'},
 {user_id:'owner',journal_type:'live',trade_date:'2026-10-26',status:'open',decision:'ENTER'},
 {user_id:'owner',journal_type:'live',trade_date:'2026-11-01',status:'closed',decision:'ENTER'},
 {user_id:'owner',journal_type:'live',trade_date:'2026-02-29',status:'closed',decision:'ENTER'},
 {user_id:'owner',journal_type:'live',trade_date:'2026-10-01',status:'reviewed',decision:'ENTER'},
 {user_id:'owner',journal_type:'paper',trade_date:'2026-10-27',status:'reviewed',decision:'NO TRADE'}
];
const out=v.counts(sample,new Date('2026-10-27T23:00:00Z'));
assert.equal(out.total,6);
assert.equal(out.completed,4);
assert.equal(out.passes,2,'Only completed no-trade decisions qualify');
assert.equal(out.awaiting,2);
assert.equal(out.bars.length,14);
assert.equal(out.bars.at(-1).count,3);
assert.equal(out.bars.at(-2).count,2);
const dashboard=src('assets/js/journal-visual-v3.js');
for(const token of [
  'gu-journal-rows-loaded','r.user_id===userId','sb.auth.onAuthStateChange',
  'userId=null;rows=[];pending=[]','r.trade_date===selected',
  'journal-entry.html?id=','gu-j3-kpis','gu-j3-calendar',
  'btn.dataset.count','Journal record','Member-recorded data','gu-j3-bars'
])assert(dashboard.includes(token),'Dashboard integrity token missing: '+token);
assert(!dashboard.includes('net_pnl')&&!dashboard.includes('gross_pnl')&&!dashboard.includes('winRate'),
 'Free visual overview must not reconstruct premium financial aggregations');
const story=src('assets/js/journal-trade-story-v3.js');
for(const token of [
  'gu-journal-record-loaded','gu-j3-story','gu-j3-price-content',
  "stage==='before'","stage==='during'","stage==='after'",
  'Planned entry','Planned stop','Actual entry','Recorded exit',
  "stage!=='before'&&actualEntry!==null",
  "stage==='after'&&actualExit!==null",
  'PRICE LEVELS ONLY','NO HISTORICAL CANDLES','NO TRADE',
  "root.addEventListener('input',render)","ob.observe(root"
])assert(story.includes(token),'Trade Story integrity token missing: '+token);
assert(!story.includes('gu_replay_bars')&&!story.includes('Math.random()'),
 'A member-entered summary cannot infer a historical OHLCV series');
for(const [page,scripts] of [
 ['journal.html',['journal-visual-v3.js','journal-v3.css']],
 ['journal-entry.html',['journal-trade-story-v3.js','journal-v3.css']],
 ['journal-analytics.html',['journal-v3.css','journal-analytics.js']]
]){
 const html=src(page);
 for(const s of scripts)assert(html.includes(s),page+' must load '+s);
 assert(html.includes('data-auth-required="true"'),page+' must remain sign-in gated');
}
const analytics=src('assets/js/journal-analytics.js');
assert(analytics.includes('server')&&analytics.includes('auth'),
 'Existing financial Analytics must remain server-authorized');
const css=src('assets/css/journal-v3.css');
for(const cls of ['.gu-j3-hero','.gu-j3-kpis','.gu-j3-calendar',
 '.gu-j3-story-grid','.gu-j3-price-plot','.gu-j3-analytics',
 '@media(max-width:690px)',':focus-visible'])
 assert(css.includes(cls),'Premium responsive stylesheet missing '+cls);
assert(!css.includes('url(https://'),'No external image/paid UI dependency in this first-party design');
console.log('PASS Journal V3: real-record calendar, confirmed no-trade, 14-day chart, price-only story, account isolation and premium boundaries.');
