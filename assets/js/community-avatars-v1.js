/* Lightweight member-avatar presentation; all author URLs are server-validated. */
(()=>{'use strict';
 const uuid=/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i;
 const fallback='/assets/avatars/av-f4.webp';
 const cacheFresh=url=>typeof url==='string'&&/\/assets\/avatars\/av-r(?:0[1-9]|[12][0-9]|30)\.webp$/.test(url)?url+'?v=5':url;
 let pending=false,busy=false;
 function validUrl(value){
  try{const u=new URL(value,location.origin);
   return u.protocol==='https:'&&(u.origin===location.origin||
    u.hostname==='oxihglyfgzywsupnyicb.supabase.co')?u.href:null;
  }catch{return null}
 }
 async function hydrate(){
  if(busy)return;
  const nodes=[...document.querySelectorAll('[data-community-avatar-user]:not([data-avatar-loaded])')].slice(0,50);
  if(!nodes.length)return;busy=true;
  for(const item of nodes)item.dataset.avatarLoaded='1';
  const ids=[...new Set(nodes.map(x=>x.dataset.communityAvatarUser).filter(x=>uuid.test(x||'')))];
  let portraits={};
  if(ids.length)try{
   const client=await window.getSupabaseClient();
   const {data:{session}}=await client.auth.getSession();
   if(session){
    const {data,error}=await client.rpc('gu_community_author_avatars_v1',{p_author_ids:ids});
    if(!error&&Array.isArray(data)){
     portraits=Object.fromEntries(data.map(x=>[x.author_id,validUrl(x.avatar_url)]));
    }
   }
  }catch{/* Avatars are optional decoration, never required for posting. */}
  for(const item of nodes){
   if(!item.isConnected)continue;
   const image=document.createElement('img');image.className='gu-author-avatar';
   image.src=cacheFresh(portraits[item.dataset.communityAvatarUser])||fallback;
   image.alt='';image.width=34;image.height=34;image.loading='lazy';
   item.appendChild(image);
  }
  busy=false;
 }
 function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;void hydrate()},100)}
 function ready(){new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});schedule()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
