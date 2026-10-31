/* First-party ad inventory and per-slot carousel (2026-10-27).
 * No third-party scripts, fake sponsor impressions, or release-gate bypass.
 * Each slide transition requests fresh server authorization.
 */
(()=>{'use strict';
const inventory=Object.freeze({
 HOME_INLINE:'Home · banner',STORE_INLINE:'Store · bottom banner',
 BOOTCAMP_LEFT:'Boot Camp Academy — Left Sponsor',BOOTCAMP_RIGHT:'Boot Camp Academy — Right Sponsor',SKILLS_LEFT:'Market Skills Record — Left Sponsor',SKILLS_RIGHT:'Market Skills Record — Right Sponsor',
 STORE_LEFT:'Store · left rail',STORE_RIGHT:'Store · right rail',
 ALL_PRODUCTS_LEFT:'All Products · left rail',ALL_PRODUCTS_RIGHT:'All Products · right rail',ALL_PRODUCTS_BOTTOM:'All Products · bottom banner',

 COMMUNITY_TOP:'Market Commons · top banner',COMMUNITY_INLINE:'Market Commons · bottom banner',
 FREE_DASHBOARD:'Dashboard · contextual',SAMPLE_LABS:'Sample Labs · contextual',
 BOOKS_BOTTOM:'Books · bottom banner',MEMBERSHIP_BOTTOM:'Membership · bottom banner',
 TOOLS_BOTTOM:'Tools · bottom banner',ABOUT_BOTTOM:'About · bottom banner',
 SIGNIN_LEFT:'Sign In · left',SIGNIN_RIGHT:'Sign In · right',SIGNIN_BOTTOM:'Sign In · bottom',
 SIGNUP_LEFT:'Create Account · left',SIGNUP_RIGHT:'Create Account · right',SIGNUP_BOTTOM:'Create Account · bottom'
});
const make=(tag,value,cls)=>{const a=document.createElement(tag);if(value!==undefined)a.textContent=String(value);if(cls)a.className=cls;return a};
const safe=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.port===''?u.href:null}catch{return null}};
const housePromos=Object.freeze({
 books:{eyebrow:'THE STOCK MARKET · FROM THE GROUND UP',title:'A stronger foundation starts here.',
  body:'Build market knowledge one clear, practical lesson at a time.',action:'Explore the books',url:'/books.html',art:'BOOKS'},
 beta:{eyebrow:'FOUNDING MEMBERSHIP',title:'Help shape a better learning platform.',
  body:'Explore the founding memberships and the learning experience behind them.',action:'See memberships',url:'/store.html',art:'BETA'},
 learning:{eyebrow:'GUIDED LEARNING',title:'Understand the decision before the trade.',
  body:'Try guided examples built around market evidence, risk, and sound reasoning.',action:'Explore learning',url:'/learn.html',art:'LEARN'},
 community:{eyebrow:'THE MARKET COMMONS',title:'Build skill through thoughtful discussion.',
  body:'Learn from shared market observations, reviews, and educational conversations.',action:'Explore Market Commons',url:'/market-commons.html',art:'COMMONS'}
});
function houseFor(slot){
 const perPlacement={
  SIGNIN_LEFT:'learning',SIGNIN_RIGHT:'community',SIGNIN_BOTTOM:'books',
  BOOTCAMP_LEFT:'learning',BOOTCAMP_RIGHT:'books',SKILLS_LEFT:'learning',SKILLS_RIGHT:'community',
  SIGNUP_LEFT:'beta',SIGNUP_RIGHT:'learning',SIGNUP_BOTTOM:'community',
  STORE_LEFT:'books',STORE_RIGHT:'learning',STORE_INLINE:'community',
  ALL_PRODUCTS_LEFT:'learning',ALL_PRODUCTS_RIGHT:'beta',ALL_PRODUCTS_BOTTOM:'books',
  COMMUNITY_TOP:'learning',COMMUNITY_INLINE:'books',HOME_INLINE:'beta'
 };
 if(perPlacement[slot])return housePromos[perPlacement[slot]];
 if(/MEMBERSHIP/.test(slot))return housePromos.beta;
 if(/COMMUNITY/.test(slot))return housePromos.community;
 if(/SAMPLE|DASHBOARD|TOOLS/.test(slot))return housePromos.learning;
 return housePromos.books;
}
function available(mount,slot,ownerPreview=false){
 const item=houseFor(slot);
 const region=make('aside',undefined,'gu-ad-slot gu-house-promo'+(ownerPreview?' gu-owner-ad-preview':''));
 region.setAttribute('aria-label',ownerPreview?'Owner advertising placement preview':'First-party site promotion');
 const body=make('div',undefined,'gu-house-promo-copy');
 const disclosure=make('span',ownerPreview?'OWNER PREVIEW · NOT A PAID AD':'SITE PROMOTION','gu-house-disclosure');
 const category=make('span',item.eyebrow,'gu-house-eyebrow');
 const title=make('h3',item.title,'gu-house-title');
 const details=make('p',item.body,'gu-house-text');
 const link=make('a',item.action,'gu-house-cta');link.href=item.url;
 body.append(disclosure,category,title,details,link);
 const art=make('div',undefined,'gu-house-art');
 art.setAttribute('aria-hidden','true');
 art.append(make('span','THE','gu-house-art-kicker'),make('strong',item.art,'gu-house-art-wordmark'),
  make('span','LEARN · UNDERSTAND · PRACTICE','gu-house-art-subtitle'));
 region.append(body,art);
 if(ownerPreview)region.append(make('span',inventory[slot]+' · '+slot,'gu-owner-placement-name'));
 mount.replaceChildren(region);
}
async function init(){
 const places=[...document.querySelectorAll('[data-ad-slot]')];
 if(!places.length)return;
 let token='',sid='';
 // Use Supabase's existing local session without waiting for an external CDN.
 // The server verifies the token, OWNER role and ad-free entitlement itself.
 // If local session state cannot be read, fail closed instead of guessing
 // that a paid ad-free member is signed out.
 try{
  const raw=localStorage.getItem('sb-oxihglyfgzywsupnyicb-auth-token');
  if(raw){
   const session=JSON.parse(raw);
   if(!session||typeof session.access_token!=='string'||!session.access_token)return;
   token=session.access_token;
  }
  sid=sessionStorage.getItem('gu_ad_session_v014229')||'';
  if(!sid){sid=crypto.randomUUID();sessionStorage.setItem('gu_ad_session_v014229',sid)}
 }catch{return}
 // Cloudflare canonical URLs often omit .html; normalize the page used by
 // the server's exact placement-route allowlist without relaxing that allowlist.
 const rawPage=location.pathname==='/'?'/index.html':location.pathname;
 const page=/^\/[a-z0-9-]+$/.test(rawPage)?rawPage+'.html':rawPage;
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
    const data=await response.json();
    stop();
    let delivered=data;
    if(!delivered?.placeholderAvailable&&token){
     // An Owner is ad-free as a member but can inspect active placements
     // without creating a pretend paid campaign or any billable event.
     const previewQuery=new URLSearchParams({slot,page,ownerPreview:'1'});
     const preview=await fetch('/api/ad-slot?'+previewQuery.toString(),{
      cache:'no-store',headers,credentials:'same-origin'});
     if(preview.ok){
      const candidate=await preview.json();
      if(candidate?.ownerPreview===true)delivered=candidate;
     }
    }
    if(!delivered||delivered.placeholderAvailable!==true){mount.replaceChildren();currentId=null;return}
    if(delivered.affiliate){
     // Affiliate creative is nonbillable and delivered only by a separate
     // server-approved channel. No paid-sponsor impression or click events.
     const affiliate=delivered.affiliate,href=safe(affiliate.destinationUrl);
     const media=String(affiliate.imageUrl||'');
     if(affiliate.type!=='affiliate'||!href||
        new URL(href).hostname!=='www.tradingview.com'||
        !media.startsWith('data:image/webp;base64,')||
        !/^[A-Za-z0-9+/=]{200,16000}$/.test(media.slice(23)))throw Error('Invalid affiliate creative');
     currentId=null;
     const region=make('aside',undefined,'gu-ad-slot gu-affiliate-promo');
     region.setAttribute('aria-label','TradingView affiliate advertisement');
     const label=make('span','Affiliate advertisement','gu-affiliate-disclosure');
     const link=make('a',undefined,'gu-affiliate-link');
     link.href=href;link.target='_blank';link.rel='sponsored nofollow noopener noreferrer';
     link.setAttribute('aria-label','Explore TradingView charts (external affiliate link)');
     const img=make('img');img.src=media;img.alt=String(affiliate.altText||'TradingView charting tools').slice(0,150);
     img.width=728;img.height=90;img.loading='lazy';img.decoding='async';
     link.append(img);region.append(label,link);mount.replaceChildren(region);
     return;
    }
    if(!delivered.ad){currentId=null;available(mount,slot,delivered.ownerPreview===true);return}
    const ad=delivered.ad;
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
    const rotate=delivered.carouselEnabled===true&&delivered.hasMore===true;
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