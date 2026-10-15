/* v0.14.0.22 — replace nonfunctional dashboard notification toggles with
 * server-backed in-app preference. Reuses the existing single Alerts center.
 * No new email/push controls: they are not implemented by this backend.
 */
(()=>{'use strict';
if(!/^\/dashboard(?:\.html)?$/i.test(location.pathname))return;
const el=(tag,txt,className)=>{const x=document.createElement(tag);if(txt!=null)x.textContent=txt;if(className)x.className=className;return x};
async function bearer(){const sb=await window.getSupabaseClient();const session=(await sb.auth.getSession()).data?.session;return session?.access_token||''}
async function preference(method,body){const token=await bearer();if(!token)throw Error('Sign in to edit your notification preferences.');
 const r=await fetch('/api/community-notification-preferences',{method,headers:{authorization:'Bearer '+token,accept:'application/json',...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||'Preferences could not be loaded.');
 if(typeof j.preferences?.subscribedRepliesEnabled!=='boolean')throw Error('Invalid preference response.');return j.preferences.subscribedRepliesEnabled}
function mount(body){if(body.querySelector('[data-gu-v01421-preferences]'))return;
 const panel=el('article',null,'v13-card gu-notification-preferences');panel.dataset.guV01421Preferences='1';
 const heading=el('h3','Notification preferences');const intro=el('p','Choose whether to receive in-app alerts when another member replies to discussions you follow. You can change this at any time.');
 const label=el('label',null,'gu-pref-row');const input=document.createElement('input');input.type='checkbox';input.disabled=true;input.setAttribute('aria-describedby','gu-pref-desc-v01421');const title=el('span','Replies to followed discussions');label.append(input,title);
 const expl=el('p','Only eligible, unrestricted Market Commons discussions generate these alerts. Turning this off does not unfollow discussions or remove prior notifications.','small');expl.id='gu-pref-desc-v01421';
 const notice=el('p','Loading your saved preference…','gu-pref-status');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
 const actions=el('div',null,'actions');const reload=el('button','Retry loading','btn secondary');reload.type='button';reload.hidden=true;
 const info=el('p','Security and billing notifications are managed separately and cannot be disabled here. Email and push notification preferences are not supported by this setting.','small');
 actions.append(reload);panel.append(heading,intro,label,expl,notice,actions,info);body.replaceChildren(panel);
 let confirmed=null,busy=false;
 async function load(){if(busy)return;busy=true;input.disabled=true;reload.hidden=true;notice.textContent='Loading saved preferences…';
  try{const v=await preference('GET');if(!panel.isConnected)return;confirmed=v;input.checked=v;input.disabled=false;notice.textContent='Saved server preference loaded.'}
  catch(e){confirmed=null;notice.textContent=e.message;reload.hidden=false}
  finally{busy=false}}
 async function save(){if(busy||confirmed===null)return;const wanted=input.checked;busy=true;input.disabled=true;notice.textContent='Saving preference…';
  try{const actual=await preference('POST',{subscribedRepliesEnabled:wanted});if(!panel.isConnected)return;confirmed=actual;input.checked=actual;notice.textContent=actual===wanted?'Notification preference saved.':'Server preference differed from the request; refreshed the displayed setting.'}
  catch(e){
    // An interrupted response does not establish whether the RPC committed.
    notice.textContent='The save response was interrupted. Reloading the server preference…';
    try{const current=await preference('GET');if(!panel.isConnected)return;
      confirmed=current;input.checked=current;
      notice.textContent=current===wanted?'The server confirms your requested preference.':'The server confirms your previous preference; the requested change was not applied.';
    }catch{
      confirmed=null;input.disabled=true;reload.hidden=false;
      notice.textContent='Could not confirm the saved preference. Use Retry loading before changing it again.';
    }
  }
  finally{busy=false;input.disabled=confirmed===null}}
 input.addEventListener('change',save);reload.addEventListener('click',load);void load();
}
let pending=false;function check(){if(pending)return;pending=true;setTimeout(()=>{pending=false;
 const active=document.querySelector('[data-s="notifications"].active');const body=active?.closest('[role="tablist"]')?.parentElement?.querySelector('[data-settings-body]')||document.querySelector('[data-settings-body]');
 if(!active||!body||body.querySelector('[data-gu-v01421-preferences]'))return;
 // The existing component writes placeholder checkboxes; replace them once rendered.
 if(body.querySelector('.v132-setting-list')||body.querySelector('article.v13-card'))mount(body);
},0)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});else check();
new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length||r.type==='attributes'))check()}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
})();
