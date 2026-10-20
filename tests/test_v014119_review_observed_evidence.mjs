// v119 client review contract remains valid after v120 removes the former
// multi-request REST race. This test is an independent regression contract.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('assets/js/review-queue.js');
const api=read('functions/api/journal-replay-review-v014118.js');
assert(ui.includes("action=evidence&reviewId="));
assert(ui.includes("replayEvidenceHTML(evidence)"));
assert(ui.includes("await replayAPI('lock'"));
assert(ui.includes("await replayAPI('reveal'"));
assert(ui.includes("await replayEvidence(Number(card.dataset.review))"));
assert(ui.indexOf("await replayAPI('reveal'")<ui.indexOf("await replayEvidence(Number(card.dataset.review))"));
assert(api.includes("rpc/gu_v014120_replay_review_evidence"));
assert(api.includes("if(request.method==='GET'&&action==='evidence')"));
assert(api.includes("result.observations.at(-1).index!==result.observedThroughIndex"));
console.log('PASS v119 maintained: evidence appears in the UI only after a locked-and-revealed review, subject to v120 server checks');
