import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {execFileSync} from 'node:child_process';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
for(const name of ['assets/js/advanced-trade-plan-v1.js','assets/js/advanced-tools.js',
 'assets/js/crownlight-echarts-loader-v1.js','functions/api/advanced-tool-workspace-v014110.js'])
 execFileSync(process.execPath,['--check',new URL('../'+name,import.meta.url).pathname]);
const root={};
runInNewContext(read('assets/js/advanced-trade-plan-v1.js'),{window:root},{timeout:1500});
const engine=root.GroundUpAdvancedTradePlanV1;
assert.equal(engine.version,'1.0');
assert.equal(typeof engine.mount,'function');
const base={direction:'LONG',entry:'5',stop:'4.8',target1:'5.6',budget:'25',
 spread:'0',slippage:'0',gap:'0'};
const r=engine.calculate(base);
assert.equal(r.ok,true);
assert.equal(r.perShare,.2);
assert.equal(r.theoretical,125);
assert.equal(r.buffer,1);
assert.equal(r.size,124);
assert.equal(r.modeledLoss,24.8);
assert.equal(r.cost,620);
assert.equal(r.rr[0],3);
assert.equal(r.stressedLoss,24.8);
const scales=engine.scaleOut(engine.calculate({...base,target2:6,stretch:6.5}),{scale1:50,scale2:30,scale3:20});
assert.equal(scales.ok,true);
assert.equal(scales.sharesAssigned,124);
assert.deepEqual(Array.from(scales.portions.map(p=>p.shares)),[62,37,25]);
assert.equal(scales.grossProfit,115.5);
assert.equal(scales.blendedR,115.5/24.8);
assert.equal(engine.scaleOut(r,{scale1:60,scale2:50,scale3:-10}).ok,false,'Total allocation must be exactly 100 and nonnegative');
assert.equal(engine.scaleOut(r,{scale1:50,scale2:50,scale3:0}).ok,false,'Allocation without target price must be refused');
assert.match(read('assets/js/advanced-trade-plan-v1.js'),/Transfer saved version to Trading Journal/);
const stress=engine.calculate({...base,spread:'.02',slippage:'.03',gap:'.15'});
assert.equal(stress.size,124);
assert.equal(stress.stressedLoss,49.6);
assert.ok(stress.stressedLoss>stress.budget,'stress may exceed a planned loss budget');
const short=engine.calculate({direction:'SHORT',entry:10,stop:10.5,target1:9,budget:100,
 spread:0,slippage:0,gap:0,capital:500});
assert.equal(short.ok,true);
assert.equal(short.size,50);
assert.equal(short.rr[0],2);
assert.equal(short.capitalCap,50);
assert.equal(short.exposurePct,100);
assert.equal(engine.calculate({...base,stop:5.5}).ok,false);
assert.equal(engine.calculate({...base,target1:4.5}).ok,false);
assert.equal(engine.calculate({...base,requested:'1.2'}).ok,false);
assert.equal(engine.calculate({...base,partial:'7'}).ok,false);
assert.equal(engine.calculate({...base,partial:'7',fill:'5.02'}).partialQty,7);
assert.equal(engine.calculate({...base,spread:'-0.01'}).ok,false);
const page=read('advanced-tool.html');
assert.match(page,/assets\/js\/advanced-trade-plan-v1\.js/);
assert.match(page,/assets\/css\/advanced-trade-plan-v1\.css/);
assert.match(page,/assets\/js\/crownlight-echarts-loader-v1\.js/);
const tool=read('assets/js/advanced-tools.js');
assert.match(tool,/GroundUpAdvancedTradePlanV1\?\.mount\?/);
assert.match(tool,/tradePlan\?\.loadCandidate\(rec\)/);
const ui=read('assets/js/advanced-trade-plan-v1.js');
assert.match(ui,/saveRecord\('scenario_review',/);
assert.match(ui,/ADVANCED_TRADE_PLAN_SNAPSHOT_V1/);
assert.match(ui,/latestRecords\('scenario_review'\)/);
assert.match(ui,/CrownlightECharts\?\.load\?/);
assert.match(ui,/journal-entry\.html/);
assert.ok(!ui.includes('localStorage'),'Private trade-plan contents must not be kept in local storage');
const intelligence={};
runInNewContext(read('assets/js/watchlist-intelligence-v1.js'),{window:intelligence},{timeout:1500});
const research=intelligence.GroundUpWatchlistIntelligenceV1.summarize([
 {record_type:'watchlist',payload:{status:'READY',sourceNote:'Issuer release',asOf:'2026-10-20T10:00:00-04:00',
  researchGates:{source:true,structure:true,liquidity:true,invalidation:true}}},
 {record_type:'watchlist',payload:{status:'NO TRADE',sourceNote:'',asOf:''}},
 {record_type:'scenario_review',payload:{status:'READY'}}]);
assert.equal(research.total,2,'Exclude trade-plan snapshots from candidate denominators');
assert.equal(research.counts.READY,1);
assert.equal(research.counts['NO TRADE'],1);
assert.equal(research.checked,1);
assert.equal(research.gates,1);
assert.equal(research.sourceMissing,1);
assert.equal(research.asOfMissing,1);
assert.match(read('advanced-tool.html'),/watchlist-intelligence-v1\.js/);
assert.match(read('assets/js/advanced-tools.js'),/GroundUpWatchlistIntelligenceV1\?\.mount/);
const sim=read('assets/css/crownlight-simulator-density-v1.css');
assert.match(sim,/INDEPENDENT workbench sections/);
assert.match(sim,/max-height:none!important;/);
assert.doesNotMatch(sim,/max-height:var\(--sim-chart-panel-height,700px\)!important/);
console.log('PASS Trade Plan Builder sizing, stops, targets, stresses, snapshots, ECharts, routing and independent simulator section layout');
