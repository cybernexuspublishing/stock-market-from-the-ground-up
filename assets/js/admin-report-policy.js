/* v0.14.0.17: integrated Admin Control Center reporting safeguards.
 * Frontend controls do not grant permission. Server + DB enforce Owner-only writes.
 */
(()=>{'use strict';
 const anchor='.admin-panel[data-admin-panel="community"]';
 const styles='/assets/css/admin-report-policy.css';
 const add=(parent,type,text,className)=>{const el=document.createElement(type);if(text!=null)el.textContent=text;if(className)el.className=className;parent.append(el);return el};
 async function call(payload){
   const sb=await window.getSupabaseClient(),{data}=await sb.auth.getSession();
   if(!data?.session?.access_token)throw Error('Sign in to the Admin Control Center to view reporting policies.');
   const r=await fetch('/api/admin-report-policy',{method:payload?'POST':'GET',cache:'no-store',headers:{authorization:'Bearer '+data.session.access_token,...(payload?{'content-type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});
   const x=await r.json().catch(()=>({}));if(!r.ok||!x.ok)throw Error(x.error||`Reporting policy request failed (${r.status})`);return x;
 }
 function mount(){const parent=document.querySelector(anchor);if(!parent||document.getElementById('gu-admin-report-policy'))return;
  const shell=add(parent,'article',null,'admin-card gu-admin-report-policy');shell.id='gu-admin-report-policy';
  const title=add(shell,'h2','Reporting Limits & Duplicate Protection');title.id='gu-report-heading';
  add(shell,'p','Configure the reporting allowance and duplicate protection without editing SQL. Security safeguards, Owner permission checks and audit logging remain enforced.');
  const start=add(shell,'button','Load reporting policies','btn secondary');start.type='button';
  const message=add(shell,'p','Select “Load reporting policies” to check the installed policy configuration.','gu-policy-message');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  const area=add(shell,'div',null,'gu-policy-content');
  let state=null;
  const show=s=>{message.textContent=s};
  const makeToggle=(form,key,label,help,initial)=>{
    const wrapper=add(form,'label',null,'gu-policy-toggle');const line=add(wrapper,'span',null,'gu-policy-toggle-line');
    const input=add(line,'input');input.type='checkbox';input.name=key;input.checked=Boolean(initial);add(line,'strong',label);add(wrapper,'small',help);return input;
  };
  const makeInt=(form,key,label,value,min,max,help)=>{
    const labelEl=add(form,'label',null,'gu-policy-number');add(labelEl,'strong',label);
    const input=add(labelEl,'input');input.type='number';input.required=true;input.step='1';input.min=min;input.max=max;input.name=key;input.value=value;
    add(labelEl,'small',help);return input;
  };
  async function load(){show('Loading reporting policy…');start.disabled=true;area.replaceChildren();
   try{
    state=await call();const p=state.policy;
    const form=add(area,'form',null,'gu-policy-form');form.noValidate=false;
    makeToggle(form,'quotaEnabled','Enforce reporting allowance','Turn off the configurable daily/rolling reporting quota. An independent, non-disableable anti-abuse ceiling still applies.',p.quota_enabled);
    const maximum=makeInt(form,'quotaMax','Maximum reports',p.quota_max,1,100,'Between 1 and 100 reports per member per reporting window.');
    const hours=makeInt(form,'quotaHours','Reporting window (hours)',p.quota_hours,1,168,'Rolling 1–168 hours, not a midnight reset.');
    makeToggle(form,'duplicateEnabled','Block duplicate reports','Prevent the same member from reporting the same discussion or reply again during the configured period.',p.duplicate_enabled);
    const duplicateWindow=makeInt(form,'duplicateHours','Duplicate restriction (hours)',p.duplicate_hours,1,168,'Rolling period after a report on the same content.');
    const guard=()=>{maximum.disabled=!form.elements.quotaEnabled.checked||!state.canEdit;hours.disabled=!form.elements.quotaEnabled.checked||!state.canEdit;duplicateWindow.disabled=!form.elements.duplicateEnabled.checked||!state.canEdit;};
    form.elements.quotaEnabled.addEventListener('change',guard);form.elements.duplicateEnabled.addEventListener('change',guard);
    const meta=add(form,'p',`Current policy revision: ${p.version}; last updated ${new Date(p.updated_at).toLocaleString()}.`,'gu-policy-metadata');
    if(state.canEdit){const save=add(form,'button','Save reporting policy','btn');save.type='submit';
      form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;
       const b={expectedVersion:p.version,quotaEnabled:form.elements.quotaEnabled.checked,quotaMax:Number(maximum.value),quotaHours:Number(hours.value),duplicateEnabled:form.elements.duplicateEnabled.checked,duplicateHours:Number(duplicateWindow.value)};
       if(!confirm('Apply these Owner-level reporting changes sitewide? This action will be recorded in the audit log.'))return;
       save.disabled=true;show('Saving…');
       try{await call(b);show('Reporting policy saved and audited. Reloading…');await load()}
       catch(error){save.disabled=false;show(error.message)}
      });
    }else{add(form,'p','Read-only access. Only the Owner can modify reporting protections.','gu-policy-info');}
    for(const el of form.querySelectorAll('input'))el.disabled=(!state.canEdit||el.disabled);
    guard();show(state.canEdit?'Owner controls loaded. Changes require confirmation and are audited.':'Reporting configuration is read-only for your assigned permissions.');
   }catch(e){state=null;show(e.message+' The previous hardcoded reporting rules remain in effect until the reviewed database migration is installed and verified.')}
   finally{start.disabled=false}
  }
  start.addEventListener('click',load);
  // Accessible shortcut from the established Site Settings panel to the one canonical policy editor.
  const settings=document.querySelector('.admin-panel[data-admin-panel="settings"]');
  if(settings){const row=add(settings,'div',null,'gu-policy-settings-shortcut');add(row,'h3','Reporting quotas & duplicate protection');add(row,'p','Reporting safeguards are centrally managed under Market Commons → Reports.');const btn=add(row,'button','Open reporting policies','btn secondary');btn.type='button';btn.addEventListener('click',()=>{document.querySelector('#admin-tabs [data-panel="community"]')?.click();shell.scrollIntoView({behavior:'auto',block:'start'});start.focus()})}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
