/* Founders Commons member-owned design preferences: no cookie, no local-storage or service keys. */
(()=>{'use strict';
async function init(){
 const form=document.getElementById('gu-f600-studio-form'),
  status=document.getElementById('gu-f600-preference-status'),
  theme=document.getElementById('gu-f600-theme'),
  density=document.getElementById('gu-f600-density');
 if(!form||!status||!theme||!density)return;
 try{
  const sb=await window.getSupabaseClient();
  const user=(await sb.auth.getUser()).data?.user;
  if(!user)return;
  const {data,error}=await sb.rpc('gu_founder_design_preferences_get_v014184');
  if(error||data?.ok!==true)return;
  const setLocal=values=>{
   if(['midnight','graphite','aurora'].includes(values.theme))document.body.dataset.f600Theme=values.theme;
   if(['comfortable','compact'].includes(values.density))document.body.dataset.f600Density=values.density;
  };
  theme.value=data.theme||'midnight';density.value=data.density||'comfortable';
  theme.querySelector('option[value="aurora"]').disabled=data.enhanced!==true;
  if(data.enhanced!==true&&theme.value==='aurora')theme.value='midnight';
  setLocal({theme:theme.value,density:density.value});
  form.hidden=false;
  form.addEventListener('submit',async event=>{
   event.preventDefault();const btn=document.getElementById('gu-f600-save-preference');
   btn.disabled=true;status.textContent='Saving your preferences…';
   try{
    const response=await sb.rpc('gu_founder_design_preferences_set_v014184',{p_theme:theme.value,p_density:density.value,p_tutor_side:'right'});
    if(response.error||response.data?.ok!==true){
      status.textContent=response.data?.error==='EXTENDED_REQUIRED'?'Aurora requires an active Extended Founder entitlement.':'Preferences could not be saved.';return
    }
    setLocal(response.data);status.textContent='Your private design preferences were saved.';
   }catch{status.textContent='The design preference service is temporarily unavailable.'}
   finally{btn.disabled=false}
  });
 }catch{status.textContent='Design settings could not be loaded.'}
}
init();
})();