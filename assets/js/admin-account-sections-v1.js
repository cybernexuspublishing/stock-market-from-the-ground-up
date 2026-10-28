/* Readable Owner account editor: all existing forms remain functional and intact. */
(()=>{'use strict';if(!/^\/admin(?:\.html)?$/.test(location.pathname))return;
const tabDefs=[['Identity','identity'],['Membership','membership'],['Public Profile','profile'],['Status','state'],
 ['Security','security'],['Books & Tools','access'],['Notes','notes'],['Deletion','delete']];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let pending=null;
async function memberSummary(root,uid){
 const status=root.querySelector('.v1-editor-summary'),sb=await window.getSupabaseClient?.();
 const token=(await sb?.auth.getSession())?.data?.session?.access_token;
 if(!token)return;
 try{
  const r=await fetch('/api/member-profile?userId='+encodeURIComponent(uid),{headers:{authorization:'Bearer '+token},cache:'no-store'});
  const j=await r.json();if(!j.ok||!status?.isConnected)return;
  const p=j.profile;
  const img=status.querySelector('img');if(img)img.src=p.avatarUrl||'/assets/avatars/av-f4.webp';
  const name=status.querySelector('[data-member-name]'),meta=status.querySelector('[data-member-meta]'),bio=status.querySelector('[data-member-bio]');
  if(name)name.textContent=(p.username?'@'+p.username:'Member')+' — '+p.titleLabel;
  if(meta)meta.textContent='Gender preference: '+(p.gender==='female'?'Female':p.gender==='male'?'Male':'Rather not say')+' · Email: '+(p.email||'Not available');
  if(bio)bio.textContent='Bio: '+(p.bio||'No bio supplied');
 }catch{/* A summary error must not interrupt privileged account-management operations. */}
}
function mount(root){
 if(root.dataset.profileSections)return;root.dataset.profileSections='1';
 const modal=root.closest('dialog'),id=modal?.querySelector('[data-v1352-body]')?.dataset?.userId||'';
 const nav=document.createElement('nav');nav.className='v1-editor-tabs';nav.setAttribute('aria-label','Edit Account sections');
 nav.setAttribute('role','tablist');
 const groups=[
  root.querySelector('#v1353-identity-form'),
  root.querySelector('#v1353-membership-form'),
  root.querySelector('#v1353-profile-form'),
  root.querySelector('#v1353-state-form'),
  root.querySelector('.v1353-danger:not(:last-child)'),
  [...root.querySelectorAll('section')].find(x=>x.querySelector('[data-editor-action="access"]')),
  root.querySelector('#v1353-notes-form'),
  [...root.querySelectorAll('section.v1353-danger')].at(-1)
 ];
 const sections=[];
 const summary=document.createElement('section');summary.className='v1-editor-summary';
 summary.innerHTML='<img src="/assets/avatars/av-f4.webp" alt="Member avatar"><div><strong data-member-name>Account presentation</strong><p class="small" data-member-meta>Account details remain in the individual sections.</p><p class="small" data-member-bio>Public biography and title appear here when authorized.</p></div>';
 root.prepend(summary,nav);
 const show=code=>{
  sections.forEach((element,i)=>{const yes=tabDefs[i][1]===code;element.hidden=!yes;element.setAttribute('aria-hidden',String(!yes));});
  nav.querySelectorAll('button').forEach(btn=>{const yes=btn.dataset.code===code;btn.setAttribute('aria-selected',String(yes));btn.tabIndex=yes?0:-1;});
 };
 for(let i=0;i<tabDefs.length;i++){
  const [name,code]=tabDefs[i],node=groups[i];if(!node)continue;
  node.classList.add('v1-editor-section');node.dataset.editorSection=code;
  node.setAttribute('role','tabpanel');node.setAttribute('aria-label',name);
  sections.push(node);
  const b=document.createElement('button');b.type='button';b.dataset.code=code;b.textContent=name;b.setAttribute('role','tab');b.setAttribute('aria-selected','false');
  b.addEventListener('click',()=>show(code));nav.append(b);
 }
 // Each original form's submit handlers are left in place; moving DOM nodes is not required.
 show('identity');
 if(modal?.open){
  const uid=modal.querySelector('[data-v1352-body]')?.dataset?.userId||
    new URLSearchParams(location.search).get('userId');
  if(uid&&/^[0-9a-f-]{36}$/i.test(uid))void memberSummary(root,uid);
 }
 // Account UUID is normally exposed on the Editor's original button; look it up from the opened list.
 const text=modal?.querySelector('[data-v1352-error]');
 if(text)text.setAttribute('aria-live','polite');
}
function scan(){
 const box=document.querySelector('dialog[open] .v1353-account-editor')||document.querySelector('.v1353-account-editor');
 if(box)mount(box);
}
document.addEventListener('DOMContentLoaded',()=>{new MutationObserver(()=>{clearTimeout(pending);pending=setTimeout(scan,70)}).observe(document.body,{childList:true,subtree:true});scan()},{once:true});
})();
