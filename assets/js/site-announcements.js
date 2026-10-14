/* v0.14.0.11. Public announcement component: renders only safe text from API.
 * Does not display outside its configured start/end window. */
(()=>{'use strict';if(['/admin','/admin.html','/training-editor.html','/gws-projects.html'].includes(location.pathname.toLowerCase()))return;
 let timer=null,snapshot=null;
 function mount(){const main=document.querySelector('main');if(!main)return null;let shell=document.getElementById('v01411-public-announcements');if(!shell){shell=document.createElement('section');shell.id='v01411-public-announcements';shell.className='v01411-public-announcements';shell.setAttribute('aria-label','Site announcements');main.insertBefore(shell,main.firstElementChild)}return shell}
 function paint(){const shell=mount();if(!shell||!snapshot)return;shell.replaceChildren();for(const row of snapshot){try{if(sessionStorage.getItem('v01411-dismiss-'+row.id)==='1')continue}catch{}const item=document.createElement('article');item.className='v01411-public-announcement';const title=document.createElement('strong');title.textContent=row.title;const body=document.createElement('p');body.textContent=row.body;item.append(title,body);if(row.dismissible){const close=document.createElement('button');close.type='button';close.textContent='Dismiss';close.setAttribute('aria-label','Dismiss '+row.title);close.className='btn secondary';close.onclick=()=>{try{sessionStorage.setItem('v01411-dismiss-'+row.id,'1')}catch{}item.remove();if(!shell.children.length)shell.hidden=true};item.append(close)}shell.append(item)}shell.hidden=!shell.children.length}

 async function refresh(){
  try{
   const opts={cache:'no-store',headers:{}};
   try{const sb=await window.getSupabaseClient?.();const session=(await sb?.auth.getSession())?.data?.session;if(session)opts.headers.authorization='Bearer '+session.access_token}catch{}
   const response=await fetch('/api/site-announcements',{...opts});if(!response.ok)throw Error('Announcements unavailable');
   const result=await response.json();if(!result.ok)throw Error('Announcements unavailable');
   snapshot=result.announcements||[];paint();
  }catch(e){/* Retain any already displayed, verified notices if the network fails. */}
  clearTimeout(timer);timer=setTimeout(refresh,60000);
 }
 function init(){refresh();const main=document.querySelector('main');if(main){const observer=new MutationObserver(()=>{if(snapshot&&!document.getElementById('v01411-public-announcements'))paint()});observer.observe(main,{childList:true,subtree:true})}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
})();
