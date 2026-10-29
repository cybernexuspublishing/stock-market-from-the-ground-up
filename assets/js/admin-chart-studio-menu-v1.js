/* Owner's Chart Studio dropdown publisher.
 * Visibility only: does not modify tiers, entitlements, credits or workspace.
 */
(()=>{'use strict';
 const root=document.getElementById('admin-chart-studio-menu-control');if(!root)return;
 const KEY='feature.crownlight_chart_studio_menu_v1';
 const all=['STANDARD','ADVANCED','PROFESSIONAL'];
 const labels={STANDARD:'Standard — Lightweight Charts',ADVANCED:'Advanced — KLineChart',PROFESSIONAL:'Professional — Dual KLineChart'};
 const choose=root.querySelector('[data-chart-menu-options]');
 const status=root.querySelector('[data-chart-menu-status]');
 const save=root.querySelector('[data-chart-menu-save]');
 const preview=root.querySelector('[data-chart-menu-preview]');
 const inputs=new Map();
 const visible=()=>all.filter(t=>inputs.get(t)?.checked);
 for(const tier of all){
  const row=document.createElement('label');row.className='admin-chart-menu-option';
  const box=document.createElement('input');box.type='checkbox';box.value=tier;box.dataset.chartMenuTier=tier;
  box.checked=true;
  const name=document.createElement('span');name.textContent=labels[tier];
  row.append(box,name);choose.append(row);
  inputs.set(tier,box);
  box.addEventListener('change',()=>{
   const active=visible();
   status.textContent=active.length?
     'Unsaved selection: '+active.join(', ')+'. Existing subscriptions and access are unchanged.':
     'Select at least one Studio before saving.';
   save.disabled=!active.length;
  });
 }
 const api=async(action,body)=>{
  const supabase=await window.getSupabaseClient();
  const session=(await supabase.auth.getSession()).data?.session;
  if(!session?.access_token)throw Error('Owner sign-in required');
  const response=await fetch('/api/admin?action='+encodeURIComponent(action),{
   method:body?'POST':'GET',cache:'no-store',
   headers:{authorization:'Bearer '+session.access_token,...(body?{'content-type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.ok!==true)throw Error(data.error||'Admin request failed');
  return data;
 };
 const load=async()=>{
  try{
   const context=await api('context');
   if(!context.roles?.includes('OWNER'))return;
   root.hidden=false;
   const data=await api('settings');
   const row=data.settings?.find(x=>x.setting_key===KEY);
   const list=Array.isArray(row?.value?.visible)?row.value.visible:all;
   all.forEach(t=>{inputs.get(t).checked=list.includes(t)});
   save.disabled=visible().length===0;
   status.textContent=row?'Current published dropdown: '+visible().join(', ')+'.':
    'Default: all three Studios displayed. No custom visibility setting saved yet.';
  }catch(error){status.textContent='Could not load Studio dropdown controls: '+error.message}
 };
 save.addEventListener('click',async()=>{
  const list=visible();
  if(!list.length){status.textContent='Select at least one Studio.';return}
  save.disabled=true;status.textContent='Saving Studio menu choices…';
  try{
   await api('setting_save',{
    setting_key:KEY,category:'learning',
    value:{visible:list},public_read:false,
    description:'Owner-controlled Chart Studio dropdown visibility only'
   });
   status.textContent='Saved: '+list.join(', ')+'. Refresh Chart Studio to see the menu.';
  }catch(error){status.textContent='Not saved: '+error.message}
  finally{save.disabled=visible().length===0}
 });
 preview.href='/simulator.html';
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void load()},{once:true});
 else void load();
})();
