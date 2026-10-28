/* Owner-only membership QA account creation. Password never saved in page state. */
(()=>{'use strict';if(!/^\/admin(?:\.html)?$/.test(location.pathname))return;
 const ID='gu-membership-qa-users-v1';
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 async function mount(){
  const panel=document.querySelector('.admin-panel[data-admin-panel="settings"]');
  if(!panel||document.getElementById(ID))return !!document.getElementById(ID);
  const host=el('section');host.id=ID;host.className='admin-card';host.hidden=true;
  const title=el('h2','Membership Test Accounts');
  const summary=el('p','Create nine test logins. Paid access is tested separately.');
  const passwordLabel=el('label','Test account password');
  const password=el('input');password.type='password';password.autocomplete='new-password';
  password.required=true;password.minLength=12;password.maxLength=128;
  password.setAttribute('aria-label','Password for nine test accounts');
  passwordLabel.append(password);
  const actions=el('div');actions.className='admin-actions';
  const create=el('button','Create Test Accounts');create.className='btn';create.type='button';
  const createChart=el('button','Create 3 Chart Studio QA Accounts');createChart.className='btn secondary';createChart.type='button';
  const refresh=el('button','Refresh Accounts');refresh.className='btn secondary';refresh.type='button';
  const status=el('p','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const table=el('table');table.className='admin-table';const caption=el('caption','Membership QA login roster');table.append(caption);
  actions.append(createChart,create,refresh);host.append(title,summary,passwordLabel,actions,status,table);
  const settings=panel.querySelector('#admin-settings-list');if(settings)settings.before(host);else panel.append(host);
  async function token(){
   const sb=await window.getSupabaseClient(),res=await sb.auth.getSession();
   if(res.error||!res.data?.session?.access_token)throw Error('Owner sign-in required');
   return res.data.session.access_token;
  }
  function render(roster){
   table.replaceChildren(caption);
   const head=el('thead'),row=el('tr');
   for(const label of ['Username','Membership','Chart QA tier','Sign-in email','Status']){
    row.append(el('th',label));
   }
   head.append(row);table.append(head);
   const body=el('tbody');
   for(const x of roster){
    const tr=el('tr');
    for(const txt of [x.username,x.plan,x.chartReady?(x.chartTier||'QA'):'—',x.email,x.created?'Created':'Not created'])
     tr.append(el('td',txt));
    body.append(tr);
   }
   table.append(body);
  }
  async function check(){
   const r=await fetch('/api/owner-membership-qa-users-v1',{headers:{authorization:'Bearer '+await token()},cache:'no-store'});
   if(r.status===401||r.status===403){host.hidden=true;return}
   const data=await r.json().catch(()=>null);
   if(!r.ok||data?.ok!==true)throw Error(data?.error||'Roster unavailable');
   host.hidden=false;render(data.roster||[]);
   status.textContent=(data.ready||0)+' of '+data.total+' accounts created; '+(data.chartReady||0)+' of 3 Chart QA tiers ready.';
   create.disabled=(data.ready===data.total);
   createChart.disabled=(data.chartReady===3);
  }
  async function provision(chartOnly){
   if(password.value.length<12){status.textContent='Enter the test password (minimum 12 characters).';password.focus();return}
   if(!window.confirm(chartOnly?'Create exactly three temporary noncommercial Crownlight Chart Studio QA accounts? No paid benefits or founder seats will be assigned.':'Create nine noncommercial test accounts in Supabase? No paid membership will be granted.'))return;
   create.disabled=true;createChart.disabled=true;refresh.disabled=true;
   const pw=password.value;password.value='';
   try{
    if(typeof window.GroundUpAdminPasswordConfirm?.ensure!=='function')throw Error('Owner password confirmation unavailable');
    await window.GroundUpAdminPasswordConfirm.ensure();
    status.textContent='Creating and verifying test accounts…';
    const r=await fetch('/api/owner-membership-qa-users-v1',{
     method:'POST',headers:{authorization:'Bearer '+await token(),'content-type':'application/json'},
     body:JSON.stringify({confirm:chartOnly?'CREATE_THREE_CROWNLIGHT_QA_ACCOUNTS':'CREATE_NINE_NONCOMMERCIAL_QA_ACCOUNTS',password:pw})});
    const data=await r.json().catch(()=>null);
    if(!r.ok||data?.ok!==true)throw Error(data?.error||'Some accounts may need reconciliation');
    render(data.roster||[]);
    status.textContent=data.created+' of '+data.total+' QA accounts verified; '+(data.chartReady||0)+' Chart Studio QA tiers confirmed.';
   }catch(e){status.textContent=e.message||'Account creation unavailable';}
   finally{
    refresh.disabled=false;create.disabled=false;createChart.disabled=false;
    try{await check()}catch(e){status.textContent=e.message||'Could not refresh QA accounts';}
   }
  }
  create.onclick=()=>void provision(false);
  createChart.onclick=()=>void provision(true);
  refresh.onclick=async()=>{refresh.disabled=true;try{await check()}catch(e){status.textContent=e.message||'Refresh failed'}finally{refresh.disabled=false}};
  try{await check()}catch(e){status.textContent=e.message||'QA controls unavailable';create.disabled=true;createChart.disabled=true}
  return true;
 }
 let tries=0;const timer=setInterval(()=>{if(mount()||++tries>60)clearInterval(timer)},250);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();