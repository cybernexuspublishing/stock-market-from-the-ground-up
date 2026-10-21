/* Deployment 01 of 08 — Owner-only operational delivery deck.
 * Uses the EXISTING protected Owner Roadmap API. This does not duplicate
 * the roadmap, grant permissions, change records, or certify deployments.
 */
(()=>{'use strict';
 if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
 if(window.__groundUpOwnerDeliveryDeck)return;
 window.__groundUpOwnerDeliveryDeck=true;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
 const card=(label,value,description)=>{
  const n=el('article','cc-delivery-stat');n.append(el('span','',label),el('strong','',String(value)),el('small','',description));return n
 };
 const link=(href,text)=>{const a=el('a','cc-delivery-link',text);a.href=href;return a};
 const mount=()=>{
  const app=document.getElementById('admin-app'),gate=document.getElementById('admin-gate'),dashboard=app?.querySelector('[data-admin-panel="dashboard"]');
  if(!dashboard||!gate?.hidden||app.hidden)return null;
  let desk=document.getElementById('cc-delivery-desk');
  if(desk)return desk;
  desk=el('section','cc-delivery-desk');desk.id='cc-delivery-desk';desk.setAttribute('aria-labelledby','cc-delivery-heading');
  desk.hidden=true;dashboard.append(desk);return desk;
 };
 const wait=()=>new Promise(resolve=>{
  let n=0;const tick=()=>{const x=mount();if(x)return resolve(x);if(++n<80)setTimeout(tick,150);else resolve(null)};tick();
 });
 async function load(){
  const desk=await wait();if(!desk)return;
  const api=window.getSupabaseClient;
  if(typeof api!=='function')return;
  let token;try{const sb=await api();token=(await sb.auth.getSession()).data?.session?.access_token}catch{return}
  if(!token)return;
  let response;try{
   response=await fetch('/api/owner-roadmap?action=delivery-summary',{method:'GET',cache:'no-store',credentials:'same-origin',headers:{authorization:'Bearer '+token,accept:'application/json'}});
  }catch{return}
  // Owner API is authoritative. Never show a private summary on staff/Showcase denial.
  if(response.status===401||response.status===403)return;
  desk.hidden=false;desk.replaceChildren();
  desk.append(el('div','cc-delivery-eyebrow','Owner operations · authenticated project evidence'));
  const h=el('div','cc-delivery-heading');const title=el('div');const titleHeading=el('h2','','Development & Acceptance');titleHeading.id='cc-delivery-heading';title.append(titleHeading,el('p','', 'Source delivery, database installation, provider operations and member acceptance are separate stages.'));
  const actions=el('div','cc-delivery-actions');actions.append(link('/owner-roadmap.html','Open authoritative roadmap →'),link('/owner-roadmap.html#product-readiness','All 21 tools'),link('/owner-roadmap.html#verification-audit','Verification & SQL'));h.append(title,actions);desk.append(h);
  if(!response.ok){desk.append(el('p','cc-delivery-warning','Roadmap service unavailable. Do not interpret missing evidence as zero outstanding work.'));return}
  let data;try{data=await response.json()}catch{}
  const summary=data?.deliverySummary;
  if(!data?.ok||!Number.isSafeInteger(summary?.totalTasks)||summary.totalTasks<1||!summary.counts){
   desk.append(el('p','cc-delivery-warning','Current authenticated roadmap evidence could not be validated. No completion counts are displayed.'));return
  }
  const counts=summary.counts,ownerComplete=counts.owner_complete||0,verified=counts.verified||0;
  const stats=el('div','cc-delivery-stats');
  stats.append(card('Tracked commitments',summary.totalTasks,'Authenticated primary roadmap tasks'),
   card('Evidence verified',verified,'Scope-specific; not a sitewide release certificate'),
   card('Owner marked complete',ownerComplete,'Owner decision; independent acceptance separate'),
   card('In progress', (counts.in_progress||0)+(counts.partially_complete||0)+(counts.testing_required||0),'Builds, partial tasks and testing'),
   card('Blocked / decisions', (counts.blocked||0)+(counts.research_required||0)+(counts.owner_review_required||0),'Review underlying dependencies'),
   card('Source implemented',counts.implemented||0,'Production behavior requires separate proof'));
  desk.append(stats);
  if(data?.bootcampReadiness?.curriculumDays===30){
    const scope=el('p','cc-delivery-note');
    scope.textContent='30-Day Learning Path: 30 original daily objectives mapped to the 30 existing official competencies and provisional Labs. Curriculum source implemented; private member progress schema, authentic historical case evidence, and individual assessment approvals remain unverified.';
    desk.append(scope);
  }
  const packages=Array.isArray(data.releasePlan?.packages)?data.releasePlan.packages:[];
  if(packages.length===8){
   const heading=el('h3','cc-delivery-subheading','Coordinated release packages');
   const phases=el('div','cc-delivery-phases');
   for(const p of packages){
    const box=el('article','cc-delivery-phase');
    box.append(el('span','cc-phase-number',p.number+' of 08'),el('strong','',p.title),el('small',''));
    box.lastChild.textContent=(p.sourceDelivery==='merged'?'Source merged in main':p.sourceDelivery==='source_candidate'?'Source candidate / in development':'Not started')+' · production acceptance '+(p.productionAcceptance||'unverified');
    const a=link('/owner-roadmap.html#task-'+p.roadmapId,'Related roadmap →');box.append(a);phases.append(box);
   }
   desk.append(heading,phases);
  }
  // Reuse the same authenticated Owner response; no independent market-data
  // admin backend, browser API keys, or assertions about untested live feeds.
  const sources=Array.isArray(data?.dataSources?.sources)?data.dataSources.sources:[];
  if(sources.length){
   desk.append(el('h3','cc-delivery-subheading','Free data sources · research & testing'));
   const sourceDeck=el('div','cc-delivery-phases');
   for(const src of sources){
    const box=el('article','cc-delivery-phase');
    box.append(el('span','cc-phase-number',src.code||'Source'),el('strong','',src.name||'Provider'));
    box.append(el('small','',src.cost+' · '+src.credential));
    box.append(el('small','',src.localPipeline+' · real connection '+src.observedLiveCapture));
    box.append(link(src.terms||'/owner-roadmap.html','Provider terms ↗'));
    sourceDeck.append(box);
   }
   desk.append(sourceDeck,el('p','cc-delivery-warning','Commercial publication is not yet approved; real IEX file decoding, historical trade condition and feed completeness, SEC endpoint access, member display and redistribution still require evidence.'));
  }
  const risks=el('p','cc-delivery-note');
  risks.textContent='Planning categories are separate from deployment evidence. Data provenance, market-data rights, grading, member access and paid billing are not certified by a GitHub commit or an Owner checkbox.';
  desk.append(risks);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void load()},{once:true});else void load();
})();
