/* Ungraded Lab spaced retrieval, integrated into the existing Skills Record.
 * Uses Supabase Auth, per-user RLS, and the same 1/7/30-day cadence as Journal
 * process review. No grader, AI, hidden replay bars or premium credit involved.
 */
(function(root){
'use strict';
const host=()=>document.getElementById('lab-concept-review');
let epoch=0,userId=null,sb=null,byLab={},guides={};
const text=(tag,content,className)=>{
 const e=document.createElement(tag);e.textContent=String(content??'');
 if(className)e.className=className;
 return e;
};
function reference(labId){
 const row=byLab[labId]||{},code=(row.relatedCompetencies||[])[0];
 return {title:row.title&&row.title!==labId?row.title:'Lab '+labId,
  guide:guides[code]||null,code:code||''};
}
function prompt(row){
 const r=reference(row.lab_id),subject=r.title;
 switch(row.review_stage){
 case '1D':return 'Without reopening the lesson, explain '+subject+
  ' in your own words. State two facts you would check and one limitation.';
 case '7D':return 'Different fictional case: apply '+subject+
  ' to an unfamiliar observation. What evidence must be available before the decision, what remains uncertain, and when would you choose NO TRADE?';
 default:return 'Independent transfer: a month after learning '+subject+
  ', describe the method you would use to verify your observation, the condition that would invalidate it, and one possible mistake. Do not use unseen future bars.';
 }
}
function card(row,context){
 const info=reference(row.lab_id),due=new Date(row.due_at);
 const item=text('article','','card gu-lab-recall-item'),title=text('h3',info.title);
 const meta=text('p',row.review_stage+' review · '+due.toLocaleDateString()+' · '+row.lab_id,'small');
 item.append(title,meta);
 const guideLink=text('a','Review the original concept guide');
 guideLink.href=info.code?'skills.html#guide-'+encodeURIComponent(info.code):
   'labs.html?open='+encodeURIComponent(row.lab_id);
 if(row.completed_at){
  item.append(text('p','Recall response saved · ungraded; no mastery or official Lab credit','small'),guideLink);
  return item;
 }
 const dueNow=due.getTime()<=Date.now();
 if(!dueNow){item.append(text('p','Upcoming — recall prompt stays locked until the scheduled review date.','small'));return item}
 const question=text('p',prompt(row));
 const label=text('label','Your independent recall response');
 const answer=document.createElement('textarea');
 answer.rows=4;answer.minLength=30;answer.maxLength=1500;
 answer.placeholder='Explain your reasoning and what evidence would change your conclusion.';
 label.append(answer);
 const status=text('p','','small');status.setAttribute('role','status');
 const submit=text('button','Save ungraded recall','btn secondary');submit.type='button';
 submit.addEventListener('click',async()=>{
  if(answer.value.trim().length<30){
   status.textContent='Explain your reasoning in at least 30 characters; your answer will not be graded.';return;
  }
  const thisEpoch=epoch;
  submit.disabled=true;status.textContent='Saving to your private learning record…';
  try{
   const session=(await sb.auth.getSession())?.data?.session;
   if(!session?.access_token||session.user.id!==userId)throw Error('Account session changed');
   const {data,error}=await sb.rpc('gu_lab_concept_review_complete_v014',{
    p_lab_id:row.lab_id,p_stage:row.review_stage,p_note:answer.value.trim()
   });
   if(thisEpoch!==epoch||session.user.id!==userId)return;
   if(error||data!==true)throw Error('Review was not accepted');
   answer.value='';label.hidden=true;submit.hidden=true;
   status.textContent='Recall saved as ungraded evidence. Compare your reasoning with the original concept guide.';
   item.append(guideLink);
  }catch{
   if(thisEpoch===epoch)status.textContent='Private recall could not be saved. Your review remains due. Retry when the service is available.';
  }finally{if(thisEpoch===epoch)submit.disabled=false;}
 });
 item.append(question,label,submit,status);
 return item;
}
function draw(rows,verified){
 const target=host();if(!target)return;
 target.replaceChildren(text('h2','Lab concept spaced reviews'));
 target.append(text('p','Recall each concept after 1, 7 and 30 days. These are independent reflections, not graded assessments, certificates or trading recommendations.'));
 if(!verified){target.append(text('p','Your private review records are temporarily unavailable; completion is not assumed.'));return;}
 if(!rows.length){
  target.append(text('p','No Lab recall reviews scheduled yet. Complete the Guided learning stages of an entitled Lab, then choose “Schedule my three recall reviews” in Results.'));
  return;
 }
 const current=Date.now();
 const due=rows.filter(x=>!x.completed_at&&new Date(x.due_at).getTime()<=current);
 const upcoming=rows.filter(x=>!x.completed_at&&new Date(x.due_at).getTime()>current);
 const done=rows.filter(x=>!!x.completed_at);
 target.append(text('p',due.length+' due · '+upcoming.length+' upcoming · '+done.length+' completed (ungraded)','small'));
 for(const [heading,items,limit] of [['Due for recall',due,30],['Upcoming',upcoming,12],['Completed',done,8]]){
  const section=text('section','','gu-lab-recall-section');section.append(text('h3',heading));
  if(!items.length)section.append(text('p','No '+heading.toLowerCase()+' items.'));
  else for(const entry of items.slice(0,limit))section.append(card(entry));
  if(items.length>limit)section.append(text('p','Showing '+limit+' of '+items.length+' records; earlier due dates are shown first.','small'));
  target.append(section);
 }
}
async function init(){
 const target=host();if(!target)return;
 target.replaceChildren(text('p','Loading your private Lab recall schedule…'));
 const thisEpoch=++epoch;
 try{
  sb=await root.getSupabaseClient();
  const {data:{user}}=await sb.auth.getUser();
  if(thisEpoch!==epoch)return;
  if(!user){draw([],false);return}
  userId=user.id;
  sb.auth.onAuthStateChange((_ev,session)=>{
   if((session?.user?.id||null)===userId)return;
   ++epoch;userId=null;target.replaceChildren(text('p','Your account changed. Reload to see your own review records.'));
  });
  const [records,labMap,guideMap]=await Promise.all([
   sb.from('lab_concept_reviews_v014')
    .select('lab_id,review_stage,due_at,completed_at').eq('user_id',userId)
    .order('due_at',{ascending:true}).limit(1000),
   fetch('/data/competency-lab-paths-v01499.json',{cache:'force-cache'}).then(r=>r.ok?r.json():null),
   fetch('/data/competency-study-guides-v01499.json',{cache:'force-cache'}).then(r=>r.ok?r.json():null)
  ]);
  if(thisEpoch!==epoch)return;
  byLab=labMap?.byLab||{};
  guides=Object.fromEntries((guideMap?.guides||[]).map(x=>[x.code,x]));
  draw(records.data||[],!records.error);
 }catch{if(thisEpoch===epoch)draw([],false)}
}
document.addEventListener('DOMContentLoaded',init);
root.GroundUpLabConceptRecall=Object.freeze({prompt});
})(window);
