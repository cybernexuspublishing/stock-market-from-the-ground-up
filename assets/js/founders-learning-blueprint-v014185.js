/* v0.14.0.185: show only server-reported first-party competency evidence.
   The 419 Lab-to-competency mappings are all candidate status: this UI never
   claims they are reviewed or that unassessed skills are failures.
*/
(()=>{'use strict';
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e};
async function init(){
 const host=document.getElementById('gu-f600-blueprint-items');if(!host)return;
 try{
  const sb=await window.getSupabaseClient();
  const user=(await sb.auth.getUser()).data?.user;if(!user)return;
  const {data,error}=await sb.rpc('gu_founder_learning_blueprint_v014185');
  if(error||!data?.ok){host.replaceChildren(make('p','Your learning blueprint is unavailable until founder access is verified.'));return}
  const list=Array.isArray(data.recommended)?data.recommended:[];host.replaceChildren();
  for(const item of list){
   const box=make('article',undefined,'gu-f600-blueprint-item');
   box.setAttribute('role','listitem');
   box.append(make('span',item.category||'Learning Skills','gu-f600-eyebrow'),
    make('h3',item.name||'Competency'));
   const n=Math.max(0,Number(item.evidenceCount)||0);
   const passed=Math.max(0,Number(item.passedCount)||0);
   box.append(make('p',n===0?'Not Yet Assessed':n+' evidence record'+(n===1?'':'s')+' · '+passed+' passed indicator'+(passed===1?'':'s')));
   if(item.description)box.append(make('p',String(item.description).slice(0,600),'gu-f600-blueprint-description'));
   const a=make('a','Open Skill Development');a.href='dashboard.html?tab=skills';box.append(a);
   host.append(box);
  }
  if(!list.length)host.append(make('p','No competency recommendations were found. Review Skill Development for your next learning step.'));
  const note=make('p','Suggestions describe recorded educational evidence, not investment signals or guaranteed competency mastery.','gu-f600-blueprint-note');host.append(note);
 }catch{host.replaceChildren(make('p','Your learning evidence could not be loaded.'))}
}
init();
})();