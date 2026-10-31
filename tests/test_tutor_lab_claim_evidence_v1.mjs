import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getApprovedLabContext,labGuidance} from '../functions/_lib/tutor-lab-context-v014149.js';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const evidence=read('data/tutor-lab-claim-evidence-v1.json'),registry=read('data/competency-lab-paths-v01499.json');
assert.equal(evidence.kind,'public_tutor_lab_claim_bridges_v1');
assert.equal(evidence.registeredLabsUnaffected,419);
assert.equal(evidence.records.length,8);
assert.equal(registry.totalCanonicalLabs,419);
assert.equal(new Set(evidence.records.map(r=>r.id)).size,8);
const sourceAllowed=/^https:\/\/(?:www\.)?(?:investor\.gov|sec\.gov|syndication\.finra\.org|chartschool\.stockcharts\.com)\//;
for(const item of evidence.records){
 assert.equal(item.title,registry.byLab[item.id].title,'Canonical Lab title must match '+item.id);
 assert(item.worked.includes('FICTIONAL'),'Original marked example required '+item.id);
 assert(item.claim.length>20&&item.counterexample.length>25&&item.transfer.length>25);
 assert(sourceAllowed.test(item.sourceUrl));
 assert.equal(item.reviewStatus,'source_specific_general_claim_checked_ungraded_not_independently_approved');
}
const env={ASSETS:{fetch:async req=>{
 const file=new URL(req.url).pathname;
 if(file.endsWith('/competency-lab-paths-v01499.json'))return Response.json(registry);
 if(file.endsWith('/tutor-lab-claim-evidence-v1.json'))return Response.json(evidence);
 throw Error('Unexpected asset '+file);
}}};
for(const item of evidence.records){
 const q='Explain Lab '+item.id+' Learning Journey stage: Learn';
 const ctx=await getApprovedLabContext(env,new Request('https://example.com/api/market-tutor-v01492'),q);
 assert(ctx&&ctx.claimEvidence?.id===item.id);
 const result=labGuidance(ctx,'explain','');
 for(const phrase of ['Original fictional worked case','What could go wrong','Independent transfer task',
 'These specific general references do not certify'])
  assert(result.includes(phrase),'Missing '+phrase+' for '+item.id);
 assert(result.includes(item.sourceUrl));
 assert(!result.includes('masteryAwarded: true'));
}
assert.equal(Math.abs(10.08-10),0.08000000000000007);
assert.equal(100000000*10,1000000000);
assert.equal((10-9.5)*100,50);
const noResearch={ASSETS:{fetch:async req=>new URL(req.url).pathname.endsWith('/competency-lab-paths-v01499.json')
 ?Response.json(registry):Response.json({error:'unavailable'},{status:503})}};
const fallback=await getApprovedLabContext(noResearch,new Request('https://example.com/api/market-tutor-v01492'),'Explain F2-C04-L01');
assert(fallback&&!fallback.claimEvidence,'Unverified optional asset cannot break original Tutor');
console.log('PASS eight researched canonical Lab Tutor bridges, 419 ID invariant, source safety, original examples and fail-closed fallback.');
