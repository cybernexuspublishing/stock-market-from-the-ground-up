import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {roadmapCatalog} from '../functions/_lib/owner-roadmap-catalog.js';
import {roadmapSupplementalItems,roadmapSupplementalReview} from '../functions/_lib/owner-roadmap-20261018-additions.js';
import {delegatedProgressFor} from '../functions/_lib/owner-roadmap-delegation-v014046.js';
assert.equal(roadmapCatalog.filter(x=>x.scope==='core').length,281);
assert.equal(roadmapCatalog.filter(x=>x.scope==='trace').length,1815);
assert.equal(roadmapSupplementalItems.length,94);
const all=[...roadmapCatalog,...roadmapSupplementalItems];
assert.equal(new Set(all.map(x=>x.id)).size,all.length);
for(let i=0;i<roadmapSupplementalItems.length;i++){
  const item=roadmapSupplementalItems[i];
  assert.equal(item.id,'CORE-'+String(167+i).padStart(4,'0'));
  assert.equal(item.scope,'core');
  const review=roadmapSupplementalReview[item.id];
  assert.ok(review&&review.summary);
  const decision=delegatedProgressFor(item.id,review);
  assert.ok(decision&&!decision.persisted);
  if(review.stage!=='deployed_verified')assert.notEqual(decision.status,'owner_complete');
}
const page=readFileSync('owner-roadmap.html','utf8');
for(const id of ['or-app','or-metrics','or-list','or-new-task','or-tab-core','or-tab-trace','or-owner-brief']){
  assert.ok(page.includes('id="'+id+'"'),id+' missing');
}
const api=readFileSync('functions/api/owner-roadmap.js','utf8');
assert.ok(api.includes('...roadmapCatalog,...roadmapSupplementalItems'));
assert.ok(api.includes('roadmapSupplementalReview[item.id]||meta.items[item.id]'));
console.log('PASS 281 core + 1815 trace + 94 additive Owner commitments; saved statuses and protected page preserved.');
