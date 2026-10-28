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
 notice.textContent=toggle.checked?'Enabled for eligible members':'Disabled for members · Owner preview available';
}
async function save(){
 const btn=$('[data-cl-admin-save]');btn.disabled=true;
 try{
  await call('setting_save','POST',{
   setting_key:key,category:'design',value:{enabled:toggle.checked},
   public_read:false,description:'Owner-controlled Crownlight continuous trading workspace presentation'
  });
  notice.textContent=toggle.checked?'Enabled for eligible members. Refresh the Simulator to apply.':
   'Disabled for members. Owner preview remains available.';
 }catch(e){notice.textContent='Could not save: '+e.message}
 finally{btn.disabled=false}
}
$('[data-cl-admin-save]').addEventListener('click',save);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh().catch(()=>{}),{once:true});
else refresh().catch(()=>{});
})();
