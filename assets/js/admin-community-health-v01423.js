/* v0.14.0.23 — Admin System, read-only Owner community telemetry. */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
let mounted=false;
const create=(tag,txt,cls)=>{const el=document.createElement(tag);if(txt!==undefined)el.textContent=txt;if(cls)el.className=cls;return el};
function mount(){
 if(mounted)return;const host=document.querySelector('.admin-panel[data-admin-panel="system"]');if(!host)return;
 mounted=true;
 const section=create('section',undefined,'admin-card gu-community-health-v01423');section.id='gu-community-health-v01423';
 const title=create('h2','Market Commons Delivery Diagnostics');
 const details=create('p','OWNER-only, read-only database record counts. This does not create notifications, follow discussions, read member content, or certify delivery.');
 const trigger=create('button','Check recorded activity','btn secondary');trigger.type='button';
 const status=create('p','Diagnostics have not been run.','gu-pref-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const list=create('dl');
 const note=create('p','A member-to-member test remains required: opt in, follow, reply, inspect Alerts, opt out, and verify no subsequent notice. New mention alerts also require a reviewed SQL migration.','small');
 section.append(title,details,trigger,status,list,note);host.append(section);
 const labels={discussionFollows:'Active follow records',replyNotificationsRecorded:'Stored reply notifications',
   mentionOptIns:'Members opting in to mentions',mentionNotificationsRecorded:'Stored mention notifications'};
 trigger.addEventListener('click',async()=>{
  trigger.disabled=true;status.textContent='Querying aggregate database records…';list.replaceChildren();
  try{
   const sb=await window.getSupabaseClient(),session=(await sb.auth.getSession()).data?.session;
   if(!session?.access_token)throw Error('Sign in with an OWNER account.');
   const r=await fetch('/api/community-health-v01423',{headers:{authorization:'Bearer '+session.access_token,accept:'application/json'},cache:'no-store'});
   const data=await r.json().catch(()=>({}));if(!r.ok||!data.ok)throw Error(data.error||'Owner community diagnostics unavailable.');
   for(const [key,label] of Object.entries(labels)){
    const metric=data.metrics?.[key],row=create('div',undefined,'gu-community-health-row');
    row.append(create('dt',label),create('dd',metric?.available?String(metric.count):'Unavailable / not installed'));
    list.append(row);
   }
   status.textContent='Database counters checked at '+new Date(data.checkedAt).toLocaleString()+'. Counts do not establish alert delivery.';
  }catch(e){status.textContent=e.message||'Unable to retrieve community diagnostics.'}
  finally{trigger.disabled=false}
 });
}
let attempts=0;
const timer=setInterval(()=>{mount();if(mounted||++attempts>120)clearInterval(timer)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
