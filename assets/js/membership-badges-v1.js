/* Verified membership badges for posts and the signed-in profile. */
(()=>{'use strict';
 const ART=Object.freeze({
  FREE:{src:'/assets/images/memberships/SMFGU_Free_Forum_Icon.webp',label:'Free Member'},
  FOUNDING_14:{src:'/assets/images/memberships/SMFGU_Founding_14_Day_Forum_Icon.webp',label:'Founding 14-Day Member'},
  FOUNDING_30:{src:'/assets/images/memberships/SMFGU_Founding_30_Day_Forum_Icon.webp',label:'Founding 30-Day Member'},
  FOUNDING_60:{src:'/assets/images/memberships/SMFGU_Founding_60_Day_Forum_Icon.webp',label:'Founding 60-Day Member'}
 });
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const cache=new Map();let busy=false,scheduled=false;
 function image(code,small){
  const spec=ART[code];if(!spec)return null;
  const img=document.createElement('img');
  img.className=small?'gu-member-badge-icon':'gu-profile-membership-icon';
  img.src=spec.src;img.alt=spec.label+' badge';img.title='Verified '+spec.label;
  img.loading='lazy';img.width=small?25:65;img.height=small?25:65;
  img.onerror=()=>img.remove();
  return img;
 }
 async function getBadges(ids,session){
  const missing=ids.filter(id=>!cache.has(id));if(!missing.length)return;
  const res=await fetch('/api/member-badges?ids='+encodeURIComponent(missing.join(',')),{
   headers:{authorization:'Bearer '+session.access_token},cache:'no-store'});
  if(!res.ok)throw Error('Badge verification unavailable');
  const data=await res.json();
  if(data.ok!==true||!Array.isArray(data.badges))throw Error('Badge verification unavailable');
  for(const id of missing)cache.set(id,null);
  for(const item of data.badges)
   if(missing.includes(item.userId)&&Object.hasOwn(ART,item.planCode))
    cache.set(item.userId,item.planCode);
 }
 async function hydrate(){
  if(busy)return;
  const authors=[...document.querySelectorAll('[data-community-avatar-user]:not([data-membership-checked])')].slice(0,49);
  const profile=document.querySelector('#member-presentation-v1:not([data-membership-checked])');
  if(!authors.length&&!profile)return;
  busy=true;
  for(const el of authors)el.dataset.membershipChecked='1';
  if(profile)profile.dataset.membershipChecked='1';
  try{
   const sb=await window.getSupabaseClient();
   const {data:{session}}=await sb.auth.getSession();
   if(!session?.user?.id)return;
   const ids=[...new Set(authors.map(n=>n.dataset.communityAvatarUser).filter(x=>UUID.test(x||'')))];
   if(profile)ids.push(session.user.id);
   const unique=[...new Set(ids)];if(unique.length)await getBadges(unique,session);
   for(const el of authors){
    if(!el.isConnected)continue;
    const badge=image(cache.get(el.dataset.communityAvatarUser),true);
    if(badge)el.append(badge);
   }
   if(profile?.isConnected){
    const code=cache.get(session.user.id),spec=ART[code];
    const row=profile.querySelector('.v1-avatar-row');
    if(row&&spec){
     const block=document.createElement('div');block.className='gu-profile-membership';
     block.setAttribute('aria-label','Verified membership badge');
     const badge=image(code,false),text=document.createElement('div');
     const label=document.createElement('strong');label.textContent=spec.label;
     const note=document.createElement('span');note.textContent='Displayed beside your forum posts and replies';
     text.append(label,note);if(badge)block.append(badge);block.append(text);
     row.insertAdjacentElement('afterend',block);
    }
   }
  }catch{/* Never invent an elevated badge when verification is unavailable. */}
  finally{
   busy=false;
   if(document.querySelector('[data-community-avatar-user]:not([data-membership-checked]),#member-presentation-v1:not([data-membership-checked])'))schedule()
  }
 }
 function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;void hydrate()},120)}
 function init(){new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});schedule()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
