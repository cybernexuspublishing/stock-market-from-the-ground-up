/* Learning Engine v3.3 — member-facing recorded grading display.
 * Reads only the existing authenticated, user-scoped progress endpoint.
 * No client-side rubric, grade estimate, invented mastery or credit mutation.
 */
(function(root){
'use strict';
const sessions=new WeakMap();
const dimensions=[['knowledge','Knowledge'],['recognition','Recognition'],['decision','Decision-making'],['process','Process']];
const validScore=value=>Number.isInteger(value)&&value>=0&&value<=100;
function elem(tag,content,className){
 const node=document.createElement(tag);
 if(content!==undefined)node.textContent=String(content);
 if(className)node.className=className;
 return node;
}
function explain(target,message){
 target.replaceChildren(elem('p',message,'gu-v33-grade-status'));
}
function rowFor(row){
 return row&&validScore(row.score)&&typeof row.labId==='string'&&
 Number.isFinite(Date.parse(String(row.completedAt||'')));
}
function scoreBar(score,label){
 const wrap=elem('div',undefined,'gu-v33-grade-meter');
 wrap.setAttribute('role','progressbar');
 wrap.setAttribute('aria-label',label);
 wrap.setAttribute('aria-valuemin','0');wrap.setAttribute('aria-valuemax','100');
 wrap.setAttribute('aria-valuenow',String(score));
 const fill=elem('span',undefined,'gu-v33-grade-fill');
 fill.style.width=score+'%';wrap.append(fill);return wrap;
}
function draw(target,labId,data){
 const recorded=(Array.isArray(data?.latestByLab)?data.latestByLab:[]).find(
  entry=>entry.labId===labId&&rowFor(entry));
 const recent=(Array.isArray(data?.recentCompleted)?data.recentCompleted:[])
  .filter(entry=>entry.labId===labId&&rowFor(entry)).slice(0,8);
 const shell=elem('section',undefined,'gu-v33-grade-report');
 shell.setAttribute('aria-label','Recorded assessment score and learning evidence');
 shell.append(elem('h3','Your Recorded Assessment Results'));
 if(recorded){
  const label=elem('p',undefined,'gu-v33-grade-main');
  label.append(elem('strong',recorded.score+'%'),document.createTextNode(' · Latest recorded conceptual assessment'));
  shell.append(label,scoreBar(recorded.score,'Latest server-graded assessment score out of 100'));
  const scale=elem('div',undefined,'gu-v33-grade-ticks');
  for(const tick of [0,25,50,75,100])scale.append(elem('span',tick+'%'));
  shell.append(scale);
  shell.append(elem('p','This is the score from a completed, reviewed conceptual assessment. It is not a probability of profitable trading, a historical replay score, or a competency certification.','gu-v33-grade-explainer'));
 }else{
  shell.append(elem('p','Not Yet Assessed — no eligible completed server-graded assessment is recorded for this Lab.','gu-v33-grade-status'));
 }
 shell.append(elem('h4','Four evidence dimensions'));
 const grid=elem('div',undefined,'gu-v33-grade-dimensions');
 for(const [key,label] of dimensions){
  const box=elem('div',undefined,'gu-v33-grade-dimension');
  box.setAttribute('data-grade-dimension',key);
  box.append(elem('strong',label),elem('span','Not Yet Assessed'));
  grid.append(box);
 }
 shell.append(grid);
 shell.append(elem('p','A conceptual quiz alone does not independently establish Recognition, Decision-making, Process, or an official Knowledge competency rating. These remain unassessed unless approved, server-recorded dimension evidence is available.','gu-v33-grade-explainer'));
 shell.append(elem('h4','Recent recorded attempts for this Lab'));
 if(recent.length){
  const list=elem('ol',undefined,'gu-v33-grade-history');
  for(const item of recent){
   const li=elem('li');
   const date=new Date(item.completedAt).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
   const label=elem('span',date+' · '+item.mode+' · '+item.score+'%');
   li.append(label,scoreBar(item.score,'Recorded '+date+' score '+item.score+' out of 100'));
   list.append(li);
  }
  shell.append(list);
  shell.append(elem('p','Only the most recent recorded attempts returned by the member-scoped service appear here. Earlier attempts may exist.','gu-v33-grade-explainer'));
 }else shell.append(elem('p','No recent graded attempts available for this Lab.','gu-v33-grade-status'));
 target.replaceChildren(shell);
}
async function mount({labId,target}={}){
 if(!target||!labId||!(/^[A-Za-z0-9_-]{3,90}$/).test(labId))return false;
 const token={};sessions.set(target,token);
 explain(target,'Loading your recorded learning results…');
 try{
  const sb=await root.getSupabaseClient?.();
  const session=(await sb?.auth?.getSession?.())?.data?.session;
  if(!session?.access_token){explain(target,'Sign in to view your recorded assessment results.');return false}
  const reply=await fetch('/api/interactive-training?action=progress',{method:'GET',cache:'no-store',
   headers:{authorization:'Bearer '+session.access_token}});
  const data=await reply.json().catch(()=>null);
  if(sessions.get(target)!==token||!target.isConnected)return false;
  if(!reply.ok||data?.ok!==true){
   explain(target,reply.status===403?'Recorded grading is not available with the current training access.':
    'Recorded grading is temporarily unavailable. No grade or mastery has been inferred.');
   return false;
  }
  if(data.truncated===true){explain(target,'The grade history is incomplete; no summary is displayed.');return false}
  draw(target,labId,data);return true;
 }catch{
  if(sessions.get(target)===token&&target.isConnected)
   explain(target,'Recorded grading is temporarily unavailable. No grade or mastery has been inferred.');
  return false;
 }
}
root.GroundUpLabV33GradeDisplay=Object.freeze({mount,version:'3.3.2'});
})(globalThis);
