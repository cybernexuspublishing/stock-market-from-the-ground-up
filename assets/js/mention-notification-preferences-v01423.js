/* v0.14.0.23 — separate, OFF-by-default in-app mention alerts.
 * Mounted within the canonical Dashboard -> Settings -> Notifications page.
 * When the review-gated migration is absent, never imply this control is active.
 */
(()=>{'use strict';
if(!/^\/dashboard(?:\.html)?$/i.test(location.pathname))return;
const make=(tag,text,className)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(className)x.className=className;return x};
async function request(method,payload){
 const sb=await window.getSupabaseClient(),session=(await sb.auth.getSession()).data?.session;
 if(!session?.access_token)throw Error('Sign in to configure mention notifications.');
 const r=await fetch('/api/community-mention-preferences-v01423',{
  method,cache:'no-store',headers:{authorization:'Bearer '+session.access_token,accept:'application/json',
    ...(payload?{'content-type':'application/json'}:{})},
  body:payload?JSON.stringify(payload):undefined
 });
 const j=await r.json().catch(()=>({}));
 if(!r.ok||!j.ok||typeof j.preferences?.mentionsEnabled!=='boolean')
   throw Error(j.error||'Mention preferences are not available.');
 return j.preferences.mentionsEnabled;
}
function mount(host){if(host.querySelector('[data-gu-mentions-v01423]'))return;
 const outer=make('section',undefined,'gu-mention-prefs-v01423');outer.dataset.guMentionsV01423='1';
 const title=make('h3','Mentions in Market Commons');
 const info=make('p','Allow in-app alerts when another member mentions your username in a published, unrestricted discussion. This is off until you explicitly enable it. No email or push messages are sent.','small');
 const label=make('label',undefined,'gu-pref-row'),input=make('input');input.type='checkbox';input.disabled=true;
 input.setAttribute('aria-describedby','gu-mention-pref-desc-v01423');
 label.append(input,make('span','Notify me about verified @mentions'));
 const details=make('p','Mention alerts are separate from followed-discussion alerts. A mention never grants access to restricted forums.','small');details.id='gu-mention-pref-desc-v01423';
 const status=make('p','Loading saved setting…','gu-pref-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const retry=make('button','Retry loading','btn secondary');retry.type='button';retry.hidden=true;
 outer.append(title,info,label,details,status,retry);host.append(outer);
 let known=null,busy=false;
 async function load(){if(busy)return;busy=true;input.disabled=true;retry.hidden=true;status.textContent='Loading saved mention preference…';
  try{const state=await request('GET');if(!outer.isConnected)return;known=state;input.checked=state;status.textContent='Saved server setting loaded.'}
  catch(e){known=null;status.textContent=e.message;retry.hidden=false}
  finally{busy=false;input.disabled=known===null}}
 async function save(){if(busy||known===null)return;const target=input.checked;busy=true;input.disabled=true;status.textContent='Saving mention alerts…';
  try{const state=await request('POST',{mentionsEnabled:target});if(!outer.isConnected)return;known=state;input.checked=state;
   status.textContent=state===target?'Mention notification preference saved.':'Server returned a different setting; displayed value reconciled.'}
  catch{
   status.textContent='Save response unknown. Checking the database before any retry…';
   try{const state=await request('GET');if(!outer.isConnected)return;known=state;input.checked=state;
     status.textContent=state===target?'The database confirms your requested preference.':'The database confirms the setting shown. Your requested change was not confirmed.';
   }catch{known=null;retry.hidden=false;status.textContent='Could not confirm the saved setting. Retry loading before making another change.'}
  }finally{busy=false;input.disabled=known===null}}
 input.addEventListener('change',save);retry.addEventListener('click',load);void load();
}
let timer=0;
function scan(){clearTimeout(timer);timer=setTimeout(()=>{
 const active=document.querySelector('[data-s="notifications"].active');if(!active)return;
 const host=document.querySelector('[data-settings-body] .gu-notification-preferences');
 if(host&&!host.querySelector('[data-gu-mentions-v01423]'))mount(host);
},80)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
const watcher=new MutationObserver(list=>{if(list.some(x=>x.addedNodes.length||x.attributeName==='class'))scan()});
watcher.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
})();
