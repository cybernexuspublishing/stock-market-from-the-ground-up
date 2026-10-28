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
 const candidates=[...index.guides,...(Array.isArray(index.supplementalGuides)?index.supplementalGuides:[]),...(Array.isArray(index.researchGuides)?index.researchGuides:[])];
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
async function originalGuides(env,request,question){
 try{
  const published=await loadPublicGuides(env,request);
  let researchGuides=[];
  try{researchGuides=await loadResearchGuides(env,request)}catch{/* Existing 30-guide Tutor remains functional. */}
  return chooseGuides({...published,researchGuides},question);
 }catch{return []}
}
function answerFromGuide(g,mode,answer){
 const links=(g.researchGuide===true&&Array.isArray(g.sourceUrls)?g.sourceUrls:[])
  .filter(u=>typeof u==='string'&&/^https:\/\/(www\.investor\.gov|www\.sec\.gov|www\.finra\.org|toslc\.thinkorswim\.com)\//.test(u)).slice(0,2);
 const evidence=g.researchGuide===true?'\n\nResearch note: This is an original educational explanation informed by owner-provided STT source studies, not a verified market event or profitable-strategy claim.'+
  (links.length?'\nAdditional public regulatory/platform reference (not evidence of historical performance): '+links.join(' '):''):'';
 const main=(g.supplemental===true?'Supplementary ungraded topic (not an official competency) — ':'')+g.title+': '+g.concept+'\n\nWhat to do: '+g.procedure+'\n\nWhat this does not establish: '+g.limit+'\n\nInvalidation: '+g.invalidation+evidence;
 if(mode==='question')return main+'\n\nUngraded self-check: '+g.selfCheck;
 if(mode==='review')return main+'\n\nUse this review criterion: '+g.reviewExplanation+' no rubric was graded or scored.\n\n'+ungradedResponseReview(answer);
 return main+'\n\nCommon error to avoid: '+g.commonError+'\n\nPractice: '+g.selfCheck;
}
export {chooseGuides,originalGuides,answerFromGuide};
