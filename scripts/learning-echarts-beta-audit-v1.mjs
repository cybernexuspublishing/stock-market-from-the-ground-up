/* Closed-beta instructional readiness audit: local repository sources only.
 * Scope: all 419 canonical lesson IDs, seven Academy programs (247 days),
 * the Free five-day course, and four Chart Studio selections.
 * Structural acceptance is NOT a substitute for individual editorial signoff,
 * authenticated production browser tests, or historical data provenance.
 */
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {academyPrograms,academyByCode} from '../functions/_lib/bootcamp-academy-v014168.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const map=JSON.parse(read('data/competency-lab-paths-v01499.json'));
const bridge=JSON.parse(read('data/lab-teaching-bridges-v014168.json'));
const guides=JSON.parse(read('data/competency-study-guides-v01499.json'));
const official=new Set(guides.guides.map(x=>x.code));
const critical=[],editorial=[],metrics={labs:0,labFacets:0,academyPrograms:0,academyDays:0,freeDays:5,studios:4,competencies:official.size};
const facets=['understand','recognize','apply','mistake','limits'];
const fail=(id,reason)=>critical.push({id,reason});
const pending=(id,reason)=>editorial.push({id,reason});
if(map.totalCanonicalLabs!==419||Object.keys(map.byLab).length!==419||
  bridge.canonicalLabCount!==419||Object.keys(bridge.entries).length!==419)fail('curriculum','419-source canonical mismatch');
if(official.size!==30)fail('competencies','Expected 30 reviewed competency codes');
for(const [id,lab] of Object.entries(map.byLab)){
 metrics.labs++;
 const row=bridge.entries[id];
 if(!row){fail(id,'Missing individual teaching bridge');continue}
 if(row.labId!==id||row.title!==lab.title||row.collection!==lab.bookCode)
  fail(id,'Teaching identity or collection differs from the canonical Lab');
 if(!official.has(row.mappedGuideCode))fail(id,'Unknown official competency guide');
 if(!Array.isArray(lab.relatedCompetencies)||!lab.relatedCompetencies.some(v=>official.has(v)))
  fail(id,'No valid competency context');
 const textOf=[];
 for(const facet of facets){
  const blocks=row.tabs?.[facet];
  if(!Array.isArray(blocks)||blocks.length<3||blocks.some(s=>typeof s!=='string'||s.trim().length<15)){
   fail(id,'Absent or shallow '+facet+' instruction');continue;
  }
  const words=blocks.join(' ').trim();
  if(words.length<160)fail(id,'Insufficient '+facet+' instruction');
  metrics.labFacets++;
  textOf.push(words.toLowerCase());
 }
 if(new Set(textOf).size!==5)fail(id,'Identical teaching used for different instructional purposes');
 if(row.independentGrade===true||row.verifiedHistory===true)fail(id,'Public teaching bridge claims an independent grade or verified historical data');
 if(/PENDING|PROVISIONAL/i.test(String(row.instructionSource||'')+' '+String(row.sourceStatus||'')))
  pending(id,'Final individual editorial/provenance signoff not established; permitted only in closed educational beta');
 const keyWords=lab.title.toLowerCase().match(/[a-z]{5,}/g)||[];
 const distinct=[...new Set(keyWords)].filter(w=>!/about|using|while|stock|market|trading|understand|review|reading|basic|practice|identify|different/.test(w));
 if(distinct.length&&textOf.length===5&&!distinct.some(w=>textOf.join(' ').includes(w)))
  pending(id,'Reviewer should verify topic-specific wording against exact canonical title');
}
const durations={truth5:5,watchlist7:7,scanners10:10,foundations30:30,charts45:45,risk60:60,practicum90:90};
for(const [code,length] of Object.entries(durations)){
 const program=academyByCode[code];metrics.academyPrograms++;
 if(!program||program.days!==length||program.curriculum?.length!==length){fail(code,'Wrong Boot Camp duration');continue}
 const labels=new Set();
 for(const [index,day] of program.curriculum.entries()){
  const id=code+':'+(index+1);metrics.academyDays++;
  if(day.day!==index+1||day.programCode!==code)fail(id,'Day sequence/program identity mismatch');
  for(const field of ['title','objective','observe','practice']){
   if(typeof day[field]!=='string'||day[field].trim().length<12)fail(id,'Missing individual '+field);
  }
  if(!String(day.limitation||day.caution||'').trim())fail(id,'Missing interpretation/risk limitation');
  if(day.officiallyGraded!==false||day.masteryAwarded!==false)fail(id,'Ungraded Boot Camp must not grant mastery');
  for(const link of day.relatedLabs||[])if(!map.byLab[link.id])fail(id,'Invalid linked Lab '+link.id);
  if(labels.has(day.title))pending(id,'Repeated day title needs editorial differentiation');
  labels.add(day.title);
 }
}
if(metrics.academyDays!==247)fail('academy','Wrong total of seven course durations');
const freeSource=read('functions/_lib/free-foundations-v1.js');
const freeStudio=read('assets/js/free-foundations-teaching-studio-v3.js');
if(!/five|Five/.test(freeSource)||!freeStudio.includes('GroundUpFreeStudioV3'))fail('free5','Free Foundations teaching bridge unavailable');
const page=read('bootcamp-academy.html');
const member=read('lab-player.html');
const engine=read('assets/js/lab-engine-v32-universal.js');
const charts=read('assets/js/crownlight-chart-tiers-v1.js');
const chartApi=read('functions/api/chart-tier-access.js');
const echart=read('assets/js/crownlight-learning-echarts-v1.js');
const loader=read('assets/js/crownlight-echarts-loader-v1.js');
for(const path of ['lab-player.html','bootcamp-academy.html','bootcamp.html','simulator.html','market-tutor.html','dashboard.html']){
 if(!read(path).includes('crownlight-learning-echarts-v1.js'))fail(path,'Missing shared ECharts teaching integration');
}
if(!member.includes('lab-engine-v32-universal.js')||!engine.includes('CrownlightLearningEChartsV1'))fail('labs','Shared engine integration missing');
if(!page.includes('GroundUp')&&!page.includes('academy-lab-slot'))fail('academy','Academy learner workstation missing');
for(const mode of ['STANDARD','ECHARTS','ADVANCED','PROFESSIONAL'])if(!charts.includes(mode))fail('studios','Missing Studio option '+mode);
if(!charts.includes("t==='ECHARTS'?'STANDARD':t")||!chartApi.includes('allowed'))fail('studios','ECharts choice or server entitlement gate missing');
if(!/Free|FREE/.test(chartApi)||!charts.includes('state.verified'))fail('studios','Free/verified chart boundary unavailable');
if(!echart.includes('checkCalculation')||!echart.includes('without Lumens')||!echart.includes('ungraded')||
   !echart.includes('gu-echarts-table')||!echart.includes('HIGH '))fail('charts','ECharts worksheet or accessibility/instruction safeguards missing');
if(!loader.includes('/assets/vendor/echarts/6.1.0/echarts.min.js'))fail('charts','Self-hosted pinned ECharts build absent');
if(!engine.includes("['blind','assessment'].includes(mode)")||!engine.includes('progressStore'))
 fail('grading','Private grading or progress authorization boundary missing');
if(!read('tests/test_crownlight_chart_tiers_v1.mjs').includes("FOUNDER")&&
  !read('tests/test_crownlight_chart_tiers_v1.mjs').includes("FOUNDING"))
 fail('entitlement','Server tier acceptance tests not connected');
const result={documentId:'SMFGU-LEARN-BETA-AUDIT-001',version:'1.0',scope:'SOURCE-ONLY / CLOSED BETA',
 metrics:{...metrics,academyAndFreeDays:metrics.academyDays+metrics.freeDays},
 critical,editorialReviewPending:editorial,criticalCount:critical.length,editorialFlags:editorial.length,
 note:'Local structural and instructional content coverage, not a human line-by-line editorial acceptance, source-data license check, or authenticated production QA.'};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/learning-echarts-beta-audit-v1.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({metrics:result.metrics,critical:critical.slice(0,12),criticalCount:critical.length,editorialFlags:editorial.length}));
assert.equal(critical.length,0,'Critical curriculum or entitlement gaps; see artifacts/learning-echarts-beta-audit-v1.json');
