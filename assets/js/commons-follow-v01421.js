/* v0.14.0.22 — idempotent per-topic follow/unfollow, no speculative success.
 * Subscriptions are only available for published ungated Commons discussions.
 * The previous optional advanced interaction toolbar is unchanged except its
 * duplicate Subscribe button is hidden while this canonical control is mounted.
 */
(()=>{'use strict';
if(!/^\/market-commons(?:\.html)?$/i.test(location.pathname))return;
const topic=Number(new URLSearchParams(location.search).get('topic'));
if(!Number.isSafeInteger(topic)||topic<1)return;
const make=(tag,label,className)=>{const el=document.createElement(tag);if(label!=null)el.textContent=label;if(className)el.className=className;return el};
async function api(method,subscribe){const sb=await window.getSupabaseClient(),session=(await sb.auth.getSession()).data?.session;
 if(!session)throw Error('Sign in to manage followed discussions.');
 const response=await fetch('/api/commons-subscriptions-v01421?topicId='+topic,{method,cache:'no-store',headers:{authorization:'Bearer '+session.access_token,accept:'application/json',...(method==='POST'?{'content-type':'application/json'}:{})},body:method==='POST'?JSON.stringify({subscribe}):undefined});
 const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw Error(data.error||'Subscription service unavailable.');
 if(typeof data.available!=='boolean'||typeof data.subscribed!=='boolean')throw Error('Unexpected subscription response.');return data}
function install(){const root=document.querySelector('#v13-commons .v13-topic-detail')||document.querySelector('#v13-commons.v13-topic-detail');const topicArticle=root?.querySelector('article[data-forum-content="topic"]');
 if(!topicArticle||root.querySelector('[data-gu-follow-v01421]'))return false;
 const box=make('section',null,'gu-commons-follow');box.dataset.guFollowV01421='1';box.setAttribute('aria-label','Discussion notifications');
 const title=make('h2','Follow this discussion');const caption=make('p','Receive an in-app alert when someone replies to a followed discussion, subject to your notification preference.','small');
 const action=make('button','Checking subscription…','btn secondary');action.type='button';action.disabled=true;
 const status=make('p','Verifying discussion subscription availability…','gu-follow-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const link=make('a','Notification settings','gu-follow-settings');link.href='/dashboard.html?tab=settings';
 box.append(title,caption,action,status,link);topicArticle.before(box);
 let subscribed=false,available=false,busy=false;
 function render(){action.disabled=busy||!available;action.textContent=available?(subscribed?'Unfollow discussion':'Follow discussion'):'Following unavailable'}
 async function load(){if(busy)return;busy=true;render();try{const r=await api('GET');if(!box.isConnected)return;subscribed=r.subscribed;available=r.available;status.textContent=available?(subscribed?'You follow this discussion.':'You are not following this discussion.'):'In-app reply subscriptions are available only for published, unrestricted discussions.'}
 catch(e){available=false;status.textContent=e.message||'Unable to check subscription.';action.disabled=true}
 finally{busy=false;render()}}
 action.addEventListener('click',async()=>{if(busy||!available)return;busy=true;const want=!subscribed;render();status.textContent=want?'Following discussion…':'Unfollowing discussion…';
 try{const r=await api('POST',want);if(!box.isConnected)return;subscribed=r.subscribed;available=r.available;status.textContent=!r.available?'This discussion is no longer available for following.':r.subscribed?'Discussion followed. In-app alerts depend on notification settings.':'Discussion unfollowed. Existing alerts are retained.'}
 catch(e){
   // A network failure may occur *after* the database commits. Never claim a rollback.
   status.textContent='The save response was interrupted. Checking the current server state…';
   try{const current=await api('GET');if(!box.isConnected)return;
     subscribed=current.subscribed;available=current.available;
     status.textContent=available
       ?(subscribed===want
          ?`The server confirms this discussion is ${subscribed?'followed':'unfollowed'}.`
          :`The server currently reports this discussion as ${subscribed?'followed':'not followed'}. Your requested change was not confirmed.`)
       :'This discussion is not available for following.';
   }catch{
     available=false;status.textContent='Subscription status could not be confirmed. Refresh this discussion before making another change.';
   }
 }
 finally{busy=false;render()}});
 void load();return true}
let done=false,timer=null;
function queue(){if(done||timer)return;timer=setTimeout(()=>{timer=null;if(install()){done=true;observer.disconnect()}},50)}
const observer=new MutationObserver(queue);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
observer.observe(document.body,{childList:true,subtree:true});
})();
