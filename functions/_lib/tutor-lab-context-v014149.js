/* D09 419 canonical Lab ID routing. Public competence crosswalk only.
 * NO question bank, assessment answers, replay candles or learner attempt data.
 */
const LAB=/\b(?:F[123]-C\d{2}-L\d{2}|DT-C\d{2}-L\d{2}|TAPE-C\d{2}-L\d{2}|SITE-\d{3})\b/i;
const cache=new WeakMap();
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
 const rawTitle=doc.data.byLab?.[id]?.title;
 const title=typeof rawTitle==='string'&&rawTitle.length<=120&&
  !/[<>\u0000-\u001f]/.test(rawTitle)?rawTitle:'';
 return {labId:id,title,relatedCompetencyCodes:codes,practiceUrl:'/labs.html?q='+encodeURIComponent(id),
  registryScope:'canonical_lab_id_and_public_competency_crosswalk_only'};
}
export function labGuidance(context,mode,reflection='',question=''){
 const match=/\bat the (Start|Learn|Experiment|Predict|Practice|Assess|Review|Transfer|Results) learning stage\b/i.exec(String(question).slice(0,450));
 const stage=match?.[1]?.toLowerCase()||'';
 const stageHelp={
  start:'Identify the stated concept, objective, and what evidence this Lab actually provides.',
  learn:'Define the terms and units first, then work through the approved concept guide one step at a time.',
  experiment:'Change one variable in the visible illustrative example; describe what changes and what remains unknown.',
  predict:'Make your own prediction from the currently visible evidence before asking for any explanation.',
  practice:'Try the method independently, then compare your steps with the public study guide and correct a specific error.',
  assess:'Complete the independent assessment without Tutor hints; return after submitting for conceptual review.',
  review:'Explain which step of your reasoning needs correction and why; no private rubric is supplied here.',
  transfer:'Apply the same method to a new example, checking whether its assumptions and units still hold.',
  results:'Summarize the concept, its limits, and one next practice task without claiming mastery.'
 };
 const stageLine=stage?'Current learning stage: '+match[1]+'. '+stageHelp[stage]+'\n\n':'';
 const n=context.labId,codes=context.relatedCompetencyCodes.join(', ');
 const a=stageLine+'Lab '+n+(context.title?' ('+context.title+')':'')+' is registered in the 419-Lab curriculum. Public competency links: '+codes+'. '+
  'Open the linked Lab, read its setup and data-source attribution, then stop at the defined observation point. '+
  'Record what the available candle/volume evidence supports, what it cannot establish, your invalidation criterion, and a NO TRADE choice when evidence is insufficient. '+
  'Do not inspect future candles, assume historical prints exist, or treat a hypothetical example as an actual trade.';
 if(mode==='question')return a+'\n\nUngraded self-check: Which visible observation supports your interpretation and which would change your decision?';
 if(mode==='review')return a+'\n\nUngraded reflection received ('+
  (reflection?'review your evidence and boundary against the actual Lab instructions':'no written reflection supplied')+
  '). The Tutor does not reveal restricted answers or award scores.';
 return a+'\n\nOfficial Lab link: '+context.practiceUrl+'\nNo grading result or future market evidence is supplied here.';
}
