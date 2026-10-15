/* v0.14.0.19 — accessible mention picker. Published contributors only; no implied alerts. */
(()=>{'use strict';
 if(!/^\/(?:new-discussion|market-commons|forum-topic|forum)(?:\.html)?$/.test(location.pathname))return;
 let dialog,field,list,note,activeArea,activeButton,controller,timer,selection=[];
 const $=(s,root=document)=>root.querySelector(s);
 function message(s){note.textContent=s}
 function build(){
   dialog=document.createElement('dialog');dialog.id='gu-verified-mention-dialog';dialog.className='gu-mention-dialog';
   dialog.setAttribute('aria-labelledby','gu-mention-title');
   const section=document.createElement('section');
   const h=document.createElement('h2');h.id='gu-mention-title';h.textContent='Mention a community contributor';
   const info=document.createElement('p');info.textContent='Search verified usernames already visible in published discussions. Mentions are display text only; delivery of mention notifications is not enabled.';
   const label=document.createElement('label');label.setAttribute('for','gu-mention-query');label.textContent='Contributor username';
   field=document.createElement('input');field.id='gu-mention-query';field.type='search';field.autocomplete='off';field.maxLength=40;field.minLength=3;field.placeholder='Type at least 3 characters';
   list=document.createElement('ul');list.className='gu-mention-options';list.setAttribute('aria-label','Visible forum contributors');
   note=document.createElement('p');note.setAttribute('role','status');note.setAttribute('aria-live','polite');note.textContent='Only contributors visible to your membership are searchable.';
   const cancel=document.createElement('button');cancel.type='button';cancel.className='btn secondary';cancel.textContent='Cancel';cancel.addEventListener('click',()=>dialog.close());
   label.append(field);section.append(h,info,label,list,note,cancel);dialog.append(section);document.body.append(dialog);
   dialog.addEventListener('close',()=>{controller?.abort();clearTimeout(timer);activeButton?.focus();activeArea=null;activeButton=null});
   field.addEventListener('input',()=>{clearTimeout(timer);controller?.abort();list.replaceChildren();const q=field.value.trim();if(!/^[A-Za-z0-9_.-]{3,40}$/.test(q)){message('Type at least 3 username characters.');return}timer=setTimeout(()=>lookup(q),250)});
   field.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){const first=list.querySelector('button');if(first){e.preventDefault();first.focus()}}});
 }
 function insert(username){if(!activeArea||!document.contains(activeArea))return;const text=`[mention]${username}[/mention]`;
   if(activeArea.hidden||getComputedStyle(activeArea).display==='none'){
     const mode=activeArea.closest('.gu-forum-editor')?.querySelector('select[aria-label="Editor mode"]');
     if(mode&&mode.value==='visual'){message('Switch to Standard BBCode mode before inserting a mention, to avoid overwriting visual edits.');return}
   }
   const start=Number.isInteger(activeArea.selectionStart)?activeArea.selectionStart:activeArea.value.length;
   const end=Number.isInteger(activeArea.selectionEnd)?activeArea.selectionEnd:start;
   activeArea.setRangeText(text,start,end,'end');activeArea.dispatchEvent(new Event('input',{bubbles:true}));
   dialog.close();activeArea?.focus();
 }
 async function lookup(q){controller?.abort();controller=new AbortController();const own=controller;
   message('Searching visible contributors…');
   try{
     const sb=await window.getSupabaseClient();const session=(await sb.auth.getSession()).data?.session;
     if(!session)throw Error('Sign in before mentioning community members.');
     const r=await fetch('/api/member-mentions?q='+encodeURIComponent(q),{headers:{authorization:'Bearer '+session.access_token},cache:'no-store',signal:own.signal});
     const body=await r.json().catch(()=>({}));if(!r.ok||!body.ok)throw Error(body.error||'Contributors could not be searched.');
     if(own!==controller)return;
     list.replaceChildren();selection=body.matches||[];
     selection.forEach(name=>{const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.className='btn secondary';b.textContent='@'+name;b.addEventListener('click',()=>insert(name));b.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const buttons=[...list.querySelectorAll('button')];const i=buttons.indexOf(b),step=e.key==='ArrowDown'?1:-1;buttons[(i+step+buttons.length)%buttons.length]?.focus()}});li.append(b);list.append(li)});
     message(selection.length?`${selection.length} verified visible contributor${selection.length===1?'':'s'} found. No notification is sent by inserting a mention.`:'No matching visible contributors.');
   }catch(e){if(e.name!=='AbortError')message(e.message||'Contributor search unavailable.')}
 }

 function attachInline(area){
   if(!area||area.dataset.guMentionInline)return;area.dataset.guMentionInline='1';
   const menu=document.createElement('div');menu.className='gu-inline-mentions';menu.setAttribute('role','listbox');menu.setAttribute('aria-label','Verified forum contributor suggestions');menu.hidden=true;
   area.insertAdjacentElement('afterend',menu);
   let matches=[],where=0,to=0,lookupAbort,delay,selected=0;
   function hide(){menu.hidden=true;menu.replaceChildren();matches=[];area.removeAttribute('aria-activedescendant');}
   async function suggest(prefix){lookupAbort?.abort();lookupAbort=new AbortController();const signal=lookupAbort.signal;
     try{
       const sb=await window.getSupabaseClient();const session=(await sb.auth.getSession()).data?.session;if(!session)return hide();
       const r=await fetch('/api/member-mentions?q='+encodeURIComponent(prefix),{headers:{authorization:'Bearer '+session.access_token},cache:'no-store',signal});
       const j=await r.json().catch(()=>({}));if(signal.aborted||!r.ok||!j.ok)return hide();
       matches=j.matches||[];selected=0;menu.replaceChildren();
       for(const [i,name] of matches.entries()){
         const b=document.createElement('button');b.type='button';b.id='gu-inline-mention-'+i;b.setAttribute('role','option');b.setAttribute('aria-selected',i===0?'true':'false');b.textContent='@'+name;
         b.addEventListener('mousedown',e=>e.preventDefault());b.addEventListener('click',()=>commit(name));menu.append(b);
       }
       menu.hidden=!matches.length;if(matches.length)area.setAttribute('aria-activedescendant','gu-inline-mention-0');else area.removeAttribute('aria-activedescendant');
     }catch(e){if(e.name!=='AbortError')hide()}
   }
   function commit(name){if(!matches.includes(name))return;const text='[mention]'+name+'[/mention]';area.setRangeText(text,where,to,'end');area.dispatchEvent(new Event('input',{bubbles:true}));hide();area.focus()}
   area.addEventListener('input',()=>{
     clearTimeout(delay);lookupAbort?.abort();
     const pos=area.selectionStart,head=area.value.slice(0,pos),m=/(?:^|[\s(])@([A-Za-z0-9_.-]{3,40})$/.exec(head);
     if(!m)return hide();where=pos-m[1].length-1;to=pos;delay=setTimeout(()=>suggest(m[1]),230);
   });
   area.addEventListener('keydown',e=>{
     if(menu.hidden||!matches.length)return;
     if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();selected=(selected+(e.key==='ArrowDown'?1:matches.length-1))%matches.length;
       for(const [i,b] of [...menu.querySelectorAll('button')].entries())b.setAttribute('aria-selected',i===selected?'true':'false');
       area.setAttribute('aria-activedescendant','gu-inline-mention-'+selected);
     }else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();commit(matches[selected])}
     else if(e.key==='Escape'){e.preventDefault();hide()}
   });
   area.addEventListener('blur',()=>setTimeout(hide,220));
 }

 function enhance(root=document){
   const bars=root.matches?.('.gu-forum-toolbar')?[root]:[...root.querySelectorAll?.('.gu-forum-toolbar')||[]];
   for(const bar of bars){const button=[...bar.querySelectorAll('button')].find(b=>b.textContent.trim()==='Mention');if(!button||button.dataset.verifiedMention)return;
     const editor=bar.closest('.gu-forum-editor');const area=editor?.querySelector('textarea[data-forum-composer]');
     // Never hijack announcement, moderation or staff editor mentions.
     if(!area)return;
     attachInline(area);
     button.dataset.verifiedMention='1';button.setAttribute('aria-haspopup','dialog');
     button.onclick=null;button.addEventListener('click',()=>{if(!dialog)build();activeArea=area;activeButton=button;field.value='';list.replaceChildren();message('Type at least 3 username characters.');dialog.showModal();field.focus()});
   }
 }
 const scan=()=>enhance(document);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
 const observer=new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length))scan()});observer.observe(document.documentElement,{childList:true,subtree:true});
})();
