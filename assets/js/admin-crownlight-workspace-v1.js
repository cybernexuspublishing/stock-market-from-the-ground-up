/* Admin > Site Settings: OWNER-only reversible presentation switch.
 * Stored in site_settings and audited by the existing Admin API.
 */
(()=>{
'use strict';
const key='feature.crownlight_continuous_workspace_v1';
const root=document.getElementById('admin-crownlight-workspace-control');
if(!root)return;
const $=s=>root.querySelector(s);
const notice=$('[data-cl-admin-message]'),toggle=$('[data-cl-admin-enabled]');
const labels={"simulator.html":"Chart Studio / Simulator","dashboard.html":"Member Dashboard","labs.html":"Labs","learn.html":"Learning System","market-tutor.html":"Market Tutor","journal.html":"Journal","bootcamp-academy.html":"Boot Camp Academy","my-library.html":"My Library","account.html":"Account","market-commons.html":"Market Commons","forum.html":"Forum","skills.html":"Skills","membership.html":"Membership","store.html":"Store","index.html":"Home"};
const pageList=$('[data-cl-admin-pages]'),previewSelect=$('[data-cl-admin-preview-page]');
const preview=$('[data-cl-admin-preview]'),classic=$('[data-cl-admin-classic]');
for(const [page,label] of Object.entries(labels)){
 const wrapper=document.createElement('label');wrapper.style.cssText='display:flex;gap:7px;align-items:center;font-size:.86rem';
 const cb=document.createElement('input');cb.type='checkbox';cb.value=page;cb.dataset.clPage='';
 const name=document.createElement('span');name.textContent=label;wrapper.append(cb,name);pageList.append(wrapper);
 const option=document.createElement('option');option.value=page;option.textContent=label;previewSelect.append(option);
}
function links(){const page=previewSelect.value||'simulator.html';preview.href='/'+page+'?workspace=continuous';classic.href='/'+page+'?workspace=classic'}
previewSelect.value='simulator.html';previewSelect.addEventListener('change',links);links();
const selectedPages=()=>[...pageList.querySelectorAll('input[data-cl-page]:checked')].map(x=>x.value);
const getToken=async()=>{
 const sb=await window.getSupabaseClient();
 const {data}=await sb.auth.getSession();
 if(!data?.session?.access_token)throw Error('Sign in as Owner to manage Chart Studio.');
 return data.session.access_token;
};
async function call(action,method='GET',body){
 const token=await getToken(),r=await fetch('/api/admin?action='+action,{
  method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},
  body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const j=await r.json().catch(()=>({}));
 if(!r.ok||j.ok!==true)throw Error(j.error||'Admin request unavailable');
 return j;
}
async function refresh(){
 const identity=await call('context');
 if(!identity.roles?.includes('OWNER'))return;
 root.hidden=false;
 const data=await call('settings');
 const setting=data.settings?.find(x=>x.setting_key===key);
 toggle.checked=setting?.value?.enabled===true;
 const selected=new Set(Array.isArray(setting?.value?.pages)?setting.value.pages:['simulator.html']);
 pageList.querySelectorAll('input[data-cl-page]').forEach(x=>x.checked=selected.has(x.value));
 notice.textContent=toggle.checked?'Enabled on '+selected.size+' selected page(s)':'Disabled sitewide · Owner preview available';
}
async function save(){
 const btn=$('[data-cl-admin-save]');
 if(selectedPages().length===0){notice.textContent='Choose at least one page before saving.';return;}
 btn.disabled=true;
 try{
  await call('setting_save','POST',{
   setting_key:key,category:'design',value:{enabled:toggle.checked,pages:selectedPages()},
   public_read:false,description:'Owner-controlled Crownlight continuous trading workspace presentation'
  });
  notice.textContent=toggle.checked?'Enabled on '+selectedPages().length+' selected page(s). Refresh to apply.':
   'Disabled sitewide. Owner preview remains available.';
 }catch(e){notice.textContent='Could not save: '+e.message}
 finally{btn.disabled=false}
}
$('[data-cl-admin-save]').addEventListener('click',save);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh().catch(()=>{}),{once:true});
else refresh().catch(()=>{});
})();
