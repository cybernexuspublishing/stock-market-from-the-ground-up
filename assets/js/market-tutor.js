/* v0.14.0.149 — Member Tutor response workspace; legacy member-tutor-history-v014102 remains served through the stable alias.
 * One question -> one user-visible answer, independent of whether paid AI is enabled.
 * Unauthenticated teaching is an explicitly labeled PUBLIC glossary fallback.
 * Persistent history is optional: fail safely to current-page memory until Owner SQL.
 * Never copy user text to localStorage, never award grades, and never render HTML
 * returned by a learner, provider, or database as markup.
 */
const TUTOR={index:[],sb:null,user:null,entries:[],busy:false,saving:false,lastTopic:'',serverHistory:false,guides:[],competencyMap:null,identityEpoch:0,conversations:[],currentConversationId:null,conversationsAvailable:false,abortController:null,lastDraft:null};
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
function guidedLessonFor(record){
 const api=window.TaliaGuidedPracticeV1;
 return api?.findLesson?.([...(Array.isArray(record.sourceCodes)?record.sourceCodes:[]),
  ...(Array.isArray(record.sourceTitles)?record.sourceTitles:[])])||null;
}
function sourceOnlyTeachingPrompt(record){
 const topic=String(record.sourceTitles?.[0]||record.question||'').slice(0,350);
 $('tutor-question').value=('Teach this in more depth: '+topic).slice(0,450);
 $('tutor-mode').value='explain';
 const consent=$('tutor-ai-consent');if(consent)consent.checked=false;
 updateCount();
 status('Deeper source-only instruction prepared. Review the question and submit.');
 $('tutor-question').focus();
 window.scrollTo({top:0,behavior:'smooth'});
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
// No innerHTML or untrusted anchors. Original/model text is always inserted as text.
function tutorInline(node,text){
 const fragments=String(text||'').split(/(\*\*[^*\n]+\*\*|`[^`\n]+`|\\\([^\n]*?\\\))/g);
 for(const fragment of fragments){
  if(!fragment)continue;
  if(fragment.startsWith('**')&&fragment.endsWith('**'))node.append(make('strong',fragment.slice(2,-2)));
  else if(fragment.startsWith('`')&&fragment.endsWith('`'))node.append(make('code',fragment.slice(1,-1)));
  else if(fragment.startsWith('\\(')&&fragment.endsWith('\\)'))node.append(make('code',fragment.slice(2,-2)));
  else node.append(document.createTextNode(fragment));
 }
}
function safeTutorMarkdown(input){
 const wrapper=make('div',undefined,'tutor-response-text');
 const lines=String(input||'').replace(/\r/g,'').split('\n').slice(0,200);
 let i=0;
 while(i<lines.length){
  const line=lines[i];
  if(!line.trim()){i++;continue}
  const title=/^#{1,3}\s+(.+)$/.exec(line);
  if(title){const h=make('h5');tutorInline(h,title[1]);wrapper.append(h);i++;continue}
  if(line.includes('|')&&i+1<lines.length&&/^\s*\|?\s*[-:| ]{3,}\|?\s*$/.test(lines[i+1])){
   const split=v=>v.replace(/^\s*\||\|\s*$/g,'').split('|').map(x=>x.trim()).slice(0,6);
   const cols=split(line);
   if(cols.length>1){
    const table=make('table'),header=make('thead'),tr=make('tr');
    for(const item of cols){const th=make('th');tutorInline(th,item);tr.append(th)}
    header.append(tr);table.append(header);const body=make('tbody');i+=2;
    for(let j=0;j<15&&i<lines.length&&lines[i].includes('|');j++,i++){
     const row=make('tr');for(const item of split(lines[i]).slice(0,cols.length)){
      const td=make('td');tutorInline(td,item);row.append(td)}
     body.append(row);
    }
    table.append(body);wrapper.append(table);continue;
   }
  }
  if(/^\s*(?:[-*]\s+|\d+\.\s+)/.test(line)){
   const ordered=/^\s*\d+\.\s+/.test(line),list=make(ordered?'ol':'ul');
   while(i<lines.length&&/^\s*(?:[-*]\s+|\d+\.\s+)/.test(lines[i])){
    const item=make('li');tutorInline(item,lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/,''));list.append(item);i++;
   }
   wrapper.append(list);continue;
  }
  const p=make('p');tutorInline(p,line);wrapper.append(p);i++;
 }
 return wrapper;
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
 reply.append(make('h4','Tutor response'),safeTutorMarkdown(record.answer));
 const observedType=record.generation.startsWith('verified:')?record.generation.slice(9):record.generation;
 const type=observedType==='grounded-model-draft'?'Optional AI-generated educational draft':
  observedType==='public-companion-glossary'?'Public glossary — not AI':
  observedType==='authenticated-practice-history'?'Private study suggestions — not AI':
  'Original source-grounded companion teaching — not generative AI';
 reply.append(make('p',type+' · '+(record.generation.startsWith('verified:')?'Source: server-produced Tutor response.':'Source: member-copied legacy notes or current session; not independently authenticated.')+' No grades or mastery awarded.','small'));
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
 const guided=guidedLessonFor(record);
 if(guided){
  const learning=make('div',undefined,'tutor-actions');
  learning.append(btn('Open guided example: '+guided.title,()=>{
   if(!window.TaliaGuidedPracticeV1?.openLesson?.(guided.id))
    status('Original lesson unavailable. No score or purchase was changed.','error');
  }));
  reply.append(learning);
 }
 const actions=make('div',undefined,'tutor-actions');
 actions.append(btn('Teach this in more depth (source-only)',()=>sourceOnlyTeachingPrompt(record)));
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
 if(record.id){
  if(record.feedback)actions.append(make('span','Your feedback: '+record.feedback.replaceAll('_',' '),'small'));
  actions.append(btn('Helpful',()=>sendTutorFeedback(record,'helpful')));
  actions.append(btn('Not helpful',()=>sendTutorFeedback(record,'not_helpful')));
  actions.append(btn('Report answer',()=>{
   const region=make('div',undefined,'tutor-feedback-form');
   const label=make('label','Optional issue details (500 characters)');
   const input=make('textarea');input.maxLength=500;input.rows=3;
   label.append(input);
   const send=btn('Submit private report',()=>sendTutorFeedback(record,'report',input.value));
   region.append(label,send);actions.replaceChildren(region);
   input.focus();
  }));
  actions.append(btn('Delete saved exchange',()=>deleteOne(record)));
}
 reply.append(actions);li.append(reply);return li;
}
function displayedExchanges(){
 return TUTOR.currentConversationId?
  TUTOR.entries.filter(x=>x.conversationId===TUTOR.currentConversationId):TUTOR.entries;
}
function renderConversation(){
 const host=$('tutor-thread');host.replaceChildren();
 const shown=displayedExchanges();
 for(const rec of shown)host.append(detailsOf(rec));
 $('tutor-export').disabled=!shown.length;
 $('tutor-followup').disabled=!shown.length;
 $('tutor-session-note').textContent=shown.length+' exchange(s) displayed. '+sessionMessage();
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
 feedback:x.feedback||null,feedbackNote:x.feedback_note||'',
 conversationId:typeof x.conversation_id==='string'?x.conversation_id:null,
 createdAt:x.created_at||new Date().toISOString()};
}
async function privateApi(path,method='GET',body,headers={}){
 const access=await token();if(!access)throw Object.assign(new Error('Sign in to manage saved Tutor exchanges.'),{status:401});
 const init={method,cache:'no-store',headers:{authorization:'Bearer '+access,...headers}};
 if(body!==undefined){init.headers['content-type']='application/json';init.body=JSON.stringify(body)}
 const response=await fetch('/api/member-tutor-history'+path,init);
 const data=await response.json().catch(()=>null);
 if(!response.ok||data?.ok!==true)throw Object.assign(
  new Error(response.status===503?'Private history storage is not installed or temporarily unavailable.':data?.error||'History request failed.'),
  {status:response.status});
 return data;
}
async function loadHistory(){
 const requestedUser=TUTOR.user?.id||null,epoch=TUTOR.identityEpoch;
 if(!TUTOR.user){historyStatus('Sign in to access saved Tutor exchanges. Public glossary answers stay on this page only.');return}
 try{
  const data=await privateApi('');
  if(TUTOR.user?.id!==requestedUser||TUTOR.identityEpoch!==epoch)return;
  TUTOR.serverHistory=true;
  const prior=data.history.map(normalizeSaved).reverse();
  const known=new Set(prior.map(x=>x.id));
  TUTOR.entries=[...prior,...TUTOR.entries.filter(x=>!x.id||!known.has(x.id))];
  renderConversation();
  historyStatus(prior.length+' previously saved exchange(s) loaded from your private member history (up to 200).');
 }catch(e){
  if(TUTOR.identityEpoch!==epoch||TUTOR.user?.id!==requestedUser)return;
  TUTOR.serverHistory=false;
  historyStatus(e.message+' Your current-page conversation still works. No assessment data was changed.');
 }
}
async function sendTutorFeedback(rec,choice,note=''){
 if(!rec.id){historyStatus('Save this response privately before submitting feedback.');return}
 try{
  await privateApi('', 'PATCH',{id:rec.id,feedback:choice,note:note.slice(0,500)});
  rec.feedback=choice;rec.feedbackNote=note.slice(0,500);
  renderConversation();historyStatus('Your private Tutor feedback was submitted; it does not award or change grades.');
 }catch(e){historyStatus('Feedback could not be stored: '+e.message)}
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
 if(!TUTOR.user){historyStatus('Sign in to delete your own saved Tutor notes.');return}
 if(!confirm('Permanently delete ALL saved Tutor exchanges AND named conversations on the server? This cannot be undone. Your Labs and Journal are unaffected.'))return;
 const epoch=TUTOR.identityEpoch,user=TUTOR.user.id;
 try{
  const access=await token();if(!access)throw Error('Your session expired.');
  const response=await fetch('/api/member-tutor-data-delete',{method:'DELETE',cache:'no-store',
   headers:{authorization:'Bearer '+access,'x-confirm-delete':'DELETE_MY_TUTOR_HISTORY'}});
  const data=await response.json().catch(()=>null);
  if(epoch!==TUTOR.identityEpoch||user!==TUTOR.user?.id)return;
  if(!response.ok||data?.ok!==true)throw Error(data?.error||'Deletion could not be confirmed.');
  TUTOR.abortController?.abort();TUTOR.identityEpoch++;
  TUTOR.entries=TUTOR.entries.filter(x=>!x.id);
  TUTOR.conversations=[];TUTOR.currentConversationId=null;
  renderConversationList();renderConversation();
  historyStatus('Deleted '+data.deletedCount+' saved exchanges and '+
   data.deletedConversationCount+' named conversations. Current-page unsaved notes remain in this tab.');
 }catch(e){
  if(epoch===TUTOR.identityEpoch)historyStatus('Your saved data was not confirmed deleted: '+e.message);
 }
}

function exportConversation(){
 if(!TUTOR.entries.length)return;
 const exportRows=displayedExchanges().map(({createdAt,question,learnerAnswer,mode,answer,generation,sourceTitles})=>({
  date:createdAt,question,learnerReasoning:learnerAnswer,mode,answer,generation,sourceTitles,graded:false
 }));
 const blob=new Blob([JSON.stringify({kind:'ungraded_member_tutor_copy',exportedAt:new Date().toISOString(),exchanges:exportRows},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='market-tutor-ungraded-exchanges.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function conversationApi(query='',method='GET',body,extra={}){
 const access=await token();
 if(!access)throw new Error('Sign in to manage private Tutor conversations.');
 const opts={method,cache:'no-store',headers:{authorization:'Bearer '+access,...extra}};
 if(body!==undefined){opts.headers['content-type']='application/json';opts.body=JSON.stringify(body)}
 const res=await fetch('/api/member-tutor-conversations'+query,opts);
 const data=await res.json().catch(()=>null);
 if(!res.ok||data?.ok!==true)throw new Error(data?.error||'Conversation management unavailable.');
 return data;
}
function conversationStatus(message){
 const el=$('tutor-conversation-status');if(el)el.textContent=message;
}
function renderConversationList(){
 const host=$('tutor-conversations-list');if(!host)return;
 host.replaceChildren();
 const selected=TUTOR.currentConversationId;
 const filter=String($('tutor-conversation-search')?.value||'').toLowerCase().trim();
 for(const conv of TUTOR.conversations.filter(x=>String(x.title).toLowerCase().includes(filter))){
  const control=btn(conv.title,()=>selectConversation(conv.id),'btn secondary');
  control.setAttribute('aria-pressed',String(selected===conv.id));
  if(selected===conv.id)control.classList.add('selected');
  host.append(control);
 }
 $('tutor-conversation-rename').disabled=!selected||!TUTOR.conversationsAvailable;
 $('tutor-conversation-delete').disabled=!selected||!TUTOR.conversationsAvailable;
 $('tutor-conversation-new').disabled=!TUTOR.conversationsAvailable;
 $('tutor-conversation-all').setAttribute('aria-pressed',String(!selected));
}
function selectConversation(id){
 TUTOR.currentConversationId=id;
 renderConversationList();renderConversation();
 conversationStatus(id?'Conversation selected. New saved responses will be grouped here.':
  'Showing all your saved and current-page exchanges.');
}
async function refreshConversations(){
 const userId=TUTOR.user?.id||null,epoch=TUTOR.identityEpoch;
 if(!userId){TUTOR.conversationsAvailable=false;TUTOR.conversations=[];TUTOR.currentConversationId=null;
  renderConversationList();conversationStatus('Sign in to organize conversations.');return}
 try{
  const result=await conversationApi();
  if(TUTOR.identityEpoch!==epoch||TUTOR.user?.id!==userId)return;
  TUTOR.conversations=Array.isArray(result.conversations)?result.conversations.slice(0,30):[];
  TUTOR.conversationsAvailable=true;
  if(TUTOR.currentConversationId&&!TUTOR.conversations.some(x=>x.id===TUTOR.currentConversationId))
   TUTOR.currentConversationId=null;
  renderConversationList();renderConversation();
  conversationStatus(TUTOR.conversations.length+' private conversation(s) available (maximum 30).');
 }catch(e){
  if(TUTOR.identityEpoch!==epoch)return;
  TUTOR.conversationsAvailable=false;TUTOR.conversations=[];TUTOR.currentConversationId=null;
  renderConversationList();renderConversation();
  conversationStatus(e.message+' Existing single-page teaching remains available.');
 }
}
async function newConversation(){
 if(!TUTOR.conversationsAvailable)return;
 const title=prompt('Name this private conversation (up to 80 characters):','New learning topic');
 if(title===null)return;
 const clean=title.trim();if(!clean||clean.length>80){conversationStatus('Use a title of 1 to 80 characters.');return}
 const epoch=TUTOR.identityEpoch,user=TUTOR.user?.id;
 try{
  const res=await conversationApi('','POST',{title:clean});
  if(epoch!==TUTOR.identityEpoch||user!==TUTOR.user?.id)return;
  await refreshConversations();
  if(epoch!==TUTOR.identityEpoch)return;
  selectConversation(res.id);
  conversationStatus('Conversation created. Your saved exchanges are private.');
 }catch(e){conversationStatus(e.message)}
}
async function renameConversation(){
 const id=TUTOR.currentConversationId,old=TUTOR.conversations.find(x=>x.id===id);
 if(!id||!old)return;
 const title=prompt('Rename selected conversation:',old.title);
 if(title===null)return;
 const clean=title.trim();if(!clean||clean.length>80){conversationStatus('Use a title of 1 to 80 characters.');return}
 const epoch=TUTOR.identityEpoch,user=TUTOR.user?.id;
 try{
  await conversationApi('?id='+encodeURIComponent(id),'PATCH',{title:clean});
  if(epoch!==TUTOR.identityEpoch||user!==TUTOR.user?.id)return;
  await refreshConversations();conversationStatus('Conversation renamed.');
 }catch(e){conversationStatus(e.message)}
}
async function deleteConversation(){
 const id=TUTOR.currentConversationId;if(!id)return;
 if(!confirm('Delete this conversation? Its saved exchanges will be kept in All exchanges, not deleted.'))return;
 const epoch=TUTOR.identityEpoch,user=TUTOR.user?.id;
 try{
  await conversationApi('?id='+encodeURIComponent(id),'DELETE',undefined,{'x-confirm-delete':'DELETE_TUTOR_CONVERSATION'});
  if(epoch!==TUTOR.identityEpoch||user!==TUTOR.user?.id)return;
  for(const entry of TUTOR.entries)if(entry.conversationId===id)entry.conversationId=null;
  TUTOR.currentConversationId=null;await refreshConversations();renderConversation();
  conversationStatus('Conversation deleted; saved exchanges retained.');
 }catch(e){conversationStatus(e.message)}
}
async function calculateHypotheticalPosition(){
 const show=$('tutor-calc-result');
 if(!TUTOR.user){show.textContent='Sign in to use the member calculator.';return}
 const keys=['equity','risk','entry','stop'];
 const values=keys.map(key=>Number($('tutor-calc-'+key).value));
 if(keys.some((key,i)=>!$('tutor-calc-'+key).value.trim()||!Number.isFinite(values[i]))){
  show.textContent='Enter valid equity, risk, entry and stop values.';return;
 }
 const rawTarget=$('tutor-calc-target').value.trim();
 const target=rawTarget?Number(rawTarget):null;
 if(rawTarget&&!Number.isFinite(target)){show.textContent='Enter a valid optional target.';return}
 const epoch=TUTOR.identityEpoch,uid=TUTOR.user.id;
 try{
  const access=await token();if(!access)throw Error('Session expired.');
  const res=await fetch('/api/tutor-calculator',{method:'POST',cache:'no-store',
   headers:{authorization:'Bearer '+access,'content-type':'application/json'},
   body:JSON.stringify({action:'position',accountEquity:values[0],riskPercent:values[1],
    entry:values[2],stop:values[3],target})});
  const data=await res.json().catch(()=>null);
  if(epoch!==TUTOR.identityEpoch||uid!==TUTOR.user?.id)return;
  if(!res.ok||!data?.ok){
   show.textContent=data?.message||data?.error||'Calculation was not completed.';return;
  }
  const usd=value=>'$'+Number(value).toFixed(2);
  show.textContent='Hypothetical long-only size: '+data.shares+' shares; budget '+
   usd(data.riskBudget)+'; stop-distance risk '+usd(data.actualRisk)+
   '; capital '+usd(data.capitalRequired)+
   (data.targetReward===null?'':'; target reward '+usd(data.targetReward)+
    '; reward/risk '+Number(data.rewardRiskRatio).toFixed(2)+':1')+
   '. '+data.warning;
 }catch(e){if(epoch===TUTOR.identityEpoch)show.textContent=e.message||'Calculation unavailable.'}
}
async function calculateHypotheticalCandle(){
 const show=$('tutor-candle-result');
 if(!TUTOR.user){show.textContent='Sign in to use the Tutor calculator.';return}
 const names=['open','high','low','close'],values=names.map(key=>$('tutor-candle-'+key).value.trim());
 if(values.some(v=>!v||!Number.isFinite(Number(v)))){
  show.textContent='Enter valid numeric open, high, low and close prices.';return;
 }
 const epoch=TUTOR.identityEpoch,uid=TUTOR.user.id;
 show.textContent='Calculating the hypothetical candle…';
 try{
  const access=await token();if(!access)throw Error('Session expired.');
  const valuesByName=Object.fromEntries(names.map((n,i)=>[n,Number(values[i])]));
  const result=await fetch('/api/tutor-calculator',{method:'POST',cache:'no-store',
   headers:{authorization:'Bearer '+access,'content-type':'application/json'},
   body:JSON.stringify({action:'candle',...valuesByName})});
  const data=await result.json().catch(()=>null);
  if(epoch!==TUTOR.identityEpoch||uid!==TUTOR.user?.id)return;
  if(!result.ok||!data?.ok){show.textContent=data?.message||data?.error||'Calculation unavailable.';return}
  const display=v=>Number(v).toLocaleString(undefined,{maximumFractionDigits:6});
  show.textContent='Step 1 — Body: |close − open| = '+display(data.bodySize)+
   '. Step 2 — Full range: high − low = '+display(data.fullRange)+
   '. Step 3 — Body ÷ range × 100 = '+data.bodyPercentOfRange.toFixed(2)+'%. '+
   'This example is '+data.direction+'. '+data.caution;
 }catch(e){
  if(epoch===TUTOR.identityEpoch&&uid===TUTOR.user?.id)show.textContent=e.message||'Calculation unavailable.';
 }
}
async function exportAllTutorData(){
 const epoch=TUTOR.identityEpoch,uid=TUTOR.user?.id;
 if(!uid){historyStatus('Sign in to download your private Tutor notes.');return}
 try{
  const access=await token();if(!access)throw Error('Session unavailable.');
  const response=await fetch('/api/member-tutor-data-export',{
   method:'GET',cache:'no-store',headers:{authorization:'Bearer '+access}});
  if(!response.ok)throw Error('Private export endpoint unavailable.');
  if(TUTOR.identityEpoch!==epoch||TUTOR.user?.id!==uid)return;
  const blob=await response.blob();
  if(blob.size>1500000)throw Error('Export exceeds browser safety limit.');
  if(TUTOR.identityEpoch!==epoch||TUTOR.user?.id!==uid)return;
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download='my-market-tutor-notes.json';anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  historyStatus('Your saved Tutor notes were exported privately.');
 }catch(e){
  if(epoch===TUTOR.identityEpoch)historyStatus('Export unavailable: '+e.message);
 }
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
async function memberExplanation(q,mode,learnerAnswer,conversationId,signal){
 const access=await token();
 if(!access)throw Object.assign(new Error('Your member session expired. Please sign in again.'),{status:401});
 const response=await fetch('/api/market-tutor',{method:'POST',cache:'no-store',signal,
  headers:{authorization:'Bearer '+access,'content-type':'application/json'},
  body:JSON.stringify({question:q,mode,learnerAnswer,requestId:TUTOR.activeRequestId,allowModel:$('tutor-ai-consent')?.checked===true,saveHistory:$('tutor-save-history')?.checked===true,conversationId})});
 const data=await response.json().catch(()=>null);
 if(!response.ok||data?.ok!==true){
  throw Object.assign(new Error(response.status===403?'Market Tutor access is not included with the current account. Review memberships or individual Tutor access.':
   response.status===401?'Your session expired; sign in again.':'Tutor could not produce an answer. Your question was not submitted or saved.'),
  {status:response.status});
 }
 if(typeof data.answer!=='string'||!data.answer)return null;
 return {answer:summarizePractice(data),generation:String(data.generation||'reviewed-glossary-logic'),
  sources:Array.isArray(data.sources)?data.sources:[],aiReason:data.aiReason||null,remainingAiToday:data.remainingAiToday,historySaved:data.historySaved===true,historyId:data.historyId||null,
  conversationLinked:data.conversationLinked===true};
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
 const submittingUser=TUTOR.user?.id||null,submittingEpoch=TUTOR.identityEpoch;
 const submittedConversationId=TUTOR.currentConversationId;
 TUTOR.activeRequestId=crypto.randomUUID();
 TUTOR.lastDraft={question:q,learnerAnswer,mode:chosen};
 TUTOR.abortController=new AbortController();
 TUTOR.busy=true;$('tutor-ask').disabled=true;
 $('tutor-stop').disabled=false;$('tutor-retry').disabled=true;
 status('Preparing a source-grounded educational response…');
 try{
  const data=TUTOR.user?await memberExplanation(q,mode,learnerAnswer,submittedConversationId,TUTOR.abortController.signal):localExplanation(q);
  if(TUTOR.abortController?.signal.aborted)throw Error('The browser stopped waiting for this response.');
  if(!data){throw Error('No approved teaching response was returned.')}
  if(TUTOR.user?.id!==submittingUser||TUTOR.identityEpoch!==submittingEpoch)
   throw Error('Your signed-in session changed; the prior response was discarded to protect privacy.');
  const rec={requestId:TUTOR.activeRequestId,question:q,learnerAnswer,mode,
   answer:data.answer,generation:data.generation,sourceTitles:sourceTitles(data.sources),
   sourceCodes:(Array.isArray(data.sources)?data.sources:[]).slice(0,3)
    .map(x=>String(x?.id||'')).filter(x=>/^(STUDY_[A-Z0-9_]{3,80}|REPLAY_EVENT_CREX_2020_04_28)$/.test(x)),
   createdAt:new Date().toISOString(),id:data.historySaved?data.historyId:null,
   conversationId:submittedConversationId||null};
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
  if(TUTOR.user&&$('tutor-save-history')?.checked===true){
   historyStatus(data.historySaved&&submittedConversationId&&!data.conversationLinked?
    'Response saved, but its selected conversation was not confirmed; it will remain Unfiled after refreshing history.':
    data.historySaved?'Tutor response was generated and saved by the authenticated service (ungraded).':
    'The reply is visible here, but private history could not be confirmed; no server save was claimed.');
  }else historyStatus('This response stays on the current page only; account history was not updated.');
 }catch(e){
  status(TUTOR.abortController?.signal.aborted?
   'Stopped waiting in this browser. The server might already have reserved AI capacity; no retry will use a paid provider automatically.':
   e.message+(e.status===403?' Visit the Membership page to review access.':''),'error');
 }finally{
  // Keep the member's Profile preference after each Tutor request.
  TUTOR.abortController=null;TUTOR.busy=false;$('tutor-ask').disabled=false;
  $('tutor-stop').disabled=true;$('tutor-retry').disabled=!TUTOR.lastDraft;
 }
}
async function refreshAiServiceStatus(){
 const host=$('tutor-ai-availability'),count=$('tutor-ai-remaining'),toggle=$('tutor-ai-consent');
 const epoch=TUTOR.identityEpoch,requestedUser=TUTOR.user?.id||null;
 if(!host||!count||!toggle)return;
 if(!TUTOR.user){
  host.textContent='Sign in to view paid AI eligibility.';
  count.textContent='Public companion-glossary help remains available.';
  toggle.disabled=true;toggle.checked=false;return;
 }
 try{
  const access=await token();if(!access)throw Error('Session unavailable');
  const response=await fetch('/api/member-ai-service',{method:'GET',cache:'no-store',headers:{authorization:'Bearer '+access}});
  const x=await response.json().catch(()=>null);
  if(!response.ok||!x?.ok)throw Error('AI status cannot be verified');
  if(TUTOR.identityEpoch!==epoch||TUTOR.user?.id!==requestedUser)return;
  toggle.disabled=x.authorized!==true||x.enabled!==true||x.remainingToday===0||x.globalAvailable===false;
  toggle.checked=!toggle.disabled&&TUTOR.user?.user_metadata?.market_tutor_ai_enabled===true;
  if(x.authorized!==true){
   host.textContent='Paid Market Tutor access is not active on this account.';
   count.textContent='View the Market Tutor product or Full Platform membership to get eligible access.';
  }else if(!x.enabled){
   host.textContent='Your Tutor entitlement is active. Paid model inference is not available yet.';
   count.textContent=x.reason||'Our original source-grounded educational assistance remains available.';
  }else{
   host.textContent='First-party AI Tutor is configured for source-grounded educational requests; provider acceptance remains a separate launch gate.';
   count.textContent=x.remainingToday+' of '+x.memberDailyLimit+' member requests available today (UTC). '+(x.globalAvailable===false?'The site-wide provider quota is exhausted. ':'')+'Course tutoring remains accessible.';
  }
 }catch{
  if(TUTOR.identityEpoch!==epoch||TUTOR.user?.id!==requestedUser)return;
  toggle.checked=false;toggle.disabled=true;
  host.textContent='Paid AI availability could not be verified; no paid provider requests will be made.';
  count.textContent='Original source-grounded lessons are still available.';
 }
}
async function initTutor(){
 window.addEventListener('talia-guided-practice-ready',renderConversation);
 $('tutor-ask').addEventListener('click',ask);
 $('tutor-stop').addEventListener('click',()=>{
  if(TUTOR.abortController&&!TUTOR.abortController.signal.aborted)TUTOR.abortController.abort();
 });
 $('tutor-retry').addEventListener('click',()=>{
  if(!TUTOR.lastDraft||TUTOR.busy)return;
  $('tutor-question').value=TUTOR.lastDraft.question;
  $('tutor-reflection').value=TUTOR.lastDraft.learnerAnswer;
  $('tutor-mode').value=TUTOR.lastDraft.mode;
  updateCount();void ask();
 });
 $('tutor-calc-submit').addEventListener('click',()=>void calculateHypotheticalPosition());
 $('tutor-candle-submit').addEventListener('click',()=>void calculateHypotheticalCandle());
 $('tutor-conversation-new').addEventListener('click',()=>void newConversation());
 $('tutor-conversation-all').addEventListener('click',()=>selectConversation(null));
 $('tutor-conversation-rename').addEventListener('click',()=>void renameConversation());
 $('tutor-conversation-delete').addEventListener('click',()=>void deleteConversation());
 $('tutor-conversation-search').addEventListener('input',renderConversationList);
 $('tutor-question').addEventListener('input',updateCount);
 $('tutor-question').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();void ask()}});
 $('tutor-reflection').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();void ask()}});
 $('tutor-mode').addEventListener('change',()=>{if($('tutor-mode').value==='review')$('tutor-reflection').focus()});
 $('tutor-followup').addEventListener('click',()=>{
  if(!displayedExchanges().length)return;
  const last=displayedExchanges().at(-1),topic=last.sourceTitles?.[0]||last.question.slice(0,80);
  $('tutor-question').value=('Follow-up on '+topic+': ').slice(0,450);
  updateCount();$('tutor-question').focus();
 });
 $('tutor-export').addEventListener('click',exportConversation);
 $('tutor-export-all').addEventListener('click',()=>void exportAllTutorData());
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
    TUTOR.abortController?.abort();TUTOR.lastDraft=null;
    TUTOR.identityEpoch++;TUTOR.entries=[];TUTOR.user=null;TUTOR.serverHistory=false;
    TUTOR.conversations=[];TUTOR.currentConversationId=null;renderConversationList();
    renderConversation();void refreshAiServiceStatus();historyStatus('Your account changed; private notes were cleared from this page.');
    status('Sign in to open your own saved Tutor history.');
   }
   if(event==='USER_UPDATED'&&session?.user?.id===TUTOR.user?.id){TUTOR.user=session.user;void refreshAiServiceStatus();}
   if(event==='SIGNED_IN'&&newId!==TUTOR.user?.id){
    TUTOR.identityEpoch++;TUTOR.user=session.user;
    TUTOR.conversations=[];TUTOR.currentConversationId=null;renderConversationList();
    void loadHistory();void refreshConversations();void refreshAiServiceStatus();
   }
  });
 }catch{TUTOR.user=null}
 renderConversation();
 await Promise.all([loadHistory(),refreshConversations(),refreshAiServiceStatus()]);
 if(query&&TUTOR.user){$('tutor-question').focus();status('The linked question is ready for you to submit.');}
 else if(query){status('The linked public glossary question is ready to submit.');}
 else status(TUTOR.user?'Member Tutor ready. Submit a question to begin.':'Public glossary ready. Sign in to access member teaching.');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initTutor,{once:true});
else void initTutor();
