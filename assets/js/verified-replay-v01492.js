/* v0.14.0.92 — server-owned replay client. No local storage, future bars or browser grading. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let sb=null,sessionId='',cursor=0,locked=false,busy=false;
function notice(msg,err=false){$('vr-notice').textContent=msg;$('vr-notice').className='status-message '+(err?'error':'success');}
async function api(action,payload={}){
 const session=(await sb.auth.getSession()).data?.session;
 if(!session?.access_token)throw Error('Sign in to continue.');
 const endpoint='/api/learning-replay-v01492?action='+encodeURIComponent(action);
 const isRead=['current','catalog','resume'].includes(action);
 const u=action==='current'?endpoint+'&sessionId='+encodeURIComponent(sessionId):endpoint;
 const res=await fetch(u,{method:isRead?'GET':'POST',cache:'no-store',headers:{
 authorization:'Bearer '+session.access_token,...(!isRead?{'content-type':'application/json'}:{})},
 body:isRead?undefined:JSON.stringify({...payload,sessionId})});
 const data=await res.json().catch(()=>({}));
 if(!res.ok||!data.ok)throw Error(data.error||'Replay service unavailable.');
 return data;
}
function addBar(b){
 if(!b)return;
 const row=document.createElement('tr');
 row.innerHTML=[b.timestamp,b.open,b.high,b.low,b.close,b.volume].map(v=>'<td>'+esc(v)+'</td>').join('');
 $('vr-bars').append(row);
}
function renderState(){
 $('vr-session').hidden=!sessionId;
 $('vr-id').textContent=sessionId;
 $('vr-index').textContent=String(cursor);
 $('vr-plan').hidden=locked;
 $('vr-advance').disabled=!locked||busy;
 $('vr-finish').disabled=!locked||busy;
}
async function call(fn){
 if(busy)return;
 busy=true;$('vr-start').disabled=true;$('vr-lock').disabled=true;$('vr-advance').disabled=true;
 try{await fn()}catch(e){notice(e.message||'Unexpected replay error.',true)}
 finally{busy=false;$('vr-start').disabled=false;$('vr-lock').disabled=locked;$('vr-refresh').disabled=false;$('vr-resume').disabled=false;renderState()}
}
function orderPlan(){
 const side=$('vr-side').value;if(!side)return null;
 const type=$('vr-type').value,quantity=Number($('vr-quantity').value),price=Number($('vr-limit').value);
 const plan={side,type,quantity,slippageBps:0,spreadBps:0,fees:0};
 if(type==='LIMIT')plan.limitPrice=price;
 if(type==='STOP')plan.stopPrice=price;
 return plan;
}
async function catalog(){
 const data=await api('catalog');
 const rows=Array.isArray(data.datasets)?data.datasets:[];
 const select=$('vr-dataset');select.replaceChildren();
 const first=document.createElement('option');first.value='';first.textContent=rows.length?'Select a published dataset':'No reviewed datasets available';select.append(first);
 for(const d of rows){
  if(!/^[A-Z][A-Z0-9_-]{2,79}$/.test(String(d.code||'')))continue;
  const option=document.createElement('option');option.value=d.code;
  option.textContent=String(d.title||d.code)+' ('+String(d.ticker||'unlisted ticker')+')';
  select.append(option);
 }
 $('vr-dataset-note').textContent=rows.length
  ?rows.length+' dataset(s) available for this release. Historical evidence and member display rights are recorded by the Owner.'
  :'No currently published and rights-cleared datasets. Replay cannot start until appropriate source data is added and verified.';
}
async function resume(){
 $('vr-journal-link').hidden=true;
 const data=await api('resume');
 const r=data.session;
 if(!r){notice(data.notice||'There is no saved replay session.');return}
 sessionId=r.id;cursor=r.currentIndex;locked=r.decisionLocked===true;
 $('vr-bars').replaceChildren();addBar(r.bar);
 $('vr-code').value=r.dataset?.code||'';
 $('vr-source').textContent=[r.dataset?.sourceAttribution,r.dataset?.licenseNotice].filter(Boolean).join(' · ');
 $('vr-execution').hidden=true;
 notice('Session restored at bar '+cursor+'. Prior bars are not re-sent; no unseen observation was revealed.');
 renderState();
}
async function start(){
 $('vr-journal-link').hidden=true;
 const code=String($('vr-dataset').value||$('vr-code').value).trim().toUpperCase();
 if(!/^[A-Z][A-Z0-9_-]{2,79}$/.test(code))throw Error('Enter an Owner-published dataset code.');
 const r=await api('start',{datasetCode:code});
 sessionId=r.sessionId;cursor=r.currentIndex;locked=false;
 $('vr-bars').replaceChildren();$('vr-execution').hidden=true;addBar(r.bar);
 $('vr-source').textContent=r.dataset?.sourceAttribution+' · '+r.dataset?.licenseNotice;
 notice(r.notice);renderState();
}
async function lock(){
 if(!sessionId)throw Error('Start with a verified dataset.');
 const r=await api('lock',{decision:$('vr-decision').value,reasoning:$('vr-reason').value,plan:orderPlan()});
 locked=true;notice(r.notice);renderState();
}
async function advance(){
 const r=await api('advance',{expectedIndex:cursor});
 cursor=r.currentIndex;addBar(r.bar);
 if(r.execution){
  $('vr-execution').hidden=false;
  $('vr-execution').textContent=JSON.stringify(r.execution);
 }
 notice('Bar '+cursor+' revealed. Future data remain server-side.');renderState();
}
async function finish(){
 const r=await api('finish');
 if(!Number.isSafeInteger(r.journalId)||r.journalId<=0)throw Error('Journal linkage not confirmed.');
 locked=false;notice(r.notice);
 const link=$('vr-journal-link');
 link.href='journal-entry.html?id='+encodeURIComponent(String(r.journalId));
 link.textContent='Open linked Trading Journal record #'+r.journalId;
 link.hidden=false;
 sessionId='';$('vr-session').hidden=true;
}
async function init(){
 let u=null;
 try{sb=await window.getSupabaseClient();if(!sb)throw Error('Authentication client unavailable.');
  u=(await sb.auth.getUser()).data?.user;
  notice(u?'Enter a published dataset code to start.':'Sign in before using the replay tool.',!u);}
 catch(e){notice(e.message,true)}
 $('vr-start').addEventListener('click',()=>call(start));
 $('vr-refresh').addEventListener('click',()=>call(catalog));
 $('vr-resume').addEventListener('click',()=>call(resume));
 $('vr-dataset').addEventListener('change',()=>{if($('vr-dataset').value)$('vr-code').value=$('vr-dataset').value});
 if(u){await call(catalog);if(!sessionId)await call(resume)}

 $('vr-lock').addEventListener('click',()=>call(lock));
 $('vr-advance').addEventListener('click',()=>call(advance));
 $('vr-finish').addEventListener('click',()=>call(finish));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
