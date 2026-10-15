/* Account tables: usernames are primary public interaction identifiers, UUIDs remain internal. */
(()=>{'use strict';if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const PAGE={memberships:[['grants','user_id'],['subscriptions','user_id']],access:[['library','user_id'],['passes','user_id']],security:[['flags','user_id']],activity:[['audit','actor_user_id']],support:[['tickets','requester_user_id']],expirations:[['grants','user_id'],['subscriptions','user_id']]};
const ui=()=>document.querySelector('#v1355-access-content');let working=false,last='',current=0;
async function attachSettingsWidget(root){
 if(root.querySelector('[data-gu-settings-r1]')||!root.querySelector('h2'))return;
 const box=document.createElement('section');box.dataset.guSettingsR1='1';box.className='admin-card';
 const h=document.createElement('h3');h.textContent='Enable / Disable Registration & Member Operations';
 const details=document.createElement('p');details.textContent='The website registration switch is separate from Supabase Auth new-user creation, password rules and confirmation settings. Update those provider policies independently.';
 const line=document.createElement('label');const enabled=document.createElement('input');enabled.type='checkbox';enabled.disabled=true;line.append(enabled,document.createTextNode(' Enable public website signup page'));
 const save=document.createElement('button');save.type='button';save.className='btn secondary';save.textContent='Save Registration Visibility';save.disabled=true;
 const all=document.createElement('button');all.type='button';all.className='btn secondary';all.textContent='Open All Communication & Payment Toggles';all.onclick=()=>window.GroundUpMemberComms?.open();
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Reading OWNER configuration…';box.append(h,details,line,save,all,status);root.prepend(box);
 try{const sb=await window.getSupabaseClient(),{data,error}=await sb.rpc('gu_staff_console_v01431r1');if(error||!data?.ok)throw Error(error?.message||'Control not available');
  enabled.checked=data.settings?.['site.registration_enabled']===true;enabled.disabled=data.role!=='OWNER';save.disabled=data.role!=='OWNER';
  status.textContent='Website signup currently '+(enabled.checked?'enabled':'disabled')+'. Supabase Auth signup permission must be configured separately.';
  save.onclick=async()=>{save.disabled=true;try{const res=await sb.rpc('gu_owner_operations_save_v01431r1',{p_key:'site.registration_enabled',p_enabled:enabled.checked});if(res.error||!res.data?.ok)throw Error(res.error?.message||'Save refused');status.textContent='Saved and audited. Website signup '+(enabled.checked?'enabled':'disabled')+'. Verify Supabase Auth policy separately.'}catch(e){status.textContent=e.message}finally{save.disabled=false}};
 }catch(e){status.textContent='Control unavailable: '+e.message}
}
async function enhance(){const root=ui(),tab=location.hash.replace(/^#access-/,'');if(tab==='settings'&&root){await attachSettingsWidget(root);return}if(!root||!PAGE[tab]||root.querySelector('[data-gu-username-added]')||working)return;
 const tables=[...root.querySelectorAll('table')];if(!tables.length)return;
 const tag=tab+'|'+tables.length;working=true;const tick=++current;
 try{const sb=await window.getSupabaseClient(),session=(await sb.auth.getSession()).data?.session;if(!session)return;
 const r=await fetch('/api/admin-access-v01355?tab='+encodeURIComponent(tab),{headers:{authorization:'Bearer '+session.access_token},cache:'no-store'});const data=await r.json();if(!r.ok||!data.ok||data.synthetic)return;
 if(tick!==current||location.hash!=='#access-'+tab)return;
 for(const [index,[key,field]] of PAGE[tab].entries()){
  const table=tables[index];if(!table||table.dataset.guUsernameAdded)continue;
  const heading=table.querySelector('thead tr');if(!heading)continue;
  const th=document.createElement('th');th.textContent='Username';th.scope='col';heading.insertBefore(th,heading.firstElementChild);
  const bodyRows=[...table.querySelectorAll('tbody tr')],records=data[key]||[];
  for(let i=0;i<bodyRows.length;i++){const row=bodyRows[i];if(!records[i]){const existing=row.querySelector('td[colspan]');if(existing)existing.colSpan+=1;continue}const id=records[i]?.[field],name=data.people?.[id]?.username||records[i]?.profile?.username||'';
   const cell=document.createElement('td');if(name){const display=document.createElement('strong');display.textContent='@'+name;cell.append(display);
    if(tab!=='activity'){const b=document.createElement('button');b.type='button';b.className='gu-username-message';b.textContent='Message';b.setAttribute('aria-label','Message @'+name);b.onclick=()=>window.GroundUpMemberComms?.openForUsername(name);cell.append(b)}
   }else cell.textContent=records[i]?'Unavailable':'—';row.insertBefore(cell,row.firstElementChild)}
  table.dataset.guUsernameAdded='1';
 }
 }catch{/* never replace an account identity with guessed text on failure */}finally{working=false}
}
function reorderCoreAccounts(){
 const root=document.querySelector('#admin-users-table');if(!root)return;
 const table=root.querySelector('table');if(!table||table.dataset.guUsernamePrimary==='1')return;
 const head=table.querySelector('thead tr');if(!head||head.children.length<2)return;
 if(head.children[0].textContent.trim()!=='User'||head.children[1].textContent.trim()!=='Username')return;
 const nodes=[head,...table.querySelectorAll('tbody tr')];
 for(const row of nodes){if(row.children.length>=2)row.insertBefore(row.children[1],row.children[0])}
 table.dataset.guUsernamePrimary='1';
}
function watchAdminTables(){
 const root=document.querySelector('#admin-users-table');if(root){const observer=new MutationObserver(reorderCoreAccounts);observer.observe(root,{childList:true,subtree:true});reorderCoreAccounts()}
}
function mount(){const root=ui();if(!root)return false;const obs=new MutationObserver(()=>{void enhance()});obs.observe(root,{childList:true,subtree:true});window.addEventListener('hashchange',()=>{current++;setTimeout(enhance,150)});watchAdminTables();void enhance();return true}
let ticks=0;const t=setInterval(()=>{if(mount()||++ticks>110)clearInterval(t)},250);
})();
