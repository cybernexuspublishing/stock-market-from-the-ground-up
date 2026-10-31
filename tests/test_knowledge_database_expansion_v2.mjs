/* Source and model acceptance: 12 legacy + 26 new original free references. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const scripts=['assets/js/free-foundations-knowledge-v1.js',
 'assets/js/knowledge-database-expanded-v2.js','assets/js/knowledge-database-workshop-v1.js'];
const r={};
for(const script of scripts){
 const s=read(script);
 assert.doesNotThrow(()=>new Script(s,{filename:script}));
 assert(!/\bfetch\s*\(|\blocalStorage\b|sessionStorage|stripe\.|checkout\(|\/api\//i.test(s),
  'No private APIs, payment or browser-stored answers may be added: '+script);
 runInNewContext(s,{window:r,document:{readyState:'loading',addEventListener(){}}},{timeout:1500});
}
const basic=r.GroundUpFreeKnowledgeV1.topics;
const advanced=r.GroundUpKnowledgeDatabaseV2.entries;
const workshop=r.GroundUpKnowledgeWorkshopV1;
assert.equal(basic.length,12,'Preserve the previously approved twelve beginner references');
assert.equal(advanced.length,26,'All twenty-six new reference modules must be published');
const ids=[...basic.map(x=>x.id),...advanced.map(x=>x.id)];
assert.equal(new Set(ids).size,38,'No duplicate concept ID or displacement of an original Foundation entry');
const categories=Object.keys(r.GroundUpKnowledgeDatabaseV2.categoryNames);
assert.deepEqual(categories,['chart','indicators','patterns','company','research','risk']);
for(const topic of advanced){
 assert(categories.includes(topic.category),topic.id+' missing approved category');
 assert(topic.title.length>16,topic.id+' needs an informative title');
 assert(topic.definition.length>=170,topic.id+' lacks first-principles definition');
 assert(topic.why.length>=95,topic.id+' lacks reasoning');
 assert.equal(topic.steps.length,4,topic.id+' must have four independent repeatable steps');
 assert(topic.steps.every(s=>s.length>=35),topic.id+' method too generic');
 assert(topic.caseStudy.includes('FICTIONAL')&&topic.caseStudy.length>=145,topic.id+' lacks original worked case');
 assert(topic.challenge.length>=70&&topic.review.length>=110,topic.id+' needs learner-facing comparison');
 assert(topic.limits.length>=80,topic.id+' needs material limitation');
 assert(topic.source.length>=18,topic.id+' source framing absent');
 assert(/^https:\/\/www\.investor\.gov\//.test(topic.link),topic.id+' must use public official source');
 assert(!/guaranteed win|always profit|sure thing/i.test(topic.definition+' '+topic.caseStudy));
}
const price=advanced.find(x=>x.id==='risk-sizing');
assert(price.caseStudy.includes('124 shares')&&price.caseStudy.includes('125 shares'),'Sizing reserves must be explicit');
const vwap=advanced.find(x=>x.id==='vwap');
assert(vwap.caseStudy.includes('$10.75')&&vwap.caseStudy.includes('$10.50'));
const float=advanced.find(x=>x.id==='float-supply');
assert(float.caseStudy.includes('4.0×')&&float.limits.includes('methodology'));
const timeline=advanced.find(x=>x.id==='news-chronology');
assert(timeline.review.includes('predates'),'No-lookahead event chronology must be taught');
assert.equal(workshop.bars.length,8);
const first=workshop.evaluate(1);
assert.equal(first.length,1);
assert(Math.abs(first[0].vwap-5.04)<1e-10);
const second=workshop.evaluate(2);
assert.equal(second.length,2);
const secondTypical=(5.20+5.01+5.15)/3;
assert(Math.abs(second[1].vwap-(5.04*2000+secondTypical*3200)/5200)<1e-10);
assert.equal(workshop.evaluate(8).length,8);
assert(workshop.bars.every(x=>x.h>=Math.max(x.o,x.c)&&x.l<=Math.min(x.o,x.c)&&x.v>0),'Invalid fictional candle');
const html=read('knowledge-database.html');
for(const p of ['assets/css/knowledge-database-expanded-v2.css',
 'assets/js/knowledge-database-expanded-v2.js',
 'assets/js/knowledge-database-workshop-v1.js',
 'assets/js/crownlight-echarts-loader-v1.js'])
 assert(html.includes(p)&&existsSync(new URL('../'+p,import.meta.url)),p+' must be bundled locally');
assert(html.indexOf('free-foundations-knowledge-v1.js')<html.indexOf('knowledge-database-expanded-v2.js'),
 'Original Foundations topics must initialize before the additional filter');
assert(html.includes('Explore 38 free, independent educational references'));
for(const id of ['academy-free-knowledge','knowledge-expansion','kd-workshop'])assert(html.includes('id="'+id+'"'));
assert(html.includes('aff_id=1173728'),'Previously approved affiliate banner must be preserved');
const expandedSource=read('assets/js/knowledge-database-expanded-v2.js');
assert(expandedSource.includes('t.source'),'Public research provenance must be visible');
assert(expandedSource.includes('aria-pressed'),'Category controls need state semantics');
assert(expandedSource.includes('aria-live'),'Independent practice feedback should be accessible');
assert(expandedSource.includes('compare.disabled=true')&&expandedSource.includes('length<25'),'No instant reveal masquerading as independent practice');
assert(expandedSource.includes('Explain this concept')&&expandedSource.includes('Teach this in more depth'),'Unrestricted Talia explanation remains Free');
assert(!expandedSource.includes('innerHTML'),'Do not insert user answers or research strings as HTML');
const css=read('assets/css/knowledge-database-expanded-v2.css');
assert(css.includes('@media(max-width:780px)')&&css.includes(':focus-visible'),'Responsive/keyboard design required');
console.log('PASS 38 Knowledge Database topics: curriculum, provenance, safe free controls, realistic arithmetic, fictional reveal, category search and responsive integration.');
