import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const obj={};runInNewContext(read('assets/js/trade-plan-trailing-model-v1.js'),{window:obj});
const engine=obj.GroundUpTrailingStopModelV1;
assert.equal(engine.version,'1.0');
const a=[
 {open:5,high:5.3,low:4.9,close:5.2},
 {open:5.3,high:5.6,low:5.15,close:5.5},
 {open:5.08,high:5.2,low:4.95,close:5.05}
];
let r=engine.model({direction:'LONG',entry:5,initialStop:4.8,trailDistance:.2,bars:a,maxBars:1});
assert.equal(r.ok,true);assert.equal(r.triggered,false);assert.equal(r.activeStop,5.1);
r=engine.model({direction:'LONG',entry:5,initialStop:4.8,trailDistance:.2,bars:a,maxBars:2});
assert.equal(r.triggered,false);assert.equal(r.activeStop,5.4,'Bar 2 uses bar 1 previous stop, not bar 2 high within bar');
r=engine.model({direction:'LONG',entry:5,initialStop:4.8,trailDistance:.2,bars:a,maxBars:3});
assert.equal(r.triggered,true);assert.equal(r.trigger.bar,3);
assert.equal(r.trigger.hypotheticalGapAwareReference,5.08);
const s=[
 {open:10,high:10.1,low:9.5,close:9.6},
 {open:9.4,high:9.8,low:9.3,close:9.6},
 {open:10.5,high:10.5,low:10.0,close:10.2}
];
r=engine.model({direction:'SHORT',entry:10,initialStop:10.4,trailDistance:.3,bars:s,maxBars:2});
assert.equal(r.ok,true);assert.equal(r.triggered,true);
assert.equal(r.trigger.stopBefore,9.8);
assert.equal(engine.model({direction:'SHORT',entry:10,initialStop:9.5,trailDistance:.3,bars:s,maxBars:1}).ok,false);
assert.equal(engine.model({direction:'LONG',entry:5,initialStop:4.8,trailDistance:.3,bars:a,maxBars:4}).ok,false,'Cannot consume unseen bar');
const api=read('functions/api/journal-research-links-v1.js');
const transfer=read('assets/js/journal-plan-transfer-v1.js');
const html=read('journal-entry.html');
assert.match(api,/advancedToolContext\(env,request,'WATCHLIST_WORKBENCH'\)/);
assert.match(api,/journal_id=eq\./);
assert.match(api,/source_published_at/);
assert.match(transfer,/gu-journal-plan-saved/);
assert.match(html,/journal-source-variance-v1.js/);
assert.match(read('advanced-tool.html'),/trade-plan-trailing-model-v1.js/);
assert.match(read('assets/js/advanced-trade-plan-v1.js'),/visibleRows\(\),maxBars:revealed/);
const migration=read('supabase/migrations/20261029_journal_research_provenance_link_v1.sql');
assert.match(migration,/ENABLE ROW LEVEL SECURITY/i);
assert.match(migration,/BEFORE UPDATE OR DELETE/i);
console.log('PASS revealed-only trailing stops, gap treatment, immutable research links and secure Journal transfer');
