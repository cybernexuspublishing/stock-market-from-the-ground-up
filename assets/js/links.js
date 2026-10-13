/* v0.13.5.7.3: one canonical header owner. The original header injector appended
 * five competing top-level links after the signed-in menu was rendered, causing
 * Market Commons and other headers to overflow. Those destinations now live in
 * the canonical Learn/Tools/Profile menus. Preserve the dashboard quick action. */
(()=>{'use strict';
 const injectQuick=()=>{
  const quick=document.querySelector('.dashboard-quick-links,.v132-quick-actions,[data-dashboard-quick-actions]');
  if(!quick||quick.querySelector('[data-v135-quick]'))return;
  const a=document.createElement('a');a.className='btn secondary';a.href='/ondemand-training.html';
  a.textContent='Historical Replay Training';a.dataset.v135Quick='1';quick.append(a);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',injectQuick,{once:true});else injectQuick();
 window.addEventListener('pageshow',injectQuick);
})();
