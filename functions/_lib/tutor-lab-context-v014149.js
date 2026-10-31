/* D09 419 canonical Lab ID routing. Public competence crosswalk only.
 * NO question bank, assessment answers, replay candles or learner attempt data.
 */
const LAB=/\b(?:F[123]-C\d{2}-L\d{2}|DT-C\d{2}-L\d{2}|TAPE-C\d{2}-L\d{2}|SITE-\d{3})\b/i;
const cache=new WeakMap();
const claimCache=new WeakMap();
const trusted=/^https:\/\/(?:www\.)?(?:investor\.gov|sec\.gov|syndication\.finra\.org|chartschool\.stockcharts\.com)\//i;
async function checkedPublicClaim(env,request,labId,title){
 if(typeof env.ASSETS?.fetch!=='function'||!title)return null;
 const saved=claimCache.get(env.ASSETS);
 let found=saved?.expires>Date.now()?saved.index:null;
 if(!found){
  const response=await env.ASSETS.fetch(new Request(new URL('/data/tutor-lab-claim-evidence-v1.json',request.url)));
  if(!response.ok)return null;
  const body=await response.json();
  if(body?.kind!=='public_tutor_lab_claim_bridges_v1'||body.registeredLabsUnaffected!==419||
    !Array.isArray(body.records)||body.records.length!==8)return null;
  const index=new Map();
  for(const x of body.records){
   if(!/^(?:F[123]|DT|TAPE)-C\d{2}-L\d{2}$/.test(x?.id||'')||index.has(x.id)||
      !trusted.test(x.sourceUrl)||x.reviewStatus!=='source_specific_general_claim_checked_ungraded_not_independently_approved'||
      ['title','claim','worked','counterexample','transfer','sourceId'].some(k=>typeof x[k]!=='string'||x[k].trim().length<5))
     return null;
   index.set(x.id,x);
  }
  found=index;claimCache.set(env.ASSETS,{index,expires:Date.now()+300000});
 }
 const result=found.get(labId);
 return result?.title===title?result:null;
}
const STAGES=['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results'];
const EXAMPLES=Object.freeze({
 'F2-C07-L01':'Compare the open and close of the displayed candle, then locate its high and low. A bullish body describes that interval; it does not predict the next candle.',
 'DT-C11-L01':'Treat VWAP as a session reference. Compare the displayed price with the plotted VWAP and check the session and volume inputs before interpreting their relationship.',
 'DT-C19-L02':'Share volume counts traded shares during the stated interval. Check the interval and feed scope; volume alone does not identify who traded or why.',
 'DT-C34-L01':'Mark the visible upper and lower bounds of the range before discussing a possible breakout. A move beyond a boundary needs subsequent evidence and can fail.',
 'DT-C45-L01':'Locate the proposed breakout level and the later visible evidence that challenges it. Do not use candles beyond the Lab observation point to justify an earlier decision.',
 'DT-C05-L01':'For a hypothetical risk calculation, name the entry, invalidation price, distance per share, and risk budget with units. A modeled stop distance cannot guarantee an exit fill.'
});
export function requestedLearningStage(question){
 const match=/\bLearning Journey stage:\s*(Start|Learn|Experiment|Predict|Practice|Assess|Review|Transfer|Results)\b/i.exec(String(question||'').slice(0,450));
 return match?STAGES.find(stage=>stage.toLowerCase()===match[1].toLowerCase()):null;
}
export function requestedCanonicalLab(question){
 const match=LAB.exec(String(question||'').slice(0,450));
 return match?match[0].toUpperCase():null;
}
export async function getApprovedLabContext(env,request,question){
 const id=requestedCanonicalLab(question);
 if(!id||typeof env.ASSETS?.fetch!=='function')return null;
 let doc=cache.get(env.ASSETS);
 if(!doc||doc.expires<Date.now()){
  const asset=await env.ASSETS.fetch(new Request(new URL('/data/competency-lab-paths-v01499.json',request.url)));
  if(!asset.ok)return null;
  const data=await asset.json().catch(()=>null);
 if(data?.totalCanonicalLabs!==419||!data.bySkill||typeof data.bySkill!=='object')return null;
  doc={expires:Date.now()+300000,data};cache.set(env.ASSETS,doc);
 }
 const codes=Object.entries(doc.data.bySkill)
  .filter(([code,ids])=>/^[A-Z_]{3,60}$/.test(code)&&Array.isArray(ids)&&ids.includes(id))
  .map(([code])=>code).slice(0,4);
 if(!codes.length)return null;
 const title=doc.data.byLab?.[id]?.title;
 const claimEvidence=await checkedPublicClaim(env,request,id,title).catch(()=>null);
 return {labId:id,labTitle:typeof title==='string'?title.slice(0,160):null,
  claimEvidence,
  learningStage:requestedLearningStage(question),relatedCompetencyCodes:codes,practiceUrl:'/labs.html?q='+encodeURIComponent(id),
  registryScope:'canonical_lab_id_and_public_competency_crosswalk_only'};
}
export function labGuidance(context,mode,reflection=''){
 const n=context.labId,codes=context.relatedCompetencyCodes.join(', ');
 const stage=STAGES.includes(context.learningStage)?context.learningStage:null;
 const focus=EXAMPLES[n]||'Use only the evidence visible at the Lab observation point. Name the concept, its limitation, and what would change your interpretation.';
 const stagePrompt={Start:'State what you already know and what the lesson will examine.',Learn:'Define the concept in plain language before applying it.',Experiment:'Change one observation at a time and describe what changes.',Predict:'Write a prediction before revealing later evidence.',Practice:'Try the next step independently, then explain your reasoning.',Assess:'Use the Lab assessment instructions; I cannot provide its answer key.',Review:'Compare your reasoning with the evidence available at the time.',Transfer:'Describe when the same concept would or would not apply elsewhere.',Results:'Review your recorded result without treating it as trading proficiency.'};
 const a='Lab '+n+' is registered in the 419-Lab curriculum. Public competency links: '+codes+'. '+
  (context.labTitle?'Public lesson title: '+context.labTitle+'. ':'')+
  (stage?'Learning Journey stage: '+stage+'. '+stagePrompt[stage]+' ':'')+focus+' '+
  'Open the linked Lab, read its setup and data-source attribution, then stop at the defined observation point. '+
  'Record what the available candle/volume evidence supports, what it cannot establish, your invalidation criterion, and a NO TRADE choice when evidence is insufficient. '+
  'Do not inspect future candles, assume historical prints exist, or treat a hypothetical example as an actual trade.';
 const researched=context.claimEvidence;
 // During an authorized assessment, show definitions and source attribution
 // only. Never show a worked case, counterexample scaffold or transfer example
 // that could accidentally resemble a protected, independent question.
 const assessmentBoundary=stage==='Assess';
 const sourceTeaching=researched?'\n\nSource-checked supplementary teaching (ungraded; NOT whole-Lab approval): '+
  researched.claim+(assessmentBoundary?
   '\nAssessment boundary: consult the Lab and reason independently. Worked examples, counterexample scaffolds and transfer solutions are withheld at this stage.':
   '\n\nOriginal fictional worked case: '+researched.worked+
    '\n\nWhat could go wrong: '+researched.counterexample+
    '\n\nIndependent transfer task: '+researched.transfer)+
  '\n\nTechnical/primary reference: '+researched.sourceId+' — '+researched.sourceUrl+
  '\nThese specific general references do not certify historical price data, protected assessment answers, or unit editorial approval.':'';
 if(mode==='question')return a+sourceTeaching+'\n\nUngraded self-check: Which visible observation supports your interpretation and which would change your decision?';
 if(mode==='review')return a+sourceTeaching+'\n\nUngraded reflection received ('+
  (reflection?'review your evidence and boundary against the actual Lab instructions':'no written reflection supplied')+
  '). The Tutor does not reveal restricted answers or award scores.';
 return a+sourceTeaching+'\n\nOfficial Lab link: '+context.practiceUrl+'\nNo grading result or future market evidence is supplied here.';
}

