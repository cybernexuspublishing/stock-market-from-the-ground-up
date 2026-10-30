import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {report} from '../functions/_lib/journal-analytics-v014114.js';
const require=createRequire(import.meta.url);
const charts=require('../assets/js/journal-echarts-equity-v1.js');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const points=[
 {date:'2026-10-01',value:120},{date:'2026-10-02',value:60},
 {date:'2026-10-03',value:140},{date:'2026-10-04',value:100}
];
const copy=structuredClone(points);
const r=charts.prepare(points);
assert.deepEqual(r.dates,points.map(p=>p.date));
assert.deepEqual(r.cumulative,[120,60,140,100]);
assert.deepEqual(r.drawdown,[0,-60,0,-40]);
assert.equal(r.maximumDrawdown,60);
assert.equal(r.denominator,4);
assert.deepEqual(points,copy,'Rendering must never modify the server-calculated analytics');
assert.throws(()=>charts.prepare([{date:'2026-02-30',value:20}]));
assert.throws(()=>charts.prepare([{date:'2026-10-01',value:Infinity}]));
assert.throws(()=>charts.prepare(Array(3001).fill(points[0])));
const option=charts.option(r);
assert.equal(option.animation,false);
assert.equal(option.series.length,2);
assert.deepEqual(option.series[0].data,r.cumulative);
assert.deepEqual(option.series[1].data,r.drawdown);
assert.equal(option.dataZoom.length,2);
const sample={
 id:1,status:'closed',journal_type:'live',trade_date:'2026-10-01',
 exit_date:'2026-10-01',net_pnl:120,setup:'Sample',
 process_grade:'GOOD',plan_followed:'YES'
};
const derived=report([sample,{...sample,id:2,trade_date:'2026-10-02',exit_date:'2026-10-02',net_pnl:-60}],{today:'2026-10-30'});
const prepared=charts.prepare(derived.equity);
assert.equal(prepared.maximumDrawdown,derived.summary.maxDrawdownCurrency,'Drawdown must agree with authorized server calculations');
const html=read('journal-analytics.html');
const app=read('assets/js/journal-analytics.js');
assert(html.includes('journal-echarts-equity-v1.js?v=1'));
assert(html.includes('journal-analytics.js?v=journal-echarts-20261030-1'));
assert(html.includes('journal-research-paid-v1.js?v=1'),'Preserve existing paid research chart');
assert(read('journal.html').includes('journal-research-free-v1.js'),'Preserve existing Free Journal ECharts');
assert(app.includes('renderEquity(result.equity);'),'Preserve original SVG fallback');
assert(app.includes('void renderEChartsEquity(data.equity,seq,userId);'),'Use verified server aggregate, not raw notes');
assert(app.includes('revision!==requestCounter||activeUserId!==userId'),'Discard stale account/filters');
assert(app.includes("await sb.auth.getSession()"),'Revalidate session before showing chart');
assert(app.includes('echartsEquity?.dispose()'),'Scrub previous private chart on account change');
assert(app.includes('next.setOption(adapter.option(series),true)'),'Render reusable tested chart options');
assert(!/fetch\(|localStorage|service_role/i.test(read('assets/js/journal-echarts-equity-v1.js')),'Adapter must not call private providers or local storage');
console.log('PASS Journal ECharts paid equity/drawdown: server parity, no-lookahead, fallback, scrub, existing research chart, chart data bounds');
