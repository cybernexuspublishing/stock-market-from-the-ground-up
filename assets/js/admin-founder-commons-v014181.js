/* Owner Founders Commons administration; all mutations go through owner-verified API. */
(()=>{'use strict';
const el=id=>document.getElementById(id);
const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n};
const states=['submitted','under_review','accepted','in_development','released','deferred','declined'];
const pretty=s=>String(s||'').replaceAll('_',' ');
let auth;
async function call(body=null){
 const session=(await auth.auth.getSession()).data?.session;
 if(!session?.access_token)throw new Error('An active Owner session is required.');
 const r=await fetch('/api/admin-founder-commons-v014179',{method:body?'POST':'GET',
 headers:{authorization:'Bearer '+session.access_token,...(body?{'content-type':'application/json'}:{})},
 ...(body?{body:JSON.stringify(body)}:{})});
 const result=await r.json().catch(()=>({ok:false,error:'Unexpected response.'}));
 if(!r.ok||!result.ok)throw new Error(result.error||'The operation was not confirmed.');
 return result;
}
function drawBallots(rows,count){
 const host=el('f600-admin-ballots');host.replaceChildren();
 if(!rows.length){host.append(make('p','No official ballot is configured yet.','gu-f600-empty'));return}
 for(const b of rows){
  const item=make('section',undefined,'gu-f600-ballot');
  item.append(make('h3',b.title),make('p','State: '+b.state));
  const results=count?.[b.id]||{},total=Object.values(results).reduce((n,v)=>n+Number(v||0),0);
  item.append(make('p',total+' recorded vote'+(total===1?'':'s')));
  for(const option of Array.isArray(b.choices)?b.choices:[])item.append(make('p',option+': '+(results[option]||0)));
  if(b.state==='open'){
   const close=make('button','Close this ballot','btn secondary');close.type='button';
   close.onclick=async()=>{close.disabled=true;try{await call({action:'close_ballot',id:b.id});el('f600-admin-status').textContent='Ballot closed.';await refresh()}catch(e){el('f600-admin-status').textContent=e.message;close.disabled=false}};
   item.append(close)
  }
  host.append(item);
 }
}
function drawIssues(rows){
 const host=el('f600-admin-issues');host.replaceChildren();
 if(!rows.length){host.append(make('p','No member-submitted bug reports or feature requests yet.','gu-f600-empty'));return}
 for(const issue of rows){
  const card=make('section',undefined,'gu-f600-ballot');
  card.append(make('h3',(issue.issue_kind==='bug'?'Bug report':'Suggestion')+' #'+issue.topic_id));
  const thread=make('a','Read the discussion');thread.href='/market-commons.html?topic='+Number(issue.topic_id);card.append(thread);
  const form=make('form'),label=make('label',' Status '),select=make('select');
  for(const v of states){const opt=make('option',pretty(v));opt.value=v;select.append(opt)}
  select.value=issue.issue_state;label.append(select);form.append(label);
  const noteLabel=make('label',' Staff response '),note=make('textarea');
  note.rows=3;note.maxLength=2000;note.value=issue.staff_response||'';noteLabel.append(note);form.append(noteLabel);
  const submit=make('button','Save reviewed status','btn');submit.type='submit';form.append(submit);
  const message=make('p','');message.setAttribute('role','status');form.append(message);
  form.onsubmit=async e=>{
   e.preventDefault();submit.disabled=true;message.textContent='Recording reviewed decision…';
   try{await call({action:'update_issue',topicId:issue.topic_id,state:select.value,staffResponse:note.value});
    message.textContent='Issue update was saved and added to the history.';}
   catch(err){message.textContent=err.message}
   finally{submit.disabled=false}
  };
  card.append(form);host.append(card);
 }
}
async function refresh(){const r=await call();drawIssues(r.issues||[]);drawBallots(r.ballots||[],r.voteCounts||{});}
async function init(){
 try{
  auth=await window.getSupabaseClient();await refresh();
  el('f600-admin-content').hidden=false;el('f600-admin-status').textContent='Verified Owner management session.';
  el('f600-ballot-form').onsubmit=async e=>{
   e.preventDefault();const form=e.currentTarget,submit=form.querySelector('[type=submit]'),notice=el('f600-ballot-status');
   const x=new FormData(form),choices=String(x.get('choices')||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
   const opens=new Date(String(x.get('opensAt')||'')),closes=new Date(String(x.get('closesAt')||''));
   if(choices.length<2||choices.length>5||!Number.isFinite(opens.getTime())||!Number.isFinite(closes.getTime())||closes<=opens){
    notice.textContent='Provide 2–5 reviewed options and valid voting dates.';return
   }
   submit.disabled=true;notice.textContent='Creating the ballot…';
   try{await call({action:'create_ballot',title:x.get('title'),description:x.get('description'),choices,opensAt:opens.toISOString(),closesAt:closes.toISOString()});
     notice.textContent='Ballot created and recorded.';form.reset();await refresh();}
   catch(err){notice.textContent=err.message}finally{submit.disabled=false}
  };
 }catch(e){el('f600-admin-status').textContent=e.message;el('f600-admin-content').hidden=true}
}
init();
})();