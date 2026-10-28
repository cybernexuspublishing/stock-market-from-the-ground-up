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
 const candidates=[...index.guides,...(Array.isArray(index.supplementalGuides)?index.supplementalGuides:[])];
 return candidates.map(g=>{
  const title=String(g.title||'').toLowerCase(),code=String(g.code||'').toLowerCase().replaceAll('_',' ');
  const concept=String(g.concept||'').toLowerCase();
  const score=query.reduce((v,w)=>v+(title.includes(w)?8:0)+(code.includes(w)?6:0)+(concept.includes(w)?2:0),0);
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
async function originalGuides(env,request,question){
 try{return chooseGuides(await loadPublicGuides(env,request),question)}
 catch{return []}
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
 const main=(g.supplemental===true?'Supplementary ungraded topic (not an official competency) — ':'')+g.title+': '+g.concept+'\n\nWhat to do: '+g.procedure+'\n\nWhat this does not establish: '+g.limit+'\n\nInvalidation: '+g.invalidation;
 if(mode==='question')return main+'\n\nUngraded self-check: '+g.selfCheck;
 if(mode==='review')return main+'\n\nUse this review criterion: '+g.reviewExplanation+' no rubric was graded or scored.\n\n'+ungradedResponseReview(answer);
 return main+'\n\nCommon error to avoid: '+g.commonError+'\n\nPractice: '+g.selfCheck;
}
export {chooseGuides,originalGuides,approvedGuideForCodes,answerFromGuide};
