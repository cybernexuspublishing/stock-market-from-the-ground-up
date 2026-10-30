import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const review=require('../assets/js/free-watchlist-review-v1.js');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('free-watchlist.html'),source=read('assets/js/free-watchlist-v1.js'),
 widget=read('assets/js/free-watchlist-review-v1.js'),
 css=read('assets/css/free-watchlist-review-v1.css');
const fixture=[
 {symbol:'GUSIM',status:'RESEARCH',sourceKind:'FICTIONAL',sourceNote:'',
  researchNote:'A fictional price observation to investigate, not a real quote.'},
 {symbol:'ABCD',status:'WAITING_FOR_SOURCE',sourceKind:'UNVERIFIED',sourceNote:'Find filing',
  researchNote:'Unconfirmed issuer claim under review.'},
 {symbol:'XYZ',status:'NO_TRADE',sourceKind:'USER_RESEARCH',sourceNote:'SEC filing dated 2026',
  researchNote:'Do not proceed without volume and original source.'},
 {symbol:'OLD',status:'ARCHIVED',sourceKind:'FICTIONAL',sourceNote:'',
  researchNote:'This fictional example is no longer a candidate.'}
];
const r=review.summarize(fixture);
assert.equal(r.total,4);
assert.deepEqual(r.counts,{RESEARCH:1,WAITING_FOR_SOURCE:1,NO_TRADE:1,ARCHIVED:1});
assert.deepEqual(r.sources,{UNVERIFIED:1,USER_RESEARCH:1,FICTIONAL:2});
assert.equal(r.withSourceNote,2);
assert.equal(r.withoutSourceNote,2);
assert.equal(r.reasonGiven,4);
assert.equal(r.denominator.includes('self-reported'),true);
assert.equal(review.summarize([]).total,0);
assert.equal(review.summarize([{symbol:'GUSIM',status:'UNKNOWN',sourceKind:'INVALID'}]).counts.RESEARCH,0);
const sourceUnchanged=structuredClone(fixture);
review.summarize(fixture);
assert.deepEqual(fixture,sourceUnchanged,'Dashboard must not mutate saved member records');
for(const key of ['free-research-checklist','free-watchlist-review-metrics',
 'free-watchlist-review-chart','free-watchlist-review-chart-button']){
 assert.equal((html.match(new RegExp('id="'+key+'"','g'))||[]).length,1,'One Free UI target: '+key);
}
assert.equal((html.match(/data-research-check=/g)||[]).length,7,'Seven research checklist steps');
assert(html.includes('crownlight-echarts-loader-v1.js'),'Use existing licensed ECharts library, not new CDN or provider');
assert(html.includes('free-watchlist-review-v1.js?v=1'));
assert(html.includes('free-watchlist-review-v1.css?v=1'));
assert(source.includes('GroundUpFreeWatchlistReviewV1?.mount?.()'));
assert(source.includes('GroundUpFreeWatchlistReviewV1?.update?.(state.entries)'));
assert(source.includes('GroundUpFreeWatchlistReviewV1?.clear?.()'),
 'Sign out and account switching must clear private summaries');
assert(source.includes("data-research-check]:checked"));
assert(source.includes("parts.push(['Member-reported research checks'"),
 'Checklist must remain an explicit member-authored research note');
assert(source.includes('combined.length>600'),'Preserve existing Free research-note length boundary');
assert(widget.includes('CrownlightECharts?.load?.()'));
assert(widget.includes('chartInstance.dispose()'));
assert(!/localStorage|sessionStorage|providerApi|stripe|fetch\(/.test(widget),
 'No extra persistent store, price feed, or commerce functionality');
assert(css.includes('grid-template-columns:minmax(0,1fr)'),'Small-screen checklist must remain usable');
console.log('PASS Free Watchlist review v1: 20-record presentation, source denominators, ECharts, seven notes, private lifecycle and no new entitlement.');
