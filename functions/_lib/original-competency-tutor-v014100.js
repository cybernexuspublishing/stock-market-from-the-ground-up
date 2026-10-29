import {ungradedResponseReview} from './tutor-response-scaffold-v014102.js';
/* v0.14.0.100 — zero-cost source-grounded tutor upgrade.
 * Reuses the 30 original public competency study guides already published
 * for the member Skills page. NO private book manuscript, rubric, market bar,
 * journal note, vendor account, AI model, or second curriculum database.
 */
const excluded=new Set(['what','how','should','about','could','with','from','when','does','the','and','this','that','mean','teach','tell','please','market','stock','stockmarket','training','lesson','help']);
const words=s=>[...new Set(String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x.length>2&&!excluded.has(x)))];
function chooseGuides(index,q){
 if(!Array.isArray(index?.guides)||index.guides.length!==30)return [];
 const query=words(q);
 if(!query.length)return [];
 const genericDecision=new Set(['why','enter','entry','exit','exiting','hold','holding','wait','decision','trade','trading','setup','setups','when','what','look','for','stop','loss','pattern']);
 const distinctive=query.filter(w=>!genericDecision.has(w));
 const decisionIntent=/\b(?:enter|entry|exit|exiting|hold|holding|when to|would you|why|setup|setups|trade or skip|no trade|what to look for|stand aside|take profit|stop loss|invalidation|earnings|guidance|balance sheet|cash flow|long.term|portfolio|rebalanc|sector|regime|breadth|confluenc|conflicting|signals|order flow|tape|level ii|order book|options|option premium|theta|vega|assignment|implied volatility|diversif|fundamentals)\b/i.test(String(q||''));
 const candidates=[...index.guides,...(Array.isArray(index.supplementalGuides)?index.supplementalGuides:[]),
  ...(Array.isArray(index.researchGuides)?index.researchGuides:[]),
  ...(decisionIntent&&Array.isArray(index.decisionGuides)?index.decisionGuides:[]),
  ...(Array.isArray(index.masterStudyGuides)?index.masterStudyGuides:[])];
 return candidates.map(g=>{
  const title=String(g.title||'').toLowerCase(),code=String(g.code||'').toLowerCase().replaceAll('_',' ');
  const concept=String(g.concept||'').toLowerCase();
  let score=query.reduce((v,w)=>v+(title.includes(w)?8:0)+(code.includes(w)?6:0)+(concept.includes(w)?2:0),0);
  if(g.decisionPlaybook===true){
   // A question about a failed breakout should not be captured by a generic
   // entry/hold/exit guide or by the unrelated breakout continuation playbook.
   const topic=new Set(words(g.title+' '+g.code.replaceAll('_',' ')).filter(w=>!genericDecision.has(w)));
   score+=distinctive.filter(w=>topic.has(w)).length*18;
   if(g.code==='DECISION_FRAMEWORK'&&distinctive.length>0)score-=30;
  }
  if(g.masterStudy===true){
   // Named study terms must outrank unrelated descriptions mentioning trend,
   // volume or a generic setup. Do not reward partial substring acronyms.
   const qText=String(q||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
   const titleText=String(g.title||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
   if(titleText.length>=4&&qText.includes(titleText))score+=100;
   const terms=words(g.title+' '+String(g.code||'').replace(/^STUDY_(?:WATCH_|STRATEGY_)?/,'').replaceAll('_',' '))
    .filter(w=>!genericDecision.has(w));
   const present=new Set(query);
   score+=new Set(terms.filter(w=>present.has(w))).size*14;
   const suffix=String(g.code||'').replace(/^STUDY_(?:WATCH_|STRATEGY_)?/,'');
   if(/^[A-Z0-9]{3,6}$/.test(suffix)&&present.has(suffix.toLowerCase()))score+=100;
  }
  return {g,score};
 }).filter(x=>x.score>=5).sort((a,b)=>b.score-a.score||a.g.code.localeCompare(b.g.code)).slice(0,2).map(x=>x.g);
}
// Module-scoped cache is per Cloudflare isolate AND per ASSETS binding. It holds
// only publicly published curriculum, never member-specific/private records.
const publicGuideCache=new WeakMap();
async function loadPublicGuides(env,request){
 if(typeof env.ASSETS?.fetch!=='function')return null;
 const cached=publicGuideCache.get(env.ASSETS);
 if(cached&&cached.expires>Date.now())return cached.value;
 const url=new URL('/data/competency-study-guides-v01499.json',request.url);
 const result=await env.ASSETS.fetch(new Request(url,{method:'GET'}));
 if(!result.ok)throw Error('Published guide asset unavailable');
 const data=await result.json();
 if(!Array.isArray(data?.guides)||data.guides.length!==30)throw Error('Invalid original guide count');
 publicGuideCache.set(env.ASSETS,{value:data,expires:Date.now()+300000});
 return data;
}
const researchCache=new WeakMap();
async function loadResearchGuides(env,request){
 if(typeof env.ASSETS?.fetch!=='function')return [];
 const saved=researchCache.get(env.ASSETS);
 if(saved&&saved.expires>Date.now())return saved.guides;
 const r=await env.ASSETS.fetch(new Request(new URL('/data/tutor-research-guides-v1.json',request.url),{method:'GET'}));
 if(!r.ok)throw Error('Supplemental public teaching asset unavailable');
 const payload=await r.json(),guides=payload?.guides;
 if(payload?.kind!=='original_public_tutor_supplemental_research_guides'||!Array.isArray(guides)||guides.length<32||guides.length>200)
  throw Error('Invalid research guide catalogue');
 const ids=new Set();
 for(const g of guides){
  if(!/^[A-Z][A-Z0-9_]{3,72}$/.test(String(g?.code||''))||ids.has(g.code)||
     g.researchGuide!==true||g.supplemental!==true||g.officialCompetency!==false||
     !String(g.archiveBasis||'').includes('STT')||
     (typeof g.title!=='string'||g.title.length<8)||
     ['concept','procedure','limit','invalidation','commonError','selfCheck','reviewExplanation']
       .some(k=>typeof g[k]!=='string'||g[k].length<40))
   throw Error('Invalid original research lesson');
  ids.add(g.code);
 }
 researchCache.set(env.ASSETS,{guides,expires:Date.now()+300000});
 return guides;
}
const decisionCache=new WeakMap();
const DECISION_CITATION=/^https:\/\/(?:www\.)?(?:cmegroup\.com|fidelity\.com|schwab\.com|investor\.gov|sec\.gov|chartschool\.stockcharts\.com|help\.stockcharts\.com)\//i;
async function loadDecisionGuides(env,request){
 if(typeof env.ASSETS?.fetch!=='function')return [];
 const cached=decisionCache.get(env.ASSETS);
 if(cached&&cached.expires>Date.now())return cached.guides;
 const r=await env.ASSETS.fetch(new Request(new URL('/data/tutor-decision-playbooks-v1.json',request.url),{method:'GET'}));
 if(!r.ok)throw Error('Optional public trade-decision teaching asset unavailable');
 const data=await r.json(),guides=data?.guides;
 if(data?.kind!=='original_public_tutor_decision_playbooks'||!Array.isArray(guides)||guides.length!==18)
  throw Error('Invalid original Tutor decision playbook count');
 const ids=new Set();
 for(const g of guides){
  if(!/^[A-Z][A-Z0-9_]{3,72}$/.test(String(g?.code||''))||ids.has(g.code)||
     g.decisionPlaybook!==true||g.researchGuide!==true||
     g.officialCompetency!==false||g.supplemental!==true||
     !Array.isArray(g.sourceUrls)||g.sourceUrls.length<1||g.sourceUrls.length>4||
     !g.sourceUrls.every(url=>typeof url==='string'&&DECISION_CITATION.test(url))||
     ['title','concept','watchFor','entryEvidence','holdEvidence','exitEvidence','noTrade',
      'fictionalCase','procedure','limit','invalidation','commonError','selfCheck','reviewExplanation']
      .some(k=>typeof g[k]!=='string'||g[k].length<35)||
     !g.fictionalCase.startsWith('FICTIONAL:'))
   throw Error('Invalid decision guide record');
  ids.add(g.code);
 }
 decisionCache.set(env.ASSETS,{guides,expires:Date.now()+300000});
 return guides;
}
const advancedCache=new WeakMap();
const ADVANCED_REFERENCE=/^https:\/\/(?:www\.)?(?:investor\.gov|optionseducation\.org|schwab\.com)\//i;
async function loadAdvancedDecisionGuides(env,request){
 if(typeof env.ASSETS?.fetch!=='function')return [];
 const hit=advancedCache.get(env.ASSETS);
 if(hit&&hit.expires>Date.now())return hit.guides;
 const r=await env.ASSETS.fetch(new Request(new URL('/data/tutor-advanced-decision-guides-v1.json',request.url),{method:'GET'}));
 if(!r.ok)throw Error('Optional advanced public decision asset unavailable');
 const data=await r.json(),guides=data?.guides;
 if(data?.kind!=='original_public_tutor_advanced_decision_guides'||!Array.isArray(guides)||guides.length!==13)
  throw Error('Invalid advanced Tutor decision catalog');
 const ids=new Set();
 for(const g of guides){
  if(!/^[A-Z][A-Z0-9_]{3,72}$/.test(String(g?.code||''))||ids.has(g.code)||
    g.advancedDecisionGuide!==true||g.decisionPlaybook!==true||g.researchGuide!==true||
    g.supplemental!==true||g.officialCompetency!==false||
    !Array.isArray(g.sourceUrls)||!g.sourceUrls.length||g.sourceUrls.length>4||
    !g.sourceUrls.every(u=>typeof u==='string'&&ADVANCED_REFERENCE.test(u))||
    ['title','horizon','concept','watchFor','entryEvidence','holdEvidence','exitEvidence',
     'noTrade','fictionalCase','procedure','limit','invalidation','commonError','selfCheck','reviewExplanation']
      .some(k=>typeof g[k]!=='string'||g[k].length<25)||
    !g.fictionalCase.startsWith('FICTIONAL:'))
   throw Error('Invalid advanced decision lesson');
  ids.add(g.code);
 }
 advancedCache.set(env.ASSETS,{guides,expires:Date.now()+300000});
 return guides;
}
const masterStudyCache=new WeakMap();
const MASTER_STUDY_SOURCES=/^https:\/\/(?:www\.)?(?:chartschool\.stockcharts\.com|toslc\.thinkorswim\.com|www\.cmegroup\.com|www\.investor\.gov)\//i;
const MASTER_GROUPS=Object.freeze([
 {file:'tutor-indicator-study-v1.json',group:'indicators',count:61},
 {file:'tutor-watchlist-study-v1.json',group:'watchlists',count:22},
 {file:'tutor-strategy-study-v1.json',group:'strategies',count:50}
]);
async function loadMasterStudyGuides(env,request){
 if(typeof env.ASSETS?.fetch!=='function')return [];
 const last=masterStudyCache.get(env.ASSETS);
 if(last&&last.expires>Date.now())return last.guides;
 const groups=await Promise.all(MASTER_GROUPS.map(async spec=>{
  try{
   const r=await env.ASSETS.fetch(new Request(new URL('/data/'+spec.file,request.url),{method:'GET'}));
   if(!r.ok)return [];
   const data=await r.json(),guides=data?.guides;
   if(data?.kind!=='original_public_tutor_master_study'||data?.group!==spec.group||
      data?.count!==spec.count||!Array.isArray(guides)||guides.length!==spec.count)
    return [];
   const codes=new Set();
   for(const g of guides){
    if(!/^STUDY_[A-Z0-9_]{3,75}$/.test(String(g?.code||''))||codes.has(g.code)||
       g.masterStudy!==true||g.supplemental!==true||g.officialCompetency!==false||
       g.researchGuide!==true||!['indicator','watchlist','strategy'].includes(g.kind)||
       !Array.isArray(g.sourceUrls)||!g.sourceUrls.length||g.sourceUrls.length>5||
       !g.sourceUrls.every(u=>typeof u==='string'&&MASTER_STUDY_SOURCES.test(u))||
       (typeof g.title!=='string'||g.title.trim().length<4)||
       (typeof g.formula!=='string'||g.formula.trim().length<8)||
       ['concept','whyUse','howToUse','procedure','limit','limits',
        'invalidation','commonError','selfCheck','reviewExplanation','fictionalPrompt']
          .some(k=>typeof g[k]!=='string'||g[k].trim().length<18))
     return [];
    codes.add(g.code);
   }
   return guides;
  }catch{return []}
 }));
 const guides=groups.flat();
 const unique=new Set(guides.map(x=>x.code));
 if(unique.size!==guides.length)return [];
 masterStudyCache.set(env.ASSETS,{expires:Date.now()+300000,guides});
 return guides;
}
async function originalGuides(env,request,question){
 try{
  const published=await loadPublicGuides(env,request);
  let researchGuides=[],decisionGuides=[],masterStudyGuides=[];
  try{researchGuides=await loadResearchGuides(env,request)}catch{/* Original approved guides remain available. */}
  try{masterStudyGuides=await loadMasterStudyGuides(env,request)}catch{/* New study is optional and never blocks the 30 core guides. */}
  if(/\b(?:enter|entry|exit|exiting|hold|holding|when to|would you|why|setup|setups|trade or skip|no trade|what to look for|stand aside|take profit|stop loss|invalidation|earnings|guidance|balance sheet|cash flow|long.term|portfolio|rebalanc|sector|regime|breadth|confluenc|conflicting|signals|order flow|tape|level ii|order book|options|option premium|theta|vega|assignment|implied volatility|diversif|fundamentals)\b/i.test(String(question||''))){
   try{decisionGuides=await loadDecisionGuides(env,request)}catch{/* Never disable original lessons for an optional curriculum asset. */}
   try{decisionGuides.push(...await loadAdvancedDecisionGuides(env,request))}catch{/* Baseline 18 playbooks and canonical lessons remain available. */}
  }
  return chooseGuides({...published,researchGuides,decisionGuides,masterStudyGuides},question);
 }catch{return []}
}
function formatDecisionGuide(g,mode,reflection){
 const lines=[
  'Supplementary ungraded trade-decision coaching — '+g.title,
  ...(g.horizon?['Governing time horizon: '+g.horizon]:[]),
  'Setup thesis: '+g.concept,
  'What to look for: '+g.watchFor,
  'WHY consider entry (only if the evidence is observed): '+g.entryEvidence,
  'WHY a hold might remain justified (only for a verified open position): '+g.holdEvidence,
  'WHY reassess or exit: '+g.exitEvidence,
  'WAIT or NO TRADE: '+g.noTrade,
  'Original fictional practice: '+g.fictionalCase,
  'What can invalidate the reasoning: '+g.invalidation,
  'Execution and evidence limitation: '+g.limit,
  'Common mistake: '+g.commonError,
  'Supporting educational references (not verified strategy-performance evidence): '+g.sourceUrls.join(' '),
  'Ungraded explanation check: '+g.selfCheck
 ];
 if(mode==='review')lines.push('Your reflection can be revised; this review cannot issue a grade or mastery credit. '+ungradedResponseReview(reflection));
 if(mode==='question')lines.push('Answer the evidence/invalidation check without consulting a future candle.');
 return lines.join('\n\n');
}
function formatMasterStudyGuide(g,mode,reflection){
 const out=[
  'Original ungraded stock-market study — '+g.title,
  'Learning family: '+g.family+' ('+g.kind+')',
  'WHAT it does: '+g.concept,
  'HOW it works or is defined: '+g.formula,
  'WHY it helps a learner: '+g.whyUse,
  'HOW to use it in research: '+g.howToUse,
  'Step-by-step process: '+g.procedure,
  'Limits and uncertainty: '+g.limit,
  'Failure or invalidation: '+g.invalidation,
  'Common mistake: '+g.commonError
 ];
 if(g.kind==='strategy')out.push(
  'Entry evidence: '+g.entryEvidence,
  'Conditional HOLD reasoning: '+g.holdEvidence,
  'Possible EXIT reasoning: '+g.exitEvidence,
  'WAIT / NO TRADE: '+g.noTrade
 );
 out.push('Original fictional teaching prompt: '+g.fictionalPrompt);
 out.push('Reference documentation (does not prove a strategy edge or current broker settings): '+g.sourceUrls.join(' '));
 out.push('Ungraded understanding check: '+g.selfCheck);
 if(mode==='review')out.push('Your reflection is ungraded; it does not earn mastery: '+ungradedResponseReview(reflection));
 if(mode==='question')out.push('Answer from evidence visible at the pause, not from later prices.');
 return out.join('\n\n');
}
async function approvedGuideForCodes(env,request,codes){
 if(!Array.isArray(codes))return null;
 const allowed=codes.filter(code=>typeof code==='string'&&/^[A-Z_]{3,60}$/.test(code)).slice(0,4);
 if(!allowed.length)return null;
 try{
  const index=await loadPublicGuides(env,request);
  return allowed.map(code=>index.guides.find(g=>g.code===code)).find(Boolean)||null;
 }catch{return null}
}
function answerFromGuide(g,mode,answer){
 if(g.masterStudy===true)return formatMasterStudyGuide(g,mode,answer);
 if(g.decisionPlaybook===true)return formatDecisionGuide(g,mode,answer);
 const links=(g.researchGuide===true&&Array.isArray(g.sourceUrls)?g.sourceUrls:[])
  .filter(u=>typeof u==='string'&&/^https:\/\/(www\.investor\.gov|www\.sec\.gov|www\.finra\.org|toslc\.thinkorswim\.com)\//.test(u)).slice(0,2);
 const evidence=g.researchGuide===true?'\n\nResearch note: This is an original educational explanation informed by owner-provided STT source studies, not a verified market event or profitable-strategy claim.'+
  (links.length?'\nAdditional public regulatory/platform reference (not evidence of historical performance): '+links.join(' '):''):'';
 const main=(g.supplemental===true?'Supplementary ungraded topic (not an official competency) — ':'')+g.title+': '+g.concept+'\n\nWhat to do: '+g.procedure+'\n\nWhat this does not establish: '+g.limit+'\n\nInvalidation: '+g.invalidation+evidence;
 if(mode==='question')return main+'\n\nUngraded self-check: '+g.selfCheck;
 if(mode==='review')return main+'\n\nUse this review criterion: '+g.reviewExplanation+' no rubric was graded or scored.\n\n'+ungradedResponseReview(answer);
 return main+'\n\nCommon error to avoid: '+g.commonError+'\n\nPractice: '+g.selfCheck;
}
export {chooseGuides,originalGuides,approvedGuideForCodes,answerFromGuide};
