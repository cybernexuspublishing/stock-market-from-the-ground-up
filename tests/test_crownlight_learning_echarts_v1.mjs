import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/js/crownlight-learning-echarts-v1.js',import.meta.url),'utf8');
const scope={window:{}};
vm.runInNewContext(source,scope);
const engine=scope.window.CrownlightLearningEChartsV1;
test('VWAP teaches weighted dollars and shares, not unweighted price',()=>{
 const m=engine.vwapMetrics(8,200,10,100);
 assert.equal(m.totalDollars,2600);
 assert.equal(m.totalShares,300);
 assert.ok(Math.abs(m.price-8.6666667)<.00001);
 assert.equal(engine.vwapMetrics(8,0,10,0),null);
});
test('candlestick body, range, percentage and direction stay distinct',()=>{
 const m=engine.candleMetrics({o:20,h:22,l:19,c:21.2});
 assert.ok(Math.abs(m.body-1.2)<1e-10);
 assert.equal(m.range,3);
 assert.ok(Math.abs(m.percent-40)<1e-10);
 assert.equal(m.direction,'Bullish');
 assert.equal(engine.candleMetrics({o:25,h:25,l:25,c:25}).percent,null);
 assert.equal(engine.candleMetrics({o:10,h:9,l:8,c:11}),null);
});
test('all learning entry points link the shared workstation without changing tier access',()=>{
 for(const name of ['lab-player.html','bootcamp-academy.html','bootcamp.html','simulator.html']){
  const html=readFileSync(new URL('../'+name,import.meta.url),'utf8');
  assert.match(html,/crownlight-learning-echarts-v1\.js/);
 }
 const engineSource=readFileSync(new URL('../assets/js/lab-engine-v32-universal.js',import.meta.url),'utf8');
 assert.match(engineSource,/CrownlightLearningEChartsV1/);
 assert.match(engineSource,/const STEPS=Object\.freeze\(\['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results'\]\)/);
 const tiers=readFileSync(new URL('../assets/js/crownlight-chart-tiers-v1.js',import.meta.url),'utf8');
 assert.match(tiers,/ECHARTS/);
});
