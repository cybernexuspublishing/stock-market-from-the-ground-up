/* v0.14.0.102 — accessible Member Tutor response workspace.
 * One question -> one user-visible answer, independent of whether paid AI is enabled.
 * Unauthenticated teaching is an explicitly labeled PUBLIC glossary fallback.
 * Persistent history is optional: fail safely to current-page memory until Owner SQL.
 * Never copy user text to localStorage, never award grades, and never render HTML
 * returned by a learner, provider, or database as markup.
 */
const TUTOR={index:[],sb:null,user:null,entries:[],busy:false,saving:false,lastTopic:'',serverHistory:false,guides:[],competencyMap:null};
const $=id=>document.getElementById(id);
function status(message,kind=''){const node=$('tutor-status');node.textContent=message;node.className='status-message'+(kind?' '+kind:'');}
function historyStatus(message){$('tutor-history-state').textContent=message;}
function btn(label,handler,cls='btn secondary'){
 const el=document.createElement('button');el.type='button';el.className=cls;el.textContent=label;el.addEventListener('click',handler);return el;
}
function make(tag,text,className){
 const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);
 if(className)n.className=className;return n;
}
function sourceTitles(sources){
 return (Array.isArray(sources)?sources:[]).slice(0,3)
 .map(x=>String(x?.title||x?.sourceLabel||'').trim().slice(0,120)).filter(Boolean);
}
function sessionMessage(){return TUTOR.user?'Current-page exchanges are available now; cross-device history requires approved private storage.':'Public glossary mode: sign in for member teaching and saved private exchanges.';}
async function token(){
 if(!TUTOR.sb)return null;
 try{return (await TUTOR.sb.auth.getSession()).data?.session?.access_token||null}catch{return null}
}
function safeUrl(x){
 const href=String(x?.practiceUrl||'');
 return href.startsWith('/labs.html?q=')?href:'labs.html?q='+encodeURIComponent(x?.title||'');
}
function relatedGuides(record){
 const context=(record.sourceTitles||[]).join(' ')+' '+record.question;
 const terms=[...new Set((context.toUpperCase().match(/[A-Z0-9]{3,}/g)||[])
  .filter(x=>!['WHAT','HOW','FOR','THE','YOUR','EXPLAIN','ABOUT','FOLLOW','WITH','FROM','STEP','REVIEW'].includes(x)))];
 return TUTOR.guides.map(g=>{
  const title=(g.title+' '+g.code.replaceAll('_',' ')).toUpperCase();
  const concept=String(g.concept||'').toUpperCase();
  const score=terms.reduce((sum,k)=>sum+(title.includes(k)?5:0)+(concept.includes(k)?1:0),0);
  return {g,score};
 }).filter(x=>x.score>=5).sort((a,b)=>b.score-a.score).slice(0,2).map(x=>x.g);
}
function detailsOf(record){
 const li=make('li',undefined,'tutor-turn');
 li.dataset.requestId=record.requestId;
 const meta=make('p',(record.mode||'explain').toUpperCase()+' · '+(record.id?'Saved privately':'Current view only')+' · '+new Date(record.createdAt).toLocaleString(),'tutor-ref');
 li.append(meta,make('h3','Your question'),make('p',record.question,'tutor-user-message'));
 if(record.learnerAnswer){
  li.append(make('h4','Your submitted reasoning (ungraded)'),make('p',record.learnerAnswer,'tutor-user-message'));
 }
 const reply=make('section',undefined,'tutor-reply');
 reply.append(make('h4','Tutor response'),make('p',record.answer,'tutor-response-text'));
 const type=record.generation==='grounded-model-draft'?'Optional AI-generated educational draft':
  record.generation==='public-companion-glossary'?'Public glossary — not AI':
  record.generation==='authenticated-practice-history'?'Private study suggestions — not AI':
  'Original source-grounded companion teaching — not generative AI';
 reply.append(make('p',type+' · No grades or mastery awarded.','small'));
 if(record.sourceTitles?.length){
  const label=make('p','Relevant original study topics: ','small');
  label.append(make('strong',record.sourceTitles.join(' · ')));reply.append(label);
 }
 // Topic-to-Lab suggestions remain ungraded and are drawn only from the
 // original 30-skill crosswalk; they are NOT assessment evidence.
 const matching=relatedGuides(record);
 if(matching.length){
  const study=make('div',undefined,'tutor-actions');
  for(const g of matching){
   const a=make('a','Study '+g.title,'btn secondary');
   a.href='skills.html#guide-'+encodeURIComponent(g.code);study.append(a);
   const related=TUTOR.competencyMap?.bySkill?.[g.code]?.[0];
   if(related){
    const lab=make('a','Find related Lab','btn secondary');
    lab.href='labs.html?q='+encodeURIComponent(related);study.append(lab);
   }
  }
  reply.append(study);
 }
 const actions=make('div',undefined,'tutor-actions');
 actions.append(btn('Continue this topic',()=>{
  TUTOR.lastTopic=record.sourceTitles?.[0]||record.question.slice(0,70);
  $('tutor-question').value='Follow-up on '+TUTOR.lastTopic+': ';
  updateCount();$('tutor-question').focus();window.scrollTo({top:0,behavior:'smooth'});
 }));
 if(record.mode==='question'){
  actions.append(btn('Type and submit my answer',()=>{
   $('tutor-mode').value='review';
   $('tutor-question').value=('Review my answer to: '+record.question).slice(0,450);
   updateCount();$('tutor-reflection').focus();window.scrollTo({top:0,behavior:'smooth'});
  }));
 }
 actions.append(btn('Copy response',async()=>{
  try{await navigator.clipboard.writeText(record.answer);status('Response copied.')}catch{status('Copy unavailable; select the response text instead.')}
 }));
 if(record.id)actions.append(btn('Delete saved exchange',()=>deleteOne(record)));
 reply.append(actions);li.append(reply);return li;
}
function renderConversation(){
 const host=$('tutor-thread');host.replaceChildren();
 for(const rec of TUTOR.entries)host.append(detailsOf(rec));
 $('tutor-export').disabled=!TUTOR.entries.length;
 $('tutor-followup').disabled=!TUTOR.entries.length;
 $('tutor-session-note').textContent=TUTOR.entries.length+' exchange(s) displayed. '+sessionMessage();
}
function addRecord(record){
 TUTOR.entries.push(record);renderConversation();
 $('tutor-thread').lastElementChild?.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function previewRecord(record){
 const exists=TUTOR.entries.findIndex(x=>x.requestId===record.requestId);
 if(exists===-1)TUTOR.entries.push(record);
 else TUTOR.entries[exists]=record;
 renderConversation();
}
function normalizeSaved(x){
 return {requestId:String(x.id),id:String(x.id),question:String(x.question||''),
 learnerAnswer:String(x.learner_answer||''),mode:String(x.mode||'explain'),
 answer:String(x.answer||''),generation:String(x.generation||'reviewed-glossary-logic'),
 sourceTitles:Array.isArray(x.source_titles)?x.source_titles:[],
 createdAt:x.created_at||new Date().toISOString()};
}
async function privateApi(path,method='GET',body,headers={}){
 const access=await token();if(!access)throw Object.assign(new Error('Sign in to manage saved Tutor exchanges.'),{status:401});
 const init={method,cache:'no-store',headers:{authorization:'Bearer '+access,...headers}};
 if(body!==undefined){init.headers['content-type']='application/json';init.body=JSON.stringify(body)}
 const response=await fetch('/api/member-tutor-history-v014102'+path,init);
 const data=await response.json().catch(()=>null);
 if(!response.ok||data?.ok!==true)throw Object.assign(
  new Error(response.status===503?'Private history storage is not installed or temporarily unavailable.':data?.error||'History request failed.'),
  {status:response.status});
 return data;
}
async function loadHistory(){
 const requestedUser=TUTOR.user?.id||null;
 if(!TUTOR.user){historyStatus('Sign in to access saved Tutor exchanges. Public glossary answers stay on this page only.');return}
 try{
  const data=await privateApi('');
  if(TUTOR.user?.id!==requestedUser)return;
  TUTOR.serverHistory=true;
  const prior=data.history.map(normalizeSaved).reverse();
  const known=new Set(prior.map(x=>x.id));
  TUTOR.entries=[...prior,...TUTOR.entries.filter(x=>!x.id||!known.has(x.id))];
  renderConversation();
  historyStatus(prior.length+' previously saved exchange(s) loaded from your private member history (up to 200).');
 }catch(e){
  TUTOR.serverHistory=false;
  historyStatus(e.message+' Your current-page conversation still works. No assessment data was changed.');
 }
}
async function saveRecord(rec){
 if(!TUTOR.user)return;
 try{
  const x=await privateApi('', 'POST', {
   requestId:rec.requestId,question:rec.question,learnerAnswer:rec.learnerAnswer,
   mode:rec.mode,answer:rec.answer,generation:rec.generation,sourceTitles:rec.sourceTitles
  });
  rec.id=x.id;renderConversation();
  historyStatus('Response saved to your private Tutor exchange history. It is not a graded attempt.');
 }catch(e){historyStatus('This exchange is available only in the current page: '+e.message)}
}
async function deleteOne(rec){
 if(!rec.id){TUTOR.entries=TUTOR.entries.filter(x=>x!==rec);renderConversation();return}
 if(!confirm('Permanently delete this saved Tutor exchange? This cannot be undone.'))return;
 try{
  await privateApi('?id='+encodeURIComponent(rec.id),'DELETE');
  TUTOR.entries=TUTOR.entries.filter(x=>x!==rec);renderConversation();historyStatus('Saved Tutor exchange deleted.');
 }catch(e){historyStatus('The saved exchange was not deleted: '+e.message)}
}
async function deleteAll(){
 if(!TUTOR.user){historyStatus('No private history is available without sign-in.');return}
 if(!confirm('Delete ALL of your saved Tutor exchanges on the server? This is permanent and does not affect Lab grades or Journal records.'))return;
 try{
  await privateApi('?all=true','DELETE',undefined,{'x-confirm-delete':'DELETE_MY_TUTOR_HISTORY'});
  TUTOR.entries=TUTOR.entries.filter(x=>!x.id);
  renderConversation();historyStatus('All saved Tutor exchanges permanently deleted. Local-only exchanges remain visible.');
 }catch(e){historyStatus('Server history was not deleted: '+e.message)}
}
function exportConversation(){
 if(!TUTOR.entries.length)return;
 const exportRows=TUTOR.entries.map(({createdAt,question,learnerAnswer,mode,answer,generation,sourceTitles})=>({
  date:createdAt,question,learnerReasoning:learnerAnswer,mode,answer,generation,sourceTitles,graded:false
 }));
 const blob=new Blob([JSON.stringify({kind:'ungraded_member_tutor_copy',exportedAt:new Date().toISOString(),exchanges:exportRows},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='market-tutor-ungraded-exchanges.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function updateCount(){$('tutor-question-count').textContent=String($('tutor-question').value.length)+' / 450'}
function localExplanation(q){
 const tokens=String(q).toLowerCase().match(/[a-z0-9]+/g)||[];
 const ranked=TUTOR.index.map(t=>{
  const title=String(t.title||'').toLowerCase(),aliases=(t.aliases||[]).join(' ').toLowerCase(),
   summary=String(t.summary||'').toLowerCase();
  const value=tokens.reduce((n,k)=>n+((k.length>2&&title.includes(k))?6:0)+((k.length>2&&aliases.includes(k))?4:0)+((k.length>3&&summary.includes(k))?1:0),0);
  return {t,value};
 }).filter(x=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,2);
 if(!ranked.length)return {answer:'No matching public companion topic was found. Search the Lab Registry, or sign in to ask the member Tutor.',generation:'public-companion-glossary',sources:[]};
 return {answer:ranked.map(x=>x.t.title+': '+x.t.summary).join('\n\n')+
 '\n\nThese are static public glossary explanations, not generated AI or reviewed assessments.',
 generation:'public-companion-glossary',sources:ranked.map(x=>({title:x.t.title,practiceUrl:'labs.html?q='+encodeURIComponent(x.t.labQuery||x.t.title)}))};
}
function summarizePractice(data){
 const parts=[String(data.answer||'')];
 if(data.mode==='practice'){
  const grades=Array.isArray(data.gradedReview)?data.gradedReview.slice(0,5):[];
  const suggested=Array.isArray(data.recommendations)?data.recommendations.slice(0,5):[];
  if(grades.length)parts.push('Recorded lessons to revisit (not a skill certification):\n'+
   grades.map(x=>String(x.labId)+' — latest reviewed conceptual score '+Number(x.latestRecordedScore)+'%').join('\n'));
  if(suggested.length)parts.push('Self-tagged review priorities:\n'+suggested.map(x=>String(x.topic)+' — '+Number(x.mentions)+' mention(s)').join('\n'));
 }
 return parts.filter(Boolean).join('\n\n');
}
async function memberExplanation(q,mode,learnerAnswer){
 const access=await token();
 if(!access)throw Object.assign(new Error('Your member session expired. Please sign in again.'),{status:401});
 const response=await fetch('/api/market-tutor-v01492',{method:'POST',cache:'no-store',
  headers:{authorization:'Bearer '+access,'content-type':'application/json'},
  body:JSON.stringify({question:q,mode,learnerAnswer,requestId:TUTOR.activeRequestId,allowModel:$('tutor-ai-consent')?.checked===true})});
 const data=await response.json().catch(()=>null);
 if(!response.ok||data?.ok!==true){
  throw Object.assign(new Error(response.status===403?'Market Tutor access is not included with the current account. Review memberships or individual Tutor access.':
   response.status===401?'Your session expired; sign in again.':'Tutor could not produce an answer. Your question was not submitted or saved.'),
  {status:response.status});
 }
 if(typeof data.answer!=='string'||!data.answer)return null;
 return {answer:summarizePractice(data),generation:String(data.generation||'reviewed-glossary-logic'),
  sources:Array.isArray(data.sources)?data.sources:[],aiReason:data.aiReason||null,remainingAiToday:data.remainingAiToday};
}
async function ask(){
 if(TUTOR.busy)return;
 const q=$('tutor-question').value.trim(),learnerAnswer=$('tutor-reflection').value.trim(),chosen=$('tutor-mode').value;
 // Practice suggestions must use actual member history, not general glossary guesses.
 const mode=chosen==='practice'||(/what should i practice|what do i need to practice|weakest|my mistakes/i.test(q)&&chosen==='explain')?'practice':chosen;
 if(q.length<4||q.length>450){status('Enter a question between 4 and 450 characters.','error');$('tutor-question').focus();return}
 if(mode==='review'&&!learnerAnswer){status('Type your reasoning before asking the Tutor to review it.','error');$('tutor-reflection').focus();return}
 if(learnerAnswer.length>1800){status('Your reasoning must be 1,800 characters or fewer.','error');return}
 if(!TUTOR.user&&mode!=='explain'&&mode!=='question'){status('Sign in to use private review and practice recommendations.','error');return}
 const submittingUser=TUTOR.user?.id||null;
 TUTOR.activeRequestId=crypto.randomUUID();
 TUTOR.busy=true;$('tutor-ask').disabled=true;status('Preparing a source-grounded educational response…');
 try{
  const data=TUTOR.user?await memberExplanation(q,mode,learnerAnswer):localExplanation(q);
  if(!data){throw Error('No approved teaching response was returned.')}
  if(TUTOR.user?.id!==submittingUser)throw Error('Your signed-in account changed; the prior response was discarded to protect privacy.');
  const rec={requestId:TUTOR.activeRequestId,question:q,learnerAnswer,mode,
   answer:data.answer,generation:data.generation,sourceTitles:sourceTitles(data.sources),
   createdAt:new Date().toISOString(),id:null};
  addRecord(rec);
  TUTOR.lastTopic=rec.sourceTitles[0]||q.slice(0,70);
  $('tutor-question').value='';$('tutor-reflection').value='';updateCount();
  const why=data.aiReason==='daily_limit_reached'?'Your daily paid AI request quota is exhausted.':
  data.aiReason==='service_capacity_reached'?'The platform-wide AI request limit was reached.':
  data.aiReason==='model_temporarily_unavailable'?'Model inference is not configured or its private meter is unavailable.':
  data.aiReason==='provider_failed'?'The model provider could not return a validated cited explanation.':
  data.aiReason==='duplicate_request'?'This AI request was already processed.':'';
  status('Response displayed. '+(data.generation==='grounded-model-draft'?'First-party AI educational draft; verify its original sources.':'No paid provider result was used. ')+why,'success');
  if(TUTOR.user&&$('tutor-ai-consent')?.checked)void refreshAiServiceStatus();
  if(TUTOR.user&&$('tutor-save-history')?.checked===true)await saveRecord(rec);
  else historyStatus('This response stays on the current page only; account history was not updated.');
 }catch(e){
  status(e.message+(e.status===403?' Visit the Membership page to review access.':''),'error');
 }finally{TUTOR.busy=false;$('tutor-ask').disabled=false}
}
async function refreshAiServiceStatus(){
 const host=$('tutor-ai-availability'),count=$('tutor-ai-remaining'),toggle=$('tutor-ai-consent');
 if(!host||!count||!toggle)return;
 if(!TUTOR.user){
  host.textContent='Sign in to view paid AI eligibility.';
  count.textContent='Public companion-glossary help remains available.';
  toggle.disabled=true;toggle.checked=false;return;
 }
 try{
  const access=await token();if(!access)throw Error('Session unavailable');
  const response=await fetch('/api/member-ai-service-v014103',{method:'GET',cache:'no-store',headers:{authorization:'Bearer '+access}});
  const x=await response.json().catch(()=>null);
  if(!response.ok||!x?.ok)throw Error('AI status cannot be verified');
  toggle.disabled=x.authorized!==true||x.enabled!==true||x.remainingToday===0;
  if(toggle.disabled)toggle.checked=false;
  if(x.authorized!==true){
   host.textContent='Paid Market Tutor access is not active on this account.';
   count.textContent='View the Market Tutor product or Full Platform membership to get eligible access.';
  }else if(!x.enabled){
   host.textContent='Your Tutor entitlement is active. Paid model inference is not available yet.';
   count.textContent=x.reason||'Our original source-grounded educational assistance remains available.';
  }else{
   host.textContent='First-party AI Tutor is ready for educational requests.';
   count.textContent=x.remainingToday+' of '+x.memberDailyLimit+' paid AI request(s) available today (UTC). Your normal course tutor remains accessible.';
  }
 }catch{
  toggle.checked=false;toggle.disabled=true;
  host.textContent='Paid AI availability could not be verified; no paid provider requests will be made.';
  count.textContent='Original source-grounded lessons are still available.';
 }
}
async function initTutor(){
 $('tutor-ask').addEventListener('click',ask);
 $('tutor-question').addEventListener('input',updateCount);
 $('tutor-question').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();void ask()}});
 $('tutor-reflection').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();void ask()}});
 $('tutor-mode').addEventListener('change',()=>{if($('tutor-mode').value==='review')$('tutor-reflection').focus()});
 $('tutor-followup').addEventListener('click',()=>{
  if(!TUTOR.entries.length)return;
  const last=TUTOR.entries.at(-1),topic=last.sourceTitles?.[0]||last.question.slice(0,80);
  $('tutor-question').value=('Follow-up on '+topic+': ').slice(0,450);
  updateCount();$('tutor-question').focus();
 });
 $('tutor-export').addEventListener('click',exportConversation);
 $('tutor-clear-view').addEventListener('click',()=>{
  TUTOR.entries=[];renderConversation();status('Displayed conversation cleared. Previously saved notes remain on the server unless deleted.');
 });
 $('tutor-load-history').addEventListener('click',loadHistory);
 $('tutor-delete-history').addEventListener('click',deleteAll);
 document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>{
  $('tutor-question').value=b.dataset.q||'';updateCount();void ask();
 }));
 const query=new URLSearchParams(location.search).get('q');
 if(query)$('tutor-question').value=query.slice(0,450);
 updateCount();
 TUTOR.index=await fetch('data/tutor-index.json',{cache:'no-store'}).then(r=>r.ok?r.json():[]).catch(()=>[]);
 const guidesAndMap=await Promise.all([
  fetch('/data/competency-study-guides-v01499.json',{cache:'force-cache'}).then(r=>r.ok?r.json():null).catch(()=>null),
  fetch('/data/competency-lab-paths-v01499.json',{cache:'force-cache'}).then(r=>r.ok?r.json():null).catch(()=>null)
 ]);
 if(guidesAndMap[0]?.guides?.length===30&&guidesAndMap[1]?.totalCanonicalLabs===419){
  TUTOR.guides=guidesAndMap[0].guides;TUTOR.competencyMap=guidesAndMap[1];
 }
 try{
  TUTOR.sb=await window.getSupabaseClient();
  const {data:{user}}=await TUTOR.sb.auth.getUser();TUTOR.user=user||null;
  TUTOR.sb.auth.onAuthStateChange((event,session)=>{
   const oldId=TUTOR.user?.id||null,newId=session?.user?.id||null;
   if(event==='SIGNED_OUT'||(oldId&&newId&&oldId!==newId)){
    TUTOR.entries=[];TUTOR.user=null;TUTOR.serverHistory=false;
    renderConversation();void refreshAiServiceStatus();historyStatus('Your account changed; private notes were cleared from this page.');
    status('Sign in to open your own saved Tutor history.');
   }
   if(event==='SIGNED_IN'&&newId!==TUTOR.user?.id){
    TUTOR.user=session.user;void loadHistory();void refreshAiServiceStatus();
   }
  });
 }catch{TUTOR.user=null}
 renderConversation();
 await Promise.all([loadHistory(),refreshAiServiceStatus()]);
 if(query&&TUTOR.user){$('tutor-question').focus();status('The linked question is ready for you to submit.');}
 else if(query){status('The linked public glossary question is ready to submit.');}
 else status(TUTOR.user?'Member Tutor ready. Submit a question to begin.':'Public glossary ready. Sign in to access member teaching.');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initTutor,{once:true});
else void initTutor();
