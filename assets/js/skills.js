function se(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function progressMeter(percent,label,description,hasEvidence=true){
 const v=Math.max(0,Math.min(100,Math.round(Number(percent)||0)));
 const labelText=hasEvidence?String(v)+'%': 'Not yet recorded';
 return '<div class="gu-skill-meter"><div class="gu-skill-meter-label"><span>'+se(label)+'</span>'+
 '<strong>'+se(labelText)+'</strong></div><progress max="100" value="'+v+'" aria-label="'+se(description||label)+'" aria-valuetext="'+se(hasEvidence?v+' percent': 'No evidence recorded')+'">'+v+'%</progress></div>';
}
function statusFor(rows){const guided=rows.filter(r=>r.mode==='guided').length,practice=rows.filter(r=>r.mode==='practice').length,blind=rows.filter(r=>['blind','assessment'].includes(r.mode)).length;if(!rows.length)return ['Not Started','skill-none'];if(blind>=3)return ['Practicing Under Uncertainty','skill-strong'];if(practice||blind)return ['Practicing','skill-practice'];if(guided)return ['Learning','skill-learning'];return ['Learning','skill-learning']}
async function verifiedSkillRecords(sb){
 const session=(await sb.auth.getSession()).data?.session;
 if(!session?.access_token)return {graded:null,competencies:null,errors:['Sign in to load verified evidence.']};
 const headers={authorization:'Bearer '+session.access_token};
 const endpoints=['/api/interactive-training?action=progress','/api/competencies?action=summary'];
 const responses=await Promise.allSettled(endpoints.map(async url=>{
  const response=await fetch(url,{headers,cache:'no-store'}),body=await response.json().catch(()=>null);
  if(!response.ok||body?.ok!==true)throw Error('Verified learning evidence is not available.');
  return body;
 }));
 return {graded:responses[0].status==='fulfilled'?responses[0].value:null,
  competencies:responses[1].status==='fulfilled'?responses[1].value:null,
  errors:responses.filter(x=>x.status==='rejected').map(()=> 'One private evidence source could not be verified. Existing records are not treated as zero.')};
}
function renderOfficialSkills(evidence){
 const host=document.getElementById('official-competencies');
 if(!host)return;
 if(!evidence?.competencies){host.textContent='Verified competency records are temporarily unavailable; no mastery or completion was inferred.';return}
 const activity=document.getElementById('replay-learning-activity');
 if(activity){
  const rec=evidence.competencies.replayLearningActivity;
  activity.textContent=rec?.available?
   'Server-controlled replay: '+String(rec.replaySessionsLinked??'1000+')+
   ' linked session(s), '+String(rec.spacedReviewsCompleted??'3000+')+
   ' completed 1D/7D/30D review stage(s). Ungraded practice only: no competency knowledge, recognition, decision, process or trading outcome is awarded by replay participation.':
   'Server-controlled replay activity is not yet available or was not verified. No completion or skill score is inferred.';
 }
 const items=Array.isArray(evidence.competencies.skills)?evidence.competencies.skills:[];
 const summary=document.getElementById('official-competencies-summary');
 if(summary)summary.textContent=items.length+' existing defined competencies · '+items.filter(x=>Number(x.evidenceCount)>0).length+' have verified assessment evidence. Conceptual Lab exercise grades do not automatically establish four-dimensional competency mastery.';
 if(evidence.competencies.synthetic===true){host.textContent='Showcase displays explicitly fictional examples, not personal assessment results.';return}
 host.innerHTML=items.map(x=>{
  const dimensions=['knowledge','recognition','decision','process'];
  const known=dimensions.filter(key=>x.subScores&&Number.isFinite(Number(x.subScores[key]))&&x.subScores[key]!==null);
  const pct=known.length/4*100;
  return '<article class="card skill-card"><div class="skill-card-top"><h3>'+se(x.name||x.code)+'</h3><span class="pill">'+se(x.status||'Not Yet Assessed')+'</span></div>'+
   progressMeter(pct,'Reviewed evidence coverage · '+known.length+' of 4 dimensions',
     'Reviewed competency dimensions available; not a mastery score',known.length>0)+
   '<p class="small">'+se(x.category||'')+' · '+Number(x.evidenceCount||0)+' distinct verified assessment(s)</p>'+
   '<p class="small">'+se(x.diagnosis||'')+'</p>'+
   '<a class="text-link" href="skills.html#guide-'+encodeURIComponent(x.code)+'">Study original guide →</a></article>';
 }).join('');
}
async function renderOriginalCurriculum(){
 const host=document.getElementById('original-competency-guides');if(!host)return;
 try{
  const [gr,mr]=await Promise.all([
   fetch('/data/competency-study-guides-v01499.json',{cache:'force-cache'}),
   fetch('/data/competency-lab-paths-v01499.json',{cache:'force-cache'})]);
  if(!gr.ok||!mr.ok)throw Error('Curriculum unavailable.');
  const guides=await gr.json(),mapping=await mr.json();
  if(!Array.isArray(guides.guides)||guides.guides.length!==30||mapping.totalCanonicalLabs!==419)
   throw Error('Curriculum contract incomplete.');
  host.replaceChildren();
  for(const g of [...guides.guides,...(Array.isArray(guides.supplementalGuides)?guides.supplementalGuides:[])]){
   const card=document.createElement('article');card.className='card skill-card';card.id='guide-'+g.code;
   const title=document.createElement('h3');title.textContent=g.title;
   const label=document.createElement('p');label.className='small';label.textContent=g.supplemental===true?'Supplementary replay-process lesson · not an official competency · ungraded':'Official competency concept guide · ungraded';
   const concept=document.createElement('p');concept.textContent=g.concept;
   const panel=document.createElement('details'),summary=document.createElement('summary');
   summary.textContent='Study procedure, errors, and self-check';panel.append(summary);
   for(const [heading,part] of [['Observe',g.procedure],['Uncertainty',g.limit],['Invalidation',g.invalidation],
    ['Common mistake',g.commonError],['Self-check',g.selfCheck],['Review explanation',g.reviewExplanation]]){
    const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=heading+': ';
    p.append(strong,document.createTextNode(part||''));panel.append(p);
   }
   const block=document.createElement('div'),selected=g.supplemental===true?[]:(mapping.bySkill?.[g.code]||[]).slice(0,5);
   const note=document.createElement('p');note.className='small';note.textContent=g.supplemental===true?'Replay chronology remains available as a supplementary concept; no extra official competency or grading evidence has been created.':'Suggested related Labs — curriculum links, not graded competency evidence:';block.append(note);
   for(const labId of selected){const lab=mapping.byLab?.[labId];if(!lab)continue;
    const link=document.createElement('a');link.href='labs.html?q='+encodeURIComponent(labId);
    link.textContent=labId+' · '+lab.title;link.style.display='block';block.append(link);}
   const tutor=document.createElement('a');
   tutor.className='btn secondary';tutor.href='market-tutor.html?q='+encodeURIComponent('Explain '+g.title+' and help me check my understanding without grading my answer.');
   tutor.textContent='Ask Market Tutor about '+g.title;
   card.append(title,label,concept,panel,block,tutor);host.append(card);
  }
  if(location.hash.startsWith('#guide-')){const code=location.hash.slice(1).replace(/[^A-Za-z0-9_-]/g,'');
   const destination=document.getElementById(code);if(destination)requestAnimationFrame(()=>destination.scrollIntoView({block:'start'}));}
  const summary=document.getElementById('original-guides-summary');
  if(summary)summary.textContent='30 original guides corresponding to the approved 30 competencies, plus a separate ungraded replay-chronology supplement. The 419 Lab links are editorial suggestions, not private graded answer keys or historical price claims.';
 }catch{
  host.textContent='The original study guides cannot be loaded right now. Existing recorded learning progress has not changed.';
 }
}
function renderRecordedGrades(evidence){
 const host=document.getElementById('recorded-training-grades');
 if(!host)return;
 if(!evidence?.graded){host.textContent='Recorded step-wise learning grades are not available for this account or entitlement. Existing grades were not replaced with zeros.';return}
 const grades=evidence.graded,rows=Array.isArray(grades.latestByLab)?grades.latestByLab:[];
 const counts=document.getElementById('recorded-training-summary');
 if(counts)counts.textContent=rows.length+' distinct Lab(s) with scored conceptual exercises · '+grades.reviewedRows+' recorded scored attempt(s)'+(grades.truncated?' · more than 500 rows; showing the most recent only':'')+'. Only Assessment-mode results are labeled assessments. Other scored exercises are formative learning records, not trading results or automatically awarded mastery.';
 host.innerHTML=rows.length?'<ol>'+rows.slice(0,30).map(x=>'<li><a href="labs.html?q='+encodeURIComponent(x.labId)+'">'+se(x.labId)+'</a> — '+Number(x.score)+'% ('+se(x.mode)+', '+se(new Date(x.completedAt).toLocaleDateString())+')</li>').join('')+'</ol>':'<p>No reviewed step-wise training grades are recorded. The 419 draft assessments are not graded until their rubric is reviewed.</p>';
}
async function reconcileReviewedKnowledge(sb){
 const button=document.getElementById('skills-sync-knowledge');
 const note=document.getElementById('skills-sync-knowledge-status');
 if(!button||!note)return;
 button.disabled=true;note.textContent='Checking existing approved Lab/rubric mappings and actual graded attempts…';
 try{
  const session=(await sb.auth.getSession()).data?.session;
  if(!session?.access_token)throw Error('Sign in before reconciling member learning evidence.');
  const response=await fetch('/api/interactive-training?action=sync-reviewed-knowledge',{
   method:'POST',cache:'no-store',headers:{authorization:'Bearer '+session.access_token,'content-type':'application/json'},
   body:'{}'
  });
  const r=await response.json().catch(()=>null);
  if(!response.ok||r?.ok!==true)throw Error(r?.error||'Knowledge reconciliation cannot be verified.');
  note.textContent=r.knowledgeRowsAdded+' new knowledge-only evidence row(s) recorded from '+
   r.approvedEligible+' qualifying Owner-approved conceptual assessment(s). '+
   r.attemptsInspected+' approved candidate attempt(s) examined. This does not certify trading skill or complete any missing evidence dimensions.';
  const verified=await verifiedSkillRecords(sb);
  renderOfficialSkills(verified);renderRecordedGrades(verified);
 }catch(e){note.textContent='Reconciliation unavailable: '+e.message+' Previously recorded grades and skills have not been changed.'}
 finally{button.disabled=false}
}
async function initSkills(){const sb=await window.getSupabaseClient();const gate=document.getElementById('skills-gate'),content=document.getElementById('skills-content');const {data:{user}}=await sb.auth.getUser();if(!user){gate.innerHTML='<div class="notice">Sign in to view your Market Skills Record.</div>';return}
let cancelled=false;
sb.auth.onAuthStateChange((_event,nextSession)=>{
 if(nextSession?.user?.id===user.id)return;
 cancelled=true;content.hidden=true;content.replaceChildren();
 gate.textContent='Account changed. Reload to see only the current member\'s skills and learning evidence.';
});
const verifiedEvidencePromise=verifiedSkillRecords(sb);document.getElementById('skills-sync-knowledge')?.addEventListener('click',()=>reconcileReviewedKnowledge(sb));
void renderOriginalCurriculum();
const [skillDef,attempts]=await Promise.all([fetch('data/skills.json').then(r=>r.json()),sb.from('lab_attempts').select('*').eq('user_id',user.id).order('completed_at',{ascending:false})]);if(cancelled)return;
if(attempts.error){gate.textContent='The private practice record could not be verified. Existing records have not been replaced with zeros.';return}const rows=attempts.data||[];gate.innerHTML='';content.hidden=false;document.getElementById('attempt-count').textContent=rows.length;document.getElementById('blind-count').textContent=rows.filter(r=>['blind','assessment'].includes(r.mode)).length;document.getElementById('avg-process').textContent=rows.length?`${Math.round(rows.reduce((a,b)=>a+Number(b.process_score||0),0)/rows.length)}%`:'—';const mistakes=rows.flatMap(r=>Array.isArray(r.mistakes)?r.mistakes:[]);document.getElementById('mistake-count').textContent=mistakes.length;
const dims=[['structure','Structure / price behavior'],['location','Location / levels'],['volume_context','Volume / context'],['invalidation','Invalidation'],['decision','Decision'],['confidence','Confidence'],['reasoning','Reasoning / notes']];
const processTarget=document.getElementById('process-profile');
if(processTarget){processTarget.innerHTML=dims.map(([key,label])=>{const n=rows.filter(r=>r.process_breakdown&&r.process_breakdown[key]===true).length;const pct=rows.length?Math.round(n/rows.length*100):0;return `<article class="card skill-card"><div class="skill-card-top"><h3>${se(label)}</h3></div>${progressMeter(pct,'Documentation frequency','Percentage of saved attempts documenting '+label,rows.length>0)}<div class="small">${rows.length?'Documented in '+n+' of '+rows.length+' saved attempt'+(rows.length===1?'':'s')+'.':'No saved attempts to measure yet.'}</div></article>`}).join('')}
const cards=skillDef.map(s=>{const a=rows.filter(r=>r.skill_code===s.skill);const [status,klass]=statusFor(a);const distinctLabs=new Set(a.map(r=>String(r.lab_id||'')).filter(Boolean)).size;const lastDate=a[0]?.completed_at?new Date(a[0].completed_at):null;const last=lastDate?lastDate.toLocaleDateString():'No practice recorded';const days=lastDate?Math.floor((Date.now()-lastDate.getTime())/86400000):null;const due=days!==null&&days>=60;return `<article class="card skill-card"><div class="skill-card-top"><h3>${se(s.skill)}</h3><span class="pill ${due?'skill-review':klass}">${due?'Refresher Due':status}</span></div><div class="small">${a.length} saved attempt${a.length===1?'':'s'} · ${s.labCount} curriculum labs</div>${progressMeter(s.labCount>0?Math.min(100,distinctLabs/s.labCount*100):0,'Distinct Labs practiced · '+distinctLabs+' / '+s.labCount,'Unique Labs with saved attempts relative to the curriculum Lab count; not mastery',distinctLabs>0)}<div class="small">Last practiced: ${last}${due?` · ${days} days ago`:''}</div><a class="text-link" href="labs.html?q=${encodeURIComponent(s.skill)}">${due?'Start refresher practice':'Find related labs'} →</a></article>`}).join('');document.getElementById('skill-cards').innerHTML=cards;const counts={};mistakes.forEach(m=>counts[m]=(counts[m]||0)+1);const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]);document.getElementById('mistake-profile').innerHTML=ranked.length?`<ol class="mistake-list">${ranked.slice(0,8).map(([m,n])=>`<li><span>${se(m)}</span><strong>${n}</strong></li>`).join('')}</ol>`:'<p class="small">No mistake tags yet. Complete interactive labs and record only the mistakes that actually apply.</p>';let rec;if(ranked.length)rec=`Your most frequently recorded review item is <strong>${se(ranked[0][0])}</strong>. Use Practice or Blind Decision Mode on related labs before moving to harder assessments.`;else{const least=skillDef.map(s=>[s,rows.filter(r=>r.skill_code===s.skill).length]).sort((a,b)=>a[1]-b[1])[0];rec=`Begin with <strong>${se(least?.[0]?.skill||'Foundations')}</strong>. The system will become more personalized as you save attempts and mistake tags.`}document.getElementById('practice-recommendation').innerHTML=`<p>${rec}</p><a class="btn secondary" href="labs.html">Choose next lab</a>`;
 const learningEvidence=await verifiedEvidencePromise;
 if(cancelled)return;
 renderRecordedGrades(learningEvidence);renderOfficialSkills(learningEvidence)
}
document.addEventListener('DOMContentLoaded',initSkills);
