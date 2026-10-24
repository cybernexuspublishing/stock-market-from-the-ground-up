import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bootcampCurriculumV014144} from '../functions/_lib/bootcamp-curriculum-v014144.js';
const labs=JSON.parse(readFileSync('data/competency-lab-paths-v01499.json','utf8')).byLab;
const guides=JSON.parse(readFileSync('data/competency-study-guides-v01499.json','utf8')).guides;
const known=new Set(guides.map(x=>x.code));
assert.equal(bootcampCurriculumV014144.days.length,30);
for(const d of bootcampCurriculumV014144.days){
 assert(d.relatedLabs.length>0,'No Lab bridge for day '+d.day);
 assert(d.relatedLabs.every(l=>labs[l.id]),'Invalid Lab ID in day '+d.day);
 assert(d.competencies.every(c=>known.has(c)),'Unknown competency in day '+d.day);
}
const h=readFileSync('bootcamp.html','utf8'),b=readFileSync('assets/js/bootcamp.js','utf8'),e=readFileSync('assets/js/lab-engine-v32-universal.js','utf8');
const instructor=readFileSync('assets/js/lab-v33-instruction-content.js','utf8');
const sourceCases=JSON.parse(readFileSync('data/bootcamp-source-cases-v014166.json','utf8'));
const bootcampCss=readFileSync('assets/css/bootcamp.css','utf8');
const build=readFileSync('scripts/build-pages.sh','utf8');
assert(build.includes('bootcamp-formative-v014154.json bootcamp-source-cases-v014166.json'),
 'Cloudflare Pages must actually copy both member Boot Camp JSON assets into the public build');
assert(build.includes('test -s "$output/data/bootcamp-source-cases-v014166.json"'),
 'An incomplete teaching-data build must fail closed rather than silently omit source cases');

assert(bootcampCss.includes('body.gu-bc-learning main.section>.wrap')&&
 bootcampCss.includes('max-width:2180px!important'),
 'Boot Camp must not inherit the narrow generic article container at desktop width');
assert(bootcampCss.includes('body.gu-bc-learning #gu-bc-source-case[hidden]'),
 'Research links must remain hidden on days without an authenticated context record');

assert.equal(sourceCases.version,'0.14.0.166');
assert.equal(sourceCases.cases.length,6,'Six genuinely sourced educational cases are available; no invented future-bar claims');
assert.equal(new Set(sourceCases.cases.map(c=>c.day)).size,sourceCases.cases.length);
for(const c of sourceCases.cases){
 assert(Number.isInteger(c.day)&&c.day>0&&c.day<=30);
 assert(/^https:\/\//.test(c.sourceUrl),'Research source links must be HTTPS');
 assert(!/profit guarantee|verified execution|guaranteed entry|verified historical candles/i.test(
  c.observation+' '+c.practice+' '+c.limit),
  'Primary-source lesson must not claim broker fills or verified market outcomes');
}

assert(b.includes('what:d.objective')&&b.includes('why:d.caution||d.observe'),
 'Every Boot Camp day needs its authored objective and distinct reason instead of a generic overview');
assert(b.includes('commonError:checkpoint?.commonMistake||d.caution')&&b.includes('limitation:d.caution'),
 'Day-specific mistakes and limitations must be narrated by Talia');
assert(instructor.includes('customHow.map((step,index)')&&instructor.includes('custom.when?'),
 'The common teaching engine must actually render the daily observe/practice methodology');
assert(instructor.includes('custom.commonError?')&&instructor.includes('custom.limitation?'),
 'Source-specific misconceptions and limitations must outrank generic hints');

assert(h.includes('gu-bc-v32-stage'));
assert(h.includes('gu-bc-source-case')&&h.includes('gu-bc-source-link'),
 'Vetted original-source references should be accessible in the appropriate day');
assert(b.includes('sourceCases.get(selected)')&&b.includes('sourceSection.hidden=!source'),
 "Do not display a source for the wrong day or a blank additional case");

assert(h.indexOf('lab-engine-v32-universal.js')<h.indexOf('bootcamp.js'));
assert(b.includes("labId:first,mode:'guided',target:guideSlot"));
assert(b.includes("focusId:'gu-bc-note'"));
assert(e.includes("document.getElementById(focusId||'ev-decision')"));
console.log('PASS all 30 Bootcamp days linked to shared nine-stage Lab v3.2 subject study');
