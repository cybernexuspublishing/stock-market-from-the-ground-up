/* First-party contextual sponsor renderer v0.14.0.229.
 * Renders only server-authorized creatives; never embeds third-party scripts.
 * Impression/click records are nonbillable and have no user ID, IP or fingerprint.
 */
(()=>{'use strict';
const places=document.querySelectorAll('[data-ad-slot]');
if(!places.length)return;
const el=(tag,value,cls)=>{const a=document.createElement(tag);if(value!==undefined)a.textContent=String(value);if(cls)a.className=cls;return a};
const safe=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password&&u.port===''?u.href:null}catch{return null}};
async function init(){
 let token='';
 try{
  if(typeof window.getSupabaseClient==='function'){
   const sb=await window.getSupabaseClient();
   const session=await sb.auth.getSession();
   if(session.error) return; // unknown auth state: fail closed
   token=session.data?.session?.access_token||'';
  }else return; // never assume member is signed out
 }catch{return}
 let sessionId='';
 try{sessionId=sessionStorage.getItem('gu_ad_session_v014229')||'';
  if(!sessionId){sessionId=crypto.randomUUID();sessionStorage.setItem('gu_ad_session_v014229',sessionId)}
 }catch{return}
 const page=location.pathname==='/'?'/index.html':location.pathname;
 for(const mount of places){
  const slot=mount.getAttribute('data-ad-slot')||'';
  if(!/^[A-Z0-9_]{4,48}$/.test(slot))continue;
  const headers=token?{authorization:'Bearer '+token}:{};
  try{
   const r=await fetch('/api/ad-slot?slot='+encodeURIComponent(slot)+'&page='+encodeURIComponent(page)+'&sessionToken='+encodeURIComponent(sessionId),
    {cache:'no-store',headers,credentials:'same-origin'});
   if(!r.ok)continue;
   const data=await r.json(),ad=data?.ad;
   if(!ad||ad.slot!==slot||!Number.isSafeInteger(ad.creativeId)||!Number.isSafeInteger(ad.campaignId))continue;
   const href=safe(ad.destinationUrl);if(!href)continue;
   const region=el('aside',undefined,'gu-ad-slot');region.setAttribute('aria-label','Sponsored content');
   const link=el('a');link.href=href;link.target='_blank';link.rel='sponsored nofollow noopener noreferrer';
   link.append(el('span',ad.label==='Sponsored'?'Sponsored':'Advertisement','gu-ad-mark'));
   link.append(el('h3',ad.headline));link.append(el('p',ad.body));
   region.append(link);mount.replaceChildren(region);
   const record=(type)=>{
    const payload=JSON.stringify({type,creativeId:ad.creativeId,campaignId:ad.campaignId,
     slot,page,sessionToken:sessionId});
    fetch('/api/ad-slot',{method:'POST',cache:'no-store',
     headers:{...headers,'content-type':'application/json'},body:payload,
     credentials:'same-origin',keepalive:true}).catch(()=>{});
   };
   // Count only an impression actually viewed, not an API fetch.
   let seen=false;
   if('IntersectionObserver'in window){
    const observer=new IntersectionObserver(entries=>{
     if(!seen&&entries.some(x=>x.isIntersecting&&x.intersectionRatio>=0.5)){
      seen=true;record('impression');observer.disconnect()}
    },{threshold:[0.5]});
    observer.observe(region);
   }
   link.addEventListener('click',()=>record('click'));
  }catch{/* no ad is preferable to a broken page */}
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();