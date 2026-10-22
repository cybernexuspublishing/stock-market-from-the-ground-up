import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const scope={Map,Set,Array,Object,String};scope.globalThis=scope;
runInNewContext(readFileSync('assets/js/market-pattern-evidence-v014150.js','utf8'),scope);
const e=scope.GroundUpPatternEvidenceV014150;
assert.equal(e.all.length,18);
assert.equal(new Set(e.all.map(x=>x.id)).size,18);
for(const p of e.all){
 for(const f of ['id','title','description','evidence','invalidation','exercise'])
  assert(typeof p[f]==='string'&&p[f].length>= (f==='id'?3:f==='title'?5:35),p.title+' '+f);
 assert.equal(p.decisionStatus,'NO_TRADE_ADVICE_OR_PREDICTION');
 assert.equal(p.evidenceStatus,'CONCEPTUAL_EDUCATION_UNVERIFIED_INPUT');
}
assert.equal(e.get('MISSING'),null);
assert.match(e.get('VWAP_HOLD').description,/OHLCV.*not true trade-derived VWAP/);
assert.match(e.get('RCT').description,/third-party/);
assert.match(e.get('HOD_BREAK').evidence,/prior rolling HOD/);
assert.match(e.get('LATE_SQUEEZE').description,/cannot prove/);
const ui=readFileSync('assets/js/advanced-tools.js','utf8');
const html=readFileSync('advanced-tool.html','utf8');
assert(html.indexOf('market-pattern-evidence-v014150.js')<html.indexOf('advanced-tools.js'));
assert(ui.includes('GroundUpPatternEvidenceV014150'));
assert(ui.includes("description.setAttribute('aria-live','polite')"));
assert(ui.includes("description.replaceChildren()"));
assert(!e.certifiedLiveSignals&&!e.marketHistoryVerified);
console.log('PASS D10 18 original educational pattern evidence cards, failure modes, RCT attribution safeguard and no live trade signals');
