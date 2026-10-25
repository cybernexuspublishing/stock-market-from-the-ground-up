/* Admin workflow for standard+extended advisory improvement polls. Owner verified by API. */
(()=>{'use strict';
const el=id=>document.getElementById(id),make=(tag,txt)=>{const x=document.createElement(tag);if(txt!==undefined)x.textContent=String(txt);return x};
async function run(){
 const form=el('f600-improvement-form'),host=el('f600-admin-improvement-polls'),notice=el('f600-improvement-status');
 if(!form||!host||!notice)return;
 let sb;try{sb=await window.getSupabaseClient()}catch{return}
 async function api(body){
  const token=(await sb.auth.getSession()).data?.session?.access_token;
  if(!token)throw Error('Owner session required.');
  const options={method:body?'POST':'GET',headers:{authorization:'Bearer '+token}};
  if(body){options.headers['content-type']='application/json';options.body=JSON.stringify(body)}
  const r=await fetch('/api/admin-founder-commons-v014179',options);
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.ok)throw Error(d.error||'Owner operation was not verified.');
  return d;
 }
 async function refresh(){
  const d=await api();host.replaceChildren();
  const rows=Array.isArray(d.improvementPolls)?d.improvementPolls:[];
  if(!rows.length){host.append(make('p','No improvement poll has been created.'));return}
  for(const p of rows){
   const box=make('section');box.className='gu-f600-ballot';
   box.append(make('h3',p.title),make('p','Status: '+p.state));
   const votes=d.improvementVoteCounts?.[p.id]||{};
   box.append(make('p','Votes in current report: '+Object.values(votes).reduce((n,v)=>n+Number(v||0),0)+' (report limited to the first 1,000 vote records across polls)'));
   for(const option of Array.isArray(p.choices)?p.choices:[])box.append(make('p',option+': '+(votes[option]||0)));
   if(p.state==='open'){
    const close=make('button','Close poll');close.className='btn secondary';close.type='button';
    close.onclick=async()=>{close.disabled=true;try{await api({action:'close_improvement_poll',id:p.id});notice.textContent='Poll closed.';await refresh()}catch(e){notice.textContent=e.message;close.disabled=false}};
    box.append(close)
   }
   host.append(box);
  }
 }
 try{await refresh()}catch(e){host.textContent='Owner poll management is unavailable: '+e.message;return}
 form.onsubmit=async event=>{
  event.preventDefault();const data=new FormData(form),save=form.querySelector('button[type=submit]');
  const choices=String(data.get('choices')||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const start=new Date(String(data.get('opensAt')||'')),end=new Date(String(data.get('closesAt')||''));
  if(choices.length<2||choices.length>5||!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start){notice.textContent='Provide 2–5 choices and a valid voting period.';return}
  save.disabled=true;notice.textContent='Opening reviewed community poll…';
  try{
   await api({action:'create_improvement_poll',title:data.get('title'),description:data.get('description'),choices,opensAt:start.toISOString(),closesAt:end.toISOString()});
   notice.textContent='Shared community poll created.';form.reset();await refresh()
  }catch(e){notice.textContent=e.message}
  finally{save.disabled=false}
 };
}
run();
})();