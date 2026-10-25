/* Verified Extended Founder 60-day guide; no Lab ID or mastery is fabricated. */
(()=>{'use strict';
const el=id=>document.getElementById(id);
const node=(tag,txt)=>{const x=document.createElement(tag);if(txt!==undefined)x.textContent=String(txt);return x};
async function run(){
 const status=el('f600-path-status'),host=el('f600-path-days');
 try{
  const db=await window.getSupabaseClient();
  const user=(await db.auth.getUser()).data?.user;
  if(!user){location.replace('signin.html?next=%2Ffounder-extended-path.html');return}
  const response=await db.rpc('gu_founder_extended_guided_path_v014213');
  if(response.error||response.data?.ok!==true){
   status.textContent='An eligible Extended Founding membership or qualifying Extended-to-Lifetime upgrade is required.';
   return
  }
  const items=Array.isArray(response.data.days)?response.data.days:[];
  if(items.length!==60){status.textContent='The approved 60-day competency route is not available.';return}
  status.textContent='Your 60 educational sessions are ready. Progress is based on your verified evidence.';
  el('f600-path-content').hidden=false;host.replaceChildren();
  for(let i=0;i<items.length;i+=2){
   const first=items[i],second=items[i+1];
   if(!first||!second||first.competencyCode!==second.competencyCode)continue;
   const card=node('article');card.className='gu-f600-path-group';
   card.append(node('p',first.category||'Learning Competency'),node('h3',first.name));
   const description=node('p',first.description||'Build confident recognition before independent decisions.');
   card.append(description);
   const tasks=node('ol');
   for(const day of [first,second]){
    const row=node('li');
    row.append(node('strong','Day '+day.day+' — '+day.stage));
    row.append(node('p',day.task));
    tasks.append(row);
   }
   card.append(tasks);
   card.append(node('p','Evidence: '+first.evidenceCount+' record(s), '+first.passingEvidenceCount+' passing indicator(s). Status: '+first.assessmentStatus+'.'));
   const open=node('a','Open Skill Development');open.href='dashboard.html?tab=skills';
   card.append(open);host.append(card);
  }
 }catch{status.textContent='The private Extended learning route could not be verified.'}
}
run();
})();