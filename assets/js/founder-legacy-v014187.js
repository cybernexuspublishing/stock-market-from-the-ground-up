/* Founder-only opt-in recognition: no public profile links or fabricated member activity. */
(()=>{'use strict';
const el=id=>document.getElementById(id);
const create=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n};
async function main(){
 try{
  const sb=await window.getSupabaseClient();
  const user=(await sb.auth.getUser()).data?.user;
  if(!user){location.replace('signin.html?next='+encodeURIComponent('/founder-legacy.html'));return}
  const {data:own,error:myError}=await sb.rpc('gu_founder_legacy_my_status_v014187');
  if(myError||!own?.eligible){el('legacy-status').textContent='A verified founding identity is required to manage this setting.';return}
  const controls=el('legacy-controls'),form=el('legacy-form'),nick=el('legacy-display');
  controls.hidden=false;el('legacy-status').textContent='Founding identity verified.';
  const describe=v=>{
   el('legacy-current').textContent=v.visible?'Recognition is currently enabled for Founding #'+String(own.founderNumber).padStart(4,'0')+'.':'Recognition is currently disabled.';
   nick.value=v.displayLabel||nick.value||'';
  };
  describe(own);
  async function change(enabled){
   const btn=form.querySelector('button[type=submit]'),remove=el('legacy-withdraw'),notice=el('legacy-action-status');
   btn.disabled=true;remove.disabled=true;notice.textContent=enabled?'Saving your consent…':'Removing recognition…';
   try{
    const r=await sb.rpc('gu_founder_legacy_consent_v014186',{p_opt_in:enabled,p_display_label:enabled?nick.value:null});
    if(r.error||r.data?.ok!==true){notice.textContent=r.data?.error==='ACTIVE_MEMBERSHIP_REQUIRED'?'An active membership is required to opt in. Withdrawal remains available.':'Preference change could not be confirmed.';return}
    describe({...r.data,displayLabel:enabled?nick.value:null});
    notice.textContent=enabled?'Recognition enabled with your consent.':'Recognition withdrawn. Your founding identity is unchanged.';
    await showWall();
   }catch{notice.textContent='The recognition service could not verify your change.'}
   finally{btn.disabled=false;remove.disabled=false}
  }
  form.onsubmit=event=>{event.preventDefault();change(true)};
  el('legacy-withdraw').onclick=()=>change(false);
  if(!own.canOptIn){form.querySelector('button[type=submit]').disabled=true;el('legacy-action-status').textContent='Your membership is inactive. You may still withdraw previous recognition.'}
  async function showWall(){
   const {data,error}=await sb.rpc('gu_founder_legacy_list_v014186');
   if(error||!data?.ok)return;
   const host=el('legacy-wall');host.replaceChildren();
   const members=Array.isArray(data.members)?data.members:[];
   for(const m of members.slice(0,600)){
    const row=create('div');row.className='gu-f600-blueprint-item';row.setAttribute('role','listitem');
    row.append(create('strong','Founding #'+String(m.founderNumber).padStart(4,'0')),create('p',String(m.displayLabel||'')));
    host.append(row);
   }
   if(!members.length)host.append(create('p','No founders have opted in yet.'));
   el('legacy-list-section').hidden=false;
  }
  await showWall();
 }catch{el('legacy-status').textContent='Recognition controls are unavailable.'}
}
main();
})();