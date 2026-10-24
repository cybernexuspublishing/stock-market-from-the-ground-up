import assert from 'node:assert/strict';
import {getApprovedLabContext,requestedCanonicalLab,labGuidance} from '../functions/_lib/tutor-lab-context-v014149.js';
assert.equal(requestedCanonicalLab('Help with Lab DT-C11-L01'), 'DT-C11-L01');
assert.equal(requestedCanonicalLab('How do I trade QQQ?'),null);
let calls=0;const asset={fetch:async(request)=>{
 calls++;assert(String(request.url).includes('competency-lab-paths-v01499.json'));
 return new Response(JSON.stringify({totalCanonicalLabs:419,bySkill:{
  VWAP_CONTEXT:['DT-C11-L01','F3-C06-L01'],OTHER_SKILL:['SITE-001']
 },byLab:{'DT-C11-L01':{title:'VWAP context in a Lab'}}}),{headers:{'content-type':'application/json'}})
}};
const req=new Request('https://school.test/api/market-tutor');
let result=await getApprovedLabContext({ASSETS:asset},req,'Explain DT-C11-L01 without any future price data.');
assert.equal(result.labId,'DT-C11-L01');
assert.equal(result.title,'VWAP context in a Lab');
const learn=labGuidance(result,'explain','','For canonical Lab DT-C11-L01 at the Learn learning stage: explain VWAP');
assert(learn.includes('Current learning stage: Learn.'));
assert(learn.includes('Define the terms and units'));
assert(learn.includes('VWAP context in a Lab'));
const review=labGuidance(result,'explain','','For canonical Lab DT-C11-L01 at the Review learning stage: common error');
assert(review.includes('Current learning stage: Review.'));
assert(!review.includes('private rubric answer'));

assert.deepEqual(result.relatedCompetencyCodes,['VWAP_CONTEXT']);
assert.equal(result.practiceUrl,'/labs.html?q=DT-C11-L01');
assert.equal(calls,1);
result=await getApprovedLabContext({ASSETS:asset},req,'Help with SITE-001');
assert.equal(result.labId,'SITE-001');
assert.equal(calls,1,'Public crosswalk uses isolate-bound cache');
assert((labGuidance(result,'explain')).includes('Do not inspect future candles'));
assert(!JSON.stringify(result).includes('answerKey'));
assert.equal(await getApprovedLabContext({ASSETS:asset},req,'Help with DT-C99-L99'),null);
assert.equal(await getApprovedLabContext({ASSETS:null},req,'Help with DT-C11-L01'),null);

/* D09 recovery: narrow guided/practice link to generic Tutor topic; source gate only. */
import {readFileSync} from 'node:fs';
const labPlayer=readFileSync(new URL('../assets/js/lab-player.js',import.meta.url),'utf8');
assert(labPlayer.includes('function tutorSafeSubject(lab)'));
assert(labPlayer.includes("if(!['guided','practice'].includes(mode))return"));
assert(labPlayer.includes("link.href='/market-tutor.html?q='+encodeURIComponent("));
assert(labPlayer.includes('mountLabTutorLink(lab,mode);'));
console.log('PASS D09 canonical Lab metadata and topic-only Tutor link source contract');
