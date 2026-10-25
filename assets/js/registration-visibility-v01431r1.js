/* Site-visible registration control only. Supabase Auth settings independently enforce actual signup. */
(()=>{'use strict';if(!/^\/create-account(?:\.html)?$/i.test(location.pathname))return;
let permitted=false;
async function install(){const form=document.querySelector('#create-account-form'),card=document.querySelector('#create-account-card');if(!form||!card)return;
 const btn=form.querySelector('button[type=submit]'),msg=document.createElement('p');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');msg.textContent='Checking whether website registration is available…';card.prepend(msg);if(btn)btn.disabled=true;
 // Capture before the inline onsubmit handler. Never claim this overrides Supabase Auth configuration.
 form.addEventListener('submit',event=>{if(!permitted){event.preventDefault();event.stopImmediatePropagation();msg.textContent='Website registration is currently unavailable.'}},true);
 try{const response=await fetch('/api/free-beta-readiness-v014272',{cache:'no-store',headers:{accept:'application/json'}});
  const state=await response.json();if(!response.ok||state?.ok!==true)throw Error('Beta status unavailable');
  permitted=state.signupAvailable===true;
  msg.textContent=permitted?'Free beta registration is available. Email confirmation is required.':
    'Free beta registration is temporarily unavailable while the account service is being configured. No account details have been submitted.';
  if(btn)btn.disabled=!permitted;
 }catch{permitted=false;msg.textContent='Free beta registration cannot be verified right now. No account details have been submitted.';if(btn)btn.disabled=true}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
