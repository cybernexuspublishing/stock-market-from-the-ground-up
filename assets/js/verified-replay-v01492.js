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
 const isRead=action==='current';
 const u=isRead?endpoint+'&sessionId='+encodeURIComponent(sessionId):endpoint;
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
 finally{busy=false;$('vr-start').disabled=false;$('vr-lock').disabled=locked;renderState()}
}
function orderPlan(){
 const side=$('vr-side').value;if(!side)return null;
 const type=$('vr-type').value,quantity=Number($('vr-quantity').value),price=Number($('vr-limit').value);
 const plan={side,type,quantity,slippageBps:0,spreadBps:0,fees:0};
 if(type==='LIMIT')plan.limitPrice=price;
 if(type==='STOP')plan.stopPrice=price;
 return plan;
}
async function start(){
 const code=$('vr-code').value.trim().toUpperCase();
 if(!/^[A-Z][A-Z0-9_-]{2,79}$/.test(code))throw Error('Enter an Owner-published dataset code.');
 const r=await api('start',{datasetCode:code});
 sessionId=r.sessionId;cursor=r.currentIndex;locked=false;
 $('vr-bars').innerHTML='';addBar(r.bar);
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
 const r=await api('finish');locked=false;notice(r.notice);
 sessionId='';$('vr-session').hidden=true;
}
async function init(){
 try{sb=await window.getSupabaseClient();if(!sb)throw Error('Authentication client unavailable.');
  const u=(await sb.auth.getUser()).data?.user;
  notice(u?'Enter a published dataset code to start.':'Sign in before using the replay tool.',!u);}
 catch(e){notice(e.message,true)}
 $('vr-start').addEventListener('click',()=>call(start));
 $('vr-lock').addEventListener('click',()=>call(lock));
 $('vr-advance').addEventListener('click',()=>call(advance));
 $('vr-finish').addEventListener('click',()=>call(finish));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
