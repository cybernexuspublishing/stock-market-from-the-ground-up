import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=get('assets/js/home-community.js'),home=get('index.html'),style=get('assets/css/home-member-stats.css');
assert.doesNotThrow(()=>new Script(js));
for(const p of ['/assets/js/home-community.js','/assets/js/crownlight-echarts-loader-v1.js','/assets/css/home-member-stats.css'])assert(home.includes(p),p+' must be included in homepage');
assert(js.includes("fetch('/api/home-member-stats-v01353?action=public'"),'Only existing aggregate endpoint');
assert(js.includes('window.CrownlightECharts.load()'),'Use first-party local ECharts loader');
assert(js.includes("valid?'LIVE DATA':'UNAVAILABLE'"),'LIVE DATA is shown only for validated live response');
assert(!js.includes('Sample statistics'),'No sample-statistics caption');
assert(!js.includes('Example activity')&&!js.includes('Example members'),'No sample member labels');
assert(!js.includes("'DEMO DATA'"),'No demo badge on homepage');
assert(js.includes('Activity in the last 60 minutes'),'Activity label remains clear');
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

assert(!api.includes("if(s.mode==='custom')return send({ok:true,show:true"),'Custom counts are not served publicly');
assert(!api.includes("if(s.mode==='range'){const period="),'Range counts are not served publicly');
assert(api.includes("mode:'live',registered,online:"),'Public API only returns live aggregates');
assert(style.includes('background:transparent!important'),'Homepage statistics have no metric cards');
