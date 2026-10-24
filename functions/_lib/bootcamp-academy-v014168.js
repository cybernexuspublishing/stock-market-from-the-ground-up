/* Crown & Lantern Press / The Stock Market: From the Ground Up.
 * Seven separately versioned Academy study paths on ONE Lab Engine.
 * The original thirty-day course is imported, not overwritten or duplicated.
 * Official competencies/grades and future historical bars stay in their own
 * protected assessment/replay services.
 */
import {bootcampCurriculumV014144 as original} from './bootcamp-curriculum-v014144.js';
export const ACADEMY_VERSION='0.14.0.168';
const current=new Map(original.days.map(day=>[day.day,day]));
if(current.size!==30)throw Error('Thirty-day original curriculum changed unexpectedly.');
const phases=Object.freeze({
 learn:{
  label:'Learn and recognize',
  lead:'I will first explain the term, show where the evidence comes from, and demonstrate the method.',
  method:'Describe the source and label each input before considering a decision.',
  boundary:'Learning the definition does not establish a trade result or independent mastery.'
 },
 practice:{
  label:'Guided rehearsal',
  lead:'I will demonstrate one attempt, then you will repeat the method without copying the outcome.',
  method:'Record the observable inputs, complete the calculation or comparison, then check a different case.',
  boundary:'A guided or revealed result is Study Only and cannot count as an independent assessment.'
 },
 transfer:{
  label:'Independent transfer',
  lead:'Now use what you learned on a new case. Decide from information actually available at the pause.',
  method:'State evidence, one alternative reading, uncertainty, invalidation and a justified no-trade choice where appropriate.',
  boundary:'Do not look ahead to the outcome, invent a broker execution or equate a journal entry with official mastery.'
 }
});
const authored={
 truth5:{
  title:'The Truth Behind the Ticker',level:'Foundation',theme:'Source credibility and market claims',
  summary:'Learn to distinguish verifiable source records from promotional claims and unsupported price stories.',
  modules:[
   ['Who can support a market claim?',24,'Separate an original issuer or regulator document from an anonymous repost.','Locate the publisher, document date and original claim before treating it as fact.'],
   ['What does the SEC filing actually say?',24,'Read an SEC filing by form, company identity, period and acceptance time.','Find and record the original accession and the fact it supports.'],
   ['When did the market learn the news?',7,'Build a timestamped chronology of a public announcement and identify what was knowable.','Separate release time from later price movement, which needs its own historical source.'],
   ['When statistics mislead',2,'Check the interval, denominator, split adjustments, venue coverage and missing comparisons.','Explain why a percentage gainer ranking without units and timestamps can mislead.'],
   ['Independent source-verification challenge',29,'Investigate one public claim using a primary source and document its limits.','Classify each statement: verified, unverified, outdated, opinion, promotional or misleading.']
  ]
 },
 watchlist7:{
  title:'Build Your Own Stock Watchlist',level:'Foundation',theme:'Research and ranking',
  summary:'Identify, verify, compare, monitor and independently review candidates without entering trades.',
  modules:[
   ['What Is a Watchlist?',26,'Distinguish a research list from a promise to purchase a security.','Define the columns, update schedule and removal criteria.'],
   ['Finding Stocks Worth Researching',8,'Screen candidates using an explicit price, volume, float and liquidity universe.','Record a candidate and explain what the scan did not establish.'],
   ['Finding the Real Catalyst',7,'Locate the original disclosure or time-stamped company announcement.','Distinguish a verified event from market commentary and rumor.'],
   ['Reading the Chart',5,'Locate completed prices and compare candles and visible structure.','Record timeframe, open, high, low, close and observed volume without guessing.'],
   ['Eliminating Weak Candidates',10,'Evaluate spread, limited volume, halt status and a reason not to trade.','Remove or flag a candidate with documented evidence rather than a hunch.'],
   ['Building and Updating the Watchlist',26,'Rank candidates by explainable criteria and track what changed.','Recheck time, liquidity and announcements before revising priority.'],
   ['Independent Watchlist Challenge',30,'Produce and defend a current ranked list with a no-trade alternative.','State the evidence, sources, uncertainty and review date for each candidate.']
  ]
 },
 scanners10:{
  title:'Mastering Stock Scanners',level:'Foundation to intermediate',theme:'Scanner logic and false positives',
  summary:'Build reproducible screens, test the inputs and learn why a scanner hit is not a trade signal.',
  modules:[
   ['Define the scanner universe',8,'Separate exchange, session and data-feed coverage.','State which securities are excluded before testing filters.'],
   ['Choose price and dollar-change filters',2,'Distinguish percent change from absolute change.','Calculate both with labeled starting and ending prices.'],
   ['Volume and relative volume',4,'Compare shares across equivalent intervals.','Show the reference-period definition and report missing data.'],
   ['Float and share structure',4,'Check publicly reported shares, float definitions and split adjustments.','Record the as-of date and source rather than trusting a stale field.'],
   ['Premarket versus regular session',5,'Identify the current market session and exact time boundaries.','Exclude an after-hours print from a regular-session calculation.'],
   ['Read the spread and liquidity',6,'Calculate bid–ask spread and recognize thin displayed depth.','Separate visible quotes from actual executed liquidity.'],
   ['Validate catalyst claims',7,'Verify news time and issuer identity against an original record.','Reject headlines unsupported by an identifiable source.'],
   ['Spot false positives',8,'Explain stale quotes, mismatched timeframes and improper volume comparisons.','Revise a filter and document which false hit it would reject.'],
   ['Compare watchlist ranking',26,'Prioritize qualified candidates by evidence, not urgency.','Identify an acceptable candidate and at least one defensible no-trade choice.'],
   ['Build and audit a scanner',30,'Specify an independently repeatable scan and its evidence requirements.','Produce the filters, an example result, limitations and a revision plan.']
  ]
 }
};
const definitions=[
 {code:'truth5',days:5,metadata:authored.truth5},
 {code:'watchlist7',days:7,metadata:authored.watchlist7},
 {code:'scanners10',days:10,metadata:authored.scanners10},
 {code:'foundations30',days:30,metadata:{title:'The Complete Trading Foundations Boot Camp',
  level:'Beginner to intermediate',theme:'Market foundations and long-only simulation',
  summary:'The original approved 30-day curriculum, with its existing progress API and authored daily objectives.'}},
 {code:'charts45',days:45,metadata:{title:'Chart Reading and Trading Setups',
  level:'Intermediate',theme:'Candles, context, patterns and multi-timeframe setup evaluation',
  summary:'Fifteen chart-focused topics, each taught, rehearsed and transferred to another evidence set.'},
  source:[5,9,13,14,15,16,18,20,21,22,23,26,27,28,29]},
 {code:'risk60',days:60,metadata:{title:'Risk, Execution, and Trading Discipline',
  level:'Intermediate to advanced',theme:'Sizing, execution, journal accuracy and no-trade decisions',
  summary:'Twenty risk-oriented topics, each examined in explanation, guided rehearsal and independent review.'},
  source:[1,2,3,4,6,8,10,11,12,13,16,17,19,20,23,24,25,26,27,30]},
 {code:'practicum90',days:90,metadata:{title:'Advanced Simulated Trading Practicum',
  level:'Advanced',theme:'Research, planning, simulation, performance analysis and independent review',
  summary:'All thirty original market-skill themes revisited across three successive evidence-based practice cycles.'},
  source:Array.from({length:30},(_,i)=>i+1)}
];
function dayFor(d,i){
 const day=i+1;
 if(d.code==='foundations30'){
  const originalDay=current.get(day);
  return Object.freeze({...originalDay,programCode:d.code,programDay:day,sourceDay:day,
   phase:'learn',mode:'guided',assessmentSource:'protected_lab_assessment_only'});
 }
 let sourceDay,topic,objective,practice,observe;
 if(d.metadata.modules){
  const row=d.metadata.modules[i];[topic,sourceDay,objective,practice]=row;
  observe='Identify and record the dated source, interval, visible evidence and uncertainty for '+topic.toLowerCase()+'.';
 }else{
  const cycle=Math.floor(i/d.source.length);sourceDay=d.source[i%d.source.length];
  const source=current.get(sourceDay);const stage=['learn','practice','transfer'][cycle]||'transfer';
  const descriptor=cycle===0?'Understand':cycle===1?'Rehearse':'Independently transfer';
  topic=descriptor+': '+source.title;
  objective=(cycle===0?'Explain and recognize: ':cycle===1?'Demonstrate with a different example: ':
   'Apply without hindsight to an unfamiliar case: ')+source.objective;
  observe=source.observe;practice=source.practice;
 }
 const phase=d.metadata.modules?'learn':['learn','practice','transfer'][Math.floor(i/d.source.length)]||'transfer';
 const info=phases[phase],source=current.get(sourceDay);
 return Object.freeze({
  day,programDay:day,programCode:d.code,sourceDay,title:topic,
  objective,observe,practice,phase,phaseLabel:info.label,
  method:[info.lead,info.method,practice],
  remediation:'If a necessary observation is unavailable, stop and return to the source before concluding.',
  limitation:source.caution+' '+info.boundary,
  competencies:[...source.competencies],
  relatedLabs:source.relatedLabs.map(row=>Object.freeze({...row,editorial:'PROVISIONAL_UNGRADED_REUSE'})),
  toolPath:source.toolPath,officiallyGraded:false,masteryAwarded:false,
  sourceStatus:'approved_parent_30_day_topic_with_program_specific_original_exercise'
 });
}
export const academyPrograms=Object.freeze(definitions.map(d=>Object.freeze({
 code:d.code,title:d.metadata.title,days:d.days,level:d.metadata.level,theme:d.metadata.theme,
 summary:d.metadata.summary,
 version:ACADEMY_VERSION,status:d.code==='foundations30'?'original_30_day_controlling':'original_study_design_editorial_acceptance_pending',
 entitlement:'ONDEMAND_TRAINING',route:d.code==='foundations30'?'bootcamp.html':'bootcamp-academy.html?program='+d.code,
 priceStatus:'covered_by_existing_authorized_training_entitlement_no_new_purchase',
 creditPolicy:'No Crownlight Sparks needed for teaching; optional assisted Practice has separate authenticated service.',
 progression:'individual_program_progress_ungraded_no_automatic_mastery',
 curriculum:Object.freeze(Array.from({length:d.days},(_,i)=>dayFor(d,i)))
})));
export const academyByCode=Object.freeze(Object.fromEntries(academyPrograms.map(program=>[program.code,program])));
export const academyCatalog=Object.freeze(academyPrograms.map(({curriculum,...summary})=>summary));
