/* v0.14.0.18 — Standalone authenticated composer; same canonical Commons RPC as existing forum. */
(()=>{'use strict';
 const form=document.getElementById('gu-new-discussion-form'); if(!form)return;
 const field=id=>document.getElementById(id);
 const forum=field('gu-topic-forum'),title=field('gu-topic-title'),body=field('gu-topic-body'),ticker=field('gu-topic-ticker'),tags=field('gu-topic-tags'),submit=field('gu-topic-submit'),result=field('gu-topic-result');
 let sb=null,busy=false;
 function state(message,alert=false){result.textContent=message;result.setAttribute('role',alert?'alert':'status')}
 async function init(){
   try{
     sb=await window.getSupabaseClient();
     const {data:{session},error:sessionError}=await sb.auth.getSession();
     if(sessionError||!session){const next='/new-discussion.html'+location.search;location.replace('/signin.html?next='+encodeURIComponent(next));return}
     const {data,error}=await sb.from('commons_forums').select('forum_code,name,section_name,active,sort_order').eq('active',true).order('sort_order');
     if(error)throw error;
     const all=Array.isArray(data)?data:[];
     forum.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=all.length?'Choose a sub-forum':'No available sub-forums';forum.appendChild(placeholder);
     all.forEach(item=>{const option=document.createElement('option');option.value=item.forum_code;option.textContent=(item.section_name?item.section_name+' — ':'')+item.name;forum.appendChild(option)});
     const requested=new URLSearchParams(location.search).get('forum');
     if(requested&&all.some(x=>x.forum_code===requested))forum.value=requested;
     forum.disabled=all.length===0;submit.disabled=all.length===0;
     if(!all.length)state('There are currently no available sub-forums.',true);
     window.GroundUpForumEditor?.decorateAll(form);
   }catch(e){forum.disabled=true;submit.disabled=true;state('Unable to load the authorized sub-forums. Retry later or return to Market Commons.',true);}
 }
 form.addEventListener('submit',async e=>{
   e.preventDefault();if(busy||submit.disabled||!sb)return;
   const heading=title.value.trim(),message=body.value.trim(),symbol=ticker.value.trim().toUpperCase();
   if(!forum.value||heading.length<5||heading.length>180||message.length<10||message.length>10000){state('Select a sub-forum and provide a 5–180 character title and 10–10,000 character discussion.',true);return}
   if(symbol&&!/^[A-Z][A-Z0-9.\-]{0,11}$/.test(symbol)){state('Use a valid ticker symbol (maximum 12 characters).',true);ticker.focus();return}
   const keywords=[...new Set(tags.value.split(',').map(x=>x.trim().replace(/[^A-Za-z0-9_ -]/g,'').replace(/\s+/g,'-').slice(0,24)).filter(Boolean))].slice(0,5);
   const args={p_forum_code:forum.value,p_title:heading,p_body:message+(keywords.length?'\n\nKeywords: '+keywords.map(x=>'#'+x).join(' '):''),p_ticker:symbol||null};
   busy=true;submit.disabled=true;state('Publishing your discussion…');
   try{
     // The database RPC enforces membership, forum permission and accepted content.
     const {data,error}=await sb.rpc('commons_create_topic',args);if(error)throw error;
     const id=Number(data);
     if(!Number.isSafeInteger(id)||id<1)throw new Error('The discussion was created, but no valid destination was returned. Check Market Commons before posting again.');
     location.replace('/market-commons.html?topic='+id);
   }catch(e){state(e?.message||'Unable to create discussion. Check Market Commons before retrying.',true);submit.disabled=false;busy=false;}
 });
 init();
})();
