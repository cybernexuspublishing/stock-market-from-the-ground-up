/* SMF Knowledge Database affiliate placement visibility.
 * The server-side active placement and ad-free policy are authoritative.
 * Fail closed on network errors or invalid sessions.
 * Does not deliver paid campaigns, create billable impressions, or load third-party code.
 */
(()=>{'use strict';
 async function init(){
  const banner=document.getElementById('gu-knowledge-partner-banner');
  if(!banner)return;
  banner.hidden=true;
  let headers={};
  try{
   const raw=localStorage.getItem('sb-oxihglyfgzywsupnyicb-auth-token');
   if(raw){
    const stored=JSON.parse(raw);
    if(typeof stored?.access_token!=='string'||!stored.access_token)return;
    headers={authorization:'Bearer '+stored.access_token};
   }
   const params=new URLSearchParams({slot:'KNOWLEDGE_TRADINGVIEW',page:'/knowledge-database.html'});
   const request=async query=>{
    const response=await fetch('/api/ad-slot?'+query.toString(),{
     headers,cache:'no-store',credentials:'same-origin'});
    if(!response.ok)throw Error('Placement visibility unavailable');
    return response.json();
   };
   let state=await request(params);
   if(state?.placeholderAvailable!==true&&headers.authorization){
    // The Owner remains ad-free but can visually inspect enabled inventory.
    params.set('ownerPreview','1');
    const preview=await request(params);
    if(preview?.ownerPreview===true)state=preview;
   }
   banner.hidden=state?.placeholderAvailable!==true;
  }catch{banner.hidden=true}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void init()},{once:true});
 else void init();
})();
