/* Founder marketing is visible only during the verified, non-full beta period.
 * This does not hide earned founder benefits or members' legal terms.
 */
(()=>{'use strict';
async function update(){
 const links=[...document.querySelectorAll('[data-founder-offer-link]')];
 if(!links.length)return;
 let visible=false;
 try{const r=await fetch('/api/founding-offer-status',{cache:'no-store'});
  if(r.ok){const s=await r.json();visible=s.ok===true&&s.offersVisible===true}
 }catch{}
 for(const link of links)link.hidden=!visible;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void update());else void update();
})();