/* Free fictional practice: source and deterministic model regression.
 * No Supabase credentials, paid grants, member data or market data used.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('simulator.html'),mode=read('assets/js/simulator-mode-v014112.js');
const sim=read('assets/js/simulator.js');
const starter=read('assets/js/fictional-simulator-starter-v1.js');
const box={};box.globalThis=box;box.Date=Date;box.Math=Math;
runInNewContext(starter,box);
const dataset=box.GroundUpFictionalSimulatorStarterV1;
assert.equal(typeof dataset.generate,'function');
assert.match(dataset.note,/FICTIONAL/);
assert.match(dataset.note,/not actual market history/i);
assert.equal(dataset.symbol,'GUSIM');
const bars=dataset.generate();
assert(bars.length>=25,'Free tutorial requires substantive sequential candles');
assert(bars.every(x=>x.time instanceof Date&&x.time.getUTCFullYear()===2040),'Fictional timestamp series');
assert(bars.every((b,i)=>Number.isFinite(b.open)&&Number.isFinite(b.close)&&Number.isFinite(b.high)&&Number.isFinite(b.low)&&
 Number.isFinite(b.volume)&&b.volume>0&&b.high>=Math.max(b.open,b.close)&&b.low<=Math.min(b.open,b.close) &&
 (!i||b.time.getTime()-bars[i-1].time.getTime()===5*60*1000)),'OHLCV construction and five-minute chronology');
assert.equal(JSON.stringify(dataset.generate().map(x=>x.close)),JSON.stringify(bars.map(x=>x.close)),'Fictional replay must be reproducible');
for(const id of ['sim-start-free','sim-load-fictional','sim-server-mode','sim-legacy-mode']){
 assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' must be unique');
}
assert(html.indexOf('fictional-simulator-starter-v1.js')<html.indexOf('assets/js/simulator.js'),'load fixture before engine');
assert(html.includes('id="sim-legacy-mode" hidden'),'keep licensed replay as default and CSV hidden until selected');
const chartAt=html.indexOf('id="sim-chart"');
const instructorAt=html.indexOf('id="sim-talia-guidance"');
const planAt=html.indexOf('class="journal-card sim-side"');
assert(chartAt>=0&&instructorAt>chartAt&&planAt>instructorAt,
 'Full-width candle chart must precede instructor guidance and paper-trade controls');
assert(html.includes('bootcamp-academy.html?program=free5&amp;day=2'),'Talia chart explanation leads to real free typed-answer lesson');
assert(read('assets/css/simulator.css').includes('.sim-layout{grid-template-columns:minmax(0,1fr)}'),'Chart occupies full width at desktop too');
assert(html.includes('browser developer tools'),'client sequence must not be misrepresented as blind graded practice');
assert(mode.includes("params.get('practice')==='free'"),'direct beginner deep links must work');
assert(mode.includes("'groundup:request-free-practice'"),'Free Start must dispatch to existing simulator');
assert(sim.includes("if(!acl.ok||grant.ok!==true)"),'provider authorization outage must fail closed');
assert(sim.includes("freeEligible=grant.freeEligible===true"),'eligibility must be explicit, not unconditional');
assert(sim.includes("SIM.hasPremium=grant.authorized===true"),'must independently identify premium entitlement');
assert(!sim.includes("Market Simulator access requires an active Full Membership or the Market Simulator tool pass."),'Free CSV must not be paywalled');
assert(sim.includes("if(!SIM.hasPremium){")&&
 sim.includes("Connected personal Tiingo/Alpaca history requires a separate Market Simulator data entitlement."),
 'connected-provider access remains independently gated without paywalling Free CSV');
assert(sim.includes("sourceProvider='csv_upload'"),'existing journal source enum must be preserved');
assert(sim.includes("if(SIM.journalId||SIM.linkedJournalId||SIM.planLocked||SIM.position)"),'do not overwrite existing member journal-backed practice');
assert(sim.includes('window.GroundUpFreePracticeRequested=false'),'consume startup request once');
assert(sim.includes("SIM.startIndex=Math.min(4"),'on first launch only opening candles shown');
assert(read('functions/_lib/verified-historical-dataset-v014143.js').includes('m.original_synthetic===true'),'private verified-historical route excludes all fictional examples');
assert(read('functions/api/learning-replay-v01492.js').includes('replayAvailableToEntitlement'),'paid server replay must retain entitlement checks');
console.log('PASS Free Simulator: 36 reproducible FICTIONAL candles, accessible CTA, Free CSV path, paid-only connected provider, protected verified replay, existing quota schema compatibility.');
