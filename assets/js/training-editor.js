(()=>{'use strict';const $=s=>document.querySelector(s),rows=$('#author-questions'),msg=$('#author-status'),form=$('#author-form');if(!form)return;const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let lastDraft=null;
async function api(action,method='GET',body,query=''){const sb=await window.getSupabaseClient(),{data:{session}}=await sb.auth.getSession();if(!session)throw Error('OWNER sign-in required.');const r=await fetch('/api/training-editor?action='+action+(query?'&'+query:''),{method,cache:'no-store',headers:{authorization:'Bearer '+session.access_token,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||'Instruction management unavailable.');return j}
function field(id,value,label){return `<label>${label}<input data-q="${id}" value="${esc(value)}" required></label>`}
function summary(){const n=rows.children.length;const host=document.querySelector('#v01414-author-summary');if(host)host.textContent=n+' question'+(n===1?'':'s')+' in this draft. Answers remain private until the assessment is completed.'}
function add(q={},key=''){const row=document.createElement('section');row.className='card v014-question-editor';row.innerHTML=`<div class="eyebrow">Reviewable Question</div>${field('id',q.id||'q'+(rows.children.length+1),'Question ID')}${field('prompt',q.prompt||'','Question')}
<label>Type<select data-q="kind"><option value="choice" ${q.kind==='choice'?'selected':''}>Multiple choice</option><option value="number" ${q.kind==='number'?'selected':''}>Number</option></select></label>${field('options',Array.isArray(q.options)?q.options.join('|'):'YES|NO','Choices separated by | (if multiple choice)')}${field('answer',key,'Correct answer')}${field('tolerance',q.tolerance??0,'Numeric tolerance')}
<label>Teaching explanation<textarea data-q="explanation" required rows="3">${esc(q.explanation||'')}</textarea></label><button class="btn secondary" type="button" data-remove>Remove Question</button>`;row.querySelector('[data-remove]').onclick=()=>{row.remove();summary()};rows.append(row);
 const kind=row.querySelector('[data-q="kind"]'),options=row.querySelector('[data-q="options"]').closest('label'),tolerance=row.querySelector('[data-q="tolerance"]').closest('label');
 const toggle=()=>{options.hidden=kind.value!=='choice';tolerance.hidden=kind.value!=='number';options.querySelector('input').required=kind.value==='choice';tolerance.querySelector('input').required=kind.value==='number';};kind.addEventListener('change',toggle);toggle();
 const preview=document.createElement('aside');preview.className='v01414-question-preview';preview.setAttribute('aria-label','Learner question preview');
 const heading=document.createElement('strong');heading.textContent='Learner-facing question preview';
 const question=document.createElement('p'),choices=document.createElement('p');preview.append(heading,question,choices);row.append(preview);
 const redraw=()=>{question.textContent=row.querySelector('[data-q="prompt"]').value||'Enter the question text.';
  choices.textContent=kind.value==='choice'?'Choices: '+row.querySelector('[data-q="options"]').value.split('|').map(x=>x.trim()).filter(Boolean).join(' • '):'Numeric answer — learner will enter a value.';summary()};
 row.addEventListener('input',redraw);row.addEventListener('change',()=>{toggle();redraw()});redraw()}
let mappedRubric=null;
const V96_SEED_IDS=new Set(['EVIDENCE','FOCUS','ORIGINAL_MATH','BOUNDARY']);
function renderTopicReviewWarning(set){
 const el=$('#author-topic-review-notice');if(!el)return;
 const source=String(set.source_status||'');
 const isV96=source.startsWith('original_hypothetical_unreviewed_v01496');
 const application=Array.isArray(set.questions)&&set.questions.some(q=>
  !V96_SEED_IDS.has(String(q?.id||''))&&
  String(q?.prompt||'').trim().length>=80&&String(q?.explanation||'').trim().length>=120);
 el.textContent=isV96?(application?
  'An added topic application question is present. Independently verify its answer, teaching feedback, dataset rights, and the specific Lab concept before approving.':
  'TOPIC-SPECIFIC QUESTION REQUIRED: Original v96 arithmetic/study-method scaffolding is not an adequate subject assessment. Add one new question (new ID, 80+ character prompt, 120+ character explanation) and save the revised draft before review.'):
  'Review the chosen rubric against this Lab objective and available evidence. No reviewed rubric alone verifies historical market tape.';
}
async function loadKnowledgeMap(){
 const state=$('#author-knowledge-state'),select=$('#author-knowledge-code'),approve=$('#author-knowledge-approve');
 select.replaceChildren();select.disabled=true;approve.disabled=true;
 if(!mappedRubric){state.textContent='Load an existing Lab rubric before inspecting its suggested competency.';return}
 try{
  const d=await api('knowledge-map','GET',null,'labId='+encodeURIComponent(mappedRubric.labId));
  const map=d.mapping;
  for(const definition of d.definitions||[]){
   const option=document.createElement('option');option.value=definition.competency_code;
   option.textContent=definition.name+' · '+definition.competency_code;select.append(option);
  }
  select.value=map.competency_code;
  select.disabled=mappedRubric.reviewState!=='reviewed';
  approve.disabled=mappedRubric.reviewState!=='reviewed'||!select.value;
  state.textContent='Lab '+map.lab_id+' · mapping: '+map.review_state+
   ' · suggested competency: '+map.competency_code+
   ' · mapping source: '+map.mapping_method+
   ' · approved rubric version: '+(map.rubric_version||'none')+
   '. Selected rubric version '+mappedRubric.version+' is '+mappedRubric.reviewState+
   '. A new version requires a separate explicit mapping approval.';
 }catch(e){state.textContent='Mapping cannot be verified: '+e.message+
  '. The Lab rubric may still be edited, but no competency evidence can be awarded.'}
}
$('#author-knowledge-refresh').onclick=loadKnowledgeMap;
$('#author-knowledge-approve').onclick=async()=>{
 const state=$('#author-knowledge-state'),button=$('#author-knowledge-approve');
 if(!mappedRubric||mappedRubric.reviewState!=='reviewed'){
  state.textContent='Approve this exact Lab rubric independently first.';return;
 }
 const code=$('#author-knowledge-code').value;
 if(!code){state.textContent='Select one existing approved competency.';return}
 if(!confirm('Confirm you have personally verified that this exact rubric tests the selected competency knowledge. No other dimension, historical chart validity, future-bar discipline or mastery is certified.')){
  return;
 }
 button.disabled=true;
 try{
  const r=await api('approve-map','POST',{labId:mappedRubric.labId,
   version:mappedRubric.version,competencyCode:code,confirmPhrase:'APPROVE KNOWLEDGE ONLY'});
  state.textContent=r.notice;await loadKnowledgeMap();
 }catch(e){state.textContent=e.message;button.disabled=false}
};
let rubricIndex=[],foundationsIndex=null,rubricIndexLoaded=false;
function bookChoice(){return $('#author-foundations-book')?.value||'ALL'}
function matchBook(id,book){
 const f=/^F[123]-/.test(String(id||''));
 return book==='ALL'||(book==='OTHER'?!f:String(id||'').startsWith('F'+book+'-'));
}
function showFoundationsQueue(){
 const state=$('#author-foundations-coverage'),picker=$('#author-foundations-missing');
 if(!state||!picker)return;
 const old=picker.value;picker.replaceChildren();
 const first=document.createElement('option');first.value='';
 first.textContent=foundationsIndex?'Choose missing private rubric':'Source catalog unavailable';
 picker.append(first);picker.disabled=!foundationsIndex;
 if(!foundationsIndex||!rubricIndexLoaded){state.textContent='Source catalog or complete private Owner rubric index not verified; no missing-rubric count is assumed.';picker.disabled=true;return}
 const q=window.GroundUpFoundationsRubricQueueV014151;
 const chosen=bookChoice(),s=q.summarize(foundationsIndex,rubricIndex,chosen),
       overall=q.summarize(foundationsIndex,rubricIndex,'ALL');
 for(const lab of chosen==='OTHER'?[]:s.missing){
  const o=document.createElement('option');o.value=lab.id;o.textContent=lab.id+' · '+lab.title;picker.append(o);
 }
 if([...picker.options].some(o=>o.value===old))picker.value=old;
 state.textContent=s.versioned+'/'+s.registered+' Labs have a saved rubric version in this view; '+
  s.reviewed+' have a reviewed rubric version; '+s.missing.length+
  ' lack a rubric. All Foundations: '+overall.versioned+'/94 with any rubric. '+
  'Neither a reviewed rubric nor a catalog ID certifies a completed lesson.';
}

function displayRubrics(){
 const sel=$('#author-existing'),needle=String($('#author-filter')?.value||'').toLowerCase().trim(),picked=sel.value;
 const book=bookChoice();
 const filtered=rubricIndex.filter(x=>matchBook(x.lab_id,book)&&[x.lab_id,x.title,x.review_state,x.source_status].some(v=>String(v||'').toLowerCase().includes(needle)));
 sel.replaceChildren();
 const first=document.createElement('option');first.value='';first.textContent=filtered.length?'Choose existing rubric':'No matching rubrics';sel.append(first);
 for(const item of filtered.slice(0,700)){const option=document.createElement('option');option.value=item.lab_id+'|'+item.version;option.textContent=item.lab_id+' · v'+item.version+' · '+item.review_state+' · '+item.title;sel.append(option)}
 if([...sel.options].some(x=>x.value===picked))sel.value=picked;
 const label=$('#author-queue-count');if(label)label.textContent=rubricIndex.length+' existing rubric version(s) · '+rubricIndex.filter(x=>x.review_state==='draft').length+' draft(s) awaiting individual review · '+filtered.length+' matching the current filter.';
 showFoundationsQueue();
}
async function refresh(){const d=await api('list');rubricIndex=Array.isArray(d.sets)?d.sets:[];rubricIndexLoaded=false;if(d.allVersionsIncluded!==true)throw Error('Owner review inventory is not complete; refuse partial catalog.');rubricIndexLoaded=true;displayRubrics()}
async function loadFoundationsIndex(){
 const response=await fetch('/data/labs.json',{cache:'no-store'});
 if(!response.ok)throw Error('Public Foundations index unavailable');
 foundationsIndex=window.GroundUpFoundationsRubricQueueV014151.catalog(await response.json());
 displayRubrics();
}
$('#author-add').onclick=()=>add();$('#author-filter').addEventListener('input',displayRubrics);
$('#author-foundations-book').addEventListener('change',displayRubrics);
$('#author-foundations-missing').addEventListener('change',function(){
 const lab=foundationsIndex?.find(x=>x.id===this.value);if(!lab)return;
 if(!confirm('Start an UNSAVED private rubric draft for '+lab.id+'? Current unsaved editor changes will be replaced.')){this.value='';return}
 form.elements.labId.value=lab.id;form.elements.title.value=lab.title;
 rows.replaceChildren();add();lastDraft=null;mappedRubric=null;
 $('#author-topic-review-notice').textContent='A topic-specific question and independent answer review are required before approval.';
 msg.textContent='Prepared UNSAVED draft for '+lab.id+'. Nothing was submitted or approved.';
 this.value='';void loadKnowledgeMap();
});$('#author-existing').onchange=async e=>{if(!e.target.value)return;const [labId,version]=e.target.value.split('|');try{const d=await api('get','GET',null,'labId='+encodeURIComponent(labId)+'&version='+version),s=d.set;form.elements.labId.value=s.lab_id;form.elements.title.value=s.title;rows.replaceChildren();for(const q of s.questions)add(q,s.answer_key[q.id]);lastDraft=s.review_state==='draft'?{labId,version:s.version}:null;
 mappedRubric={labId,version:s.version,reviewState:s.review_state};
 renderTopicReviewWarning(s);
 void loadKnowledgeMap();
 msg.textContent=s.review_state==='reviewed'?'Reviewed version is locked. Saving changes creates a new draft.':'Draft loaded for editing.'}catch(err){msg.textContent=err.message}};
form.onsubmit=async ev=>{ev.preventDefault();const questions=[],answerKey={};try{for(const node of rows.children){const o=Object.fromEntries([...node.querySelectorAll('[data-q]')].map(e=>[e.dataset.q,e.value]));const id=o.id.trim(),kind=o.kind;
 if(!id||questions.some(q=>q.id===id))throw Error('Question IDs must be filled and unique.');
 if(!o.prompt.trim()||!o.explanation.trim())throw Error('Every question requires a prompt and teaching explanation.');
 const opts=kind==='choice'?o.options.split('|').map(x=>x.trim()).filter(Boolean):[];
 if(kind==='choice'&&(opts.length<2||!opts.includes(o.answer.trim())))throw Error('Correct answer must exactly match one of at least two choices in question '+id+'.');
 if(kind==='number'&&(!o.answer.trim()||!Number.isFinite(Number(o.answer))||!Number.isFinite(Number(o.tolerance))||Number(o.tolerance)<0))throw Error('Numeric questions require a valid answer and a nonnegative tolerance.');
 questions.push({id,prompt:o.prompt.trim(),kind,options:opts,tolerance:kind==='number'?Number(o.tolerance):0,explanation:o.explanation.trim()});answerKey[id]=kind==='number'?Number(o.answer):o.answer.trim()}const r=await api('draft','POST',{labId:form.elements.labId.value,title:form.elements.title.value,questions,answerKey});lastDraft={labId:r.labId,version:r.version};mappedRubric={labId:r.labId,version:r.version,reviewState:'draft'};void loadKnowledgeMap();msg.textContent=r.notice;await refresh()}catch(e){msg.textContent=e.message}};
$('#author-review').onclick=async()=>{if(!lastDraft){msg.textContent='First save a draft.';return}if(!confirm('You have individually verified all question prompts, one correct key for each, mathematical tolerances, explanation quality, and the fictional-versus-historical source label. This ONLY releases authored assessment grading and does not verify historical tape or certify trading skill.'))return;try{const r=await api('review','POST',{labId:lastDraft.labId,title:form.elements.title.value,version:lastDraft.version,confirmPhrase:'REVIEW BOOK RUBRIC'});msg.textContent=r.notice;mappedRubric={labId:r.labId,version:r.version,reviewState:'reviewed'};void loadKnowledgeMap();lastDraft=null;await refresh()}catch(e){msg.textContent=e.message}};
add();refresh().catch(e=>{rubricIndexLoaded=false;showFoundationsQueue();msg.textContent=e.message});
loadFoundationsIndex().catch(e=>{foundationsIndex=null;showFoundationsQueue();msg.textContent='Foundations index unavailable: '+e.message});
})();
