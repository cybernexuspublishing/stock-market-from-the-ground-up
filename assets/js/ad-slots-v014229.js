/* First-party ad inventory and per-slot carousel (2026-10-27).
 * No third-party scripts, fake sponsor impressions, or release-gate bypass.
 * Each slide transition requests fresh server authorization.
 */
(()=>{'use strict';
const inventory=Object.freeze({
 HOME_INLINE:'Home · banner',STORE_INLINE:'Store · bottom banner',
 STORE_LEFT:'Store · left rail',STORE_RIGHT:'Store · right rail',
 COMMUNITY_TOP:'Market Commons · top banner',COMMUNITY_INLINE:'Market Commons · bottom banner',
 FREE_DASHBOARD:'Dashboard · contextual',SAMPLE_LABS:'Sample Labs · contextual',
 BOOKS_BOTTOM:'Books · bottom banner',MEMBERSHIP_BOTTOM:'Membership · bottom banner',
 TOOLS_BOTTOM:'Tools · bottom banner',ABOUT_BOTTOM:'About · bottom banner',
 SIGNIN_LEFT:'Sign In · left',SIGNIN_RIGHT:'Sign In · right',SIGNIN_BOTTOM:'Sign In · bottom',
 SIGNUP_LEFT:'Create Account · left',SIGNUP_RIGHT:'Create Account · right',SIGNUP_BOTTOM:'Create Account · bottom'
});
const make=(tag,value,cls)=>{const a=document.createElement(tag);if(value!==undefined)a.textContent=String(value);if(cls)a.className=cls;return a};
const safe=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.port===''?u.href:null}catch{return null}};
function available(mount,slot){
 const region=make('aside',undefined,'gu-ad-slot gu-ad-placeholder');
 region.setAttribute('aria-label','Available advertising space');
 const copy=make('div',undefined,'gu-ad-placeholder-copy');
 copy.append(make('span','ADVERTISING SPACE AVAILABLE','gu-ad-placeholder-kicker'),
  make('strong','Feature your business here','gu-ad-placeholder-title'),
  make('span',inventory[slot]+' · Subject to editorial review','gu-ad-placeholder-description'));
 const link=make('a','Request a sponsorship quote','gu-ad-placeholder-link');
 link.href='/advertise.html';
 region.append(copy,link);mount.replaceChildren(region);
}
async function init(){
 const places=[...document.querySelectorAll('[data-ad-slot]')];
 if(!places.length||typeof window.getSupabaseClient!=='function')return;
 let token='',sid='';
 try{
  const sb=await window.getSupabaseClient(),session=await sb.auth.getSession();
  if(session.error)return; // Never treat unknown membership as a signed-out visitor.
  token=session.data?.session?.access_token||'';
  sid=sessionStorage.getItem('gu_ad_session_v014229')||'';
  if(!sid){sid=crypto.randomUUID();sessionStorage.setItem('gu_ad_session_v014229',sid)}
 }catch{return}
 const page=location.pathname==='/'?'/index.html':location.pathname;
 for(const mount of places){
  const slot=mount.getAttribute('data-ad-slot')||'';
  if(!Object.hasOwn(inventory,slot))continue;
  const headers=token?{authorization:'Bearer '+token}:{};
  let currentId=null,loading=false,timer=null,intersecting=false,observer=null;
  function stop(){if(timer!==null){clearInterval(timer);timer=null}if(observer){observer.disconnect();observer=null}}
  const record=(type,ad)=>{const payload=JSON.stringify({type,creativeId:ad.creativeId,campaignId:ad.campaignId,
   slot,page,sessionToken:sid});fetch('/api/ad-slot',{method:'POST',cache:'no-store',
   headers:{...headers,'content-type':'application/json'},body:payload,credentials:'same-origin',keepalive:true}).catch(()=>{})};
  async function load(next=false){
   if(loading)return;
   loading=true;
   try{
    const query=new URLSearchParams({slot,page,sessionToken:sid});
    if(next&&Number.isSafeInteger(currentId))query.set('excludeCreativeId',String(currentId));
    const response=await fetch('/api/ad-slot?'+query.toString(),{cache:'no-store',headers,credentials:'same-origin'});
    if(!response.ok)throw Error('Sponsor authorization unavailable');
    const data=await response.json(),ad=data?.ad;
    stop();
    if(!data||data.placeholderAvailable!==true){mount.replaceChildren();currentId=null;return}
    if(!ad){currentId=null;available(mount,slot);return}
    if(ad.slot!==slot||!Number.isSafeInteger(ad.creativeId)||!Number.isSafeInteger(ad.campaignId))throw Error('Invalid sponsor');
    const href=safe(ad.destinationUrl);if(!href)throw Error('Invalid destination');
    currentId=ad.creativeId;
    const region=make('aside',undefined,'gu-ad-slot gu-ad-sponsored');
    region.setAttribute('aria-label','Sponsored content');
    const link=make('a',undefined,'gu-ad-sponsored-link');link.href=href;link.target='_blank';
    link.rel='sponsored nofollow noopener noreferrer';
    link.append(make('span',ad.label==='Sponsored'?'Sponsored':'Advertisement','gu-ad-mark'),
      make('h3',ad.headline),make('p',ad.body));
    region.append(link);
    const rotate=data.carouselEnabled===true&&data.hasMore===true;
    if(rotate){
     const controls=make('div',undefined,'gu-ad-carousel-controls');
     const nextBtn=make('button','Next sponsor','gu-ad-carousel-next');nextBtn.type='button';
     const pause=make('button','Pause rotation','gu-ad-carousel-pause');pause.type='button';
     let paused=false;pause.addEventListener('click',()=>{
      paused=!paused;pause.textContent=paused?'Resume rotation':'Pause rotation';
      if(paused)stopTimer();else schedule();
     });
     nextBtn.addEventListener('click',()=>{void load(true)});
     controls.append(nextBtn,pause);region.append(controls);
     function stopTimer(){if(timer!==null){clearInterval(timer);timer=null}}
     function schedule(){
      stopTimer();
      if(paused||!intersecting||document.hidden||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
      timer=setInterval(()=>{if(!loading&&!document.hidden&&!region.matches(':focus-within'))void load(true)},12000);
     }
     if('IntersectionObserver' in window){
      observer=new IntersectionObserver(entries=>{intersecting=entries.some(e=>e.isIntersecting);schedule()}, {threshold:[0,.5]});
      observer.observe(region);
     }else{intersecting=true;schedule()}
     region.addEventListener('mouseenter',stopTimer);
     region.addEventListener('mouseleave',schedule);
     region.addEventListener('focusin',stopTimer);
     region.addEventListener('focusout',schedule);
     document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTimer();else if(region.isConnected)schedule()},{once:true});
    }
    mount.replaceChildren(region);
    let seen=false;
    if('IntersectionObserver' in window){
     const impression=new IntersectionObserver(entries=>{
      if(!seen&&entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.5)){
       seen=true;record('impression',ad);impression.disconnect()}
     },{threshold:[.5]});
     impression.observe(region);
    }
    link.addEventListener('click',()=>record('click',ad));
   }catch{stop();mount.replaceChildren();currentId=null}
   finally{loading=false}
  }
  void load(false);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else void init();
})();