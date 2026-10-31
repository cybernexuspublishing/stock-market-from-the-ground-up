import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=get('assets/js/home-community.js'),home=get('index.html'),style=get('assets/css/home-member-stats.css');
assert.doesNotThrow(()=>new Script(js));
for(const p of ['/assets/js/home-community.js','/assets/js/crownlight-echarts-loader-v1.js','/assets/css/home-member-stats.css'])assert(home.includes(p),p+' must be included in homepage');
assert(js.includes("fetch('/api/home-member-stats-v01353?action=public'"),'Only existing aggregate endpoint');
assert(js.includes('window.CrownlightECharts.load()'),'Use first-party local ECharts loader');
assert(js.includes("badge.textContent=valid?'LIVE DATA':'UNAVAILABLE'"),'Badge says LIVE DATA for validated selected mode');
assert(!js.includes('gu-stat-provenance')&&!js.includes('data-source-info'),'No statistics information tooltip or icon');
assert(!js.includes('Sample statistics'),'No sample-statistics caption');
assert(!js.includes('Example activity')&&!js.includes('Example members'),'No sample member labels');
assert(!js.includes("'DEMO DATA'"),'No demo badge on homepage');
assert(js.includes('>Active members</dt>'),'Public metric label is Active members');
assert(js.includes('aria-label="Members active within the last 60 minutes"'),'Accessible label preserves the measurement window');
assert(js.includes('Member accounts'),'Account label remains clear');
assert(js.includes('last 60 minutes')||js.includes('last hour'),'Activity window must be explicit');
assert(js.includes('total-active'),'Pie remainder derives solely from aggregate totals');
assert(js.includes('if(!total)'),'No-data denominator must not create a fabricated percentage');
assert(js.includes('if(visual&&visualNode!==host)'),'Remount must release previous chart');
assert(js.includes('if(window.__SMFGUHomeStatsMounted)return'),'Singleton initializer');
assert(style.includes('v1353-stats-graph'),'Chart layout exists');
console.log('PASS member-stat ECharts source, truthful modes, no-data fallback, local assets, responsive panel');

assert(js.includes('renderFuture(panel,d.extras)'),'Owner toggles drive optional homepage modules');
assert(!js.includes('187 of 225 illustrative members'),'Removed unwanted verbose text');
const api=get('functions/api/home-member-stats-v01353.js'),admin=get('assets/js/admin-community.js');
for(const key of ['registrationTrends','membershipBreakdown','learningEngagement']){
 assert(api.includes(key),'API option missing: '+key);
 assert(admin.includes('name="'+key+'"'),'Owner control missing: '+key);
}
assert(api.includes("extras:s.extras"),'Public response exposes display switches');

assert(api.includes("if(s.mode==='custom')return send({ok:true,show:true"),'Owner-configured fixed figure mode is supported');
assert(api.includes("if(s.mode==='range'){"),'Owner-configured changing-range mode is supported');
assert(api.includes("mode:'live',registered,online:"),'Verified live aggregate mode remains available');
assert(js.includes("const example=d.mode==='custom'||d.mode==='range'"),'Illustrative ECharts snapshots use explicit source metadata');
assert(js.includes("badge.setAttribute('aria-label'"),'Selected source remains disclosed accessibly without a visual tooltip');
assert(js.includes('aria-label'),'Source disclosure is accessible');
assert(style.includes('background:transparent!important'),'Homepage statistics have no metric cards');

assert(home.includes('href="candle-practice.html" aria-label="Open the free interactive candlestick learning workstation"'),'Entire workstation links to its actual public learning experience');
assert(!home.includes('DEMONSTRATION · NOT LIVE DATA'),'Promotional demonstration banner removed');
assert(js.includes('gu-home-right-rail'),'Homepage statistics are mounted directly above the linked workstation');
assert(js.includes("rail.insertBefore(panel,rail.firstChild)"),'Statistics appear before workstation');
assert(js.includes("existing.closest('.gu-home-stage-grid')"),'Moving component into rail must not cause observer remount loop');
assert(style.includes('gu-home-right-rail'),'Compact right-hand layout must be styled');

assert(js.includes("fontSize:32,fontWeight:800"),'Gauge percentage should be visually dominant');
assert(js.includes('gu-stats-content'),'Statistics title and text must sit beside the gauge');
assert(style.includes('grid-template-columns:122px minmax(0,1fr)!important'),'Compact desktop gauge geometry required');
assert(style.includes('font-size:clamp(.64rem,.76vw,.72rem)'),'Metric captions should be smaller than the percentage');
assert(style.includes('padding:4px 0!important'),'Reduce vertical whitespace around metric labels');
assert(style.includes('height:122px!important'),'Gauge must stay compact at desktop widths');
assert(style.includes('height:102px!important'),'Gauge scales down on narrow devices');
