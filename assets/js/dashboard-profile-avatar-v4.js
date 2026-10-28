/* Read only the current signed-in member profile; never read a public profiles list. */
(()=>{'use strict';if(!/^\/dashboard(?:\.html)?$/.test(location.pathname))return;
 const pic=document.querySelector('[data-dashboard-avatar]'),title=document.querySelector('[data-dashboard-member-name]');
 function setImage(url,username){
  if(pic){pic.onerror=()=>{pic.onerror=null;pic.src='/assets/avatars/av-f4.webp'};pic.src=url||'/assets/avatars/av-f4.webp'}
  if(title&&username)title.textContent=String(username).slice(0,40);
 }
 async function load(){try{
  const sb=await window.getSupabaseClient(),{data,error}=await sb.auth.getSession();
  if(error||!data?.session)return;
  const response=await fetch('/api/member-profile',{cache:'no-store',headers:{authorization:'Bearer '+data.session.access_token}});
  if(!response.ok)return;const dataResult=await response.json();
  if(dataResult.ok&&dataResult.profile)setImage(dataResult.profile.avatarUrl,dataResult.profile.username);
 }catch{/* Keep a neutral fallback if the account is temporarily unreachable. */}}
 window.addEventListener('gu:profile-avatar-updated',event=>setImage(event.detail?.avatarUrl));
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void load(),{once:true});else void load();
})();
