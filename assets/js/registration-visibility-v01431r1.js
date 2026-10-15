/* Site-visible registration control only. Supabase Auth settings independently enforce actual signup. */
(()=>{'use strict';if(!/^\/create-account(?:\.html)?$/i.test(location.pathname))return;
let permitted=false;
async function install(){const form=document.querySelector('#create-account-form'),card=document.querySelector('#create-account-card');if(!form||!card)return;
 const btn=form.querySelector('button[type=submit]'),msg=document.createElement('p');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');msg.textContent='Checking whether website registration is available…';card.prepend(msg);if(btn)btn.disabled=true;
 // Capture before the inline onsubmit handler. Never claim this overrides Supabase Auth configuration.
 form.addEventListener('submit',event=>{if(!permitted){event.preventDefault();event.stopImmediatePropagation();msg.textContent='Website registration is currently unavailable.'}},true);
 try{const sb=await window.getSupabaseClient(),{data,error}=await sb.from('site_settings').select('value').eq('setting_key','site.registration_enabled').maybeSingle();if(error||!data)throw Error('Site setting not readable');
  permitted=data.value===true;msg.textContent=permitted?'Website registration is currently available.':'New website registrations are currently paused.';if(btn)btn.disabled=!permitted;
 }catch{permitted=false;msg.textContent='Registration availability cannot be verified. Please try again later.';if(btn)btn.disabled=true}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
